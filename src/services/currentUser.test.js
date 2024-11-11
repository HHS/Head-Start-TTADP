import {} from 'dotenv/config';
import axios from 'axios';
import httpCodes from 'http-codes';

import httpContext from 'express-http-context';
import { retrieveUserDetails, currentUserId } from './currentUser';
import findOrCreateUser from './findOrCreateUser';
import userInfoClassicLogin from '../mocks/classicLogin';
import userInfoPivCardLogin from '../mocks/pivCardLogin';
import { auditLogger } from '../logger';

jest.mock('axios');
jest.mock('./findOrCreateUser');
jest.mock('./accessValidation', () => ({
  validateUserAuthForAdmin: jest.fn(),
}));
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
  },
  auditLogger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));
jest.mock('express-http-context', () => ({
  set: jest.fn(),
}));

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

    test('can retrieve userId from the session', async () => {
      const mockRequest = { session: mockSession, headers: {} };
      const mockResponse = { locals: mockLocals };

      mockSession.userId = 5;

      expect(await currentUserId(mockRequest, mockResponse)).toEqual(5);
    });

    test('can retrieve userId from the response locals', async () => {
      const mockRequest = { headers: {} };
      const mockResponse = { locals: mockLocals };

      mockLocals.userId = 10;

      expect(await currentUserId(mockRequest, mockResponse)).toEqual(10);
    });

    test('bypasses auth and retrieves userId from environment variables when not in production and BYPASS_AUTH is true', async () => {
      process.env.NODE_ENV = 'development';
      process.env.BYPASS_AUTH = 'true';
      process.env.CURRENT_USER_ID = '999';

      const mockRequest = { session: {}, headers: {} };
      const mockResponse = {};

      const userId = await currentUserId(mockRequest, mockResponse);

      expect(userId).toEqual(999);
      expect(mockRequest.session.userId).toEqual('999');
      expect(mockRequest.session.uuid).toBeDefined();
    });

    test('handles impersonation when Auth-Impersonation-Id header is set and user is not an admin', async () => {
      const { validateUserAuthForAdmin } = await import('./accessValidation');

      const mockRequest = {
        headers: { 'auth-impersonation-id': JSON.stringify(200) },
        session: {},
      };
      const mockResponse = {
        sendStatus: jest.fn(),
        locals: {},
      };
      mockResponse.locals.userId = 100; // Non-admin user

      validateUserAuthForAdmin.mockResolvedValueOnce(false); // Non-admin user cannot impersonate

      await currentUserId(mockRequest, mockResponse);

      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.UNAUTHORIZED);
      expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining('Impersonation failure. User (100) attempted to impersonate user (200), but the session user (100) is not an admin.'));
    });

    test('handles impersonation when Auth-Impersonation-Id header is set and impersonated user is an admin', async () => {
      const { validateUserAuthForAdmin } = await import('./accessValidation');
      const mockRequest = {

        headers: { 'auth-impersonation-id': JSON.stringify(300) },
        session: {},
      };
      const mockResponse = {
        sendStatus: jest.fn(),
        locals: {},
      };
      mockResponse.locals.userId = 100; // Admin user

      validateUserAuthForAdmin
        .mockResolvedValueOnce(true) // Current user is an admin
        .mockResolvedValueOnce(true); // Impersonated user is also an admin

      await currentUserId(mockRequest, mockResponse);

      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.UNAUTHORIZED);
      expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining('Impersonation failure. User (100) attempted to impersonate user (300), but the session user (100) is not an admin.'));
    });

    test('allows impersonation when Auth-Impersonation-Id header is set and both users pass validation', async () => {
      const mockRequest = {
        session: {},
      };
      const mockResponse = {
        sendStatus: jest.fn(),
        locals: { userId: 100 },
      };

      const userId = await currentUserId(mockRequest, mockResponse);

      expect(userId).toEqual(100);
      expect(mockResponse.sendStatus).not.toHaveBeenCalledWith(httpCodes.UNAUTHORIZED);
    });

    test('handles invalid JSON in Auth-Impersonation-Id header gracefully', async () => {
      const mockRequest = {
        headers: { 'auth-impersonation-id': '{invalidJson}' },
        session: {},
      };
      const mockResponse = {
        locals: {},
        status: jest.fn().mockReturnThis(), // Enables chaining: status(...).end()
        end: jest.fn(), // Mock the end function
      };

      await currentUserId(mockRequest, mockResponse);

      const expectedMessage = 'Could not parse the Auth-Impersonation-Id header';
      expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining(expectedMessage));
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
