import request from 'supertest';
import axios from 'axios';
import * as currentUserService from './services/currentUser';
import app from './app';
// import { retrieveUserDetails } from './services/currentUser';

jest.mock('./services/currentUser');
jest.mock('axios');
jest.mock('smartsheet');

describe('TTA Hub server', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };

    // Ensure all env vars used in the route are set
    process.env.NODE_ENV = 'test';
    process.env.BYPASS_AUTH = 'false';
    process.env.REDIRECT_URI_HOST = 'http://localhost:3000';
    process.env.AUTH_BASE = 'https://mock-auth.com';
    process.env.AUTH_CLIENT_ID = 'mock-client-id';
    process.env.TTA_SMART_HUB_URI = 'http://localhost:3000';

    // Mock token response
    axios.post.mockResolvedValue({
      data: {
        accessToken: 'fake-access-token',
      },
    });

    // Mock user info
    axios.get.mockResolvedValue({
      data: {
        id: 'mock-user-id',
        name: 'Test User',
      },
    });

    currentUserService.retrieveUserDetails.mockResolvedValue({
      id: 1,
    });
  });

  // afterAll(() => {
  //   process.env = ORIGINAL_ENV;
  // });

  afterEach(() => {
    jest.resetAllMocks();
    process.env = ORIGINAL_ENV;
  });

  test('retrieves user details to login', async () => {
    // process.env.NODE_ENV = 'test';
    // process.env.BYPASS_AUTH = 'false';

    const resp = await request(app)
      .get('/oauth2-client/login/oauth2/code/?code=test-code')
      .set('Cookie', ['session=mock-session']);

    expect(axios.post).toHaveBeenCalled();
    expect(axios.get).toHaveBeenCalled();
    expect(currentUserService.retrieveUserDetails).toHaveBeenCalled();
    expect(resp.status).toBe(302);
  });
});
