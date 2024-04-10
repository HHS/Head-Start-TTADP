import { createClient } from 'redis';
import getCachedResponse from './cache';

jest.mock('redis');

jest.mock('./queue', () => ({
  generateRedisConfig: jest.fn(() => ({
    uri: 'arg',
    tlsEnabled: true,
  })),
}));

const ORIGINAL_ENV = process.env;

describe('getCachedResponse', () => {
  beforeAll(() => {
    process.env = { ...ORIGINAL_ENV }; // make a copy
  });
  afterAll(() => {
    jest.clearAllMocks();
    process.env = ORIGINAL_ENV; // restore original env
  });

  it('returns the cached response', async () => {
    const callback = jest.fn(() => 'new value');
    createClient.mockImplementation(() => ({
      connect: jest.fn(),
      get: jest.fn(() => 'value'),
      set: jest.fn(),
      quit: jest.fn(),
    }));
    const response = await getCachedResponse('key', callback);
    expect(response).toEqual('value');
  });

  it('calls the callback when there is no cached response', async () => {
    createClient.mockImplementation(() => ({
      connect: jest.fn(),
      get: jest.fn(() => null),
      set: jest.fn(),
      quit: jest.fn(),
    }));
    const callback = jest.fn(() => 'new value');
    const response = await getCachedResponse('key', callback);
    expect(response).toEqual('new value');
  });

  it('handles a failure to connect to the client', async () => {
    createClient.mockImplementation(() => ({
      connect: jest.fn(() => { throw new Error('error'); }),
      get: jest.fn(() => null),
      set: jest.fn(),
      quit: jest.fn(),
    }));
    const callback = jest.fn(() => 'new value');
    const response = await getCachedResponse('key', callback);
    expect(response).toEqual('new value');
  });

  it('handles an error to set the response', async () => {
    createClient.mockImplementation(() => ({
      connect: jest.fn(),
      get: jest.fn(() => null),
      set: jest.fn(() => { throw new Error('error'); }),
      quit: jest.fn(),
    }));
    const callback = jest.fn(() => 'new value');
    const response = await getCachedResponse('key', callback);
    expect(response).toEqual('new value');
  });

  it('uses an output callback when provided', async () => {
    createClient.mockImplementation(() => ({
      connect: jest.fn(),
      get: jest.fn(() => null),
      set: jest.fn(),
      quit: jest.fn(),
    }));
    const callback = jest.fn(() => 'new value');
    const outputCallback = jest.fn(() => 'output value');
    const response = await getCachedResponse('key', callback, outputCallback);
    expect(response).toEqual('output value');
  });

  it('skips the cache when the env is set', async () => {
    process.env.IGNORE_CACHE = 'true';
    createClient.mockImplementation(() => ({
      connect: jest.fn(),
      get: jest.fn(() => 'value'),
      set: jest.fn(),
      quit: jest.fn(),
    }));
    const callback = jest.fn(() => 'new value');
    const response = await getCachedResponse('key', callback);
    expect(response).toEqual('new value');
  });
});
