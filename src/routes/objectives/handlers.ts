/* eslint-disable import/prefer-default-export */
import { DECIMAL_BASE } from '@ttahub/common'
import type { Request, Response } from 'express'
import httpCodes from 'http-codes'
import { OBJECTIVE_STATUS } from '../../constants'
import { currentUserId } from '../../services/currentUser'
import { userById } from '../../services/users'
import GoalPolicy from '../../policies/goals'
import { updateObjectiveStatusByIds, verifyObjectiveStatusTransition, getObjectiveRegionAndGoalStatusByIds } from '../../services/objectives'
import handleErrors from '../../lib/apiErrorHandler'

const namespace = 'SERVICE:OBJECTIVES'

const logContext = {
  namespace,
}

export async function updateStatus(req: Request, res: Response) {
  try {
    // check permissions
    const userId = await currentUserId(req, res)
    const user = await userById(userId)

    const { ids, status, regionId, closeSuspendReason, closeSuspendContext } = req.body
    const region = parseInt(regionId, DECIMAL_BASE)
    const auth = new GoalPolicy(user, {}, region)

    if (!auth.isAdmin() && !auth.canWriteInRegion(region)) {
      return res.status(httpCodes.FORBIDDEN).json({ message: 'You do not have permission to update objectives in this region' })
    }

    if (!ids || !status) {
      return res.status(httpCodes.BAD_REQUEST).json({ message: 'Missing required fields' })
    }

    const objectives = await getObjectiveRegionAndGoalStatusByIds(ids)

    // check if objectives are in the same region provided
    const regionIds = objectives.map((o) => o.goal.grant.regionId)
    const uniqueRegionIds = [...new Set(regionIds)]

    if (uniqueRegionIds.length > 1 || uniqueRegionIds[0] !== region) {
      return res.status(httpCodes.BAD_REQUEST).json({ message: 'Invalid objective ids provided' })
    }

    // check if status transition is valid
    const validTransitions = objectives.every((o) => verifyObjectiveStatusTransition(o, status))
    if (!validTransitions) {
      return res.status(httpCodes.BAD_REQUEST).json({ message: 'Invalid status transition' })
    }

    // If the objective has onApprovedAR set to true,
    //  we need to change the status for each depending on its current status.
    for (let i = 0; i < objectives.length; i += 1) {
      const objective = objectives[i]
      if (objective.onApprovedAR === true) {
        if (objective.status === OBJECTIVE_STATUS.NOT_STARTED && status === OBJECTIVE_STATUS.COMPLETE) {
          // If the current status is "Not Started" and target is "Complete",
          // set to "In Progress" instead
          objectives[i].overrideStatus = OBJECTIVE_STATUS.IN_PROGRESS
        } else if (objective.status === OBJECTIVE_STATUS.IN_PROGRESS && status === OBJECTIVE_STATUS.NOT_STARTED) {
          // If the current status is "In Progress" and target is
          // "Not Started", keep as "In Progress"
          objectives[i].overrideStatus = OBJECTIVE_STATUS.IN_PROGRESS
        } else if (objective.status === OBJECTIVE_STATUS.SUSPENDED && status === OBJECTIVE_STATUS.NOT_STARTED) {
          // If the current status is "Suspended" and target is "Not Started", keep as "Suspended"
          objectives[i].overrideStatus = OBJECTIVE_STATUS.SUSPENDED
        }
      }
    }

    // Reduce to bucket objectives by status.
    const objectivesIdsWithNewStatuses = objectives.reduce(
      (acc, objective) => {
        const overrideStatus = objective.overrideStatus || status
        // Check if the return array already contains this status
        const existingStatus = acc.find((item) => item.status === overrideStatus)
        // If it does, just add the id to that status
        if (existingStatus) {
          existingStatus.ids.push(objective.id)
        } else {
          // If it doesn't, create a new entry with the status and id
          acc.push({
            status: overrideStatus,
            ids: [objective.id],
          })
        }
        return acc
      },
      [] as Array<{ status: string; ids: number[] }>
    )

    // Use Promise.all to run all updates concurrently
    await Promise.all(
      objectivesIdsWithNewStatuses.map((statusGroup) =>
        updateObjectiveStatusByIds(statusGroup.ids, statusGroup.status, closeSuspendReason, closeSuspendContext)
      )
    )

    return res.status(httpCodes.OK).json({
      objectives: ids,
    })
  } catch (err) {
    return handleErrors(req, res, err, logContext)
  }
}
