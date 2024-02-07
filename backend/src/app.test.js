import request from 'supertest';
import app from './app';
import { hsesAuth } from './middleware/authMiddleware';
import { retrieveUserDetails } from './services/currentUser';

jest.mock('./middleware/authMiddleware');
jest.mock('./services/currentUser');

describe('TTA Hub server', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // clear the cache
    process.env = { ...ORIGINAL_ENV }; // make a copy

    hsesAuth.code.getToken.mockResolvedValue({ sign: jest.fn().mockReturnValue({}) });
    retrieveUserDetails.mockResolvedValue({ id: 1 });
  });

  afterAll(async () => {
    process.env = ORIGINAL_ENV; // restore original env
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('retrieves user details to login', async () => {
    // Ensure authorization is required, do not bypass authorization check
    process.env.NODE_ENV = 'test';
    process.env.BYPASS_AUTH = 'false';

    const resp = await request(app).get('/oauth2-client/login/oauth2/code/');
    expect(retrieveUserDetails).toHaveBeenCalled();
    expect(resp.status).toBe(302);
  });
});
