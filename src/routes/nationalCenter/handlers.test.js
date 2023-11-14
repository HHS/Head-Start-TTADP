import httpCodes from 'http-codes';
import {
  getHandler,
} from './handlers';
import { findAll, findAllNationalCenterUsers } from '../../services/nationalCenters';

jest.mock('../../services/nationalCenters', () => ({
  findAllNationalCenterUsers: jest.fn(),
  findAll: jest.fn(),
}));

describe('nationalCenter route', () => {
  const mockResponse = {
    attachment: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    sendStatus: jest.fn(),
    status: jest.fn(() => ({
      end: jest.fn(),
      json: jest.fn(),
    })),
  };

  const mockRequest = {
    session: {
      userId: 1,
    },
    query: {},
  };

  describe('getHandler', () => {
    it('successfully gets all nationalCenters', async () => {
      const nationalCenters = [{ id: 1, name: 'National Center 1' }, { id: 2, name: 'National Center 2' }];
      findAll.mockResolvedValueOnce(nationalCenters);
      findAllNationalCenterUsers.mockResolvedValueOnce([]);

      await getHandler(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.OK);
    });

    it('handles failures', async () => {
      findAll.mockRejectedValueOnce(new Error('Failed to get nationalCenters'));

      await getHandler(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });
  });
});
