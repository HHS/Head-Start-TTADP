import httpCodes from 'http-codes';
import { Request, Response } from 'express';
import {
  logById,
  logsByRecipientAndScopes,
  deleteLog,
  updateLog,
  createLog,
  csvLogsByRecipientAndScopes,
} from '../../services/communicationLog';
import handleErrors from '../../lib/apiErrorHandler';
import { currentUserId } from '../../services/currentUser';
import { userById } from '../../services/users';
import Policy from '../../policies/communicationLog';
import filtersToScopes from '../../scopes';
import { setTrainingAndActivityReportReadRegions } from '../../services/accessValidation';

const namespace = 'HANDLERS:COMMUNICATION_LOG';

const logContext = { namespace };

const getAuthorizationByRegion = async (req: Request, res: Response) => {
  const { regionId } = req.params;
  const userId = await currentUserId(req, res);
  const user = await userById(userId);

  return new Policy(user, Number(regionId));
};

const getAuthorizationByLogId = async (req: Request, res: Response) => {
  const { regionId, id } = req.params;
  const log = await logById(Number(id));
  const userId = await currentUserId(req, res);
  const user = await userById(userId);
  return new Policy(user, Number(regionId), log);
};

async function communicationLogById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const policy = await getAuthorizationByRegion(req, res);
    if (!policy.canReadLog()) {
      res.status(httpCodes.FORBIDDEN).send();
      return;
    }

    const log = await logById(Number(id));
    res.status(httpCodes.OK).json(log);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

const communicationLogsByRecipientId = async (req: Request, res: Response) => {
  try {
    const { recipientId } = req.params;
    const policy = await getAuthorizationByRegion(req, res);

    if (!policy.canReadLog()) {
      res.status(httpCodes.FORBIDDEN).send();
      return;
    }

    const userId = await currentUserId(req, res);
    const {
      sortBy,
      offset,
      direction,
      limit,
      format,
    } = req.query;
    const updatedFilters = await setTrainingAndActivityReportReadRegions(req.query, userId);
    const { communicationLog: scopes } = await filtersToScopes(updatedFilters, { userId });

    const limitNumber = Number(limit) || false;

    if (format === 'csv') {
      const logs = await csvLogsByRecipientAndScopes(
        Number(recipientId),
        String(sortBy),
        Number(offset),
        String(direction),
        scopes,
      );
      res.send(logs);
      return;
    }

    const logs = await logsByRecipientAndScopes(
      Number(recipientId),
      String(sortBy),
      Number(offset),
      String(direction),
      limitNumber,
      scopes,
    );
    res.status(httpCodes.OK).json(logs);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
};

const updateLogById = async (req: Request, res: Response) => {
  try {
    const policy = await getAuthorizationByLogId(req, res);
    if (!policy.canUpdateLog()) {
      res.status(httpCodes.FORBIDDEN).send();
      return;
    }

    const { id } = req.params;
    const { data } = req.body;

    const log = await updateLog(Number(id), data);
    res.status(httpCodes.OK).json(log);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
};

const deleteLogById = async (req: Request, res: Response) => {
  try {
    const policy = await getAuthorizationByLogId(req, res);
    if (!policy.canDeleteLog()) {
      res.status(httpCodes.FORBIDDEN).send();
      return;
    }

    const { id } = req.params;
    const operation = await deleteLog(Number(id));
    if (!operation) {
      throw new Error('Failure to delete log');
    }
    res.status(httpCodes.NO_CONTENT).send();
  } catch (err) {
    await handleErrors(req, res, err, logContext);
  }
};

const createLogByRecipientId = async (req: Request, res: Response) => {
  try {
    const policy = await getAuthorizationByRegion(req, res);
    if (!policy.canCreateLog()) {
      res.status(httpCodes.FORBIDDEN).send();
      return;
    }

    const { recipientId } = req.params;
    const userId = await currentUserId(req, res);
    const { data } = req.body;

    const log = await createLog(Number(recipientId), userId, data);
    res.status(httpCodes.CREATED).json(log);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
};

export {
  communicationLogById,
  communicationLogsByRecipientId,
  updateLogById,
  deleteLogById,
  createLogByRecipientId,
};
