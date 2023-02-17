import httpCodes from 'http-codes';
import {
  getRttapas,
  getRttapa,
  createRttapa,
} from './handlers';
import { userById } from '../../services/users';
import SCOPES from '../../middleware/scopeConstants';

const mockUser = (scopeId = false) => ({
  id: 1,
  permissions: scopeId ? [
    {
      regionId: 1,
      scopeId,
      userId: 1,
    },
  ] : [],
});

jest.mock('../../services/users', () => ({
  userById: jest.fn(),
}));

jest.mock('../../services/currentUser', () => ({
  currentUserId: jest.fn(() => 1),
}));

describe('Rttapa Reports route handlers', () => {
  describe('getRttapas', () => {
    it('should return a list of rttapa reports', async () => {
      const mockRequest = {
        session: {
          userId: 1,
        },
        params: {
          regionId: 1,
          recipientId: 1,
        },
      };
      const mockResponse = {
        status: jest.fn(() => ({
          json: jest.fn(),
          end: jest.fn(),
        })),
        sendStatus: jest.fn(),
        json: jest.fn().mockReturnThis(),
      };

      userById.mockImplementationOnce(() => mockUser(SCOPES.READ_WRITE_REPORTS));

      await getRttapas(mockRequest, mockResponse);
      expect(mockResponse.json).toHaveBeenCalled();
      // todo - verify response
    });

    it('checks permssions', async () => {
      const mockRequest = {
        session: {
          userId: 1,
        },
        params: {
          regionId: 1,
          recipientId: 1,
        },
      };
      const mockResponse = {
        status: jest.fn(() => ({
          json: jest.fn(),
          end: jest.fn(),
        })),
        sendStatus: jest.fn(),
        json: jest.fn().mockReturnThis(),
      };

      userById.mockImplementationOnce(() => mockUser());

      await getRttapas(mockRequest, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });

    it('should return a 500 if there is an error', async () => {
      const mockRequest = {
        session: {
          userId: 1,
        },
      };
      const mockResponse = {
        status: jest.fn(() => ({
          json: jest.fn(),
          end: jest.fn(),
        })),
        sendStatus: jest.fn(),
        json: jest.fn().mockReturnThis(),
      };
      // No params passed, triggers an error
      await getRttapas(mockRequest, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('getRttapa', () => {
    it('should return a single rttapa report', async () => {
      const mockRequest = {
        session: {
          userId: 1,
        },
        params: {
          reportId: 1,
        },
      };
      const mockResponse = {
        status: jest.fn(() => ({
          json: jest.fn(),
          end: jest.fn(),
        })),
        sendStatus: jest.fn(),
        json: jest.fn().mockReturnThis(),
      };

      userById.mockImplementationOnce(() => mockUser(SCOPES.READ_WRITE_REPORTS));

      await getRttapa(mockRequest, mockResponse);
      expect(mockResponse.json).toHaveBeenCalled();
      // todo - verify response
    });

    it('handles errors', async () => {
      const mockRequest = {
        session: {
          userId: 1,
        },
      };
      const mockResponse = {
        status: jest.fn(() => ({
          json: jest.fn(),
          end: jest.fn(),
        })),
        sendStatus: jest.fn(),
        json: jest.fn().mockReturnThis(),
      };

      userById.mockImplementationOnce(() => mockUser(SCOPES.READ_WRITE_REPORTS));

      await getRttapa(mockRequest, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });

    it('checks permssions', async () => {
      const mockRequest = {
        session: {
          userId: 1,
        },
        params: {
          reportId: 1,
        },
      };
      const mockResponse = {
        status: jest.fn(() => ({
          json: jest.fn(),
          end: jest.fn(),
        })),
        sendStatus: jest.fn(),
        json: jest.fn().mockReturnThis(),
      };

      userById.mockImplementationOnce(() => mockUser());

      await getRttapa(mockRequest, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });
  });

  describe('createRttapa', () => {
    it('should create a new rttapa report', async () => {
      const mockRequest = {
        session: {
          userId: 1,
        },
        body: {
          recipientId: 1,
          regionId: 1,
          reviewDate: '2019-01-01',
          notes: 'notes',
          goalIds: [1, 2, 3],
        },
      };
      const mockResponse = {
        status: jest.fn(() => ({
          json: jest.fn(),
          end: jest.fn(),
        })),
        json: jest.fn().mockReturnThis(),
      };

      userById.mockImplementationOnce(() => mockUser(SCOPES.READ_WRITE_REPORTS));

      await createRttapa(mockRequest, mockResponse);
      expect(mockResponse.json).toHaveBeenCalled();
      // todo - verify response
    });

    it('handles errors', async () => {
      const mockRequest = {
        session: {
          userId: 1,
        },
      };
      const mockResponse = {
        status: jest.fn(() => ({
          json: jest.fn(),
          end: jest.fn(),
        })),
        sendStatus: jest.fn(),
        json: jest.fn().mockReturnThis(),
      };

      await createRttapa(mockRequest, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });

    it('checks permssions', async () => {
      const mockRequest = {
        session: {
          userId: 1,
        },
        body: {
          recipientId: 1,
          regionId: 1,
          reviewDate: '2019-01-01',
          notes: 'notes',
          goalIds: [1, 2, 3],
        },
      };
      const mockResponse = {
        status: jest.fn(() => ({
          json: jest.fn(),
          end: jest.fn(),
        })),
        json: jest.fn().mockReturnThis(),
        sendStatus: jest.fn(),
      };

      userById.mockImplementationOnce(() => mockUser());

      await createRttapa(mockRequest, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.FORBIDDEN);
    });
  });
});
