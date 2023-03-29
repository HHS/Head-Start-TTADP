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
  const ORIGINAL_ENV = process.env;

  beforeAll(() => {
    process.env.CI = false;
  });

  afterAll(() => {
    jest.clearAllMocks();
    process.env = ORIGINAL_ENV;
  });

  it('returns the cached response', async () => {
    const callback = jest.fn();
    const response = await getCachedResponse('key', callback);
    expect(response).toEqual('value');
  });
});
