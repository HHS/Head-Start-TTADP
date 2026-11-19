import request from 'supertest';
import { auditLogger } from './logger';
import { getAccessToken, getMissingLoginState, getUserInfo } from './middleware/authMiddleware';
import { retrieveUserDetails } from './services/currentUser';

jest.mock('./services/currentUser', () => ({
  __esModule: true,
  retrieveUserDetails: jest.fn(),
}));

jest.mock('./middleware/authMiddleware', () => ({
  __esModule: true,
  default: (req, _res, next) => next(),

  login: jest.fn((req, res) => {
    req.session = req.session || {};
    req.session.pkce = { codeVerifier: 'v', state: 'xyz', nonce: 'n' };
    res.redirect('/');
  }),

  getMissingLoginState: jest.fn(),

  getAccessToken: jest.fn(async (req) => {
    req.session = req.session || {};

    req.session.claims = {
      sub: 'user-123',
      email: 'user@example.com',
      given_name: 'Test',
      family_name: 'User',
      userId: '123',
      roles: [],
    };
    return 'fake-access-token';
  }),

  getUserInfo: jest.fn(async () => ({
    sub: 'user-123',
    email: 'user@example.com',
    given_name: 'Test',
    family_name: 'User',
    userId: '123',
    roles: [],
  })),

  logoutOidc: jest.fn(),
}));

jest.mock('./middleware/jwkKeyManager', () => ({
  __esModule: true,
  getPrivateJwk: jest.fn().mockResolvedValue({
    kty: 'RSA',
    kid: 'test',
    n: 'test',
    e: 'AQAB',
  }),
}));

jest.mock('axios');
jest.mock('smartsheet');

/* eslint-disable global-require */
const app = require('./app').default || require('./app');

describe('TTA Hub server', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.NODE_ENV = 'test';
    process.env.BYPASS_AUTH = 'false';

    retrieveUserDetails.mockResolvedValue({ id: 1 });
    process.env.TTA_SMART_HUB_URI = 'http://localhost:3000';
    // resetAllMocks in afterEach clears the module-level implementations
    getMissingLoginState.mockReturnValue(undefined);
    getAccessToken.mockImplementation(async (req) => {
      req.session.claims = { sub: 'user-123' };
      return 'fake-access-token';
    });
    getUserInfo.mockResolvedValue({
      email: 'user@example.com',
      given_name: 'Test',
      family_name: 'User',
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test('retrieves user details to login', async () => {
    const resp = await request(app)
      .get('/oauth2-client/login/oauth2/code/')
      .query({ code: 'abc', state: 'xyz' });

    expect(retrieveUserDetails).toHaveBeenCalled();
    expect(retrieveUserDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        given_name: 'Test',
        family_name: 'User',
      })
    );

    expect(resp.status).toBe(302);
  });

  describe('login callback', () => {
    const callback = (query) => request(app).get('/oauth2-client/login/oauth2/code/').query(query);

    test.each(['missing_session', 'missing_pkce', 'missing_code_verifier'])(
      'returns 400 with a restart link and no user lookup when login state is lost (%s)',
      async (reason) => {
        const errorSpy = jest.spyOn(auditLogger, 'error').mockImplementation(() => {});
        const alertSpy = jest.spyOn(auditLogger, 'alertError').mockImplementation(() => {});
        getMissingLoginState.mockReturnValue(reason);

        const resp = await callback({ code: 'secret-code', state: 'secret-state' });

        expect(resp.status).toBe(400);
        expect(resp.text).toContain('href="http://localhost:3000/api/login"');
        expect(getAccessToken).not.toHaveBeenCalled();
        expect(getUserInfo).not.toHaveBeenCalled();
        expect(retrieveUserDetails).not.toHaveBeenCalled();
        expect(alertSpy).not.toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledWith('Login callback cannot be completed', {
          reason,
          hasSession: true,
          hasPkce: expect.any(Boolean),
          hasCode: true,
          hasState: true,
          hasIdpError: false,
        });
        const logged = JSON.stringify(errorSpy.mock.calls);
        expect(logged).not.toMatch(/secret-code|secret-state/);

        errorSpy.mockRestore();
        alertSpy.mockRestore();
      }
    );

    test('returns 400 without starting an exchange when HSES reports an error', async () => {
      const errorSpy = jest.spyOn(auditLogger, 'error').mockImplementation(() => {});

      const resp = await callback({ error: 'access_denied' });

      expect(resp.status).toBe(400);
      expect(resp.text).toContain('Start login again');
      expect(getMissingLoginState).not.toHaveBeenCalled();
      expect(getAccessToken).not.toHaveBeenCalled();
      expect(retrieveUserDetails).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        'Login callback cannot be completed',
        expect.objectContaining({ reason: 'idp_error', hasIdpError: true })
      );

      errorSpy.mockRestore();
    });

    test('still returns 500 and alerts when the token exchange genuinely fails', async () => {
      const alertSpy = jest.spyOn(auditLogger, 'alertError').mockImplementation(() => {});
      getAccessToken.mockResolvedValue(undefined);

      const resp = await callback({ code: 'abc', state: 'xyz' });

      expect(resp.status).toBe(500);
      expect(alertSpy).toHaveBeenCalledWith(
        'No access token retrieved',
        'auth_access_token_missing'
      );
      expect(retrieveUserDetails).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });

    test('does not carry pkce state into the session after a successful login', async () => {
      let callbackReq;
      getAccessToken.mockImplementation(async (req) => {
        callbackReq = req;
        req.session.pkce = { codeVerifier: 'v', state: 'xyz', nonce: 'n' };
        req.session.claims = { sub: 'user-123' };
        return 'fake-access-token';
      });

      const resp = await callback({ code: 'abc', state: 'xyz' });

      expect(resp.status).toBe(302);
      expect(callbackReq.session.userId).toBe(1);
      expect(callbackReq.session.pkce).toBeUndefined();
    });
  });

  test('parses bracket-notation query arrays with more than 20 entries as arrays', () => {
    // Guards against the default `qs` arrayLimit (20), which silently converts
    // large arrays into objects keyed by index. Filters like
    // `stateCode.nin[]=...` on the goal dashboard can easily exceed 20 values
    // (e.g. selecting every state/territory) and must remain arrays so the
    // backend scope code treats them as a list of search terms.
    const parser = app.get('query parser fn');
    const queryString = Array.from(
      { length: 60 },
      (_, i) => `stateCode.nin[]=S${i.toString().padStart(2, '0')}`
    ).join('&');

    const parsed = parser(queryString);

    expect(Array.isArray(parsed['stateCode.nin'])).toBe(true);
    expect(parsed['stateCode.nin']).toHaveLength(60);
    expect(parsed['stateCode.nin'][0]).toBe('S00');
    expect(parsed['stateCode.nin'][59]).toBe('S59');
  });
});
