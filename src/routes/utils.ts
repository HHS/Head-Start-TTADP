import type { Request, Response } from 'express';
import httpCodes from 'http-codes';
import parsePositiveInteger from '../lib/parsePositiveInteger';
import { getUserReadRegions } from '../services/accessValidation';
import { currentUserId } from '../services/currentUser';
import { recipientById } from '../services/recipient';

const checkRecipientAccessAndExistence = async (req: Request, res: Response) => {
  const { recipientId, regionId } = req.params;
  res.locals = res.locals || {};
  const validatedRecipientId =
    res.locals.validatedParams?.recipientId ?? parsePositiveInteger(recipientId);
  const validatedRegionId = res.locals.validatedParams?.regionId ?? parsePositiveInteger(regionId);

  if (validatedRecipientId === null || validatedRegionId === null) {
    res.sendStatus(httpCodes.BAD_REQUEST);
    return false;
  }

  res.locals.validatedParams = {
    ...res.locals.validatedParams,
    recipientId: validatedRecipientId,
    regionId: validatedRegionId,
  };

  // Check if user has access to this region.
  const userId = await currentUserId(req, res);
  const readRegions = await getUserReadRegions(userId);
  if (!readRegions.includes(validatedRegionId)) {
    res.sendStatus(httpCodes.FORBIDDEN);
    return false;
  }

  // Verify that the recipient has a grant in the requested region. This avoids
  // revealing recipient existence outside the requested region.
  const recipient = await recipientById(validatedRecipientId, {
    where: { regionId: validatedRegionId },
  });
  if (!recipient) {
    res.sendStatus(httpCodes.NOT_FOUND);
    return false;
  }

  return true;
};

// eslint-disable-next-line import/prefer-default-export
export { checkRecipientAccessAndExistence };
