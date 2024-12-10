import { Request, Response } from 'express';
import { checkRecipientAccessAndExistence } from '../utils';
import handleErrors from '../../lib/apiErrorHandler';
import {
  classScore,
  monitoringData,
  ttaByCitations,
  ttaByReviews,
} from '../../services/monitoring';

const namespace = 'SERVICE:MONITORING';

const logContext = {
  namespace,
};

export async function getTtaByReview(req: Request, res: Response) {
  const { recipientId, regionId } = req.params;

  try {
    await checkRecipientAccessAndExistence(req, res);
    const data = await ttaByReviews(
      Number(recipientId),
      Number(regionId),
    );

    res.status(200).json(data);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function getTtaByCitation(req: Request, res: Response) {
  const { recipientId, regionId } = req.params;

  try {
    await checkRecipientAccessAndExistence(req, res);
    const data = await ttaByCitations(
      Number(recipientId),
      Number(regionId),
    );

    res.status(200).json(data);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function getMonitoringData(req: Request, res: Response) {
  const { recipientId, grantNumber, regionId } = req.params;

  try {
    await checkRecipientAccessAndExistence(req, res);
    const data = await monitoringData({
      recipientId: Number(recipientId),
      grantNumber: String(grantNumber),
      regionId: Number(regionId),
    });

    res.status(200).json(data);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function getClassScore(req: Request, res: Response) {
  const { recipientId, grantNumber, regionId } = req.params;

  try {
    await checkRecipientAccessAndExistence(req, res);
    const data = await classScore({
      recipientId: Number(recipientId),
      grantNumber: String(grantNumber),
      regionId: Number(regionId),
    });

    res.status(200).json(data);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
