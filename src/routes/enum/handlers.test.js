import httpCodes from 'http-codes';
import { findAllFromEnum } from './handlers';
import { findAll } from '../../services/enums/generic';

jest.mock('../../services/enums/generic', () => ({
  findAll: jest.fn(),
}));

describe('enum handler', () => {
  const json = jest.fn();
  const mockResponse = {
    attachment: jest.fn(),
    json,
    send: jest.fn(),
    sendStatus: jest.fn(),
    status: jest.fn(() => ({
      end: jest.fn(),
      json,
    })),
  };

  const mockRequest = {
    session: {
      userId: 1,
    },
    params: {
      enumName: 'enumName',
      enumType: 'enumType',
    },
    query: {},
  };

  afterEach(() => jest.clearAllMocks());

  describe('findAllFromEnum', () => {
    it('returns the enum data', async () => {
      const res = [{ id: 1 }, { id: 2 }];
      findAll.mockResolvedValueOnce(res);

      await findAllFromEnum(mockRequest, mockResponse);
      expect(json).toHaveBeenCalledWith(res);
    });

    it('handles errors', async () => {
      findAll.mockRejectedValueOnce(new Error('Failed to get enums'));
      await findAllFromEnum(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(httpCodes.INTERNAL_SERVER_ERROR);
    });
  });
});
