import request from 'supertest';
import { getAccessToken, getUserInfo } from './middleware/authMiddleware';
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

  describe('post-login redirect', () => {
    const loginWithReferrerPath = (referrerPath) => {
      process.env.TTA_SMART_HUB_URI = 'http://localhost:3000';
      getAccessToken.mockImplementation(async (req) => {
        req.session.claims = { sub: 'user-123' };
        req.session.referrerPath = referrerPath;
        return 'fake-access-token';
      });
      getUserInfo.mockResolvedValue({ sub: 'user-123', email: 'user@example.com' });

      return request(app).get('/oauth2-client/login/oauth2/code/').query({ code: 'abc' });
    };

    test('returns the user to the page they started login from', async () => {
      const resp = await loginWithReferrerPath('/cli/authorize?code=WDJBMJHT');

      expect(resp.status).toBe(302);
      expect(resp.headers.location).toBe('http://localhost:3000/cli/authorize?code=WDJBMJHT');
    });

    test('sends the user home when there is no referrer path', async () => {
      const resp = await loginWithReferrerPath('');

      expect(resp.status).toBe(302);
      expect(resp.headers.location).toBe('http://localhost:3000/');
    });

    test('sends the user home instead of back to the logout page', async () => {
      const resp = await loginWithReferrerPath('/logout?reason=timeout');

      expect(resp.status).toBe(302);
      expect(resp.headers.location).toBe('http://localhost:3000/');
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
