import {} from 'dotenv/config';
import { FORBIDDEN, UNAUTHORIZED } from 'http-codes';
import db, { User, Permission } from '../models';
import SCOPES from './scopeConstants';

jest.mock('openid-client', () => {
  /* eslint-disable global-require */
  const { URL } = require('node:url');
  const moduleAsClient = {
    discovery: jest.fn(async () => ({})),
    allowInsecureRequests: {},
    PrivateKeyJwt: jest.fn(() => ({})),
    randomState: jest.fn(() => 'state'),
    randomNonce: jest.fn(() => 'nonce'),
    randomPKCECodeVerifier: jest.fn(() => 'verifier'),
    calculatePKCECodeChallenge: jest.fn(async () => 'challenge'),
    buildAuthorizationUrl: jest.fn(() => new URL('https://auth.example/authorize?x=1')),
    authorizationCodeGrant: jest.fn(async () => ({
      access_token: 'fake-access',
      id_token: 'fake-id',
      claims: () => ({
        sub: 'user-123',
        email: 'user@example.com',
        given_name: 'Test',
        family_name: 'User',
        userId: '123',
        roles: [],
      }),
    })),
    fetchUserInfo: jest.fn(async () => ({
      sub: 'user-123',
      email: 'user@example.com',
      given_name: 'Test',
      family_name: 'User',
      userId: '123',
      roles: [],
    })),
    buildEndSessionUrl: jest.fn(() => new URL('https://auth.example/logout')),
  };
  return { __esModule: true, ...moduleAsClient };
});

jest.mock('./jwkKeyManager', () => ({
  __esModule: true,
  getPrivateJwk: jest.fn(async () => ({
    kty: 'RSA', kid: 'test', n: 'n', e: 'AQAB',
  })),
}));

/* eslint-disable global-require */
const { default: authMiddleware, login } = require('./authMiddleware');

const mockUser = {
  id: 66349,
  name: 'Auth Middleware',
  hsesUserId: '66349',
  hsesUsername: 'auth.middleware',
  permissions: [{ userId: 66349, regionId: 14, scopeId: SCOPES.SITE_ACCESS }],
  lastLogin: new Date(),
};

const unAuthdUser = {
  id: 663491,
  name: 'unAuth Middleware',
  hsesUserId: '663491',
  hsesUsername: 'unauth.middleware',
  permissions: [],
  lastLogin: new Date(),
};

describe('authMiddleware', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      AUTH_BASE: 'http://auth.local',
      AUTH_CLIENT_ID: 'client-local',
      REDIRECT_URI_HOST: 'http://localhost:3000',
      TTA_SMART_HUB_URI: 'http://localhost:3000',
    };
    jest.clearAllMocks();
  });

  afterAll(async () => {
    process.env = ORIGINAL_ENV;
    await User.destroy({ where: { id: [mockUser.id, unAuthdUser.id] }, individualHooks: true });
    await db.sequelize.close();
  });

  const setupUser = async (user) => {
    await User.destroy({ where: { id: user.id } });
    await User.create(user, { include: [{ model: Permission, as: 'permissions' }] });
  };
  const destroyUser = async (user) => User.destroy({ where: { id: user.id } });

  it('should allow access if user data is present', async () => {
    await setupUser(mockUser);
    process.env.CURRENT_USER_ID = String(mockUser.id);

    const next = jest.fn();
    const req = { path: '/api/endpoint', session: { userId: mockUser.id } };
    const res = { redirect: jest.fn(), sendStatus: jest.fn() };

    await authMiddleware(req, res, next);
    expect(res.redirect).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    await destroyUser(mockUser);
  });

  it('should send 401 if user data is not present', async () => {
    process.env.NODE_ENV = 'test';
    process.env.BYPASS_AUTH = 'false';

    const next = jest.fn();
    const req = { path: '/api/endpoint', session: {}, headers: { referer: 'http://localhost:3000' } };
    const res = { redirect: jest.fn(), sendStatus: jest.fn() };

    await authMiddleware(req, res, next);
    expect(res.redirect).not.toHaveBeenCalled();
    expect(res.sendStatus).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('login should redirect to IdP', async () => {
    const req = { path: '/api/login', session: {}, headers: { referer: 'http://localhost:3000' } };
    const res = { redirect: jest.fn(), sendStatus: jest.fn() };

    await login(req, res);
    expect(res.redirect).toHaveBeenCalled();
    expect(req.session.referrerPath).toBe('/');
  });

  it('login sets referrerPath to empty string if no referrer', async () => {
    const req = { path: '/api/login', session: {}, headers: {} };
    const res = { redirect: jest.fn(), sendStatus: jest.fn() };

    await login(req, res);
    expect(req.session.referrerPath).toBe('');
  });

  it('bypass auth when NODE_ENV non-prod and BYPASS_AUTH=true', async () => {
    const user = { ...mockUser, id: 777, hsesUserId: '777' };
    await setupUser(user);
    process.env.NODE_ENV = 'development';
    process.env.BYPASS_AUTH = 'true';
    process.env.CURRENT_USER_ID = '777';

    const next = jest.fn();
    const req = { path: '/api/endpoint', session: {} };
    const res = { redirect: jest.fn(), sendStatus: jest.fn() };

    await authMiddleware(req, res, next);
    expect(res.redirect).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    await destroyUser(user);
  });

  it('requires auth in production even if BYPASS_AUTH=true', async () => {
    process.env.NODE_ENV = 'production';
    process.env.BYPASS_AUTH = 'true';

    const next = jest.fn();
    const req = { path: '/api/endpoint', session: {} };
    const res = { redirect: jest.fn(), sendStatus: jest.fn() };

    await authMiddleware(req, res, next);
    expect(res.redirect).not.toHaveBeenCalled();
    expect(res.sendStatus).toHaveBeenCalledWith(UNAUTHORIZED);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 if user lacks SITE_ACCESS', async () => {
    await setupUser(unAuthdUser);
    process.env.CURRENT_USER_ID = String(unAuthdUser.id);

    const next = jest.fn();
    const req = { path: '/api/endpoint', session: { userId: unAuthdUser.id } };
    const res = { redirect: jest.fn(), sendStatus: jest.fn() };

    await authMiddleware(req, res, next);
    expect(res.redirect).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.sendStatus).toHaveBeenCalledWith(FORBIDDEN);
    await destroyUser(unAuthdUser);
  });

  it('no-op if headers already sent', async () => {
    const next = jest.fn();
    const req = { path: '/api/endpoint', session: {} };
    const res = { headersSent: true, redirect: jest.fn(), sendStatus: jest.fn() };

    await authMiddleware(req, res, next);
    expect(res.redirect).not.toHaveBeenCalled();
    expect(res.sendStatus).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
