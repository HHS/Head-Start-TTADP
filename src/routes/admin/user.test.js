import db, {
  User, Permission, sequelize,
} from '../../models';
import getUsers, {
  getUser, deleteUser, createUser, updateUser,
} from './user';
import handleErrors from '../../lib/apiErrorHandler';

jest.mock('../../lib/apiErrorHandler', () => jest.fn().mockReturnValue(() => Promise.resolve()));

const mockUser = {
  id: 47,
  name: 'Joe Green',
  title: null,
  phoneNumber: '555-555-554',
  hsesUserId: '33',
  email: 'test@test.com',
  homeRegionId: 1,
  permissions: [
    {
      userId: 47,
      regionId: 1,
      scopeId: 1,
    },
    {
      userId: 47,
      regionId: 2,
      scopeId: 1,
    },
  ],
};
const mockSession = jest.fn();
mockSession.userId = mockUser.id;
const mockRequest = {
  params: { userId: mockUser.id },
  session: mockSession,
  connection: {
    setTimeout: jest.fn(),
  },
  log: {
    error: jest.fn(),
    info: jest.fn(),
  },
};
const mockResponse = {
  json: jest.fn(),
  sendStatus: jest.fn(),
  status: jest.fn(() => ({
    end: jest.fn(),
  })),
};

describe('User route handler', () => {
  beforeEach(async () => {
    await User.destroy({ where: {} });
  });
  afterAll(async () => {
    await User.destroy({ where: {} });
    db.sequelize.close();
  });

  it('Returns a user by id', async () => {
    await sequelize.transaction((transaction) => User.create(mockUser,
      {
        include: [{ model: Permission, as: 'permissions' }],
        transaction,
      }));

    // Verify that once the user exists, it will be retrieved
    await getUser(mockRequest, mockResponse);

    expect(mockResponse.json).toHaveBeenCalledWith(mockUser);
  });

  it('Returns users', async () => {
    mockRequest.path = '/api/user';
    await sequelize.transaction((transaction) => User.create(mockUser,
      {
        include: [{ model: Permission, as: 'permissions' }],
        transaction,
      }));

    // Verify that once the user exists, it will be retrieved
    await getUsers(mockRequest, mockResponse);

    expect(mockResponse.json).toHaveBeenCalled();
  });

  it('Creates a new user', async () => {
    mockRequest.body = mockUser;

    // Verify that there are no users
    const beginningUsers = await User.findAll();
    const beginningPermissions = await Permission.findAll();

    expect(beginningUsers.length).toBe(0);
    expect(beginningPermissions.length).toBe(0);

    await createUser(mockRequest, mockResponse);

    expect(mockResponse.json).toHaveBeenCalled();
    // Verify that one user was created
    const endingUsers = await User.findAll();
    const endingPermissions = await Permission.findAll();

    expect(endingUsers.length).toBe(1);
    expect(endingPermissions.length).toBe(2);
  });

  it('Updates a user', async () => {
    mockRequest.body = mockUser;

    const user = await User.create(mockUser,
      {
        include: [{ model: Permission, as: 'permissions', attributes: ['userId', 'scopeId', 'regionId'] }],
      });

    expect(user).toBeInstanceOf(User);
    // Update the user and a permission
    mockUser.email = 'updated@mail.com';
    mockUser.permissions[0].scopeId = 4;

    await updateUser(mockRequest, mockResponse);

    expect(mockResponse.json).toHaveBeenCalled();

    const updatedUser = await User.findOne({
      where: { id: mockUser.id },
      include: [
        {
          model: Permission,
          as: 'permissions',
          attributes: ['userId', 'scopeId', 'regionId'],
        },
      ],
    });
    // Check that the updates were persisted to the db
    expect(updatedUser.email).toEqual(mockUser.email);

    const permissions = await updatedUser.permissions;

    expect(permissions).not.toBe(null);

    const perm = permissions.find((p) => p.regionId === 1);

    expect(perm.toJSON()).toEqual(mockUser.permissions[0]);
  });

  it('Deletes a user', async () => {
    await User.create(mockUser,
      {
        include: [{ model: Permission, as: 'permissions' }],
      });
    // Check that the above `user` exists
    const existingUser = await User.findOne({
      where: {
        hsesUserId: mockUser.hsesUserId,
      },
    });
    expect(existingUser).toBeInstanceOf(User);

    await deleteUser(mockRequest, mockResponse);

    expect(mockResponse.json).toHaveBeenCalledWith(1);

    // Check that the `user` was deleted
    const result = await User.findOne({
      where: {
        hsesUserId: mockUser.hsesUserId,
      },
    });

    expect(result).toBeNull();

    await deleteUser(mockRequest, mockResponse);

    expect(mockResponse.json).toHaveBeenCalledWith(0);
  });

  it('Calls an error handler on error', async () => {
    mockUser.email = 'invalid';
    mockRequest.body = mockUser;

    await updateUser(mockRequest, mockResponse);

    expect(handleErrors).toHaveBeenCalled();

    await createUser(mockRequest, mockResponse);

    expect(handleErrors).toHaveBeenCalledTimes(2);
  });
});
