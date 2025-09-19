/* eslint-disable global-require */
import request from 'supertest';

jest.mock('./middleware/authMiddleware', () => ({
  __esModule: true,
  // For this test we expect 401 when not logged in
  default: (_req, res) => res.sendStatus(401),
  login: jest.fn(),
  getAccessToken: jest.fn(),
  getUserInfo: jest.fn(),
  logoutOidc: jest.fn(),
}));

jest.mock('./middleware/jwkKeyManager', () => ({
  __esModule: true,
  getPrivateJwk: jest.fn().mockResolvedValue({
    kty: 'RSA', kid: 'test', n: 'n', e: 'AQAB',
  }),
}));

jest.mock('./middleware/sessionMiddleware', () => ({
  __esModule: true,
  default: (_req, _res, next) => next(),
}));
jest.mock('./lib/redisClient', () => ({
  __esModule: true,
  getRedis: jest.fn(() => ({ on: jest.fn(), quit: jest.fn() })),
}));

jest.mock('axios');
jest.mock('smartsheet');

// Import app AFTER mocks so it uses stubs
const app = require('./app').default || require('./app');

describe('Root', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test('Responds with a 401 (Unauthorized) if user is not logged in', async () => {
    process.env.NODE_ENV = 'test';
    process.env.BYPASS_AUTH = 'false';

    const response = await request(app).get('/api');
    expect(response.status).toBe(401);
  });
});
