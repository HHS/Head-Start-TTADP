import httpCodes from 'http-codes';
import {
  User,
  GoalTemplate,
  Recipient,
  Group,
  sequelize,
} from '../../models';
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
  communicationLogAdditionalData,
  getAvailableUsersRecipientsAndGoals,
} from './handlers';
import SCOPES from '../../middleware/scopeConstants';
import { setTrainingAndActivityReportReadRegions } from '../../services/accessValidation';

jest.mock('../../services/currentUser');
jest.mock('../../services/users');
jest.mock('../../services/communicationLog');
jest.mock('../../services/accessValidation');
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
      const mockUsers = [{ value: 1, label: 'UserA' }, { value: 2, label: 'UserB' }];
      const mockGoals = [{ value: 1, label: 'GoalA' }, { value: 2, label: 'GoalB' }];
      const mockRecipients = [{ value: 1, label: 'RecipientA' }, { value: 2, label: 'RecipientB' }];
      userById.mockResolvedValue(authorizedToReadOnly);
      User.findAll.mockResolvedValue(mockUsers);
      GoalTemplate.findAll.mockResolvedValue(mockGoals);
      Recipient.findAll.mockResolvedValue(mockRecipients);
      Group.findAll.mockResolvedValue([]);
      const result = await getAvailableUsersRecipientsAndGoals(mockRequest, { ...mockResponse });
      // eslint-disable-next-line max-len
      expect(result).toEqual({
        regionalUsers: mockUsers,
        standardGoals: mockGoals,
        recipients: mockRecipients,
        groups: [],
      });
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
      const mockUsers = [{ value: 1, label: 'User' }];
      const mockGoals = [{ value: 1, label: 'Goal' }];
      userById.mockResolvedValue(authorizedToReadOnly);
      User.findAll.mockResolvedValue(mockUsers);
      GoalTemplate.findAll.mockResolvedValue(mockGoals);
      Recipient.findAll.mockResolvedValue([]);
      Group.findAll.mockResolvedValue([]);
      await communicationLogAdditionalData(mockRequest, { ...mockResponse });
      // eslint-disable-next-line max-len
      expect(statusJson).toHaveBeenCalledWith({
        regionalUsers: mockUsers,
        standardGoals:
        mockGoals,
        groups: [],
        recipients: [],
      });
    });
  });
});
