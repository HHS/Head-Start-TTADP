import {} from 'dotenv/config';
import db, { User, Permission } from '../models';
import userAdminAccessMiddleware from './userAdminAccessMiddleware';
import SCOPES from './scopeConstants';

const { ADMIN } = SCOPES;

const mockNext = jest.fn();
const mockSession = jest.fn();
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
let user;

describe('userAdminAccessMiddleware', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  beforeEach(async () => {
    [user] = await User.findOrCreate({
      where: {
        email: 'admin@acf.hhs.gov',
        hsesUsername: 'admin@acf.hhs.gov',
        hsesUserId: 'admin@acf.hhs.gov',
      },
    });

    mockSession.userId = user.id;
  });
  afterAll(async () => {
    await User.destroy({ where: { id: user.id } });
    await db.sequelize.close();
  });

  it('should allow access if an user has an admin role', async () => {
    const admin = await Permission.create({
      scopeId: ADMIN,
      userId: user.id,
      regionId: 14,
    });

    await userAdminAccessMiddleware(mockRequest, mockResponse, mockNext);

    expect(mockResponse.sendStatus).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
    await admin.destroy();
  });

  it('should return 403 if an user does not have an admin permission', async () => {
    await userAdminAccessMiddleware(mockRequest, mockResponse, mockNext);

    expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
