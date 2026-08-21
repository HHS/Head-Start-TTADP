import { DECIMAL_BASE } from '@ttahub/common';
import type { Request, Response } from 'express';
import httpCodes from 'http-codes';
import { getUserReadRegions } from '../services/accessValidation';
import { currentUserId } from '../services/currentUser';
import { recipientById } from '../services/recipient';

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

const checkUserRegionAccess = async (req: Request, res: Response, regionIds: number[]) => {
  const validRegionIds =
    Array.isArray(regionIds) &&
    regionIds.length > 0 &&
    regionIds.every((regionId) => Number.isInteger(Number(regionId)) && Number(regionId) > 0);

  if (!validRegionIds) {
    res.sendStatus(httpCodes.BAD_REQUEST);
    return false;
  }

  const userId = await currentUserId(req, res);
  const readRegions = await getUserReadRegions(userId);
  const hasAccessToAllRegions = regionIds.every((regionId) =>
    readRegions.includes(Number(regionId))
  );

  if (!hasAccessToAllRegions) {
    res.sendStatus(httpCodes.FORBIDDEN);
    return false;
  }

  return true;
};

export { checkRecipientAccessAndExistence, checkUserRegionAccess };
