import { describe } from 'yargs';
import { getPossibleCollaborators } from './handlers';
import { userById, usersWithPermissions } from '../../services/users';
import User from '../../policies/user';

jest.mock('../../services/users', () => ({
  userById: jest.fn(),
  usersWithPermissions: jest.fn(),
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

  describe('getPossibleStateCodes', () => {

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
  });
});
