import type { Request, Response } from 'express';
import httpCodes from 'http-codes';
import handleErrors from '../../lib/apiErrorHandler';
import { respondWithServiceError } from '../../lib/serviceError';
import TtaRequestPolicy from '../../policies/ttaRequest';
import filtersToScopes from '../../scopes';
import { setTtaRequestReadRegions } from '../../services/accessValidation';
import { currentUserId } from '../../services/currentUser';
import {
  createTtaRequest as createTtaRequestService,
  getTtaRequests as getTtaRequestsService,
  lockTtaRequest,
  reviewTtaRequest as reviewTtaRequestService,
  submitTtaRequest as submitTtaRequestService,
  ttaRequestApprovingCors,
  ttaRequestAssignableStaff,
  ttaRequestById,
  ttaRequestReviewers,
  updateTtaRequest,
} from '../../services/ttaRequests';
import { userById } from '../../services/users';
import { onTransactionCommitted } from '../transactionWrapper';

const namespace = 'SERVICE:TTA_REQUESTS';

const logContext = {
  namespace,
};

/**
 * The form reads the request, or the list it is in, again as soon as it has a write's
 * response, so inside the transaction wrapper the response waits until the write has
 * committed; sent before, those reads could still see the request as it was
 */
function respondOnceCommitted(req: Request, respond: () => void) {
  if ((req as Request & { inTransactionWrapper?: boolean }).inTransactionWrapper) {
    onTransactionCommitted(req, respond);
    return;
  }
  respond();
}

export async function getTtaRequests(req: Request, res: Response) {
  try {
    const userId = await currentUserId(req, res);
    // filter the query so that only regions the user has permission to are included
    const query = await setTtaRequestReadRegions(req.query, userId);
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

export async function getTtaRequestReviewers(req: Request, res: Response) {
  try {
    const { regionId } = req.params;
    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const authorization = new TtaRequestPolicy(user, Number(regionId));

    if (!authorization.canGet()) {
      res.sendStatus(httpCodes.FORBIDDEN);
      return;
    }

    const reviewers = await ttaRequestReviewers(Number(regionId));
    res.json(reviewers);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function getTtaRequestAssignableStaff(req: Request, res: Response) {
  try {
    const { regionId } = req.params;
    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const authorization = new TtaRequestPolicy(user, Number(regionId));

    if (!authorization.canGet()) {
      res.sendStatus(httpCodes.FORBIDDEN);
      return;
    }

    const staff = await ttaRequestAssignableStaff(Number(regionId));
    res.json(staff);
  } catch (error) {
    await handleErrors(req, res, error, logContext);
  }
}

export async function getTtaRequestApprovers(req: Request, res: Response) {
  try {
    const { regionId } = req.params;
    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const authorization = new TtaRequestPolicy(user, Number(regionId));

    if (!authorization.canGet()) {
      res.sendStatus(httpCodes.FORBIDDEN);
      return;
    }

    const approvers = await ttaRequestApprovingCors(Number(regionId));
    res.json(approvers);
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
    respondOnceCommitted(req, () => res.status(httpCodes.CREATED).json(ttaRequest));
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
    await lockTtaRequest(Number(ttaRequestId));
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

    // the reviewer edits the request's details, but not who reviews it or the creator's notes
    const { reviewerId: _reviewerId, creatorNotes: _creatorNotes, ...details } = req.body;
    const data = authorization.canReviewerEdit() ? details : req.body;

    const ttaRequest = await updateTtaRequest(existing, data, userId);
    respondOnceCommitted(req, () => res.json(ttaRequest));
  } catch (error) {
    if (respondWithServiceError(res, error)) {
      return;
    }
    await handleErrors(req, res, error, logContext);
  }
}

export async function submitTtaRequest(req: Request, res: Response) {
  try {
    const { ttaRequestId } = req.params;
    await lockTtaRequest(Number(ttaRequestId));
    const existing = await ttaRequestById(Number(ttaRequestId));

    if (!existing) {
      res.sendStatus(httpCodes.NOT_FOUND);
      return;
    }

    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const authorization = new TtaRequestPolicy(user, existing.regionId, existing);

    // only the creator's draft, or a request sent back to them, can be submitted
    if (!authorization.canSubmit()) {
      res.sendStatus(httpCodes.FORBIDDEN);
      return;
    }

    const ttaRequest = await submitTtaRequestService(existing, req.body, userId);
    respondOnceCommitted(req, () => res.json(ttaRequest));
  } catch (error) {
    // Errors that set their own statusCode are deliberate client responses
    if (error?.statusCode) {
      const responseBody = error.responseBody ?? { error: error.message };
      // the draft was saved before the check failed, so the wrapper must roll it back
      // before it sends the response
      if ((req as Request & { inTransactionWrapper?: boolean }).inTransactionWrapper) {
        throw Object.assign(error, { responseBody });
      }
      res.status(error.statusCode).json(responseBody);
      return;
    }
    await handleErrors(req, res, error, logContext);
  }
}

export async function reviewTtaRequest(req: Request, res: Response) {
  try {
    const { ttaRequestId } = req.params;
    await lockTtaRequest(Number(ttaRequestId));
    const existing = await ttaRequestById(Number(ttaRequestId));

    if (!existing) {
      res.sendStatus(httpCodes.NOT_FOUND);
      return;
    }

    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const authorization = new TtaRequestPolicy(user, existing.regionId, existing);

    if (!authorization.canReview()) {
      res.sendStatus(httpCodes.FORBIDDEN);
      return;
    }

    const ttaRequest = await reviewTtaRequestService(existing, req.body, userId);
    respondOnceCommitted(req, () => res.json(ttaRequest));
  } catch (error) {
    // the service rejects a review before it writes anything, so there is nothing for the
    // wrapper to roll back, unlike a submission
    if (respondWithServiceError(res, error)) {
      return;
    }
    await handleErrors(req, res, error, logContext);
  }
}
