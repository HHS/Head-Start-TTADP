import { getCitationsByGrants, getTextByCitation } from './handlers';
import { currentUserId } from '../../services/currentUser';
import { userById } from '../../services/users';
import { getCitationsByGrantIds, textByCitation } from '../../services/citations';
import User from '../../policies/user';
import handleErrors from '../../lib/apiErrorHandler';

jest.mock('../../models');
jest.mock('../../services/currentUser');
jest.mock('../../services/users');
jest.mock('../../policies/user');
jest.mock('../../lib/apiErrorHandler');
jest.mock('../../services/citations');

describe('Citation handlers', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('getTextByCitation', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should get text by citation', async () => {
      const req = {
        query: {
          citationIds: [1],
        },
      };

      const res = {
        sendStatus: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      const text = [
        {
          id: 1,
        },
      ];

      textByCitation.mockResolvedValue(text);

      await getTextByCitation(req, res);

      expect(textByCitation).toHaveBeenCalledWith([1]);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(text);
    });

    it('should handle errors', async () => {
      const req = {
        query: {
          citationIds: [1],
        },
      };
      const res = {
        sendStatus: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      textByCitation.mockRejectedValueOnce(new Error('Something went wrong!'));

      handleErrors.mockImplementation(() => {
        res.sendStatus(500);
      });

      await getTextByCitation(req, res);

      expect(textByCitation).toHaveBeenCalledWith([1]);
      expect(res.sendStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('getCitationsByGrantS', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should get citations by grant id', async () => {
    // Mock request.
      const req = {
        query: {
          grantIds: [1],
          reportStartDate: '2024-10-01',
        },
        params: {
          regionId: 1,
        },
      };

      // Mock response.
      const res = {
        sendStatus: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      // Mock the user.
      const user = {
        id: 1,
      };

      // Mock the response citations.
      const citations = [
        {
          id: 1,
        },
      ];

      // Mock the functions.
      User.mockImplementation(() => ({
        canWriteInRegion: () => true,
      }));
      currentUserId.mockResolvedValue(user.id);
      userById.mockResolvedValue(user);
      getCitationsByGrantIds.mockResolvedValue(citations);

      await getCitationsByGrants(req, res);

      expect(currentUserId).toHaveBeenCalledWith(req, res);
      expect(userById).toHaveBeenCalledWith(user.id);
      expect(getCitationsByGrantIds).toHaveBeenCalledWith(req.query.grantIds, '2024-10-01');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(citations);
    });

    it('should handle errors', async () => {
    // Mock request.
      const req = {
        query: {
          grantIds: [1],
          reportStartDate: '2024-10-01',
        },
        params: {
          regionId: 1,
        },
      };

      // Mock response.
      const res = {
        sendStatus: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      // Mock the user.
      const user = {
        id: 1,
      };

      // Mock the functions.
      User.mockImplementation(() => ({
        canWriteInRegion: () => true,
      }));
      currentUserId.mockResolvedValue(user.id);
      userById.mockResolvedValue(user);
      getCitationsByGrantIds.mockRejectedValueOnce(new Error('Something went wrong!'));

      // Mock the handleErrors function to return a 500 status code.
      handleErrors.mockImplementation(() => {
        res.sendStatus(500);
      });

      await getCitationsByGrants(req, res);

      expect(currentUserId).toHaveBeenCalledWith(req, res);
      expect(userById).toHaveBeenCalledWith(user.id);
      expect(getCitationsByGrantIds).toHaveBeenCalledWith(req.query.grantIds, '2024-10-01');
      expect(res.sendStatus).toHaveBeenCalledWith(500);
    });

    it('should return a 403 status code if the user cannot write in the region', async () => {
    // Mock request.
      const req = {
        query: {
          grantIds: [1],
          reportStartDate: '2024-10-01',
        },
        params: {
          regionId: 1,
        },
      };

      // Mock response.
      const res = {
        sendStatus: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      // Mock the user.
      const user = {
        id: 1,
      };

      // Mock the functions.
      User.mockImplementation(() => ({
        canWriteInRegion: () => false,
      }));
      currentUserId.mockResolvedValue(user.id);
      userById.mockResolvedValue(user);
      getCitationsByGrantIds.mockResolvedValue([]);

      await getCitationsByGrants(req, res);

      expect(res.sendStatus).toHaveBeenCalledWith(403);
    });
  });
});
