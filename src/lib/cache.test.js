import getCachedResponse from './cache';

jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    get: jest.fn(() => 'value'),
    set: jest.fn(),
    quit: jest.fn(),
  })),
}));

jest.mock('./queue', () => ({
  generateRedisConfig: jest.fn(() => ({
    uri: 'arg',
    tlsEnabled: true,
  })),
}));

describe('getCachedResponse', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it('returns the cached response', async () => {
    const callback = jest.fn();
    const response = await getCachedResponse('key', callback);
    expect(response).toEqual('value');
  });
});
