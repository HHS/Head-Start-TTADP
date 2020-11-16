import {} from 'dotenv/config';
import db from '../models';
import userAdminAccessMiddleware from './userAdminAccessMiddleware';
import handleErrors from '../lib/apiErrorHandler';

jest.mock('../lib/apiErrorHandler', () => jest.fn().mockReturnValue(() => Promise.resolve()));

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
  status: jest.fn(() => ({
    end: jest.fn(),
  })),
};

describe('userAdminAccessMiddleware', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  afterAll(() => {
    db.sequelize.close();
  });

  it('should allow access if an user has an admin role', async () => {
    mockSession.role = 'admin';

    await userAdminAccessMiddleware(mockRequest, mockResponse, mockNext);

    expect(mockResponse.sendStatus).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should return 404 if an user does not have an admin permission', async () => {
    mockSession.role = undefined;

    await userAdminAccessMiddleware(mockRequest, mockResponse, mockNext);

    expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle errors on error', async () => {
    mockSession.userId = undefined;

    await userAdminAccessMiddleware(mockRequest, mockResponse, mockNext);

    expect(mockResponse.sendStatus).not.toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
    expect(handleErrors).toHaveBeenCalled();
  });
});
