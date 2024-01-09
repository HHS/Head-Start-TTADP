import { Request, Response } from 'express';
import { checkRecipientAccessAndExistence } from '../utils';
import handleErrors from '../../lib/apiErrorHandler';
import { classScore, monitoringData } from '../../services/monitoring';

const namespace = 'SERVICE:MONITORING';

const logContext = {
  namespace,
};

export async function getMonitoringData(req: Request, res: Response) {
  const { recipientId, regionId } = req.params;

  try {
    await checkRecipientAccessAndExistence(recipientId, req);
    const data = await monitoringData(Number(recipientId), Number(regionId));

    res.status(200).json(data);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function getClassScore(req: Request, res: Response) {
  const { recipientId, regionId } = req.params;

  try {
    await checkRecipientAccessAndExistence(recipientId, req);
    const data = await classScore(Number(recipientId), Number(regionId));

    res.status(200).json(data);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}
