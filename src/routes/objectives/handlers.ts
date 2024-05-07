/* eslint-disable import/prefer-default-export */
import { DECIMAL_BASE } from '@ttahub/common';
import { type Request, type Response } from 'express';
import httpCodes from 'http-codes';
import { currentUserId } from '../../services/currentUser';
import { userById } from '../../services/users';
import GoalPolicy from '../../policies/goals';
import { updateObjectiveStatusByIds, verifyObjectiveStatusTransition, getObjectiveRegionAndGoalStatusByIds } from '../../services/objectives';
import handleErrors from '../../lib/apiErrorHandler';

const namespace = 'SERVICE:OBJECTIVES';

const logContext = {
  namespace,
};

export async function updateStatus(req: Request, res:Response) {
  try {
    // check permissions
    const userId = await currentUserId(req, res);
    const user = await userById(userId);

    const {
      ids,
      status,
      regionId,
      closeSuspendReason,
      closeSuspendContext,
    } = req.body;
    const region = parseInt(regionId, DECIMAL_BASE);
    const auth = new GoalPolicy(user, {}, region);

    if (!auth.isAdmin() && !auth.canWriteInRegion(region)) {
      return res.status(httpCodes.FORBIDDEN).json({ message: 'You do not have permission to update objectives in this region' });
    }

    if (!ids || !status) {
      return res.status(httpCodes.BAD_REQUEST).json({ message: 'Missing required fields' });
    }

    const objectives = await getObjectiveRegionAndGoalStatusByIds(ids);

    // check if objectives are in the same region provided
    const regionIds = objectives.map((o) => o.goal.grant.regionId);
    const uniqueRegionIds = [...new Set(regionIds)];

    if (uniqueRegionIds.length > 1 || uniqueRegionIds[0] !== region) {
      return res.status(httpCodes.BAD_REQUEST).json({ message: 'Invalid objective ids provided' });
    }

    // check if status transition is valid
    const validTransitions = objectives.every((o) => verifyObjectiveStatusTransition(o, status));
    if (!validTransitions) {
      return res.status(httpCodes.BAD_REQUEST).json({ message: 'Invalid status transition' });
    }

    // call update status service
    await updateObjectiveStatusByIds(ids, status, closeSuspendReason, closeSuspendContext);

    return res.status(httpCodes.OK).json({
      objectives: ids,
    });
  } catch (err) {
    return handleErrors(req, res, err, logContext);
  }
}
