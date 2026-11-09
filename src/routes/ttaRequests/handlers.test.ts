import { TTA_REQUEST_STATUSES } from '@ttahub/common';
import type { Request, Response } from 'express';
import handleErrors from '../../lib/apiErrorHandler';
import { serviceError } from '../../lib/serviceError';
import SCOPES from '../../middleware/scopeConstants';
import filtersToScopes from '../../scopes';
import { setTtaRequestReadRegions } from '../../services/accessValidation';
import { currentUserId } from '../../services/currentUser';
import {
  createTtaRequest as createTtaRequestService,
  getTtaRequests as getTtaRequestsService,
  lockTtaRequest,
  reviewTtaRequest as reviewTtaRequestService,
  submitTtaRequest as submitTtaRequestService,
  ttaRequestById,
  ttaRequestReviewers,
  updateTtaRequest,
} from '../../services/ttaRequests';
import { userById } from '../../services/users';
import {
  createTtaRequest,
  getTtaRequest,
  getTtaRequestReviewers,
  getTtaRequests,
  getTtaRequestsByRecipient,
  reviewTtaRequest,
  saveTtaRequest,
  submitTtaRequest,
} from './handlers';

jest.mock('../../services/ttaRequests', () => ({
  createTtaRequest: jest.fn(),
  getTtaRequests: jest.fn(),
  lockTtaRequest: jest.fn(),
  reviewTtaRequest: jest.fn(),
  submitTtaRequest: jest.fn(),
  ttaRequestById: jest.fn(),
  ttaRequestReviewers: jest.fn(),
  updateTtaRequest: jest.fn(),
}));
jest.mock('../../services/currentUser');
jest.mock('../../services/accessValidation');
jest.mock('../../scopes');
jest.mock('../../services/users');
jest.mock('../../lib/apiErrorHandler');
jest.mock('../../logger', () => ({
  auditLogger: {
    warn: jest.fn(),
  },
}));

const CREATOR_ID = 123;

const writer = {
  id: CREATOR_ID,
  permissions: [{ scopeId: SCOPES.READ_WRITE_TTA_REQUESTS, regionId: 1 }],
};

const stranger = {
  id: 456,
  permissions: [],
};

const draft = {
  id: 1,
  regionId: 1,
  userId: CREATOR_ID,
  recipientId: null,
  status: TTA_REQUEST_STATUSES.DRAFT,
};

const mockRequestModel = (data) => ({ ...data, toJSON: () => data });

type WrappedRequest = Request & {
  inTransactionWrapper?: boolean;
  transactionCommittedCallbacks?: (() => void | Promise<void>)[];
};

// as the transaction wrapper does once the request's transaction has committed
const commit = async (request: Partial<Request>) => {
  for (const callback of (request as WrappedRequest).transactionCommittedCallbacks ?? []) {
    await callback();
  }
};

// how the service rejects grants the request can't have
const badGrants = () => serviceError(400, 'bad grants', { error: 'bad grants' });

