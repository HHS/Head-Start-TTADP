/* eslint-disable import/prefer-default-export */
import express, { Response, Request } from 'express';
import httpCodes from 'http-codes';
import transactionWrapper from '../transactionWrapper';
import { handleError } from '../../lib/apiErrorHandler';
import { groupsByRegion } from '../../services/groups';

const namespace = 'ADMIN:GROUPS';
const logContext = { namespace };

/**
   *
   * @param {Request} req - request
   * @param {Response} res - response
   */
export async function getGroupsByRegion(req: Request, res: Response) {
  // admin access is already checked in the middleware
  try {
    const { regionId } = req.params;
    if (!regionId) {
      res.status(httpCodes.BAD_REQUEST).json({ error: 'regionId is required' });
    }

    const groups = await groupsByRegion(Number(regionId));
    res.status(httpCodes.OK).json(groups);
  } catch (err) {
    await handleError(req, res, err, logContext);
  }
}

const router = express.Router();

router.get('/region/:regionId', transactionWrapper(getGroupsByRegion));

export default router;
