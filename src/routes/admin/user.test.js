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
    // const mockUser = {
    //   id: 47,
    //   name: 'Joe Green',
    //   title: null,
    //   phoneNumber: '555-555-555',
    //   hsesUserId: '33',
    //   email: 'test@test.com',
    //   homeRegionId: 1,
    //   permissions: [
    //     {
    //       userId: 47,
    //       regionId: 1,
    //       scopeId: 1,
    //     },
    //     {
    //       userId: 47,
    //       regionId: 2,
    //       scopeId: 1,
    //     },
    //   ],
    // };
    // const mockSession = jest.fn();
    // mockSession.userId = 47;
    // const mockRequest = {
    //   path: '/api/user/47',
    //   params: { userId: 47 },
    //   session: mockSession,
    //   connection: {
    //     setTimeout: jest.fn(),
    //   },
    //   featureFlags: {},
    //   log: {
    //     error: jest.fn(),
    //     info: jest.fn(),
    //   },
    // };
    // const mockResponse = {
    //   json: jest.fn(),
    //   sendStatus: jest.fn(),
    //   status: jest.fn(() => ({
    //     end: jest.fn(),
    //   })),
    // };

    // await Region.create(region);
    // await Region.create(region2);
    // const createdUser = await User.create(mockUser);
    // const createdUser = await findOrCreateUser(mockUser);
    // await sequelize.transaction((t) => Promise.all([
    //   // Permission.destroy({ where: {} }, t),
    //   User.destroy({ where: {} }, t),
    //   // User.create(mockUser, { include: [{ model: Permission, as: 'permissions' }] }),
    // ]));
    await sequelize.transaction((transaction) => User.create(mockUser,
      {
        include: [{ model: Permission, as: 'permissions' }],
        transaction,
      }));
    // const createdUser = await User.findOrCreate({ where: { ...mockUser, include: Permission, as: 'permissions' } });
    // const createdUser = await User.create(mockUser, { include: [{ model: Permission, as: 'permissions', attributes: ['regionId', 'userId', 'scopeId'] }] });
    // delete createdUser.updatedAt;

    // const test = {
    //   id: createdUser.id,
    //   name: createdUser.name,
    //   title: createdUser.title,
    //   phoneNumber: createdUser.phoneNumber,
    //   permissions: createdUser.permissions.map((p) => ({ userId: p.userId, scopeId: p.scopeId, regionId: p.regionId })),
    //   hsesUserId: createdUser.hsesUserId,
    //   homeRegionId: createdUser.homeRegionId,
    //   email: createdUser.email,
    // };
    // await createdUser.setPermissions(mockUser.permissions);
    // // await Scope.create(scope);
    // await Permission.create(permission);
    // await Permission.create(permission2);
    // await Permission.create(mockUser.permissions[0]);
    // await Permission.create(mockUser.permissions[1]);
    // Verify that there are no users
    // const originalUsers = await User.findAll();

    // expect(originalUsers.length).toBe(0);

    // expect(createdUser).toBeInstanceOf(User);

    // Verify that once the user exists, it will be retrieved
    await getUser(mockRequest, mockResponse);
    // const weird = JSON.parse(JSON.stringify(mockUser));
    // console.log(weird);
    expect(mockResponse.json).toHaveBeenCalledWith(mockUser);
    // expect(result).toBe(mockUser);
    // console.log(retrievedUser), undefined, 2);
    // const allUsers = await User.findAll();

    // expect(allUsers.length).not.toBe(0);
    // // expect(retrievedUser).toBe(1);
    // expect(retrievedUser.hsesUserId).toEqual(user.hsesUserId);
    // expect(retrievedUser.email).toEqual(user.email);
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
