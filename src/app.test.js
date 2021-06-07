import request from 'supertest';
import axios from 'axios';
import app from './app';
import { hsesAuth } from './middleware/authMiddleware';
import userInfoClassicLogin from './mocks/classicLogin';
import userInfoPivCardLogin from './mocks/pivCardLogin';
import findOrCreateUser from './services/accessValidation';

jest.mock('axios');
jest.mock('./middleware/authMiddleware');
jest.mock('./services/accessValidation');

describe('TTA Hub server', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // clear the cache
    process.env = { ...ORIGINAL_ENV }; // make a copy

    hsesAuth.code.getToken.mockResolvedValue({ sign: jest.fn().mockReturnValue({}) });
    findOrCreateUser.mockResolvedValue({ id: 1 });
  });

  afterAll(async () => {
    process.env = ORIGINAL_ENV; // restore original env
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('can handle oauth classic login user response from HSES', async () => {
    // Ensure authorization is required, do not bypass authorization check
    process.env.NODE_ENV = 'test';
    process.env.BYPASS_AUTH = 'false';

    const responseFromUserInfo = {
      status: 200,
      data: userInfoClassicLogin,
    };
    axios.get.mockResolvedValueOnce(responseFromUserInfo);

    hsesAuth.code.getToken.mockResolvedValue({ sign: jest.fn().mockReturnValue({}) });

    const resp = await request(app).get('/oauth2-client/login/oauth2/code/');
    expect(findOrCreateUser).toHaveBeenCalledWith({
      email: 'testUser@adhocteam.us', hsesAuthorities: ['ROLE_FEDERAL'], hsesUserId: '1', hsesUsername: 'testUser@adhocteam.us', name: 'testUser@adhocteam.us',
    });
    expect(resp.status).toBe(302);
  });

  test('can handle oauth piv card login user response from HSES', async () => {
    // Ensure authorization is required, do not bypass authorization check
    process.env.NODE_ENV = 'test';
    process.env.BYPASS_AUTH = 'false';

    const responseFromUserInfoPiv = {
      status: 200,
      data: userInfoPivCardLogin,
    };
    axios.get.mockResolvedValueOnce(responseFromUserInfoPiv);

    const resp = await request(app).get('/oauth2-client/login/oauth2/code/');
    expect(axios.get).toHaveBeenCalled();
    expect(findOrCreateUser).toHaveBeenCalledWith({
      email: 'testUser@adhocteam.us', hsesAuthorities: ['ROLE_FEDERAL'], hsesUserId: '1', hsesUsername: 'testUser@adhocteam.us', name: 'testUser@adhocteam.us',
    });
    expect(resp.status).toBe(302);
  });
});
