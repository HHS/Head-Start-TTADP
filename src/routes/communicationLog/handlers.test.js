import httpCodes from 'http-codes';
import { Op } from 'sequelize';
import SCOPES from '../../middleware/scopeConstants';
import { GoalTemplate, Grant, Group, Recipient, sequelize, User } from '../../models';
import {
  getUserReadRegions,
  setTrainingAndActivityReportReadRegions,
} from '../../services/accessValidation';
import {
  createLog,
  csvLogsByRecipientAndScopes,
  csvLogsByScopes,
  deleteLog,
  logById,
  logsByRecipientAndScopes,
  logsByScopes,
  recipientsInRegion,
  updateLog,
} from '../../services/communicationLog';
import { currentUserId } from '../../services/currentUser';
import { userById, usersByRoles } from '../../services/users';
import {
  communicationLogAdditionalData,
  communicationLogById,
  communicationLogs,
  communicationLogsByRecipientId,
  createLogByRecipientId,
  createLogByRegionId,
  deleteLogById,
  getAvailableUsersRecipientsAndGoals,
  updateLogById,
} from './handlers';

jest.mock('../../services/currentUser');
jest.mock('../../services/users');
jest.mock('../../services/communicationLog');
jest.mock('../../services/accessValidation');
jest.mock('../../logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
  auditLogger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
  requestLogger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));
jest.mock('../../models', () => ({
  User: {
    findAll: jest.fn(),
  },
  GoalTemplate: {
    findAll: jest.fn(),
  },
  Recipient: {
    findAll: jest.fn(),
  },
  Grant: {},
  sequelize: {
    close: jest.fn(),
    col: jest.fn(),
  },
  Group: {
    findAll: jest.fn(),
  },
}));

