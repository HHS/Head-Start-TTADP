import type { Request, Response } from 'express';
import httpCodes from 'http-codes';
import handleErrors from '../../lib/apiErrorHandler';
import { respondWithServiceError } from '../../lib/serviceError';
import TtaRequestPolicy from '../../policies/ttaRequest';
import filtersToScopes from '../../scopes';
import { setReadRegions } from '../../services/accessValidation';
import { currentUserId } from '../../services/currentUser';
import {
  createTtaRequest as createTtaRequestService,
  getTtaRequests as getTtaRequestsService,
  ttaRequestById,
  updateTtaRequest,
} from '../../services/ttaRequests';
import { userById } from '../../services/users';

const namespace = 'SERVICE:TTA_REQUESTS';

const logContext = {
  namespace,
};

export async function getTtaRequests(req: Request, res: Response) {
  try {
    const userId = await currentUserId(req, res);
    // filter the query so that only regions the user has permission to are included
    const query = await setReadRegions(req.query, userId);
    const { ttaRequest: scopes } = await filtersToScopes(query, { userId });

    const ttaRequests = await getTtaRequestsService(scopes, userId);
    res.json(ttaRequests);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function getTtaRequestsByRecipient(req: Request, res: Response) {
  try {
    const { regionId, recipientId } = req.params;
    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const authorization = new TtaRequestPolicy(user, Number(regionId));

    if (!authorization.canGet()) {
      res.sendStatus(httpCodes.FORBIDDEN);
      return;
    }

    const { ttaRequest: scopes } = await filtersToScopes({ 'region.in': [regionId] }, { userId });

    const ttaRequests = await getTtaRequestsService(scopes, userId, Number(recipientId));
    res.json(ttaRequests);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function getTtaRequest(req: Request, res: Response) {
  try {
    const { ttaRequestId } = req.params;
    const ttaRequest = await ttaRequestById(Number(ttaRequestId));

    if (!ttaRequest) {
      res.sendStatus(httpCodes.NOT_FOUND);
      return;
    }

    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const authorization = new TtaRequestPolicy(user, ttaRequest.regionId, ttaRequest);

    if (!authorization.canGet()) {
      res.sendStatus(httpCodes.FORBIDDEN);
      return;
    }

    // toJSON keeps the virtual fields
    res.json(ttaRequest.toJSON());
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function createTtaRequest(req: Request, res: Response) {
  try {
    const data = req.body;
    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const authorization = new TtaRequestPolicy(user, data.regionId);

    if (!authorization.canCreate()) {
      res.sendStatus(httpCodes.FORBIDDEN);
      return;
    }

    const ttaRequest = await createTtaRequestService(data, userId);
    res.status(httpCodes.CREATED).json(ttaRequest);
  } catch (error) {
    if (respondWithServiceError(res, error)) {
      return;
    }
    await handleErrors(req, res, error, logContext);
  }
}

export async function saveTtaRequest(req: Request, res: Response) {
  try {
    const { ttaRequestId } = req.params;
    const existing = await ttaRequestById(Number(ttaRequestId));

    if (!existing) {
      res.sendStatus(httpCodes.NOT_FOUND);
      return;
    }

    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const authorization = new TtaRequestPolicy(user, existing.regionId, existing);

    if (!authorization.canUpdate()) {
      res.sendStatus(httpCodes.FORBIDDEN);
      return;
    }

    const ttaRequest = await updateTtaRequest(existing, req.body, userId);
    res.json(ttaRequest);
  } catch (error) {
    if (respondWithServiceError(res, error)) {
      return;
    }
    await handleErrors(req, res, error, logContext);
  }
}
