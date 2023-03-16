/* eslint-disable import/prefer-default-export */
import { Request, Response } from 'express';
import httpCodes from 'http-codes';
import { handleError } from '../../lib/apiErrorHandler';
import { createNewObjectivesForOtherEntity } from '../../services/objectives';
import { currentUserId } from '../../services/currentUser';
import ObjectivePolicy from '../../policies/objective';
import { userById } from '../../services/users';

/**
 *
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 */
export async function createObjectivesForOtherEntity(req: Request, res: Response): Promise<void> {
  try {
    const { otherEntityIds, regionId } = req.body;

    // check permissions
    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const policy = new ObjectivePolicy({}, user);

    if (!policy.canWriteInRegion(regionId)) {
      res.sendStatus(httpCodes.FORBIDDEN);
    }

    // bulk create objectives
    let objective = null;
    if (otherEntityIds) {
      objective = await createNewObjectivesForOtherEntity(otherEntityIds);
    }

    res.json(objective);
  } catch (err) {
    await handleError(req, res, err, 'createObjective');
  }
}
