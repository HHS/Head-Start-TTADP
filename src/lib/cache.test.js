import getCachedResponse from './cache';

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockQuit = jest.fn();

const mockRedisInstance = {
  get: mockGet,
  set: mockSet,
  quit: mockQuit,
};

jest.mock('ioredis', () => ({
  Redis: jest.fn().mockImplementation(() => mockRedisInstance),
}));

jest.mock('./queue', () => ({
  generateRedisConfig: jest.fn(() => ({
    uri: 'redis://localhost:6379',
    tlsEnabled: false,
  })),
}));

describe('getCachedResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReset();
    mockSet.mockReset();
    mockQuit.mockReset();

    delete process.env.IGNORE_CACHE;
  });

  it('returns the cached response', async () => {
    mockGet.mockResolvedValue('value');

    const callback = jest.fn(() => 'new value');
    const response = await getCachedResponse('key', callback);

    expect(mockGet).toHaveBeenCalledWith('key');
    expect(response).toEqual('value');
    expect(callback).not.toHaveBeenCalled();
    expect(mockQuit).toHaveBeenCalled();
  });

  it('calls the callback when there is no cached response', async () => {
    mockGet.mockResolvedValue(null);

    const callback = jest.fn().mockResolvedValue('new value');
    const response = await getCachedResponse('key', callback);

    expect(mockGet).toHaveBeenCalledWith('key');
    expect(response).toEqual('new value');
    expect(callback).toHaveBeenCalled();
    expect(mockQuit).toHaveBeenCalled();
  });

  it('handles a failure to connect to the client', async () => {
    // eslint-disable-next-line global-require
    const { Redis } = require('ioredis');

    Redis.mockImplementationOnce(() => {
      throw new Error('error');
    });

    const callback = jest.fn().mockResolvedValue('new value');
    const response = await getCachedResponse('key', callback);

    expect(response).toEqual('new value');
    expect(callback).toHaveBeenCalled();
    expect(mockQuit).not.toHaveBeenCalled();
  });

  it('handles an error to set the response', async () => {
    mockGet.mockResolvedValue(null);
    mockSet.mockImplementation(() => { throw new Error('error'); });

    const callback = jest.fn().mockResolvedValue('new value');
    const response = await getCachedResponse('key', callback);

    expect(mockGet).toHaveBeenCalledWith('key');
    expect(mockSet).toHaveBeenCalled();
    expect(response).toEqual('new value');
    expect(callback).toHaveBeenCalled();
    expect(mockQuit).toHaveBeenCalled();
  });

  it('uses an output callback when provided', async () => {
    mockGet.mockResolvedValue(null);

    const callback = jest.fn().mockResolvedValue('new value');
    const outputCallback = jest.fn().mockReturnValue('output value');

    const response = await getCachedResponse('key', callback, outputCallback);

    expect(mockGet).toHaveBeenCalledWith('key');
    expect(response).toEqual('output value');
    expect(callback).toHaveBeenCalled();
    expect(outputCallback).toHaveBeenCalledWith('new value');
    expect(mockQuit).toHaveBeenCalled();
  });

  it('skips the cache when the env is set', async () => {
    process.env.IGNORE_CACHE = 'true';

    mockGet.mockResolvedValue('value');

    const callback = jest.fn().mockResolvedValue('new value');
    const response = await getCachedResponse('key', callback);

    // since IGNORE_CACHE is true, the callback should be called
    // and the Redis get should not be called
    expect(mockGet).not.toHaveBeenCalled();
    expect(response).toEqual('new value');
    expect(callback).toHaveBeenCalled();
    expect(mockQuit).not.toHaveBeenCalled();
  });
});
