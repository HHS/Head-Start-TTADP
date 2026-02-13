import httpCodes from 'http-codes'
import { Op } from 'sequelize'
import { DECIMAL_BASE } from '@ttahub/common'
import type { Request, Response } from 'express'
import UserPolicy from '../../policies/user'
import db from '../../models'
import {
  logById,
  logsByRecipientAndScopes,
  deleteLog,
  updateLog,
  createLog,
  csvLogsByRecipientAndScopes,
  csvLogsByScopes,
  logsByScopes,
} from '../../services/communicationLog'
import handleErrors from '../../lib/apiErrorHandler'
import { currentUserId } from '../../services/currentUser'
import { userById, usersByRoles } from '../../services/users'
import Policy from '../../policies/communicationLog'
import filtersToScopes from '../../scopes'
import { setTrainingAndActivityReportReadRegions } from '../../services/accessValidation'
import SCOPES from '../../middleware/scopeConstants'
import { groupsByRegion } from '../../services/groups'

const namespace = 'HANDLERS:COMMUNICATION_LOG'

const logContext = { namespace }
const { GoalTemplate, Recipient, Grant } = db

const getAuthorizationByRegion = async (req: Request, res: Response) => {
  const { regionId } = req.params
  const userId = await currentUserId(req, res)
  const user = await userById(userId)

  return new Policy(user, Number(regionId))
}

const getAuthorizationByLogId = async (req: Request, res: Response) => {
  const { regionId, id } = req.params
  const log = await logById(Number(id))
  const userId = await currentUserId(req, res)
  const user = await userById(userId)
  return new Policy(user, Number(regionId), log)
}

async function getAvailableUsersRecipientsAndGoals(req: Request, res: Response) {
  const userId = await currentUserId(req, res)
  const user = await userById(userId)
  const { regionId } = req.params
  const authorization = new UserPolicy(user)

  if (!authorization.canViewUsersInRegion(parseInt(String(regionId), DECIMAL_BASE))) {
    return null
  }
  const ONE_YEAR_IN_MS = 365 * 24 * 60 * 60 * 1000

  const users = (await usersByRoles(['TTAC', 'ECM', 'GSM', 'GS', 'ECS', 'HS', 'FES', 'SS'], regionId)) as {
    id: number
    name: string
  }[]

  const regionalUsers = users.map((u) => ({
    label: u.name,
    value: u.id,
  }))

  const standardGoals = await GoalTemplate.findAll({
    where: { standard: { [Op.ne]: null } },
    attributes: [
      ['standard', 'label'],
      ['id', 'value'],
    ],
    order: [['label', 'ASC']],
  })

  const recipients = await Recipient.findAll({
    attributes: [
      ['id', 'value'],
      ['name', 'label'],
    ],
    where: {
      deleted: false,
    },
    include: [
      {
        model: Grant,
        as: 'grants',
        attributes: ['status', 'inactivationDate'],
        where: {
          regionId,
          [Op.or]: [
            { status: 'Active' },
            {
              [Op.and]: [
                { status: 'Inactive' },
                { inactivationDate: { [Op.ne]: null } },
                {
                  inactivationDate: {
                    [Op.gte]: new Date(Date.now() - ONE_YEAR_IN_MS),
                  },
                },
              ],
            },
          ],
        },
        required: true,
      },
    ],
    order: [['label', 'ASC']],
  })
  // Append ' (Inactive)' to recipient names if all their grants are inactive
  const recipientsWithInactiveStatus = recipients.map((recipient) => {
    const recipientToUse = recipient.dataValues || recipient
    const allGrantsInactive = recipientToUse.grants.length && recipientToUse.grants.every((grant) => grant.status === 'Inactive')
    return {
      value: recipientToUse.value,
      label: allGrantsInactive ? `${recipientToUse.label} (inactive)` : recipientToUse.label,
    }
  })
  const groups = await groupsByRegion(Number(regionId), userId)

  return {
    regionalUsers,
    standardGoals,
    recipients: recipientsWithInactiveStatus,
    groups,
  }
}

async function communicationLogAdditionalData(req: Request, res: Response) {
  const additionalData = await getAvailableUsersRecipientsAndGoals(req, res)
  res.status(httpCodes.OK).json(additionalData)
}

async function communicationLogById(req: Request, res: Response) {
  try {
    const { id } = req.params
    const policy = await getAuthorizationByRegion(req, res)
    if (!policy.canReadLog()) {
      res.status(httpCodes.FORBIDDEN).send()
      return
    }

    const log = await logById(Number(id))
    res.status(httpCodes.OK).json(log)
  } catch (error) {
    await handleErrors(req, res, error, logContext)
  }
}