describe('communicationLog handlers', () => {
  const REGION_ID = 15;

  const authorizedToCreate = {
    id: 1,
    permissions: [
      {
        regionId: REGION_ID,
        scopeId: SCOPES.READ_WRITE_REPORTS,
      },
    ],
  };

  const authorizedToReadOnly = {
    id: 2,
    permissions: [
      {
        regionId: REGION_ID,
        scopeId: SCOPES.READ_REPORTS,
      },
    ],
  };

  const unauthorized = {
    id: 3,
    permissions: [],
  };

  const centralOffice = {
    id: 5,
    homeRegionId: 14,
    permissions: [],
  };

  const admin = {
    id: 4,
    permissions: [
      {
        regionId: 200,
        scopeId: SCOPES.ADMIN,
      },
    ],
  };

  const statusJson = jest.fn();
  const send = jest.fn();

  const mockResponse = {
    sendStatus: jest.fn(),
    end: jest.fn(),
    send,
    status: jest.fn(() => ({
      end: jest.fn(),
      json: statusJson,
      send: jest.fn(),
    })),
    type: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    currentUserId.mockImplementation(async (req) => req.session.userId);
  });

  afterAll(() => sequelize.close());
  describe('communicationLogById', () => {
    afterEach(async () => {
      jest.restoreAllMocks();
    });
    it('success', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToReadOnly.id,
        },
        params: {
          id: 1,
          regionId: REGION_ID,
        },
      };
      userById.mockImplementation(() => Promise.resolve(authorizedToReadOnly));
      logById.mockImplementation(() => Promise.resolve({ id: 1 }));
      await communicationLogById(mockRequest, { ...mockResponse });
      expect(statusJson).toHaveBeenCalledWith({ id: 1 });
    });

    it('rejects a log saved under a region the user cannot read', async () => {
      const mockRequest = {
        session: { userId: authorizedToReadOnly.id },
        params: { id: 1, regionId: REGION_ID },
      };
      userById.mockResolvedValue(authorizedToReadOnly);
      logById.mockResolvedValue({ id: 1, data: { regionId: REGION_ID + 1 } });
      await communicationLogById(mockRequest, { ...mockResponse });
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
      expect(statusJson).not.toHaveBeenCalled();
    });

    it('returns a log saved under a region the user can read', async () => {
      const mockRequest = {
        session: { userId: authorizedToReadOnly.id },
        params: { id: 1, regionId: REGION_ID },
      };
      const log = { id: 1, data: { regionId: REGION_ID } };
      userById.mockResolvedValue(authorizedToReadOnly);
      logById.mockResolvedValue(log);
      await communicationLogById(mockRequest, { ...mockResponse });
      expect(statusJson).toHaveBeenCalledWith(log);
    });

    it('unauthorized', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToReadOnly.id,
        },
        params: {
          id: 1,
          regionId: REGION_ID,
        },
      };
      userById.mockImplementation(() => Promise.resolve(unauthorized));
      logById.mockImplementation(() => Promise.resolve({ id: 2 }));
      await communicationLogById(mockRequest, { ...mockResponse });
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });

    it('error', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToReadOnly.id,
        },
        params: {
          id: 1,
          regionId: REGION_ID,
        },
      };
      userById.mockImplementation(() => Promise.resolve(authorizedToReadOnly));
      logById.mockRejectedValue(new Error('error'));
      await communicationLogById(mockRequest, { ...mockResponse });
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });

    it('admin', async () => {
      const mockRequest = {
        session: {
          userId: admin.id,
        },
        params: {
          id: 1,
          regionId: REGION_ID,
        },
      };
      userById.mockImplementation(() => Promise.resolve(admin));
      logById.mockImplementation(() => Promise.resolve({ id: 1 }));
      await communicationLogById(mockRequest, { ...mockResponse });
      expect(statusJson).toHaveBeenCalledWith({ id: 1 });
    });
  });
  describe('communicationLogsByRecipientId', () => {
    afterEach(async () => {
      jest.restoreAllMocks();
    });
    it('success', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToReadOnly.id,
        },
        params: {
          id: 1,
          regionId: REGION_ID,
        },
        query: {
          offset: 0,
          sortyBy: 'communicationDate',
          direction: 'asc',
        },
      };
      setTrainingAndActivityReportReadRegions.mockImplementation(() => Promise.resolve({}));
      userById.mockImplementation(() => Promise.resolve(authorizedToReadOnly));
      logsByRecipientAndScopes.mockImplementation(() => Promise.resolve([{ id: 1 }]));
      await communicationLogsByRecipientId(mockRequest, { ...mockResponse });
      expect(statusJson).toHaveBeenCalledWith([{ id: 1 }]);
    });

    it('with limit', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToReadOnly.id,
        },
        params: {
          id: 1,
          regionId: REGION_ID,
        },
        query: {
          offset: 0,
          sortyBy: 'communicationDate',
          direction: 'asc',
          limit: '20',
        },
      };
      setTrainingAndActivityReportReadRegions.mockImplementation(() => Promise.resolve({}));
      userById.mockImplementation(() => Promise.resolve(authorizedToReadOnly));
      logsByRecipientAndScopes.mockImplementation(() => Promise.resolve([{ id: 1 }]));
      await communicationLogsByRecipientId(mockRequest, { ...mockResponse });
      expect(statusJson).toHaveBeenCalledWith([{ id: 1 }]);
    });

    it('csv', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToReadOnly.id,
        },
        params: {
          id: 1,
          regionId: REGION_ID,
        },
        query: {
          offset: 0,
          sortyBy: 'communicationDate',
          direction: 'asc',
          format: 'csv',
        },
      };
      setTrainingAndActivityReportReadRegions.mockImplementation(() => Promise.resolve({}));
      userById.mockImplementation(() => Promise.resolve(authorizedToReadOnly));
      csvLogsByRecipientAndScopes.mockImplementation(() => Promise.resolve('id\n1'));
      await communicationLogsByRecipientId(mockRequest, { ...mockResponse });
      expect(send).toHaveBeenCalledWith('id\n1');
    });

    it('unauthorized', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToReadOnly.id,
        },
        params: {
          id: 1,
          regionId: REGION_ID,
        },
        query: {
          offset: 0,
          sortyBy: 'communicationDate',
          direction: 'asc',
        },
      };
      userById.mockImplementation(() => Promise.resolve(unauthorized));
      setTrainingAndActivityReportReadRegions.mockImplementation(() => Promise.resolve({}));
      await communicationLogsByRecipientId(mockRequest, { ...mockResponse });
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });

    it('error', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToReadOnly.id,
        },
        params: {
          id: 1,
          regionId: REGION_ID,
        },
        query: {
          offset: 0,
          sortyBy: 'communicationDate',
          direction: 'asc',
        },
      };
      userById.mockImplementation(() => Promise.resolve(authorizedToReadOnly));
      logsByRecipientAndScopes.mockRejectedValue(new Error('error'));
      setTrainingAndActivityReportReadRegions.mockImplementation(() => Promise.resolve({}));
      await communicationLogsByRecipientId(mockRequest, { ...mockResponse });
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });

    it('admin', async () => {
      const mockRequest = {
        session: {
          userId: admin.id,
        },
        params: {
          id: 1,
          regionId: REGION_ID,
        },
        query: {
          offset: 0,
          sortyBy: 'communicationDate',
          direction: 'asc',
        },
      };
      userById.mockImplementation(() => Promise.resolve(admin));
      logsByRecipientAndScopes.mockImplementation(() => Promise.resolve([{ id: 1 }]));
      setTrainingAndActivityReportReadRegions.mockImplementation(() => Promise.resolve({}));
      await communicationLogsByRecipientId(mockRequest, { ...mockResponse });
      expect(statusJson).toHaveBeenCalledWith([{ id: 1 }]);
    });
  });

  describe('communicationLogs', () => {
    afterEach(async () => {
      jest.restoreAllMocks();
    });
    it('success', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToReadOnly.id,
        },
        params: {
          regionId: REGION_ID,
        },
        query: {
          offset: 0,
          sortyBy: 'communicationDate',
          direction: 'asc',
        },
      };
      setTrainingAndActivityReportReadRegions.mockImplementation(() => Promise.resolve({}));
      userById.mockImplementation(() => Promise.resolve(authorizedToReadOnly));
      logsByScopes.mockImplementation(() => Promise.resolve([{ id: 1 }]));
      await communicationLogs(mockRequest, { ...mockResponse });
      expect(statusJson).toHaveBeenCalledWith([{ id: 1 }]);
    });

    it('with limit', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToReadOnly.id,
        },
        params: {
          regionId: REGION_ID,
        },
        query: {
          offset: 0,
          sortyBy: 'communicationDate',
          direction: 'asc',
          limit: '20',
        },
      };
      setTrainingAndActivityReportReadRegions.mockImplementation(() => Promise.resolve({}));
      userById.mockImplementation(() => Promise.resolve(authorizedToReadOnly));
      logsByScopes.mockImplementation(() => Promise.resolve([{ id: 1 }]));
      await communicationLogs(mockRequest, { ...mockResponse });
      expect(statusJson).toHaveBeenCalledWith([{ id: 1 }]);
    });

    it('csv', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToReadOnly.id,
        },
        params: {
          regionId: REGION_ID,
        },
        query: {
          offset: 0,
          sortyBy: 'communicationDate',
          direction: 'asc',
          format: 'csv',
        },
      };
      setTrainingAndActivityReportReadRegions.mockImplementation(() => Promise.resolve({}));
      userById.mockImplementation(() => Promise.resolve(authorizedToReadOnly));
      csvLogsByScopes.mockImplementation(() => Promise.resolve('id\n1'));
      await communicationLogs(mockRequest, { ...mockResponse });
      expect(send).toHaveBeenCalledWith('id\n1');
    });

    it('error', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToReadOnly.id,
        },
        params: {
          regionId: REGION_ID,
        },
        query: {
          offset: 0,
          sortyBy: 'communicationDate',
          direction: 'asc',
        },
      };
      userById.mockImplementation(() => Promise.resolve(authorizedToReadOnly));
      logsByScopes.mockRejectedValue(new Error('error'));
      setTrainingAndActivityReportReadRegions.mockImplementation(() => Promise.resolve({}));
      await communicationLogs(mockRequest, { ...mockResponse });
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });

    it('admin', async () => {
      const mockRequest = {
        session: {
          userId: admin.id,
        },
        params: {
          regionId: REGION_ID,
        },
        query: {
          offset: 0,
          sortyBy: 'communicationDate',
          direction: 'asc',
        },
      };
      userById.mockImplementation(() => Promise.resolve(admin));
      logsByScopes.mockImplementation(() => Promise.resolve([{ id: 1 }]));
      setTrainingAndActivityReportReadRegions.mockImplementation(() => Promise.resolve({}));
      await communicationLogs(mockRequest, { ...mockResponse });
      expect(statusJson).toHaveBeenCalledWith([{ id: 1 }]);
    });
  });

  describe.each([
    ['recipient route', createLogByRecipientId],
    ['region route', createLogByRegionId],
  ])('creation region binding: %s', (_name, handler) => {
    beforeEach(() => {
      userById.mockResolvedValue(authorizedToCreate);
      recipientsInRegion.mockResolvedValue(true);
      createLog.mockResolvedValue({ id: 1 });
    });

    it.each([{ recipients: [{ value: 1 }] }, { recipients: [] }, {}])(
      'rejects a forged body region before writing, including empty recipients: %j',
      async (data) => {
        await handler(
          {
            session: { userId: authorizedToCreate.id },
            params: { regionId: String(REGION_ID), recipientId: '1' },
            body: { data: { ...data, regionId: REGION_ID + 1 } },
          },
          mockResponse
        );
        expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
        expect(createLog).not.toHaveBeenCalled();
        expect(statusJson).not.toHaveBeenCalled();
      }
    );

    it.each([REGION_ID, String(REGION_ID), undefined])(
      'persists the authorized URL region for body region %s',
      async (regionId) => {
        await handler(
          {
            session: { userId: authorizedToCreate.id },
            params: { regionId: String(REGION_ID), recipientId: '1' },
            body: { data: { regionId, recipients: [{ value: 1 }], message: 'test' } },
          },
          mockResponse
        );
        expect(createLog).toHaveBeenCalledWith(
          expect.any(Array),
          authorizedToCreate.id,
          expect.objectContaining({ regionId: REGION_ID, message: 'test' })
        );
        expect(statusJson).toHaveBeenCalledWith({ id: 1 });
      }
    );

    it.each([null, '15junk', [REGION_ID]])('rejects malformed body region %j', async (regionId) => {
      await handler(
        {
          session: { userId: authorizedToCreate.id },
          params: { regionId: String(REGION_ID), recipientId: '1' },
          body: { data: { regionId } },
        },
        mockResponse
      );
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
      expect(createLog).not.toHaveBeenCalled();
    });
  });

  describe('createLogByRecipientId', () => {
    beforeEach(() => {
      recipientsInRegion.mockResolvedValue(true);
    });

    it('rejects recipients outside the requested region before writing', async () => {
      recipientsInRegion.mockResolvedValue(false);
      userById.mockResolvedValue(authorizedToCreate);
      const req = {
        session: { userId: authorizedToCreate.id },
        params: { regionId: REGION_ID, recipientId: 10 },
        body: { data: { recipients: [{ value: 10 }, { value: 20 }] } },
      };
      await createLogByRecipientId(req, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
      expect(createLog).not.toHaveBeenCalled();
      expect(statusJson).not.toHaveBeenCalled();
    });

    afterEach(async () => {
      jest.restoreAllMocks();
    });

    it('success', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToCreate.id,
        },
        params: {
          id: 1,
          recipientId: 1,
          regionId: REGION_ID,
        },
        body: {
          data: {
            recipientId: 1,
            message: 'test',
          },
        },
      };
      userById.mockImplementation(() => Promise.resolve(authorizedToCreate));
      createLog.mockImplementation(() => Promise.resolve({ id: 1 }));
      await createLogByRecipientId(mockRequest, { ...mockResponse });
      expect(statusJson).toHaveBeenCalledWith({ id: 1 });
      expect(recipientsInRegion).toHaveBeenCalledWith([1], REGION_ID);
    });

    it('unauthorized', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToReadOnly.id,
        },
        params: {
          id: 1,
          recipientId: 1,
          regionId: REGION_ID,
        },
        body: {
          message: 'test',
        },
      };
      userById.mockImplementation(() => Promise.resolve(authorizedToReadOnly));
      await createLogByRecipientId(mockRequest, { ...mockResponse });
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });

    it('error', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToCreate.id,
        },
        params: {
          id: 1,
          recipientId: 1,
          regionId: REGION_ID,
        },
        body: {
          message: 'test',
        },
      };
      userById.mockImplementation(() => Promise.resolve(authorizedToCreate));
      createLog.mockRejectedValue(new Error('error'));
      await createLogByRecipientId(mockRequest, { ...mockResponse });
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });

    it('admin', async () => {
      const mockRequest = {
        session: {
          userId: admin.id,
        },
        params: {
          id: 1,
          recipientId: 1,
          regionId: REGION_ID,
        },
        body: {
          message: 'test',
        },
      };
      userById.mockImplementation(() => Promise.resolve(admin));
      createLog.mockImplementation(() => Promise.resolve({ id: 1 }));
      await createLogByRecipientId(mockRequest, { ...mockResponse });
      expect(statusJson).toHaveBeenCalledWith({ id: 1 });
    });
  });

  describe('updateLogById', () => {
    afterEach(() => jest.restoreAllMocks());

    it('returns not found when log does not exist', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToCreate.id,
        },
        params: {
          id: 1,
          regionId: REGION_ID,
        },
        body: {
          data: {
            recipientId: 1,
            message: 'test',
          },
        },
      };
      userById.mockImplementation(() => Promise.resolve(authorizedToCreate));
      logById.mockResolvedValue(null);

      await updateLogById(mockRequest, { ...mockResponse });

      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.NOT_FOUND);
      expect(updateLog).not.toHaveBeenCalled();
    });

    it('success', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToCreate.id,
        },
        params: {
          id: 1,
          regionId: REGION_ID,
        },
        body: {
          data: {
            recipientId: 1,
            message: 'test',
          },
        },
      };
      userById.mockImplementation(() => Promise.resolve(authorizedToCreate));
      logById.mockImplementation(() => Promise.resolve({ id: 1, userId: authorizedToCreate.id }));
      updateLog.mockImplementation(() => Promise.resolve({ id: 1 }));
      await updateLogById(mockRequest, { ...mockResponse });
      expect(statusJson).toHaveBeenCalledWith({ id: 1 });
    });

    describe('region and recipient authorization', () => {
      const SAVED_REGION_ID = 3;
      const multiRegionCreator = {
        id: 1,
        permissions: [
          { regionId: SAVED_REGION_ID, scopeId: SCOPES.READ_WRITE_REPORTS },
          { regionId: REGION_ID, scopeId: SCOPES.READ_WRITE_REPORTS },
        ],
      };
      const request = (user, data) => ({
        session: { userId: user.id },
        params: { id: 1, regionId: REGION_ID },
        body: { data },
      });
      const savedLog = (data, recipients = []) => ({
        id: 1,
        userId: multiRegionCreator.id,
        recipients,
        data,
      });

      beforeEach(() => {
        recipientsInRegion.mockResolvedValue(false);
        updateLog.mockResolvedValue({ id: 1 });
      });

      it('keeps the saved region when an update submits a different one', async () => {
        userById.mockResolvedValue(multiRegionCreator);
        logById.mockResolvedValue(savedLog({ regionId: SAVED_REGION_ID }));
        await updateLogById(request(multiRegionCreator, { message: 'x', regionId: 99 }), {
          ...mockResponse,
        });
        expect(updateLog).toHaveBeenCalledWith(1, { message: 'x', regionId: SAVED_REGION_ID });
      });

      it('does not add a region to a log that has none', async () => {
        userById.mockResolvedValue(multiRegionCreator);
        logById.mockResolvedValue(savedLog({}));
        await updateLogById(request(multiRegionCreator, { message: 'x', regionId: 99 }), {
          ...mockResponse,
        });
        expect(updateLog).toHaveBeenCalledWith(1, { message: 'x' });
      });

      it('rejects a new recipient from another writable region', async () => {
        userById.mockResolvedValue(multiRegionCreator);
        logById.mockResolvedValue(savedLog({ regionId: SAVED_REGION_ID }));
        await updateLogById(
          request(multiRegionCreator, { recipients: [{ value: 99 }], message: 'x' }),
          { ...mockResponse }
        );
        expect(recipientsInRegion).toHaveBeenCalledWith([99], [SAVED_REGION_ID]);
        expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
        expect(updateLog).not.toHaveBeenCalled();
      });

      it('rejects new recipients when the user cannot write in the saved region', async () => {
        recipientsInRegion.mockResolvedValue(true);
        const creatorWithoutSavedRegionAccess = {
          id: 1,
          permissions: [{ regionId: REGION_ID, scopeId: SCOPES.READ_WRITE_REPORTS }],
        };
        userById.mockResolvedValue(creatorWithoutSavedRegionAccess);
        logById.mockResolvedValue(savedLog({ regionId: SAVED_REGION_ID }));
        await updateLogById(
          request(creatorWithoutSavedRegionAccess, { recipients: [{ value: 5 }], message: 'x' }),
          { ...mockResponse }
        );
        expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
        expect(updateLog).not.toHaveBeenCalled();
      });

      it('lets a creator without saved region access edit without adding recipients', async () => {
        const creatorWithoutSavedRegionAccess = {
          id: 1,
          permissions: [{ regionId: REGION_ID, scopeId: SCOPES.READ_WRITE_REPORTS }],
        };
        userById.mockResolvedValue(creatorWithoutSavedRegionAccess);
        logById.mockResolvedValue(savedLog({ regionId: SAVED_REGION_ID }, [{ id: 5 }]));
        await updateLogById(
          request(creatorWithoutSavedRegionAccess, { recipients: [{ value: 5 }], message: 'x' }),
          { ...mockResponse }
        );
        expect(recipientsInRegion).not.toHaveBeenCalled();
        expect(updateLog).toHaveBeenCalled();
      });

      it('accepts a new recipient in the saved region', async () => {
        recipientsInRegion.mockResolvedValue(true);
        userById.mockResolvedValue(multiRegionCreator);
        logById.mockResolvedValue(savedLog({ regionId: SAVED_REGION_ID }));
        await updateLogById(
          request(multiRegionCreator, { recipients: [{ value: 5 }], message: 'x' }),
          { ...mockResponse }
        );
        expect(recipientsInRegion).toHaveBeenCalledWith([5], [SAVED_REGION_ID]);
        expect(updateLog).toHaveBeenCalled();
      });

      it('checks new recipients against the saved region for admins too', async () => {
        userById.mockResolvedValue(admin);
        logById.mockResolvedValue(savedLog({ regionId: SAVED_REGION_ID }));
        await updateLogById(request(admin, { recipients: [{ value: 99 }], message: 'x' }), {
          ...mockResponse,
        });
        expect(recipientsInRegion).toHaveBeenCalledWith([99], [SAVED_REGION_ID]);
        expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
      });

      it('does not recheck recipients the log already has', async () => {
        userById.mockResolvedValue(multiRegionCreator);
        logById.mockResolvedValue(
          savedLog({ regionId: SAVED_REGION_ID }, [{ id: 99 }, { id: 5 }])
        );
        await updateLogById(
          request(multiRegionCreator, { recipients: [{ value: 99 }, { value: 5 }], message: 'x' }),
          { ...mockResponse }
        );
        expect(recipientsInRegion).not.toHaveBeenCalled();
        expect(updateLog).toHaveBeenCalled();
      });

      it('only checks the new recipients when some are already on the log', async () => {
        recipientsInRegion.mockResolvedValue(true);
        userById.mockResolvedValue(multiRegionCreator);
        logById.mockResolvedValue(savedLog({ regionId: SAVED_REGION_ID }, [{ id: 99 }]));
        await updateLogById(
          request(multiRegionCreator, { recipients: [{ value: 99 }, { value: 5 }], message: 'x' }),
          { ...mockResponse }
        );
        expect(recipientsInRegion).toHaveBeenCalledWith([5], [SAVED_REGION_ID]);
      });

      it('falls back to the writable regions for a log with no saved region', async () => {
        userById.mockResolvedValue(multiRegionCreator);
        logById.mockResolvedValue(savedLog({}));
        await updateLogById(
          request(multiRegionCreator, { recipients: [{ value: 99 }], message: 'x' }),
          { ...mockResponse }
        );
        expect(recipientsInRegion).toHaveBeenCalledWith([99], [SAVED_REGION_ID, REGION_ID]);
        expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
      });

      it('lets an admin add recipients to a log with no saved region without a lookup', async () => {
        userById.mockResolvedValue(admin);
        logById.mockResolvedValue(savedLog({}));
        await updateLogById(request(admin, { recipients: [{ value: 99 }], message: 'x' }), {
          ...mockResponse,
        });
        expect(recipientsInRegion).not.toHaveBeenCalled();
        expect(updateLog).toHaveBeenCalled();
      });
    });

    it('returns not found when update target no longer exists', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToCreate.id,
        },
        params: {
          id: 1,
          regionId: REGION_ID,
        },
        body: {
          data: {
            recipientId: 1,
            message: 'test',
          },
        },
      };
      userById.mockImplementation(() => Promise.resolve(authorizedToCreate));
      logById.mockImplementation(() => Promise.resolve({ id: 1, userId: authorizedToCreate.id }));
      updateLog.mockResolvedValue(null);

      await updateLogById(mockRequest, { ...mockResponse });

      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.NOT_FOUND);
    });

    it('error', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToCreate.id,
        },
        params: {
          id: 1,
          regionId: REGION_ID,
        },
        body: {
          data: {
            recipientId: 1,
            message: 'test',
          },
        },
      };
      userById.mockImplementation(() => Promise.resolve(authorizedToCreate));
      logById.mockImplementation(() => Promise.resolve({ id: 1, userId: authorizedToCreate.id }));
      updateLog.mockRejectedValue(new Error('error'));
      await updateLogById(mockRequest, { ...mockResponse });
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });

    it('unauthorized', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToReadOnly.id,
        },
        params: {
          id: 1,
          regionId: REGION_ID,
        },
        body: {
          data: {
            recipientId: 1,
            message: 'test',
          },
        },
      };
      userById.mockImplementation(() => Promise.resolve(authorizedToReadOnly));
      logById.mockImplementation(() => Promise.resolve({ id: 1, userId: authorizedToCreate.id }));
      await updateLogById(mockRequest, { ...mockResponse });
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });

    it('admin', async () => {
      const mockRequest = {
        session: {
          userId: admin.id,
        },
        params: {
          id: 1,
          regionId: REGION_ID,
        },
        body: {
          data: {
            recipientId: 1,
            message: 'test',
          },
        },
      };
      userById.mockImplementation(() => Promise.resolve(admin));
      logById.mockImplementation(() => Promise.resolve({ id: 1, userId: authorizedToCreate.id }));
      updateLog.mockImplementation(() => Promise.resolve({ id: 1 }));
      await updateLogById(mockRequest, { ...mockResponse });
      expect(statusJson).toHaveBeenCalledWith({ id: 1 });
    });
  });

  describe('deleteLogById', () => {
    afterEach(() => jest.restoreAllMocks());

    it('returns not found when log does not exist', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToCreate.id,
        },
        params: {
          id: 1,
          regionId: REGION_ID,
        },
        body: {
          recipientId: 1,
          message: 'test',
        },
      };
      userById.mockImplementation(() => Promise.resolve(authorizedToCreate));
      logById.mockResolvedValue(null);

      await deleteLogById(mockRequest, { ...mockResponse });

      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.NOT_FOUND);
      expect(deleteLog).not.toHaveBeenCalled();
    });

    it('success', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToCreate.id,
        },
        params: {
          id: 1,
          regionId: REGION_ID,
        },
        body: {
          recipientId: 1,
          message: 'test',
        },
      };
      userById.mockImplementation(() => Promise.resolve(authorizedToCreate));
      logById.mockImplementation(() => Promise.resolve({ id: 1, userId: authorizedToCreate.id }));
      deleteLog.mockImplementation(() => Promise.resolve({ id: 1 }));
      await deleteLogById(mockRequest, { ...mockResponse });
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.NO_CONTENT);
    });

    it('returns not found when delete target no longer exists', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToCreate.id,
        },
        params: {
          id: 1,
          regionId: REGION_ID,
        },
        body: {
          recipientId: 1,
          message: 'test',
        },
      };
      userById.mockImplementation(() => Promise.resolve(authorizedToCreate));
      logById.mockImplementation(() => Promise.resolve({ id: 1, userId: authorizedToCreate.id }));
      deleteLog.mockResolvedValue(0);
      await deleteLogById(mockRequest, { ...mockResponse });
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.NOT_FOUND);
    });

    it('unauthorized', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToReadOnly.id,
        },
        params: {
          id: 1,
          regionId: REGION_ID,
        },
        body: {
          recipientId: 1,
          message: 'test',
        },
      };
      userById.mockImplementation(() => Promise.resolve(authorizedToReadOnly));
      deleteLog.mockImplementation(() => Promise.resolve({ id: 1, userId: authorizedToCreate.id }));
      await deleteLogById(mockRequest, { ...mockResponse });
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });

    it('admin', async () => {
      const mockRequest = {
        session: {
          userId: admin.id,
        },
        params: {
          id: 1,
          regionId: REGION_ID,
        },
        body: {
          recipientId: 1,
          message: 'test',
        },
      };
      userById.mockImplementation(() => Promise.resolve(admin));
      logById.mockImplementation(() => Promise.resolve({ id: 1, userId: authorizedToCreate.id }));
      deleteLog.mockImplementation(() => Promise.resolve({ id: 1 }));
      await deleteLogById(mockRequest, { ...mockResponse });
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.NO_CONTENT);
    });
  });

  describe('getAvailableUsersAndGoals', () => {
    afterEach(() => jest.restoreAllMocks());

    it('returns users and goals', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToReadOnly.id,
        },
        params: {
          regionId: REGION_ID,
        },
      };
      const mockUsers = [
        { id: 1, name: 'UserA' },
        { id: 2, name: 'UserB' },
      ];
      const mockGoals = [
        { value: 1, label: 'GoalA' },
        { value: 2, label: 'GoalB' },
      ];
      const mockRecipients = [
        { value: 1, label: 'RecipientA', grants: [] },
        { value: 2, label: 'RecipientB', grants: [] },
      ];
      userById.mockResolvedValue(authorizedToReadOnly);
      usersByRoles.mockResolvedValue(mockUsers);
      GoalTemplate.findAll.mockResolvedValue(mockGoals);
      Recipient.findAll.mockResolvedValue(mockRecipients);
      Group.findAll.mockResolvedValue([]);
      const result = await getAvailableUsersRecipientsAndGoals(mockRequest, { ...mockResponse });
      // eslint-disable-next-line max-len
      expect(result).toEqual({
        regionalUsers: mockUsers.map((u) => ({ label: u.name, value: u.id })),
        standardGoals: mockGoals,
        recipients: [
          { value: 1, label: 'RecipientA' },
          { value: 2, label: 'RecipientB' },
        ],
        groups: [],
      });
    });

    it('only returns recipients with active grants', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToReadOnly.id,
        },
        params: {
          regionId: REGION_ID,
        },
      };
      const mockUsers = [{ value: 1, label: 'UserA' }];
      const mockGoals = [{ value: 1, label: 'GoalA' }];
      const mockRecipients = [{ value: 1, label: 'RecipientA', grants: [] }];

      userById.mockResolvedValue(authorizedToReadOnly);
      usersByRoles.mockResolvedValue(mockUsers);
      GoalTemplate.findAll.mockResolvedValue(mockGoals);
      Recipient.findAll.mockResolvedValue(mockRecipients);
      Group.findAll.mockResolvedValue([]);

      await getAvailableUsersRecipientsAndGoals(mockRequest, { ...mockResponse });

      // Verify that Recipient.findAll was called with the correct query parameters
      expect(Recipient.findAll).toHaveBeenCalledWith({
        attributes: [
          ['id', 'value'],
          ['name', 'label'],
        ],
        where: {
          deleted: false,
        },
        include: [
          {
            model: Grant,
            as: 'grants',
            attributes: ['status', 'inactivationDate'],
            where: {
              regionId: REGION_ID,
              [Op.or]: [
                { status: 'Active' },
                {
                  [Op.and]: [
                    { status: 'Inactive' },
                    { inactivationDate: { [Op.ne]: null } },
                    {
                      inactivationDate: {
                        [Op.gte]: expect.any(Date),
                      },
                    },
                  ],
                },
              ],
            },
            required: true,
          },
        ],
        order: [['label', 'ASC']],
      });

      // Verify that the inactivationDate filter is set to 365 days ago
      const callArgs = Recipient.findAll.mock.calls[0][0];
      const whereClause = callArgs.include[0].where[Op.or][1][Op.and][2];
      const inactivationDateCondition = whereClause.inactivationDate[Op.gte];
      const timeDiff = Date.now() - inactivationDateCondition.getTime();
      const daysDifference = timeDiff / (24 * 60 * 60 * 1000);
      expect(daysDifference).toBeCloseTo(365, 1);
    });

    it('includes recipients with inactive grants that have inactivationDate within 365 days', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToReadOnly.id,
        },
        params: {
          regionId: REGION_ID,
        },
      };
      const mockUsers = [{ value: 1, label: 'UserA' }];
      const mockGoals = [{ value: 1, label: 'GoalA' }];
      const mockRecipients = [{ value: 1, label: 'RecipientA', grants: [] }];

      userById.mockResolvedValue(authorizedToReadOnly);
      usersByRoles.mockResolvedValue(mockUsers);
      GoalTemplate.findAll.mockResolvedValue(mockGoals);
      Recipient.findAll.mockResolvedValue(mockRecipients);
      Group.findAll.mockResolvedValue([]);

      await getAvailableUsersRecipientsAndGoals(mockRequest, { ...mockResponse });

      const callArgs = Recipient.findAll.mock.calls[0][0];
      const whereCondition = callArgs.include[0].where;

      // Verify the where condition includes both active and recently inactive grants
      expect(whereCondition).toEqual({
        regionId: REGION_ID,
        [Op.or]: [
          { status: 'Active' },
          {
            [Op.and]: [
              { status: 'Inactive' },
              { inactivationDate: { [Op.ne]: null } },
              {
                inactivationDate: {
                  [Op.gte]: expect.any(Date),
                },
              },
            ],
          },
        ],
      });
    });

    it('excludes recipients with inactive grants that have null inactivationDate', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToReadOnly.id,
        },
        params: {
          regionId: REGION_ID,
        },
      };

      userById.mockResolvedValue(authorizedToReadOnly);
      usersByRoles.mockResolvedValue([]);
      GoalTemplate.findAll.mockResolvedValue([]);
      Recipient.findAll.mockResolvedValue([]);
      Group.findAll.mockResolvedValue([]);

      await getAvailableUsersRecipientsAndGoals(mockRequest, { ...mockResponse });

      const callArgs = Recipient.findAll.mock.calls[0][0];
      const inactiveCondition = callArgs.include[0].where[Op.or][1][Op.and];

      // Verify that inactive grants must have a non-null inactivationDate
      expect(inactiveCondition).toContainEqual({ inactivationDate: { [Op.ne]: null } });
    });

    it('excludes recipients with inactive grants older than 365 days', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToReadOnly.id,
        },
        params: {
          regionId: REGION_ID,
        },
      };

      userById.mockResolvedValue(authorizedToReadOnly);
      usersByRoles.mockResolvedValue([]);
      GoalTemplate.findAll.mockResolvedValue([]);
      Recipient.findAll.mockResolvedValue([]);
      Group.findAll.mockResolvedValue([]);

      await getAvailableUsersRecipientsAndGoals(mockRequest, { ...mockResponse });

      const callArgs = Recipient.findAll.mock.calls[0][0];
      const whereClause = callArgs.include[0].where[Op.or][1][Op.and][2];
      const inactivationDateCondition = whereClause.inactivationDate[Op.gte];

      // Verify that the date filter excludes grants older than 365 days
      const cutoffDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const actualCutoffTime = inactivationDateCondition.getTime();
      const expectedCutoffTime = cutoffDate.getTime();

      // Allow for small time differences due to test execution time
      const timeDifference = Math.abs(actualCutoffTime - expectedCutoffTime);
      expect(timeDifference).toBeLessThan(1000); // 1 second tolerance
    });

    it('appends (inactive) to recipient names when all grants are inactive', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToReadOnly.id,
        },
        params: {
          regionId: REGION_ID,
        },
      };

      const mockRecipients = [
        {
          value: 1,
          label: 'Recipient with Active Grant',
          grants: [{ status: 'Active' }],
        },
        {
          value: 2,
          label: 'Recipient with Inactive Grant',
          grants: [{ status: 'Inactive' }],
        },
        {
          value: 3,
          label: 'Recipient with Mixed Grants',
          grants: [{ status: 'Active' }, { status: 'Inactive' }],
        },
        {
          value: 4,
          label: 'Recipient with Multiple Inactive Grants',
          grants: [{ status: 'Inactive' }, { status: 'Inactive' }],
        },
      ];

      userById.mockResolvedValue(authorizedToReadOnly);
      usersByRoles.mockResolvedValue([]);
      GoalTemplate.findAll.mockResolvedValue([]);
      Recipient.findAll.mockResolvedValue(mockRecipients);
      Group.findAll.mockResolvedValue([]);

      const result = await getAvailableUsersRecipientsAndGoals(mockRequest, { ...mockResponse });

      expect(result.recipients).toEqual([
        { value: 1, label: 'Recipient with Active Grant' },
        { value: 2, label: 'Recipient with Inactive Grant (inactive)' },
        { value: 3, label: 'Recipient with Mixed Grants' },
        { value: 4, label: 'Recipient with Multiple Inactive Grants (inactive)' },
      ]);
    });

    it('returns null if unauthorized', async () => {
      const mockRequest = {
        session: {
          userId: unauthorized.id,
        },
        params: {
          regionId: REGION_ID,
        },
      };
      userById.mockImplementation(() => Promise.resolve(unauthorized));
      const result = await getAvailableUsersRecipientsAndGoals(mockRequest, { ...mockResponse });
      expect(result).toBeNull();
    });

    it('returns users from all regions for central office users', async () => {
      const mockRequest = {
        session: {
          userId: centralOffice.id,
        },
        params: {
          regionId: 14,
        },
      };
      const mockUsers = [
        { id: 1, name: 'UserA' },
        { id: 2, name: 'UserB' },
      ];
      userById.mockResolvedValue(centralOffice);
      getUserReadRegions.mockResolvedValue([1, 2, 3]);
      usersByRoles.mockResolvedValue(mockUsers);
      GoalTemplate.findAll.mockResolvedValue([]);
      Recipient.findAll.mockResolvedValue([]);
      Group.findAll.mockResolvedValue([]);

      const result = await getAvailableUsersRecipientsAndGoals(mockRequest, { ...mockResponse });

      // central office should be scoped to the regions they can read, not a single region
      expect(usersByRoles).toHaveBeenCalledWith(
        ['TTAC', 'ECM', 'GSM', 'GS', 'ECS', 'HS', 'FES', 'SS'],
        [1, 2, 3]
      );
      expect(result.regionalUsers).toEqual(mockUsers.map((u) => ({ label: u.name, value: u.id })));
    });
  });

  describe('communicationLogAdditionalData', () => {
    afterEach(() => jest.restoreAllMocks());

    it('returns additional data', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToReadOnly.id,
        },
        params: {
          regionId: REGION_ID,
        },
      };
      const mockUsers = [{ id: 1, name: 'UserA' }];
      const mockGoals = [{ value: 1, label: 'Goal' }];
      userById.mockResolvedValue(authorizedToReadOnly);
      usersByRoles.mockResolvedValue(mockUsers);
      GoalTemplate.findAll.mockResolvedValue(mockGoals);
      Recipient.findAll.mockResolvedValue([]);
      Group.findAll.mockResolvedValue([]);
      await communicationLogAdditionalData(mockRequest, { ...mockResponse });
      expect(statusJson).toHaveBeenCalledWith({
        regionalUsers: mockUsers.map((u) => ({ label: u.name, value: u.id })),
        standardGoals: mockGoals,
        groups: [],
        recipients: [],
      });
    });
  });

  describe('createLogByRegionId', () => {
    beforeEach(() => {
      recipientsInRegion.mockResolvedValue(true);
    });

    it('rejects recipients outside the requested region before writing', async () => {
      recipientsInRegion.mockResolvedValue(false);
      userById.mockResolvedValue(authorizedToCreate);
      const req = {
        session: { userId: authorizedToCreate.id },
        params: { regionId: REGION_ID, recipientId: 10 },
        body: { data: { recipients: [{ value: 10 }, { value: 20 }] } },
      };
      await createLogByRegionId(req, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
      expect(createLog).not.toHaveBeenCalled();
      expect(statusJson).not.toHaveBeenCalled();
    });

    afterEach(async () => {
      jest.restoreAllMocks();
    });

    it('success', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToCreate.id,
        },
        params: {
          regionId: REGION_ID,
        },
        body: {
          data: {
            recipients: [{ value: 1 }, { value: 2 }],
            message: 'test',
          },
        },
      };
      userById.mockImplementation(() => Promise.resolve(authorizedToCreate));
      createLog.mockImplementation(() => Promise.resolve({ id: 1 }));
      await createLogByRegionId(mockRequest, { ...mockResponse });
      expect(statusJson).toHaveBeenCalledWith({ id: 1 });
      expect(recipientsInRegion).toHaveBeenCalledWith([1, 2], REGION_ID);
      expect(createLog).toHaveBeenCalledWith([1, 2], authorizedToCreate.id, {
        message: 'test',
        regionId: REGION_ID,
      });
    });

    it('unauthorized', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToReadOnly.id,
        },
        params: {
          regionId: REGION_ID,
        },
        body: {
          data: {
            recipients: [{ value: 1 }],
            message: 'test',
          },
        },
      };
      userById.mockImplementation(() => Promise.resolve(authorizedToReadOnly));
      await createLogByRegionId(mockRequest, { ...mockResponse });
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });

    it('error', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToCreate.id,
        },
        params: {
          regionId: REGION_ID,
        },
        body: {
          data: {
            recipients: [{ value: 1 }],
            message: 'test',
          },
        },
      };
      userById.mockImplementation(() => Promise.resolve(authorizedToCreate));
      createLog.mockRejectedValue(new Error('error'));
      await createLogByRegionId(mockRequest, { ...mockResponse });
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });

    it('creates a log when recipients are missing', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToCreate.id,
        },
        params: {
          regionId: String(REGION_ID),
        },
        body: {
          data: {
            message: 'test',
          },
        },
      };
      userById.mockImplementation(() => Promise.resolve(authorizedToCreate));
      createLog.mockResolvedValue({ id: 44 });
      await createLogByRegionId(mockRequest, { ...mockResponse });
      expect(createLog).toHaveBeenCalledWith([], authorizedToCreate.id, {
        message: 'test',
        regionId: REGION_ID,
      });
      expect(statusJson).toHaveBeenCalledWith({ id: 44 });
    });

    it('filters out invalid recipients before creating a log', async () => {
      const mockRequest = {
        session: {
          userId: authorizedToCreate.id,
        },
        params: {
          regionId: String(REGION_ID),
        },
        body: {
          data: {
            recipients: [{}, { value: null }],
            message: 'test',
          },
        },
      };
      userById.mockImplementation(() => Promise.resolve(authorizedToCreate));
      createLog.mockResolvedValue({ id: 55 });
      await createLogByRegionId(mockRequest, { ...mockResponse });
      expect(createLog).toHaveBeenCalledWith([], authorizedToCreate.id, {
        message: 'test',
        regionId: REGION_ID,
      });
      expect(statusJson).toHaveBeenCalledWith({ id: 55 });
    });

    it('admin', async () => {
      const mockRequest = {
        session: {
          userId: admin.id,
        },
        params: {
          regionId: REGION_ID,
        },
        body: {
          data: {
            recipients: [{ value: 1 }],
            message: 'test',
          },
        },
      };
      userById.mockImplementation(() => Promise.resolve(admin));
      createLog.mockImplementation(() => Promise.resolve({ id: 1 }));
      await createLogByRegionId(mockRequest, { ...mockResponse });
      expect(statusJson).toHaveBeenCalledWith({ id: 1 });
    });
  });
});
