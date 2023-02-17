import { Request, Response } from 'express';
import httpCodes from 'http-codes';
import handleErrors from '../../lib/apiErrorHandler';
import ActivityReport from '../../policies/activityReport'; // presumably this is a fine set of policies for us to use as a starting point
import { currentUserId } from '../../services/currentUser';
import { userById } from '../../services/users';
import { newRttapa, rttapa, allRttapas } from '../../services/rttapa';

export async function createRttapa(req: Request, res: Response) {
  try {
    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const policy = new ActivityReport(user, req.body);
    if (!policy.canCreate()) {
      res.status(httpCodes.FORBIDDEN);
    }

    // create the rttapa
    const report = await newRttapa(req.body);
    res.json(report);
  } catch (e) {
    await handleErrors(req, res, e, 'createRttapa');
  }
}

export async function getRttapa(req: Request, res: Response) {
  try {
    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const report = await rttapa(Number(req.params.reportId));
    const policy = new ActivityReport(user, report);

    if (!policy.canReadInRegion()) {
      res.status(httpCodes.FORBIDDEN);
      return;
    }

    res.json(report);
  } catch (e) {
    await handleErrors(req, res, e, 'getRttapa');
  }
}

export async function getRttapas(req: Request, res: Response) {
  try {
    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const policy = new ActivityReport(user, { regionId: req.params.regionId });
    if (!policy.canReadInRegion()) {
      res.status(httpCodes.FORBIDDEN);
      return;
    }

    const regionId = Number(req.params.regionId);
    const recipientId = Number(req.params.recipientId);

    const reports = await allRttapas(regionId, recipientId);
    res.json(reports);
  } catch (e) {
    await handleErrors(req, res, e, 'getRttapas');
  }
}