const communicationLogsByRecipientId = async (req: Request, res: Response) => {
  try {
    const { recipientId } = req.params
    const policy = await getAuthorizationByRegion(req, res)

    if (!policy.canReadLog()) {
      res.status(httpCodes.FORBIDDEN).send()
      return
    }

    const userId = await currentUserId(req, res)
    const { sortBy, offset, direction, limit, format } = req.query
    const updatedFilters = await setTrainingAndActivityReportReadRegions(req.query, userId)
    const { communicationLog: scopes } = await filtersToScopes(updatedFilters, { userId })

    const limitNumber = Number(limit || 100)

    if (format === 'csv') {
      const logs = await csvLogsByRecipientAndScopes(Number(recipientId), String(sortBy), Number(offset), String(direction), scopes)
      res.type('text/csv')
      res.send(logs)
      return
    }

    const logs = await logsByRecipientAndScopes(Number(recipientId), String(sortBy), Number(offset), String(direction), limitNumber, scopes)
    res.status(httpCodes.OK).json(logs)
  } catch (error) {
    await handleErrors(req, res, error, logContext)
  }
}

const communicationLogs = async (req: Request, res: Response) => {
  try {
    const userId = await currentUserId(req, res)
    const { sortBy, offset, direction, limit, format } = req.query
    const updatedFilters = await setTrainingAndActivityReportReadRegions(req.query, userId)
    const { communicationLog: scopes } = await filtersToScopes(updatedFilters, { userId })

    const limitNumber = Number(limit || 100)

    if (format === 'csv') {
      const logs = await csvLogsByScopes(String(sortBy), Number(offset), String(direction), scopes)
      res.type('text/csv')
      res.send(logs)
      return
    }

    const logs = await logsByScopes(String(sortBy), Number(offset), String(direction), limitNumber, scopes)
    res.status(httpCodes.OK).json(logs)
  } catch (error) {
    await handleErrors(req, res, error, logContext)
  }
}

const updateLogById = async (req: Request, res: Response) => {
  try {
    const policy = await getAuthorizationByLogId(req, res)
    if (!policy.canUpdateLog()) {
      res.status(httpCodes.FORBIDDEN).send()
      return
    }

    const { id } = req.params
    const { data } = req.body

    const log = await updateLog(Number(id), data)
    res.status(httpCodes.OK).json(log)
  } catch (error) {
    await handleErrors(req, res, error, logContext)
  }
}

const deleteLogById = async (req: Request, res: Response) => {
  try {
    const policy = await getAuthorizationByLogId(req, res)
    if (!policy.canDeleteLog()) {
      res.status(httpCodes.FORBIDDEN).send()
      return
    }

    const { id } = req.params
    const operation = await deleteLog(Number(id))
    if (!operation) {
      throw new Error('Failure to delete log')
    }
    res.status(httpCodes.NO_CONTENT).send()
  } catch (err) {
    await handleErrors(req, res, err, logContext)
  }
}

const createLogByRecipientId = async (req: Request, res: Response) => {
  try {
    const policy = await getAuthorizationByRegion(req, res)
    if (!policy.canCreateLog()) {
      res.status(httpCodes.FORBIDDEN).send()
      return
    }

    const { recipientId } = req.params
    const userId = await currentUserId(req, res)
    const { data } = req.body

    const log = await createLog([Number(recipientId)], userId, data)
    res.status(httpCodes.CREATED).json(log)
  } catch (error) {
    await handleErrors(req, res, error, logContext)
  }
}

const createLogByRegionId = async (req: Request, res: Response) => {
  try {
    const policy = await getAuthorizationByRegion(req, res)
    if (!policy.canCreateLog()) {
      res.status(httpCodes.FORBIDDEN).send()
      return
    }

    const userId = await currentUserId(req, res)
    const { data } = req.body
    const { recipients, ...fields } = data

    const recipientIds = Array.isArray(recipients)
      ? recipients
          .map((recipient: { value: number } | null | undefined) => Number(recipient?.value))
          .filter((id: number) => Number.isInteger(id) && id > 0)
      : []

    const log = await createLog(recipientIds, userId, fields)
    res.status(httpCodes.CREATED).json(log)
  } catch (error) {
    await handleErrors(req, res, error, logContext)
  }
}

export {
  communicationLogAdditionalData,
  communicationLogById,
  communicationLogsByRecipientId,
  communicationLogs,
  updateLogById,
  deleteLogById,
  createLogByRecipientId,
  getAvailableUsersRecipientsAndGoals,
  createLogByRegionId,
}
