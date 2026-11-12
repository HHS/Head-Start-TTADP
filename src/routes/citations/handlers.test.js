import handleErrors from '../../lib/apiErrorHandler';
import SCOPES from '../../middleware/scopeConstants';
import User from '../../policies/user';
import { getCitationsByGrantIds, textByCitation } from '../../services/citations';
import { currentUserId } from '../../services/currentUser';
import { userById } from '../../services/users';
import { getCitationsByGrants, getTextByCitation } from './handlers';

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

    it('converts object shaped citationIds to an array', async () => {
      const req = {
        query: {
          citationIds: {
            0: '1302.102(c)(1-2)',
            1: '1302.102(d)(1)(ii)',
          },
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

      expect(textByCitation).toHaveBeenCalledWith(['1302.102(c)(1-2)', '1302.102(d)(1)(ii)']);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(text);
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

    it.each([
      [
        'a non-numeric grantId',
        { grantIds: ['1) UNION SELECT 1--'], reportStartDate: '2024-10-01' },
      ],
      ['a fractional grantId', { grantIds: ['1.5'], reportStartDate: '2024-10-01' }],
      ['a negative grantId', { grantIds: ['-1'], reportStartDate: '2024-10-01' }],
      ['no grantIds', { reportStartDate: '2024-10-01' }],
      ['a malformed reportStartDate', { grantIds: ['1'], reportStartDate: "2024-10-01' OR 1=1--" }],
      ['no reportStartDate', { grantIds: ['1'] }],
    ])('should return a 400 status code for %s', async (_description, query) => {
      const req = { query, params: { regionId: 1 } };
      const res = {
        sendStatus: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      User.mockImplementation(() => ({
        canWriteInRegion: () => true,
      }));
      currentUserId.mockResolvedValue(1);
      userById.mockResolvedValue({ id: 1 });

      await getCitationsByGrants(req, res);

      expect(res.sendStatus).toHaveBeenCalledWith(400);
      expect(getCitationsByGrantIds).not.toHaveBeenCalled();
      expect(handleErrors).not.toHaveBeenCalled();
    });

    describe('without activity report write permission in the region', () => {
      const req = {
        query: { grantIds: ['1'], reportStartDate: '2024-10-01' },
        params: { regionId: '1' },
      };
      let res;

      beforeEach(() => {
        res = {
          sendStatus: jest.fn(),
          status: jest.fn().mockReturnThis(),
          send: jest.fn(),
        };
        User.mockImplementation(() => ({
          canWriteInRegion: () => false,
        }));
        currentUserId.mockResolvedValue(1);
        getCitationsByGrantIds.mockResolvedValue([]);
      });

      it.each([
        ['write TTA requests', SCOPES.READ_WRITE_TTA_REQUESTS],
        ['review TTA requests', SCOPES.REVIEW_TTA_REQUESTS],
      ])('returns citations to a user who can %s in the region', async (_description, scopeId) => {
        userById.mockResolvedValue({ id: 1, permissions: [{ regionId: 1, scopeId }] });

        await getCitationsByGrants(req, res);

        expect(getCitationsByGrantIds).toHaveBeenCalledWith([1], '2024-10-01');
        expect(res.status).toHaveBeenCalledWith(200);
      });

      it('returns a 403 to a user who can only review TTA requests in another region', async () => {
        userById.mockResolvedValue({
          id: 1,
          permissions: [{ regionId: 2, scopeId: SCOPES.REVIEW_TTA_REQUESTS }],
        });

        await getCitationsByGrants(req, res);

        expect(res.sendStatus).toHaveBeenCalledWith(403);
        expect(getCitationsByGrantIds).not.toHaveBeenCalled();
      });

      it('returns a 403 to a user who can only read reports in the region', async () => {
        userById.mockResolvedValue({
          id: 1,
          permissions: [{ regionId: 1, scopeId: SCOPES.READ_REPORTS }],
        });

        await getCitationsByGrants(req, res);

        expect(res.sendStatus).toHaveBeenCalledWith(403);
        expect(getCitationsByGrantIds).not.toHaveBeenCalled();
      });
    });

    it('should pass parsed grantIds from a single query string value', async () => {
      const req = {
        query: { grantIds: '12', reportStartDate: '2024-10-01' },
        params: { regionId: 1 },
      };
      const res = {
        sendStatus: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      User.mockImplementation(() => ({
        canWriteInRegion: () => true,
      }));
      currentUserId.mockResolvedValue(1);
      userById.mockResolvedValue({ id: 1 });
      getCitationsByGrantIds.mockResolvedValue([]);

      await getCitationsByGrants(req, res);

      expect(getCitationsByGrantIds).toHaveBeenCalledWith([12], '2024-10-01');
      expect(res.status).toHaveBeenCalledWith(200);
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
        permissions: [],
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
