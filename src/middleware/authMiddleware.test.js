import {} from 'dotenv/config';
import { FORBIDDEN, UNAUTHORIZED } from 'http-codes';
import db, { User, Permission } from '../models';
import authMiddleware, { login } from './authMiddleware';
import SCOPES from './scopeConstants';

describe('authMiddleware', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // clear the cache
    process.env = { ...ORIGINAL_ENV }; // make a copy
  });

  afterAll(async () => {
    process.env = ORIGINAL_ENV; // restore original env
    await db.sequelize.close();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const mockUser = {
    id: 66349,
    name: 'Auth Middleware',
    hsesUserId: '66349',
    hsesUsername: 'auth.middleware',
    permissions: [{
      userId: 66349,
      regionId: 14,
      scopeId: SCOPES.SITE_ACCESS,
    }],
  };

  const unAuthdUser = {
    id: 663491,
    name: 'unAuth Middleware',
    hsesUserId: '663491',
    hsesUsername: 'unauth.middleware',
    permissions: [],
  };

  const setupUser = async (user) => {
    await User.destroy({
      where: { id: user.id },
      individualHooks: true,
    });
    await User.create(user, {
      include: [{ model: Permission, as: 'permissions' }],
    });
  };

  const destroyUser = async (user) => (
    User.destroy({
      where: { id: user.id },
      individualHooks: true,
    })
  );

  it('should allow access if user data is present', async () => {
    await setupUser(mockUser);
    process.env.CURRENT_USER_ID = 66349;

    const mockNext = jest.fn();
    const mockSession = jest.fn();
    mockSession.userId = mockUser.id;
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
    await destroyUser(mockUser);
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
    const user = {
      ...mockUser,
      id: process.env.CURRENT_USER_ID,
      hsesUserId: process.env.CURRENT_USER_ID,
    };
    await setupUser(user);
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
    await destroyUser(user);
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

  it('returns 403 if user does not have permission to access endpoint', async () => {
    await setupUser(unAuthdUser);
    process.env.CURRENT_USER_ID = unAuthdUser.id;

    const mockNext = jest.fn();
    const mockSession = jest.fn();
    mockSession.userId = unAuthdUser.id;
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
    expect(mockNext).not.toHaveBeenCalled();

    expect(mockResponse.sendStatus).toHaveBeenCalledWith(FORBIDDEN);

    await destroyUser(mockUser);
  });
});