describe('TTA request handlers', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let json: jest.Mock;
  let sendStatus: jest.Mock;
  let status: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    json = jest.fn();
    sendStatus = jest.fn();
    status = jest.fn(() => ({ json }));
    req = { params: {}, body: {} };
    res = { json, sendStatus, status };
    (currentUserId as jest.Mock).mockResolvedValue(CREATOR_ID);
    (userById as jest.Mock).mockResolvedValue(writer);
  });

  describe('getTtaRequests', () => {
    const SCOPED = [{ regionId: [1] }];
    const LIST = { count: 1, rows: [draft] };

    beforeEach(() => {
      req.query = { 'region.in': ['1'] };
      (setTtaRequestReadRegions as jest.Mock).mockResolvedValue({ 'region.in': [1] });
      (filtersToScopes as jest.Mock).mockResolvedValue({ ttaRequest: SCOPED });
    });

    it("lists the user's requests in the regions they can read", async () => {
      (getTtaRequestsService as jest.Mock).mockResolvedValue(LIST);
      await getTtaRequests(req as Request, res as Response);
      expect(setTtaRequestReadRegions).toHaveBeenCalledWith(req.query, CREATOR_ID);
      expect(filtersToScopes).toHaveBeenCalledWith({ 'region.in': [1] }, { userId: CREATOR_ID });
      expect(getTtaRequestsService).toHaveBeenCalledWith(SCOPED, CREATOR_ID);
      expect(json).toHaveBeenCalledWith(LIST);
    });

    it('hands unexpected errors to handleErrors', async () => {
      (getTtaRequestsService as jest.Mock).mockRejectedValue(new Error('boom'));
      await getTtaRequests(req as Request, res as Response);
      expect(handleErrors).toHaveBeenCalled();
    });
  });

  describe('getTtaRequestsByRecipient', () => {
    const SCOPED = [{ regionId: ['1'] }];
    const LIST = { count: 1, rows: [draft] };

    beforeEach(() => {
      req.params = { regionId: '1', recipientId: '9' };
      (filtersToScopes as jest.Mock).mockResolvedValue({ ttaRequest: SCOPED });
    });

    it("lists the user's requests for the recipient in the region", async () => {
      (getTtaRequestsService as jest.Mock).mockResolvedValue(LIST);
      await getTtaRequestsByRecipient(req as Request, res as Response);
      expect(filtersToScopes).toHaveBeenCalledWith({ 'region.in': ['1'] }, { userId: CREATOR_ID });
      expect(getTtaRequestsService).toHaveBeenCalledWith(SCOPED, CREATOR_ID, 9);
      expect(json).toHaveBeenCalledWith(LIST);
    });

    it('returns 403 without read permission in the region', async () => {
      (userById as jest.Mock).mockResolvedValue(stranger);
      await getTtaRequestsByRecipient(req as Request, res as Response);
      expect(sendStatus).toHaveBeenCalledWith(403);
      expect(getTtaRequestsService).not.toHaveBeenCalled();
    });

    it('hands unexpected errors to handleErrors', async () => {
      (getTtaRequestsService as jest.Mock).mockRejectedValue(new Error('boom'));
      await getTtaRequestsByRecipient(req as Request, res as Response);
      expect(handleErrors).toHaveBeenCalled();
    });
  });

  describe('getTtaRequestReviewers', () => {
    const REVIEWERS = [{ id: 5, name: 'Rachel Green' }];

    beforeEach(() => {
      req.params = { regionId: '1' };
    });

    it("lists the region's reviewers", async () => {
      (ttaRequestReviewers as jest.Mock).mockResolvedValue(REVIEWERS);
      await getTtaRequestReviewers(req as Request, res as Response);
      expect(ttaRequestReviewers).toHaveBeenCalledWith(1);
      expect(json).toHaveBeenCalledWith(REVIEWERS);
    });

    it('returns 403 without read permission in the region', async () => {
      (userById as jest.Mock).mockResolvedValue(stranger);
      await getTtaRequestReviewers(req as Request, res as Response);
      expect(sendStatus).toHaveBeenCalledWith(403);
      expect(ttaRequestReviewers).not.toHaveBeenCalled();
    });

    it('hands unexpected errors to handleErrors', async () => {
      (ttaRequestReviewers as jest.Mock).mockRejectedValue(new Error('boom'));
      await getTtaRequestReviewers(req as Request, res as Response);
      expect(handleErrors).toHaveBeenCalled();
    });
  });

  describe('getTtaRequest', () => {
    beforeEach(() => {
      req.params = { ttaRequestId: '1' };
    });

    it('returns the request', async () => {
      (ttaRequestById as jest.Mock).mockResolvedValue(mockRequestModel(draft));
      await getTtaRequest(req as Request, res as Response);
      expect(ttaRequestById).toHaveBeenCalledWith(1);
      expect(json).toHaveBeenCalledWith(draft);
    });

    it('returns 404 when the request does not exist', async () => {
      (ttaRequestById as jest.Mock).mockResolvedValue(null);
      await getTtaRequest(req as Request, res as Response);
      expect(sendStatus).toHaveBeenCalledWith(404);
    });

    it('returns 403 when the user cannot see the request', async () => {
      (ttaRequestById as jest.Mock).mockResolvedValue(mockRequestModel(draft));
      (userById as jest.Mock).mockResolvedValue(stranger);
      await getTtaRequest(req as Request, res as Response);
      expect(sendStatus).toHaveBeenCalledWith(403);
    });

    it('hands unexpected errors to handleErrors', async () => {
      (ttaRequestById as jest.Mock).mockRejectedValue(new Error('boom'));
      await getTtaRequest(req as Request, res as Response);
      expect(handleErrors).toHaveBeenCalled();
    });
  });

  describe('createTtaRequest', () => {
    beforeEach(() => {
      req.body = { regionId: 1, context: 'hello' };
    });

    it('creates a draft for the current user', async () => {
      (createTtaRequestService as jest.Mock).mockResolvedValue(draft);
      await createTtaRequest(req as Request, res as Response);
      expect(createTtaRequestService).toHaveBeenCalledWith(req.body, CREATOR_ID);
      expect(status).toHaveBeenCalledWith(201);
      expect(json).toHaveBeenCalledWith(draft);
    });

    it('inside the transaction wrapper, responds only once the draft has committed', async () => {
      (createTtaRequestService as jest.Mock).mockResolvedValue(draft);
      (req as WrappedRequest).inTransactionWrapper = true;
      await createTtaRequest(req as Request, res as Response);
      expect(json).not.toHaveBeenCalled();

      await commit(req);
      expect(status).toHaveBeenCalledWith(201);
      expect(json).toHaveBeenCalledWith(draft);
    });

    it('returns 403 without write permission in the region', async () => {
      req.body = { regionId: 2 };
      await createTtaRequest(req as Request, res as Response);
      expect(sendStatus).toHaveBeenCalledWith(403);
      expect(createTtaRequestService).not.toHaveBeenCalled();
    });

    it('returns 400 when the service rejects the data', async () => {
      (createTtaRequestService as jest.Mock).mockRejectedValue(badGrants());
      await createTtaRequest(req as Request, res as Response);
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ error: 'bad grants' });
      expect(handleErrors).not.toHaveBeenCalled();
    });

    it('hands unexpected errors to handleErrors', async () => {
      (createTtaRequestService as jest.Mock).mockRejectedValue(new Error('boom'));
      await createTtaRequest(req as Request, res as Response);
      expect(handleErrors).toHaveBeenCalled();
    });

    it('hands an error with a server status code to handleErrors', async () => {
      (createTtaRequestService as jest.Mock).mockRejectedValue(serviceError(500, 'boom'));
      await createTtaRequest(req as Request, res as Response);
      expect(status).not.toHaveBeenCalledWith(500);
      expect(handleErrors).toHaveBeenCalled();
    });
  });

  describe('saveTtaRequest', () => {
    beforeEach(() => {
      req.params = { ttaRequestId: '1' };
      req.body = { context: 'updated' };
    });

    it('saves the draft', async () => {
      const existing = mockRequestModel(draft);
      const saved = { ...draft, context: 'updated' };
      (ttaRequestById as jest.Mock).mockResolvedValue(existing);
      (updateTtaRequest as jest.Mock).mockResolvedValue(saved);
      await saveTtaRequest(req as Request, res as Response);
      expect(lockTtaRequest).toHaveBeenCalledWith(1);
      expect(updateTtaRequest).toHaveBeenCalledWith(existing, req.body, CREATOR_ID);
      expect(json).toHaveBeenCalledWith(saved);
    });

    it('inside the transaction wrapper, responds only once the save has committed', async () => {
      const saved = { ...draft, context: 'updated' };
      (ttaRequestById as jest.Mock).mockResolvedValue(mockRequestModel(draft));
      (updateTtaRequest as jest.Mock).mockResolvedValue(saved);
      (req as WrappedRequest).inTransactionWrapper = true;
      await saveTtaRequest(req as Request, res as Response);
      expect(json).not.toHaveBeenCalled();

      await commit(req);
      expect(json).toHaveBeenCalledWith(saved);
    });

    it('returns 404 when the request does not exist', async () => {
      (ttaRequestById as jest.Mock).mockResolvedValue(null);
      await saveTtaRequest(req as Request, res as Response);
      expect(sendStatus).toHaveBeenCalledWith(404);
    });

    it('returns 403 for someone other than the creator', async () => {
      (ttaRequestById as jest.Mock).mockResolvedValue(mockRequestModel(draft));
      (userById as jest.Mock).mockResolvedValue({ ...writer, id: 456 });
      await saveTtaRequest(req as Request, res as Response);
      expect(sendStatus).toHaveBeenCalledWith(403);
      expect(updateTtaRequest).not.toHaveBeenCalled();
    });

    it('returns 400 when the service rejects the data', async () => {
      (ttaRequestById as jest.Mock).mockResolvedValue(mockRequestModel(draft));
      (updateTtaRequest as jest.Mock).mockRejectedValue(badGrants());
      await saveTtaRequest(req as Request, res as Response);
      expect(status).toHaveBeenCalledWith(400);
    });

    it('hands unexpected errors to handleErrors', async () => {
      (ttaRequestById as jest.Mock).mockResolvedValue(mockRequestModel(draft));
      (updateTtaRequest as jest.Mock).mockRejectedValue(new Error('boom'));
      await saveTtaRequest(req as Request, res as Response);
      expect(handleErrors).toHaveBeenCalled();
    });
  });

  describe('submitTtaRequest', () => {
    beforeEach(() => {
      req.params = { ttaRequestId: '1' };
      req.body = { context: 'submitted' };
    });

    it('submits the draft', async () => {
      const existing = mockRequestModel(draft);
      const submitted = { ...draft, status: TTA_REQUEST_STATUSES.SUBMITTED };
      (ttaRequestById as jest.Mock).mockResolvedValue(existing);
      (submitTtaRequestService as jest.Mock).mockResolvedValue(submitted);
      await submitTtaRequest(req as Request, res as Response);
      expect(lockTtaRequest).toHaveBeenCalledWith(1);
      expect(submitTtaRequestService).toHaveBeenCalledWith(existing, req.body, CREATOR_ID);
      expect(json).toHaveBeenCalledWith(submitted);
    });

    it('inside the transaction wrapper, responds only once the submission has committed', async () => {
      const submitted = { ...draft, status: TTA_REQUEST_STATUSES.SUBMITTED };
      (ttaRequestById as jest.Mock).mockResolvedValue(mockRequestModel(draft));
      (submitTtaRequestService as jest.Mock).mockResolvedValue(submitted);
      (req as WrappedRequest).inTransactionWrapper = true;
      await submitTtaRequest(req as Request, res as Response);
      expect(json).not.toHaveBeenCalled();

      await commit(req);
      expect(json).toHaveBeenCalledWith(submitted);
    });

    it('returns 404 when the request does not exist', async () => {
      (ttaRequestById as jest.Mock).mockResolvedValue(null);
      await submitTtaRequest(req as Request, res as Response);
      expect(sendStatus).toHaveBeenCalledWith(404);
    });

    it('returns 403 for someone other than the creator', async () => {
      (ttaRequestById as jest.Mock).mockResolvedValue(mockRequestModel(draft));
      (userById as jest.Mock).mockResolvedValue({ ...writer, id: 456 });
      await submitTtaRequest(req as Request, res as Response);
      expect(sendStatus).toHaveBeenCalledWith(403);
      expect(submitTtaRequestService).not.toHaveBeenCalled();
    });

    it('returns 403 once the request is already submitted', async () => {
      (ttaRequestById as jest.Mock).mockResolvedValue(
        mockRequestModel({ ...draft, status: TTA_REQUEST_STATUSES.SUBMITTED })
      );
      await submitTtaRequest(req as Request, res as Response);
      expect(sendStatus).toHaveBeenCalledWith(403);
      expect(submitTtaRequestService).not.toHaveBeenCalled();
    });

    it('returns 400 when the service rejects the data', async () => {
      (ttaRequestById as jest.Mock).mockResolvedValue(mockRequestModel(draft));
      (submitTtaRequestService as jest.Mock).mockRejectedValue(serviceError(400, 'no citations'));
      await submitTtaRequest(req as Request, res as Response);
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ error: 'no citations' });
    });

    it('rethrows rejected data inside the transaction wrapper so the save rolls back', async () => {
      (ttaRequestById as jest.Mock).mockResolvedValue(mockRequestModel(draft));
      (submitTtaRequestService as jest.Mock).mockRejectedValue(serviceError(400, 'no citations'));
      (req as WrappedRequest).inTransactionWrapper = true;
      await expect(submitTtaRequest(req as Request, res as Response)).rejects.toMatchObject({
        statusCode: 400,
        responseBody: { error: 'no citations' },
      });
      expect(status).not.toHaveBeenCalled();
    });

    it('hands unexpected errors to handleErrors', async () => {
      (ttaRequestById as jest.Mock).mockResolvedValue(mockRequestModel(draft));
      (submitTtaRequestService as jest.Mock).mockRejectedValue(new Error('boom'));
      await submitTtaRequest(req as Request, res as Response);
      expect(handleErrors).toHaveBeenCalled();
    });
  });

  describe('reviewTtaRequest', () => {
    const REVIEWER_ID = 789;
    const reviewer = {
      id: REVIEWER_ID,
      permissions: [{ scopeId: SCOPES.REVIEW_TTA_REQUESTS, regionId: 1 }],
    };
    const submitted = {
      ...draft,
      reviewerId: REVIEWER_ID,
      status: TTA_REQUEST_STATUSES.SUBMITTED,
    };

    beforeEach(() => {
      req.params = { ttaRequestId: '1' };
      req.body = { status: 'needs_action', note: 'Add the agenda' };
      (currentUserId as jest.Mock).mockResolvedValue(REVIEWER_ID);
      (userById as jest.Mock).mockResolvedValue(reviewer);
    });

    it('sends the request back for changes', async () => {
      const existing = mockRequestModel(submitted);
      const reviewed = { ...submitted, status: TTA_REQUEST_STATUSES.NEEDS_ACTION };
      (ttaRequestById as jest.Mock).mockResolvedValue(existing);
      (reviewTtaRequestService as jest.Mock).mockResolvedValue(reviewed);
      await reviewTtaRequest(req as Request, res as Response);
      expect(lockTtaRequest).toHaveBeenCalledWith(1);
      expect(reviewTtaRequestService).toHaveBeenCalledWith(existing, req.body, REVIEWER_ID);
      expect(json).toHaveBeenCalledWith(reviewed);
    });

    it('inside the transaction wrapper, responds only once the review has committed', async () => {
      const reviewed = { ...submitted, status: TTA_REQUEST_STATUSES.NEEDS_ACTION };
      (ttaRequestById as jest.Mock).mockResolvedValue(mockRequestModel(submitted));
      (reviewTtaRequestService as jest.Mock).mockResolvedValue(reviewed);
      (req as WrappedRequest).inTransactionWrapper = true;
      await reviewTtaRequest(req as Request, res as Response);
      expect(json).not.toHaveBeenCalled();

      await commit(req);
      expect(json).toHaveBeenCalledWith(reviewed);
    });

    it('returns 404 when the request does not exist', async () => {
      (ttaRequestById as jest.Mock).mockResolvedValue(null);
      await reviewTtaRequest(req as Request, res as Response);
      expect(sendStatus).toHaveBeenCalledWith(404);
    });

    it('returns 403 for someone other than the reviewer', async () => {
      (ttaRequestById as jest.Mock).mockResolvedValue(mockRequestModel(submitted));
      (userById as jest.Mock).mockResolvedValue({ ...reviewer, id: 456 });
      await reviewTtaRequest(req as Request, res as Response);
      expect(sendStatus).toHaveBeenCalledWith(403);
      expect(reviewTtaRequestService).not.toHaveBeenCalled();
    });

    it('returns 403 once the request has been sent back', async () => {
      (ttaRequestById as jest.Mock).mockResolvedValue(
        mockRequestModel({ ...submitted, status: TTA_REQUEST_STATUSES.NEEDS_ACTION })
      );
      await reviewTtaRequest(req as Request, res as Response);
      expect(sendStatus).toHaveBeenCalledWith(403);
      expect(reviewTtaRequestService).not.toHaveBeenCalled();
    });

    it('returns 400 when the service rejects the review', async () => {
      (ttaRequestById as jest.Mock).mockResolvedValue(mockRequestModel(submitted));
      (reviewTtaRequestService as jest.Mock).mockRejectedValue(
        serviceError(400, 'not the reviewer', { error: 'not the reviewer' })
      );
      await reviewTtaRequest(req as Request, res as Response);
      expect(status).toHaveBeenCalledWith(400);
    });

    it('hands unexpected errors to handleErrors', async () => {
      (ttaRequestById as jest.Mock).mockResolvedValue(mockRequestModel(submitted));
      (reviewTtaRequestService as jest.Mock).mockRejectedValue(new Error('boom'));
      await reviewTtaRequest(req as Request, res as Response);
      expect(handleErrors).toHaveBeenCalled();
    });
  });
});
