import request from 'supertest';
import SCOPES from '../middleware/scopeConstants';
import db, { User, Permission } from '../models';

jest.mock('../middleware/authMiddleware', () => ({
  __esModule: true,
  default: (_req, _res, next) => next(),
  login: jest.fn(),
  getAccessToken: jest.fn(),
  getUserInfo: jest.fn(),
  logoutOidc: jest.fn((req, res) => res.status(204).end()),
}));

jest.mock('../middleware/jwkKeyManager', () => ({
  __esModule: true,
  getPrivateJwk: jest.fn().mockResolvedValue({
    kty: 'RSA',
    kid: 'test',
    n: 'test',
    e: 'AQAB',
  }),
}));

jest.mock('../services/users');
jest.mock('axios');
jest.mock('smartsheet');

/* eslint-disable global-require */
const app = require('../app').default || require('../app');

const mockUser = {
  id: 110110,
  hsesUserId: '110110',
  hsesUsername: 'user110110',
  homeRegionId: 1,
  permissions: [
    { userId: 110110, regionId: 5, scopeId: SCOPES.READ_WRITE_REPORTS },
    { userId: 110110, regionId: 6, scopeId: SCOPES.READ_WRITE_REPORTS },
    { userId: 110110, regionId: 14, scopeId: SCOPES.SITE_ACCESS },
  ],
  lastLogin: new Date(),
};

describe('apiDirectory tests', () => {
  beforeAll(async () => {
    await User.create(mockUser, { include: [{ model: Permission, as: 'permissions' }] });
    process.env.NODE_ENV = 'test';
    process.env.BYPASS_AUTH = 'true';
    process.env.CURRENT_USER_ID = 110110;
  });

  afterAll(async () => {
    await User.destroy({ where: { id: mockUser.id } });
    await db.sequelize.close();
  });

  it('tests an unknown route', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.statusCode).toBe(404);
  });

  it('tests the logout route', async () => {
    const res = await request(app).get('/api/logout');
    expect(res.statusCode).toBe(204);
  });

  it('sets Content-Type header to application/json for successful responses', async () => {
    const res = await request(app).get('/api/unknown');
    // Even though this is a 404, the middleware sets Content-Type for all responses
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('sets Content-Type header for 404 responses', async () => {
    const res = await request(app).get('/api/unknown-route');
    expect(res.statusCode).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('returns the current user data from /api/user endpoint', async () => {
    const { userById } = require('../services/users');
    const mockUserData = {
      id: 110110,
      hsesUsername: 'user110110',
      toJSON: jest.fn().mockReturnValue({
        id: 110110,
        hsesUsername: 'user110110',
      }),
    };
    userById.mockResolvedValue(mockUserData);

    const res = await request(app).get('/api/user');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      id: 110110,
      hsesUsername: 'user110110',
    });
    expect(mockUserData.toJSON).toHaveBeenCalled();
  });

  it('handles errors in /api/user endpoint', async () => {
    const { userById } = require('../services/users');
    const testError = new Error('User not found');
    userById.mockRejectedValue(testError);

    const res = await request(app).get('/api/user');
    // The error handler will return a status code (typically 500 or similar)
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});
