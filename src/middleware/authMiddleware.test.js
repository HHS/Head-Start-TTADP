import {} from 'dotenv/config';
import { UNAUTHORIZED } from 'http-codes';

import authMiddleware, { login } from './authMiddleware';

describe('authMiddleware', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // clear the cache
    process.env = { ...ORIGINAL_ENV }; // make a copy
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV; // restore original env
  });

  it('should allow access if user data is present', async () => {
    const mockNext = jest.fn();
    const mockSession = jest.fn();
    mockSession.userId = 2;
    const mockRequest = {
      path: '/api/endpoint',
      session: mockSession,
    };
    const mockResponse = {
      redirect: jest.fn(),
      sendStatus: jest.fn(),
    };
    await authMiddleware(mockRequest, mockResponse, mockNext);
    expect(mockResponse.redirect).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should redirect to login if user data is not present', async () => {
    // Ensure authorization is required, do not bypass authorization check
    process.env.NODE_ENV = 'test';
    process.env.BYPASS_AUTH = 'false';

    const mockNext = jest.fn();
    const mockSession = jest.fn();
    mockSession.userId = undefined;
    const mockRequest = {
      path: '/api/endpoint',
      session: mockSession,
      headers: {
        referer: 'http://localhost:3000',
      },
    };
    const mockResponse = {
      redirect: jest.fn(),
      sendStatus: jest.fn(),
    };
    await authMiddleware(mockRequest, mockResponse, mockNext);
    expect(mockResponse.redirect).not.toHaveBeenCalled();
    expect(mockResponse.sendStatus).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('login should redirect to HSES', async () => {
    const mockSession = jest.fn();
    mockSession.userId = undefined;
    const mockRequest = {
      path: '/api/login',
      session: mockSession,
      headers: {
        referer: 'http://localhost:3000',
      },
    };
    const mockResponse = {
      redirect: jest.fn(),
      sendStatus: jest.fn(),
    };
    login(mockRequest, mockResponse);
    expect(mockResponse.redirect).not.toHaveBeenCalledWith(process.env.TTA_SMART_HUB_URI);
  });

  it('bypass authorization if variables are set for UAT or accessibility testing', async () => {
    // auth is bypassed if non-prod NODE_ENV and BYPASS_AUTH = 'true', needed for cucumber and axe
    process.env.NODE_ENV = 'development';
    process.env.BYPASS_AUTH = 'true';

    const mockNext = jest.fn();
    const mockSession = jest.fn();
    mockSession.userId = undefined;
    const mockRequest = {
      path: '/api/endpoint',
      session: mockSession,
    };
    const mockResponse = {
      redirect: jest.fn(),
      sendStatus: jest.fn(),
    };
    await authMiddleware(mockRequest, mockResponse, mockNext);
    expect(mockResponse.redirect).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it('require authorization if variables are set NOT for UAT or accessibility testing', async () => {
    // set env variables to values that require authorization
    process.env.NODE_ENV = 'production';
    process.env.BYPASS_AUTH = 'true';
    const mockNext = jest.fn();
    const mockSession = jest.fn();
    mockSession.userId = undefined;
    const mockRequest = {
      path: '/api/endpoint',
      session: mockSession,
    };
    const mockResponse = {
      redirect: jest.fn(),
      sendStatus: jest.fn(),
    };
    await authMiddleware(mockRequest, mockResponse, mockNext);
    expect(mockResponse.redirect).not.toHaveBeenCalled();
    expect(mockResponse.sendStatus).toHaveBeenCalledWith(UNAUTHORIZED);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
