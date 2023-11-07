import httpCodes from 'http-codes';
import { Request, Response } from 'express';
import {
  logById,
  logsByRecipientAndScopes,
  deleteLog,
  updateLog,
  createLog,
} from '../../services/communicationLog';
import handleErrors from '../../lib/apiErrorHandler';
import { currentUserId } from '../../services/currentUser';
import { userById } from '../../services/users';
import Policy from '../../policies/communicationLog';

const namespace = 'HANDLERS:COMMUNICATION_LOG';

const logContext = { namespace };

const getAuthorizationByRegion = async (req: Request, res: Response) => {
  const { regionId } = req.params;
  const userId = await currentUserId(req, res);
  const user = await userById(userId);

  console.log(user);
  return new Policy(user, Number(regionId));
};

const getAuthorizationByLogId = async (req: Request, res: Response) => {
  const { regionId, logId } = req.params;
  const log = await logById(Number(logId));
  const userId = await currentUserId(req, res);
  const user = await userById(userId);
  return new Policy(user, Number(regionId), log);
};

const communicationLogById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const policy = await getAuthorizationByRegion(req, res);
    if (!policy.canReadLog()) {
      return res.status(httpCodes.FORBIDDEN).send();
    }

    const log = await logById(Number(id));
    return res.status(httpCodes.OK).json(log);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

const communicationLogsByRecipientId = async (req: Request, res: Response) => {
  try {
    const { recipientId } = req.params;
    const policy = await getAuthorizationByRegion(req, res);

    if (!policy.canReadLog()) {
      return res.status(httpCodes.FORBIDDEN).send();
    }

    const logs = await logsByRecipientAndScopes(Number(recipientId));
    return res.status(httpCodes.OK).json(logs);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

const updateLogById = async (req: Request, res: Response) => {
  try {
    const policy = await getAuthorizationByLogId(req, res);
    if (!policy.canUpdateLog()) {
      return res.status(httpCodes.FORBIDDEN).send();
    }

    const { id } = req.params;
    const { data } = req.body;

    const log = await updateLog(Number(id), data);
    return res.status(httpCodes.OK).json(log);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

const deleteLogById = async (req: Request, res: Response) => {
  try {
    const policy = await getAuthorizationByLogId(req, res);
    if (!policy.canDeleteLog()) {
      return res.status(httpCodes.FORBIDDEN).send();
    }

    const { id } = req.params;
    const operation = await deleteLog(Number(id));
    if (!operation) {
      throw new Error('Failure to delete log');
    }
    return res.status(httpCodes.NO_CONTENT).send();
  } catch (err) {
    return handleErrors(req, res, err, logContext);
  }
};

const createLogByRecipientId = async (req: Request, res: Response) => {
  try {
    const policy = await getAuthorizationByRegion(req, res);
    if (!policy.canCreateLog()) {
      return res.status(httpCodes.FORBIDDEN).send();
    }

    const { recipientId } = req.params;
    const { data } = req.body;
    const log = await createLog(Number(recipientId), 0, data);
    return res.status(httpCodes.CREATED).json(log);
  } catch (error) {
    return handleErrors(req, res, error, logContext);
  }
};

export {
  communicationLogById,
  communicationLogsByRecipientId,
  updateLogById,
  deleteLogById,
  createLogByRecipientId,
};
