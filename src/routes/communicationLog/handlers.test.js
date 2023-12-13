import httpCodes from 'http-codes';
import { sequelize } from '../../models';
import {
  logById,
  logsByRecipientAndScopes,
  csvLogsByRecipientAndScopes,
  deleteLog,
  updateLog,
  createLog,
} from '../../services/communicationLog';
import { userById } from '../../services/users';
import {
  communicationLogById,
  communicationLogsByRecipientId,
  updateLogById,
  deleteLogById,
  createLogByRecipientId,
} from './handlers';
import SCOPES from '../../middleware/scopeConstants';
import { setTrainingAndActivityReportReadRegions } from '../../services/accessValidation';

jest.mock('../../services/currentUser');
jest.mock('../../services/users');
jest.mock('../../services/communicationLog');
jest.mock('../../services/accessValidation');

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
  };

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

  describe('createLogByRecipientId', () => {
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
          regionId: REGION_ID,
        },
        body: {
          recipientId: 1,
          message: 'test',
        },
      };
      userById.mockImplementation(() => Promise.resolve(authorizedToCreate));
      createLog.mockImplementation(() => Promise.resolve({ id: 1 }));
      await createLogByRecipientId(mockRequest, { ...mockResponse });
      expect(statusJson).toHaveBeenCalledWith({ id: 1 });
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
      updateLog.mockImplementation(() => Promise.resolve({ id: 1 }));
      await updateLogById(mockRequest, { ...mockResponse });
      expect(statusJson).toHaveBeenCalledWith({ id: 1 });
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
          recipientId: 1,
          message: 'test',
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
          recipientId: 1,
          message: 'test',
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
          recipientId: 1,
          message: 'test',
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
          recipientId: 1,
          message: 'test',
        },
      };
      userById.mockImplementation(() => Promise.resolve(authorizedToCreate));
      logById.mockImplementation(() => Promise.resolve({ id: 1, userId: authorizedToCreate.id }));
      deleteLog.mockRejectedValue(new Error('error'));
      await deleteLogById(mockRequest, { ...mockResponse });
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
});
