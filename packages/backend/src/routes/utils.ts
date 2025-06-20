import { Request, Response } from 'express';
import httpCodes from 'http-codes';
import { DECIMAL_BASE } from '@ttahub/common';
import { getUserReadRegions } from '../services/accessValidation';
import { currentUserId } from '../services/currentUser';
import SCOPES from '../middleware/scopeConstants';
import { recipientById, allArUserIdsByRecipientAndRegion } from '../services/recipient';
import Recipient from '../policies/recipient';
import { userById } from '../services/users';

/**
 *
 * Takes an express request and response and runs a few simply
 * queries to determine if the user has permission to merge goals
 *
 * Meant to be used across different handlers (Goals, recipients, etc)
 *
 * @param req Request
 * @param res Response
 * @returns boolean
 */
export async function validateMergeGoalPermissions(req: Request, res: Response) {
  const { recipientId, regionId } = req.params;

  if (!recipientId || !regionId) {
    res.sendStatus(httpCodes.BAD_REQUEST);
    return false;
  }

  const recipient = await recipientById(recipientId, []);
  if (!recipient) {
    res.sendStatus(httpCodes.NOT_FOUND);
    return false;
  }

  const userId = await currentUserId(req, res);
  const user = await userById(userId);
  const arUsers = await allArUserIdsByRecipientAndRegion(
    Number(recipientId),
    Number(regionId),
  );

  const userIsAdmin = user.permissions.some((p: { scopeId: number }) => p.scopeId === SCOPES.ADMIN);

  const policy = new Recipient(
    user,
    recipient,
    arUsers.includes(userId),
  );

  return policy.canMergeGoals() || userIsAdmin;
}

const checkRecipientAccessAndExistence = async (req: Request, res: Response) => {
  const { recipientId, regionId } = req.params;
  // Check if user has access to this region.
  const userId = await currentUserId(req, res);
  const readRegions = await getUserReadRegions(userId);
  if (!readRegions.includes(parseInt(regionId, DECIMAL_BASE))) {
    res.sendStatus(httpCodes.FORBIDDEN);
    return false;
  }

  // Check recipient exists.
  const recipient = await recipientById(recipientId, []);
  if (!recipient) {
    res.sendStatus(httpCodes.NOT_FOUND);
    return false;
  }

  return true;
};

export { checkRecipientAccessAndExistence };
