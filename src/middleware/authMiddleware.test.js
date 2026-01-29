import {} from 'dotenv/config';
import { FORBIDDEN, UNAUTHORIZED } from 'http-codes';
import db, { User, Permission } from '../models';
import SCOPES from './scopeConstants';
import { getUserInfo, getAccessToken, logoutOidc } from './authMiddleware';

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

jest.mock('../lib/apiErrorHandler', () => ({
  __esModule: true,
  default: jest.fn(async () => {}),
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
    process.env.CURRENT_USER_ID = 66349;
    await setupUser(mockUser);

    const mockNext = jest.fn();
    const mockSession = jest.fn();
    mockSession.userId = mockUser.id;
    const mockRequest = {
      path: '/api/endpoint',
      session: mockSession,
    };
    const mockResponse = {
      redirect: jest.fn(),
      sendStatus: jest.fn(),
    };
    await authMiddleware(mockRequest, mockResponse, mockNext);
    expect(mockResponse.redirect).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
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

  it('bypass authorization if variables are set for UAT or accessibility testing', async () => {
    // auth is bypassed if non-prod NODE_ENV and BYPASS_AUTH = 'true', needed for cucumber and axe
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

  it('getAccessToken: returns access token and stores claims & id_token in session', async () => {
    const req = {
      originalUrl: '/oauth2-client/login/oauth2/code/?code=abc&state=state',
      protocol: 'http',
      get: () => 'localhost:3000',
      session: {
        pkce: { codeVerifier: 'verifier', state: 'state', nonce: 'nonce' },
      },
    };

    const token = await getAccessToken(req);

    expect(token).toBe('fake-access');
    expect(req.session.claims).toEqual({
      sub: 'user-123',
      email: 'user@example.com',
      given_name: 'Test',
      family_name: 'User',
      userId: '123',
      roles: [],
    });
    expect(req.session.id_token).toBe('fake-id');

    // sanity: our mocked client was invoked with the PKCE checks
    const oc = require('openid-client');
    expect(oc.authorizationCodeGrant).toHaveBeenCalledWith(
      expect.anything(), // issuerConfig
      expect.any(URL), // currentUrl
      expect.objectContaining({
        pkceCodeVerifier: 'verifier',
        expectedState: 'state',
        expectedNonce: 'nonce',
        idTokenExpected: true,
      }),
    );
  });

  it('getAccessToken: returns undefined when PKCE verifier is missing', async () => {
    const req = {
      originalUrl: '/oauth2-client/login/oauth2/code/?code=abc&state=state',
      protocol: 'http',
      get: () => 'localhost:3000',
      session: {
        pkce: { state: 'state', nonce: 'nonce' },
      },
    };

    const token = await getAccessToken(req);
    expect(token).toBeUndefined();

    const oc = require('openid-client');
    expect(oc.authorizationCodeGrant).not.toHaveBeenCalled();
  });

  it('getAccessToken: returns undefined on error', async () => {
    const oc = require('openid-client');
    oc.authorizationCodeGrant.mockRejectedValueOnce(new Error('boom'));

    const req = {
      originalUrl: '/oauth2-client/login/oauth2/code/?code=abc&state=state',
      protocol: 'http',
      get: () => 'localhost:3000',
      session: {
        pkce: { codeVerifier: 'verifier', state: 'state', nonce: 'nonce' },
      },
    };

    const token = await getAccessToken(req);
    expect(token).toBeUndefined();
  });

  it('getUserInfo: returns user info for valid access token and subject', async () => {
    const info = await getUserInfo('fake-access', 'user-123');
    expect(info).toEqual({
      sub: 'user-123',
      email: 'user@example.com',
      given_name: 'Test',
      family_name: 'User',
      userId: '123',
      roles: [],
    });

    const oc = require('openid-client');
    expect(oc.fetchUserInfo).toHaveBeenCalledWith(
      expect.anything(),
      'fake-access',
      'user-123',
    );
  });

  it('getUserInfo: throws if accessToken or subject missing', async () => {
    await expect(getUserInfo(undefined, 'user-123')).rejects.toThrow(
      'Access token and subject are required',
    );
    await expect(getUserInfo('fake-access', undefined)).rejects.toThrow(
      'Access token and subject are required',
    );
  });

  it('getUserInfo: returns undefined if fetchUserInfo fails', async () => {
    const oc = require('openid-client');
    oc.fetchUserInfo.mockRejectedValueOnce(new Error('nope'));

    const result = await getUserInfo('fake-access', 'user-123');
    expect(result).toBeUndefined();
  });

  it('logoutOidc: redirects to IdP end-session URL and clears session (with id_token_hint)', async () => {
    const req = {
      sessionID: 'sid-123',
      session: {
        idToken: 'id-token-abc',
        userId: 42,
        destroy: jest.fn((cb) => cb && cb()),
      },
    };
    const res = { redirect: jest.fn(), clearCookie: jest.fn() };

    await logoutOidc(req, res);

    expect(res.redirect).toHaveBeenCalledWith('https://auth.example/logout');
    expect(res.clearCookie).toHaveBeenCalledWith(
      'session',
      expect.objectContaining({ path: '/', httpOnly: true, sameSite: 'lax' }),
    );
    // ensure local session destroy was attempted
    expect(req.session.destroy).toHaveBeenCalled();
  });

  it('logoutOidc: falls back to /logout when end-session is unavailable (headers NOT sent)', async () => {
    const oc = require('openid-client');
    oc.buildEndSessionUrl.mockImplementationOnce(() => {
      throw new Error('end-session down');
    });

    const req = { session: { id_token: 'fake-id', userId: 99 } };
    const res = { redirect: jest.fn(), clearCookie: jest.fn(), headersSent: false };

    await logoutOidc(req, res);

    expect(res.redirect).toHaveBeenCalledWith('/logout');
    // in this branch, middleware does NOT clear session
    expect(req.session).toEqual({ id_token: 'fake-id', userId: 99 });
  });

  it('logoutOidc: if headers already sent, clears session and sends 204', async () => {
    const oc = require('openid-client');
    oc.buildEndSessionUrl.mockImplementationOnce(() => {
      throw new Error('end-session down');
    });

    const req = {
      session: { userId: 777, destroy: jest.fn((cb) => cb && cb()) },
    };
    const res = {
      headersSent: true,
      redirect: jest.fn(),
      clearCookie: jest.fn(),
      sendStatus: jest.fn(),
    };

    await logoutOidc(req, res);

    expect(res.redirect).not.toHaveBeenCalled();
    expect(res.sendStatus).toHaveBeenCalledWith(204);
    expect(req.session.destroy).toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledWith(
      'session',
      expect.objectContaining({ path: '/', httpOnly: true, sameSite: 'lax' }),
    );
  });

  it('login: on error, logs and responds 500 (catch path)', async () => {
    const oc = require('openid-client');
    oc.calculatePKCECodeChallenge.mockRejectedValueOnce(new Error('some error'));

    const req = {
      path: '/api/login',
      headers: { referer: 'http://localhost:3000/some/page' },
      session: {},
    };
    const res = {
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      sendStatus: jest.fn(),
    };

    await login(req, res);

    expect(res.redirect).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('Failed to start login');
    expect(req.session.pkce?.codeVerifier).toBeDefined();
  });

  it('calls handleErrors when validateUserAuthForAccess throws (catch path)', async () => {
    const req = { path: '/api/endpoint', session: { userId: 42 } };
    const res = { sendStatus: jest.fn(), headersSent: false };
    const next = jest.fn();

    const access = require('../services/accessValidation');
    jest
      .spyOn(access, 'validateUserAuthForAccess')
      .mockRejectedValue(new Error('kaboom'));

    const handleErrors = require('../lib/apiErrorHandler').default;

    const { default: underTest } = require('./authMiddleware');
    await underTest(req, res, next);

    expect(handleErrors).toHaveBeenCalledTimes(1);
    expect(handleErrors).toHaveBeenCalledWith(
      req,
      res,
      expect.any(Error),
      'MIDDLEWARE:AUTH',
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.sendStatus).not.toHaveBeenCalled();
  });
});
