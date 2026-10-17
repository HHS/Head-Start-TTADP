import { TTA_REQUEST_STATUSES } from '@ttahub/common';
import type { Request, Response } from 'express';
import handleErrors from '../../lib/apiErrorHandler';
import { serviceError } from '../../lib/serviceError';
import SCOPES from '../../middleware/scopeConstants';
import filtersToScopes from '../../scopes';
import { setReadRegions } from '../../services/accessValidation';
import { currentUserId } from '../../services/currentUser';
import {
  createTtaRequest as createTtaRequestService,
  getTtaRequests as getTtaRequestsService,
  submitTtaRequest as submitTtaRequestService,
  ttaRequestById,
  updateTtaRequest,
} from '../../services/ttaRequests';
import { userById } from '../../services/users';
import {
  createTtaRequest,
  getTtaRequest,
  getTtaRequests,
  getTtaRequestsByRecipient,
  saveTtaRequest,
  submitTtaRequest,
} from './handlers';

jest.mock('../../services/ttaRequests', () => ({
  createTtaRequest: jest.fn(),
  getTtaRequests: jest.fn(),
  submitTtaRequest: jest.fn(),
  ttaRequestById: jest.fn(),
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
  permissions: [{ scopeId: SCOPES.READ_WRITE_REPORTS, regionId: 1 }],
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
      (setReadRegions as jest.Mock).mockResolvedValue({ 'region.in': [1] });
      (filtersToScopes as jest.Mock).mockResolvedValue({ ttaRequest: SCOPED });
    });

    it("lists the user's requests in the regions they can read", async () => {
      (getTtaRequestsService as jest.Mock).mockResolvedValue(LIST);
      await getTtaRequests(req as Request, res as Response);
      expect(setReadRegions).toHaveBeenCalledWith(req.query, CREATOR_ID);
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
      expect(updateTtaRequest).toHaveBeenCalledWith(existing, req.body, CREATOR_ID);
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
      expect(submitTtaRequestService).toHaveBeenCalledWith(existing, req.body, CREATOR_ID);
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
    });

    it('hands unexpected errors to handleErrors', async () => {
      (ttaRequestById as jest.Mock).mockResolvedValue(mockRequestModel(draft));
      (submitTtaRequestService as jest.Mock).mockRejectedValue(new Error('boom'));
      await submitTtaRequest(req as Request, res as Response);
      expect(handleErrors).toHaveBeenCalled();
    });
  });
});
