import { Request, Response } from 'express';
import httpCodes from 'http-codes';
import handleErrors from '../../lib/apiErrorHandler';
import ActivityReport from '../../policies/activityReport'; // presumably this is a fine set of policies for us to use as a starting point
import { currentUserId } from '../../services/currentUser';
import { userById } from '../../services/users';
import { createRttapa as create, findRttapa, findAllRttapa } from '../../services/rttapa';

/**
 *
 * @param {Request} req
 * @param {Request} req
 * @returns Promise<void>
 */
export async function createRttapa(req: Request, res: Response) {
  try {
    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const policy = new ActivityReport(user, { regionId: Number(req.body.regionId) });

    if (!policy.canCreate()) {
      res.sendStatus(httpCodes.FORBIDDEN);
      return;
    }

    // create the rttapa
    const report = await create(userId, req.body);
    res.json(report);
  } catch (e) {
    await handleErrors(req, res, e, 'createRttapa');
  }
}
/**
 *
 * @param {Request} req
 * @param {Response} res
 * @returns Promise<void>
 */
export async function getRttapa(req: Request, res: Response) {
  try {
    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const report = await findRttapa(Number(req.params.reportId));
    const policy = new ActivityReport(user, report);

    if (!policy.canReadInRegion()) {
      res.sendStatus(httpCodes.FORBIDDEN);
      return;
    }

    res.json(report);
  } catch (e) {
    await handleErrors(req, res, e, 'getRttapa');
  }
}
/**
 *
 * @param {Request} req
 * @param {Response} res
 * @returns Promise<void>
 */
export async function getRttapas(req: Request, res: Response) {
  try {
    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const policy = new ActivityReport(user, { regionId: Number(req.params.regionId) });
    if (!policy.canReadInRegion()) {
      res.sendStatus(httpCodes.FORBIDDEN);
      return;
    }

    const { sortBy, direction } = req.query;

    const regionId = Number(req.params.regionId);
    const recipientId = Number(req.params.recipientId);
    const reports = await findAllRttapa(regionId, recipientId, {
      sortBy: String(sortBy),
      direction: String(direction),
    });

    res.json(reports);
  } catch (e) {
    await handleErrors(req, res, e, 'getRttapas');
  }
}
