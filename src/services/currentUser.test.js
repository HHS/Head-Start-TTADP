import {} from 'dotenv/config';
import axios from 'axios';

import { retrieveUserDetails, currentUserId } from './currentUser';
import findOrCreateUser from './findOrCreateUser';
import userInfoClassicLogin from '../mocks/classicLogin';
import userInfoPivCardLogin from '../mocks/pivCardLogin';

jest.mock('axios');
jest.mock('./findOrCreateUser');

describe('currentUser', () => {
  beforeEach(async () => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('currentUserId', () => {
    const mockSession = jest.fn();
    const mockLocals = jest.fn();

    test('can retrieve userId from the session', () => {
      const mockRequest = { session: mockSession };
      const mockResponse = { locals: mockLocals };

      mockSession.userId = 5;

      expect(currentUserId(mockRequest, mockResponse)).toEqual(5);
    });

    test('can retrieve userId from the response locals', () => {
      const mockRequest = {};
      const mockResponse = { locals: mockLocals };

      mockLocals.userId = 10;

      expect(currentUserId(mockRequest, mockResponse)).toEqual(10);
    });
  });

  describe('retrieveUserDetails', () => {
    test('can handle oauth classic login user response from HSES', async () => {
      const responseFromUserInfo = {
        status: 200,
        data: userInfoClassicLogin,
      };
      axios.get.mockResolvedValueOnce(responseFromUserInfo);

      const accessToken = { sign: jest.fn().mockReturnValue({ url: '/auth/user/me' }) };

      await retrieveUserDetails(accessToken);

      expect(axios.get).toHaveBeenCalled();
      expect(findOrCreateUser).toHaveBeenCalledWith({
        name: 'testUser@adhocteam.us',
        email: 'testUser@adhocteam.us',
        hsesUsername: 'testUser@adhocteam.us',
        hsesAuthorities: ['ROLE_FEDERAL'],
        hsesUserId: '1',
      });
    });

    test('can handle oauth piv card login user response from HSES', async () => {
      const responseFromUserInfoPiv = {
        status: 200,
        data: userInfoPivCardLogin,
      };
      axios.get.mockResolvedValueOnce(responseFromUserInfoPiv);

      const accessToken = { sign: jest.fn().mockReturnValue({ url: '/auth/user/me' }) };

      await retrieveUserDetails(accessToken);

      expect(axios.get).toHaveBeenCalled();
      expect(findOrCreateUser).toHaveBeenCalledWith({
        name: 'testUser@adhocteam.us',
        email: 'testUser@adhocteam.us',
        hsesUsername: 'testUser@adhocteam.us',
        hsesAuthorities: ['ROLE_FEDERAL'],
        hsesUserId: '1',
      });
    });
  });
});
