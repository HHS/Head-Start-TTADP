import {
  getPossibleCollaborators,
  getPossibleStateCodes,
  requestVerificationEmail,
  verifyEmailToken,
  getUserStatistics,
} from './handlers';
import { userById, usersWithPermissions, statisticsByUser } from '../../services/users';
import User from '../../policies/user';
import { Grant } from '../../models';
import { createAndStoreVerificationToken, validateVerificationToken } from '../../services/token';
import { currentUserId } from '../../services/currentUser';

jest.mock('../../services/users', () => ({
  userById: jest.fn(),
  usersWithPermissions: jest.fn(),
  statisticsByUser: jest.fn(),
}));

jest.mock('../../services/currentUser', () => ({
  currentUserId: jest.fn(),
}));

jest.mock('../../lib/mailer', () => ({
  sendEmailVerificationRequestWithToken: jest.fn(),
}));

jest.mock('../../services/token', () => ({
  createAndStoreVerificationToken: jest.fn(),
  validateVerificationToken: jest.fn(),
}));

const mockResponse = {
  json: jest.fn(),
  sendStatus: jest.fn(),
  status: jest.fn(() => ({
    end: jest.fn(),
  })),
};

const mockRequest = {
  session: {
    userId: 1,
  },
};

describe('User handlers', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserStatistics', () => {
    it('returns statistics', async () => {
      const response = { daysSinceJoined: 10, arsCreated: 10 };
      statisticsByUser.mockResolvedValue(response);
      userById.mockResolvedValue({
        permissions: [
          {
            regionId: 1,
          },
          {
            regionId: 2,
          },
        ],
      });
      User.prototype.canWriteInRegion = jest.fn().mockReturnValue(true);
      await getUserStatistics(mockRequest, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(response);
    });

    it('handles errors', async () => {
      const response = { daysSinceJoined: 10, arsCreated: 10 };
      statisticsByUser.mockResolvedValue(response);
      userById.mockResolvedValue({
        permissions: [
          {
            regionId: 1,
          },
          {
            regionId: 2,
          },
        ],
      });
      const end = jest.fn();
      const status = jest.fn(() => ({ end }));
      User.prototype.canWriteInRegion = jest.fn().mockReturnValue(true);
      await getUserStatistics({}, { status });
      expect(status).toHaveBeenCalledWith(500);
    });
  });

  describe('getPossibleStateCodes', () => {
    it('returns state codes', async () => {
      const response = ['NM', 'NV', 'AZ', 'OK', 'MN'];
      Grant.findAll = jest.fn();
      Grant.findAll.mockResolvedValue([{ stateCode: 'NM' }, { stateCode: 'NV' }, { stateCode: 'AZ' }, { stateCode: 'OK' }, { stateCode: 'MN' }]);
      userById.mockResolvedValue({
        permissions: [
          {
            regionId: 1,
          },
          {
            regionId: 2,
          },
        ],
      });
      await getPossibleStateCodes(mockRequest, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(response);
    });

    it('handles errors', async () => {
      Grant.findAll = jest.fn();
      Grant.findAll.mockResolvedValue([{ stateCode: 'NM' }, { stateCode: 'NV' }, { stateCode: 'AZ' }, { stateCode: 'OK' }, { stateCode: 'MN' }]);
      userById.mockResolvedValue({
        permissions: [
          {
            regionId: 1,
          },
          {
            regionId: 2,
          },
        ],
      });
      const end = jest.fn();
      const status = jest.fn(() => ({ end }));
      await getPossibleStateCodes({}, { status });
      expect(status).toHaveBeenCalledWith(500);
    });
  });

  describe('getPossibleCollaborators', () => {
    const request = {
      ...mockRequest,
      query: { region: 1 },
      body: { resourcesUsed: 'test' },
    };

    it('returns users', async () => {
      const response = [{ name: 'name', id: 1 }];
      User.prototype.canViewUsersInRegion = jest.fn().mockReturnValue(true);
      usersWithPermissions.mockResolvedValue(response);
      userById.mockResolvedValue({
        id: 1,
      });
      await getPossibleCollaborators(request, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(response);
    });

    it('handles unauthorized requests', async () => {
      User.prototype.canViewUsersInRegion = jest.fn().mockReturnValue(false);
      userById.mockResolvedValue({
        id: 1,
      });
      await getPossibleCollaborators(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
    });

    it('handles errors', async () => {
      const response = [{ name: 'name', id: 1 }];
      User.prototype.canViewUsersInRegion = jest.fn().mockReturnValue(true);
      usersWithPermissions.mockResolvedValue(response);
      userById.mockResolvedValue({
        id: 1,
      });
      await getPossibleCollaborators({}, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('requestVerificationEmail', () => {
    const request = {
      ...mockRequest,
      body: { email: '' },
    };

    it('returns 200', async () => {
      currentUserId.mockResolvedValueOnce(1);
      userById.mockResolvedValueOnce({
        id: 1,
        email: 'whatever',
      });
      createAndStoreVerificationToken.mockResolvedValue('token');
      await requestVerificationEmail(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(200);
    });

    it('handles errors', async () => {
      currentUserId.mockResolvedValueOnce(1);
      userById.mockResolvedValueOnce({
        id: 1,
        email: 'whatever',
      });
      createAndStoreVerificationToken.mockRejectedValueOnce(new Error('Problem creating token'));
      await requestVerificationEmail({}, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
  describe('verifyEmailToken', () => {
    it('handles success', async () => {
      const request = {
        ...mockRequest,
        params: { token: 'token' },
      };
      validateVerificationToken.mockResolvedValueOnce({
        userId: 1,
      });
      currentUserId.mockResolvedValueOnce(1);
      await verifyEmailToken(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(200);
    });

    it('handles a missing token in the request params', async () => {
      const request = {
        ...mockRequest,
        params: {},
      };
      currentUserId.mockResolvedValueOnce(1);
      await verifyEmailToken(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(400);
    });

    it('handles a missing user id', async () => {
      const request = {
        ...mockRequest,
        params: { token: 'token' },
      };

      currentUserId.mockResolvedValueOnce(null);
      await verifyEmailToken(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(400);
    });

    it('handles no error returned from the token service', async () => {
      const request = {
        ...mockRequest,
        params: { token: 'token' },
      };

      currentUserId.mockResolvedValueOnce(1);
      validateVerificationToken.mockResolvedValueOnce(null);
      await verifyEmailToken(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
    });

    it('handles errors', async () => {
      const request = {
        ...mockRequest,
        params: { token: 'token' },
      };

      currentUserId.mockResolvedValueOnce(1);
      validateVerificationToken.mockRejectedValueOnce(new Error('Problem validating token'));
      await verifyEmailToken(request, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});
