import request from 'supertest';
import axios from 'axios';
import app from './app';
import * as currentUser from './services/currentUser';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn().mockResolvedValue({ data: { accessToken: 'fake-access-token' } }),
    get: jest.fn().mockResolvedValue({ data: { id: 'mock-user-id', name: 'Test User' } }),
  },
}));

jest.mock('smartsheet');

describe('TTA Hub server', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    process.env.NODE_ENV = 'test';
    process.env.BYPASS_AUTH = 'false';
    process.env.REDIRECT_URI_HOST = 'http://localhost:8080';
    process.env.AUTH_BASE = 'https://mock-auth.com';
    process.env.AUTH_CLIENT_ID = 'mock-client-id';
    process.env.TTA_SMART_HUB_URI = 'http://localhost:8080';

    axios.post.mockResolvedValue({ data: { accessToken: 'fake-access-token' } });
    axios.get.mockResolvedValue({ data: { id: 'mock-user-id', name: 'Test User' } });
  });

  afterEach(() => {
    jest.resetAllMocks();
    process.env = ORIGINAL_ENV;
  });

  test('retrieves user details to login', async () => {
    const spy = jest.spyOn(currentUser, 'retrieveUserDetails').mockResolvedValue({ id: 1 });
    const resp = await request(app)
      .get('/oauth2-client/login/oauth2/code/?code=test-code')
      .set('Cookie', ['session=mock-session']);

    expect(axios.post).toHaveBeenCalled();
    expect(axios.get).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
    expect(resp.status).toBe(302);
  });
});
