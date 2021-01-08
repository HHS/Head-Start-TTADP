import db, {
  User, Permission, sequelize,
} from '../../models';
import getUsers, {
  getUser, deleteUser, createUser, updateUser,
} from './user';
import handleErrors from '../../lib/apiErrorHandler';

jest.mock('../../lib/apiErrorHandler', () => jest.fn().mockReturnValue(() => Promise.resolve()));

const mockUser = {
  id: 49,
  name: 'Joe Green',
  role: null,
  phoneNumber: '555-555-554',
  hsesUserId: '49',
  email: 'test49@test.com',
  homeRegionId: 1,
  permissions: [
    {
      userId: 49,
      regionId: 1,
      scopeId: 1,
    },
    {
      userId: 49,
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
  afterEach(() => {
    jest.clearAllMocks();
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
    const user = await User.findOne({ where: { id: mockUser.id } });

    expect(user).not.toBeNull();
    expect(user.id).toBe(mockUser.id);

    // Verify that once the user exists, it will be retrieved
    await getUser(mockRequest, mockResponse);

    expect(mockResponse.json).toHaveBeenCalledWith(mockUser);
  });

  it('Returns users', async () => {
    mockRequest.path = '/api/user';
    mockUser.id = 50;
    mockUser.hsesUserId = '50';
    mockUser.email = 'test50@test.com';
    mockUser.permissions[0].userId = mockUser.id;
    mockUser.permissions[1].userId = mockUser.id;

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
    mockUser.id = 52;
    mockUser.hsesUserId = '52';
    mockUser.email = 'test52@test.com';
    mockUser.permissions[0].userId = mockUser.id;
    mockUser.permissions[1].userId = mockUser.id;
    mockRequest.body = mockUser;

    // Verify that there are no users
    const beginningUser = await User.findOne({ where: { id: mockUser.id } });
    const beginningPermissions = await Permission.findAll({ where: { userId: mockUser.id } });

    expect(beginningUser).toBeNull();
    expect(beginningPermissions.length).toBe(0);

    await createUser(mockRequest, mockResponse);

    expect(mockResponse.json).toHaveBeenCalled();
    // Verify that the user was created
    const endingUser = await User.findOne({ where: { id: mockUser.id } });
    const endingPermissions = await Permission.findAll({ where: { userId: mockUser.id } });

    expect(endingUser).toBeInstanceOf(User);
    expect(endingUser.id).toBe(mockUser.id);
    expect(endingPermissions.length).toBe(2);
  });

  it('Updates a user', async () => {
    const testUpdateUser = {
      id: 53,
      name: 'Joe Green',
      role: 'Health Specialist',
      phoneNumber: '555-555-554',
      hsesUserId: '53',
      email: 'test53@test.com',
      homeRegionId: 1,
      permissions: [
        {
          userId: 53,
          regionId: 1,
          scopeId: 1,
        },
        {
          userId: 53,
          regionId: 2,
          scopeId: 1,
        },
      ],
    };

    mockRequest.body = testUpdateUser;
    mockRequest.params.userId = 53;

    await User.destroy({ where: { id: 53 } });
    const user = await User.create(testUpdateUser,
      {
        include: [{ model: Permission, as: 'permissions', attributes: ['userId', 'scopeId', 'regionId'] }],
      });

    expect(user).toBeInstanceOf(User);
    expect(user.email).toBe(testUpdateUser.email);
    // Update the user and a permission
    testUpdateUser.email = 'updated@mail.com';
    testUpdateUser.permissions[0].scopeId = 4;

    await updateUser(mockRequest, mockResponse);

    expect(mockResponse.json).toHaveBeenCalled();

    const updatedUser = await User.findOne({
      where: { id: testUpdateUser.id },
      include: [
        {
          model: Permission,
          as: 'permissions',
          attributes: ['userId', 'scopeId', 'regionId'],
        },
      ],
    });
    // Check that the updates were persisted to the db
    expect(updatedUser.email).toEqual(testUpdateUser.email);

    const permissions = await updatedUser.permissions;

    expect(permissions).not.toBe(null);

    const perm = permissions.find((p) => p.regionId === 1);

    expect(perm.toJSON()).toEqual(testUpdateUser.permissions[0]);
  });

  it('Deletes a user', async () => {
    mockUser.id = 54;
    mockUser.hsesUserId = '54';
    mockUser.email = 'test54@test.com';
    mockUser.permissions[0].userId = mockUser.id;
    mockUser.permissions[1].userId = mockUser.id;
    mockRequest.params.userId = mockUser.id;

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
