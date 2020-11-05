import db, {
  User, Permission, sequelize,
} from '../../models';
import findOrCreateUser from '../../services/accessValidation';
import {
  getUser, deleteUser, createUser, updateUser,
} from './user';

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
  path: '/api/user/47',
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

  it('Creates a new user', async () => {
    mockRequest.body = mockUser;

    await createUser(mockRequest, mockResponse);

    expect(mockResponse.json).toHaveBeenCalledWith(mockUser);
  });

  it.only('Updates a user', async () => {
    mockRequest.body = mockUser;

    const user = await User.create(mockUser,
      {
        include: [{ model: Permission, as: 'permissions', attributes: ['userId', 'scopeId', 'regionId'] }],
      });
    expect(user).toBeInstanceOf(User);
    // update the user and a permission
    mockUser.email = 'updated@mail.com';
    mockUser.permissions[0].scopeId = 4;

    await updateUser(mockRequest, mockResponse);

    expect(mockResponse.json).toHaveBeenCalledWith([1]);

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

    expect(updatedUser.email).toEqual(mockUser.email);
    expect(updatedUser.getPermissions()).not.toBe(null);

    const perm = (await updatedUser.getPermissions())[0].dataValues;

    expect(perm).toEqual(mockUser.permissions[0]);
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

    await deleteUser(mockRequest, mockResponse);

    expect(mockResponse.json).toHaveBeenCalledWith(0);
  });

  it('Throws when there is something wrong', async () => {
    await expect(() => findOrCreateUser(undefined)).rejects.toBeInstanceOf(Error);
  });
});
