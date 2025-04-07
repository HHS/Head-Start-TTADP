import request from 'supertest';
import axios from 'axios';
import app from './app';
import { retrieveUserDetails } from './services/currentUser';

jest.mock('./services/currentUser');
jest.mock('axios');
jest.mock('smartsheet');

describe('TTA Hub server', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };

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

    retrieveUserDetails.mockResolvedValue({
      id: 1,
    });
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('retrieves user details to login', async () => {
    process.env.NODE_ENV = 'test';
    process.env.BYPASS_AUTH = 'false';

    const resp = await request(app)
      .get('/oauth2-client/login/oauth2/code/?code=test-code')
      .set('Cookie', ['session=mock-session']);

    expect(axios.post).toHaveBeenCalled();
    expect(axios.get).toHaveBeenCalled();
    expect(retrieveUserDetails).toHaveBeenCalled();
    expect(resp.status).toBe(302);
  });
});
