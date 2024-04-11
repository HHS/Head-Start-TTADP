import { getRedisInfo, flushRedis } from './redis';

const redisClient = {
  connect: () => Promise.resolve(),
  quit: () => Promise.resolve(),
  info: () => Promise.resolve(''),
  flushAll: () => Promise.resolve(''),
};

jest.mock(('redis'), () => ({
  createClient: jest.fn(() => redisClient),
}));

describe('redis', () => {
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
    query: {},
  };

  afterEach(() => jest.clearAllMocks());

  describe('getRedisInfo', () => {
    it('returns the redis info', async () => {
      await getRedisInfo(mockRequest, mockResponse);
      expect(json).toHaveBeenCalledWith({ info: '' });
    });

    it('handles errors', async () => {
      const oldInfo = redisClient.info;
      redisClient.info = () => Promise.reject(new Error('error'));
      await getRedisInfo(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      redisClient.info = oldInfo;
    });
  });

  describe('flushRedis', () => {
    it('flushes redis', async () => {
      await flushRedis(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('handles errors', async () => {
      redisClient.flushAll = () => Promise.reject(new Error('error'));
      await flushRedis(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});
