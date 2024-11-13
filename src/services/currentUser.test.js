import {} from 'dotenv/config';
import axios from 'axios';
import httpCodes from 'http-codes';

import httpContext from 'express-http-context';
import isEmail from 'validator/lib/isEmail';
import { retrieveUserDetails, currentUserId } from './currentUser';
import findOrCreateUser from './findOrCreateUser';
import userInfoClassicLogin from '../mocks/classicLogin';
import userInfoPivCardLogin from '../mocks/pivCardLogin';
import { auditLogger } from '../logger';
import { validateUserAuthForAdmin } from './accessValidation';

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
jest.mock('validator/lib/isEmail', () => jest.fn());

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

    test('does not bypass auth and retrieves userId from environment variables when not in production and BYPASS_AUTH is false', async () => {
      process.env.NODE_ENV = 'development';
      process.env.BYPASS_AUTH = 'false';
      process.env.CURRENT_USER_ID = '999';

      const mockRequest = { session: {}, headers: {} };
      const mockResponse = {};

      const userId = await currentUserId(mockRequest, mockResponse);

      expect(userId).toBeNull();
      expect(mockRequest.session.userId).not.toBeDefined();
      expect(mockRequest.session.uuid).not.toBeDefined();
    });

    test('does not set the session userId when not in production and BYPASS_AUTH is true', async () => {
      process.env.NODE_ENV = 'development';
      process.env.BYPASS_AUTH = 'true';
      process.env.CURRENT_USER_ID = '999';

      const mockRequest = { headers: {} };
      const mockResponse = {};

      const userId = await currentUserId(mockRequest, mockResponse);

      expect(userId).toEqual(999);
      expect(mockRequest.session).toBeUndefined();
    });

    test('handles impersonation when Auth-Impersonation-Id header is set and user is not an admin', async () => {
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
      expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining('Impersonation failure. User (100) attempted to impersonate user (300), but the impersonated user is an admin.'));
    });

    test('allows impersonation when Auth-Impersonation-Id header is set and both users pass validation', async () => {
      const mockRequest = {
        headers: { 'auth-impersonation-id': JSON.stringify(200) },
        session: {},
      };
      const mockResponse = {
        sendStatus: jest.fn(),
        locals: { userId: 100 },
      };

      validateUserAuthForAdmin
        .mockResolvedValueOnce(true) // Current user is an admin
        .mockResolvedValueOnce(false); // Impersonated user is not an admin

      const userId = await currentUserId(mockRequest, mockResponse);

      expect(userId).toEqual(200);
      expect(mockResponse.sendStatus).not.toHaveBeenCalledWith(httpCodes.UNAUTHORIZED);
      expect(httpContext.set).toHaveBeenCalledWith('impersonationUserId', 200);
    });

    test('handles invalid JSON in Auth-Impersonation-Id header gracefully', async () => {
      const mockRequest = {
        headers: { 'auth-impersonation-id': '{invalidJson}' },
        session: {},
      };
      const mockResponse = {
        locals: {},
        status: jest.fn().mockReturnThis(),
        end: jest.fn(),
      };

      await currentUserId(mockRequest, mockResponse);

      const expectedMessage = 'Could not parse the Auth-Impersonation-Id header';
      expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining(expectedMessage));
    });

    test('handles null Auth-Impersonation-Id header gracefully', async () => {
      process.env.NODE_ENV = 'production';
      process.env.BYPASS_AUTH = 'false';
      const mockRequest = {
        headers: { 'auth-impersonation-id': '""' },
        session: {},
      };
      const mockResponse = {
        sendStatus: jest.fn(),
        locals: {},
        status: jest.fn().mockReturnThis(),
        end: jest.fn(),
      };

      const userId = await currentUserId(mockRequest, mockResponse);

      expect(userId).toEqual(100);
      expect(auditLogger.error).not.toHaveBeenCalledWith();
      expect(httpContext.set).not.toHaveBeenCalled(); // `httpContext.set` should not be called
      expect(mockResponse.sendStatus).not.toHaveBeenCalled();
    });

    test('calls handleErrors if an error occurs during impersonation admin validation', async () => {
      const mockRequest = {
        headers: { 'auth-impersonation-id': JSON.stringify(155) },
        session: {},
      };
      const mockResponse = {
        locals: {},
        status: jest.fn().mockReturnThis(),
        end: jest.fn(),
      };

      validateUserAuthForAdmin.mockImplementationOnce(() => {
        throw new Error('Admin validation failed');
      });

      await currentUserId(mockRequest, mockResponse);

      const expectedMessage = 'MIDDLEWARE:CURRENT USER - UNEXPECTED ERROR - Error: Admin validation failed';
      expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining(expectedMessage));
    });

    test('logs error and returns UNAUTHORIZED if userId is null', async () => {
      process.env.BYPASS_AUTH = 'false';
      const mockRequest = {
        headers: { 'auth-impersonation-id': JSON.stringify(155) },
        session: null,
      };
      const mockResponse = {
        sendStatus: jest.fn(),
        locals: {},
      };

      await currentUserId(mockRequest, mockResponse);

      expect(auditLogger.error).toHaveBeenCalledWith(
        'Impersonation failure. No valid user ID found in session or locals.',
      );
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(httpCodes.UNAUTHORIZED);
    });

    test('bypasses authentication with playwright-user-id header in non-production environment', async () => {
      process.env.NODE_ENV = 'development';
      process.env.BYPASS_AUTH = 'true';
      const mockRequest = {
        headers: { 'playwright-user-id': '123' },
        session: {},
      };
      const mockResponse = {};

      const userId = await currentUserId(mockRequest, mockResponse);

      expect(userId).toEqual(123);
      expect(mockRequest.session.userId).toEqual('123');
      expect(mockRequest.session.uuid).toBeDefined();
      expect(auditLogger.warn).toHaveBeenCalledWith(
        'Bypassing authentication in authMiddleware. Using user id 123 from playwright-user-id header.',
      );
    });

    test('does not set session if req.session is undefined', async () => {
      const mockRequest = {
        headers: { 'playwright-user-id': '123' },
        session: undefined,
      };
      const mockResponse = {};

      const userId = await currentUserId(mockRequest, mockResponse);

      expect(userId).toEqual(123);
      expect(mockRequest.session).toBeUndefined();
      expect(auditLogger.warn).toHaveBeenCalledWith(
        'Bypassing authentication in authMiddleware. Using user id 123 from playwright-user-id header.',
      );
    });
  });

  describe('retrieveUserDetails', () => {
    test('can handle oauth classic login user response from HSES', async () => {
      const responseFromUserInfo = {
        status: 200,
        data: userInfoClassicLogin,
      };
      axios.get.mockResolvedValueOnce(responseFromUserInfo);
      isEmail.mockReturnValueOnce(true);

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
      isEmail.mockReturnValueOnce(true);

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

    test('can handle oauth piv card login user response from HSES with null email', async () => {
      const responseFromUserInfoPiv = {
        status: 200,
        data: userInfoPivCardLogin,
      };
      axios.get.mockResolvedValueOnce(responseFromUserInfoPiv);
      isEmail.mockReturnValueOnce(false);

      const accessToken = { sign: jest.fn().mockReturnValue({ url: '/auth/user/me' }) };

      await retrieveUserDetails(accessToken);

      expect(axios.get).toHaveBeenCalled();
      expect(findOrCreateUser).toHaveBeenCalledWith({
        name: 'testUser@adhocteam.us',
        email: null,
        hsesUsername: 'testUser@adhocteam.us',
        hsesAuthorities: ['ROLE_FEDERAL'],
        hsesUserId: '1',
      });
    });
  });
});
