import faker from '@faker-js/faker';
import db, {
  User,
  Permission,
  Role,
  UserRole,
} from '../../models';
import { featureFlags } from '../../models/user';
import {
  getUsers,
  getUser,
  deleteUser,
  createUser,
  updateUser,
  getFeatures,
  createUserRoles,
} from './user';
import handleErrors from '../../lib/apiErrorHandler';

jest.mock('../../lib/apiErrorHandler', () => jest.fn().mockReturnValue(() => Promise.resolve()));

const mockUser = {
  id: 49,
  name: 'Joe Green',
  phoneNumber: '555-555-554',
  hsesUserId: '49',
  hsesUsername: 'test49@test.com',
  hsesAuthorities: ['ROLE_FEDERAL'],
  email: 'test49@test.com',
  homeRegionId: 1,
  lastLogin: new Date('2021-02-09T15:13:00.000Z'),
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
  flags: [],
  roles: [],
  validationStatus: [],
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
    await User.destroy({ where: { id: 49 } });
    await User.destroy({ where: { id: 55 } });
    await User.destroy({ where: { id: 52 } });
    await User.destroy({ where: { id: 53 } });
    await db.sequelize.close();
  });

  it('Returns a user by id', async () => {
    await User.create(
      mockUser,
      {
        include: [{ model: Permission, as: 'permissions' }],
      },
    );
    const user = await User.findOne({ where: { id: mockUser.id } });

    expect(user).not.toBeNull();
    expect(user.id).toBe(mockUser.id);

    // Verify that once the user exists, it will be retrieved
    await getUser(mockRequest, mockResponse);

    expect(mockResponse.json).toHaveBeenCalledWith(mockUser);
  });

  it('Returns users', async () => {
    mockRequest.path = '/api/user';
    mockUser.id = 55;
    mockUser.hsesUserId = '55';
    mockUser.email = 'test55@test.com';
    mockUser.permissions[0].userId = mockUser.id;
    mockUser.permissions[1].userId = mockUser.id;

    await User.create(
      mockUser,
      {
        include: [{ model: Permission, as: 'permissions' }],
      },
    );

    // Verify that once the user exists, it will be retrieved
    await getUsers(mockRequest, mockResponse);

    expect(mockResponse.json).toHaveBeenCalled();
  });

  it('properly fetches features', async () => {
    await getFeatures(mockRequest, mockResponse);
    expect(mockResponse.json).toHaveBeenCalledWith(featureFlags);
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
      role: ['Health Specialist'],
      phoneNumber: '555-555-554',
      hsesUserId: '53',
      hsesUsername: 'test53@test.com',
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
      roles: [],
    };

    mockRequest.body = testUpdateUser;
    mockRequest.params.userId = 53;

    await User.destroy({ where: { id: 53 } });
    const user = await User.create(
      testUpdateUser,
      {
        include: [{ model: Permission, as: 'permissions', attributes: ['userId', 'scopeId', 'regionId'] }],
      },
    );

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

    await User.create(
      mockUser,
      {
        include: [{ model: Permission, as: 'permissions' }],
      },
    );
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

describe('createUserRoles', () => {
  const mockUserTheFirst = {
    id: faker.datatype.number({ min: 10000, max: 99999 }),
    name: `${faker.name.firstName()} ${faker.name.lastName()}`,
    phoneNumber: '555-555-554',
    hsesUserId: '49',
    hsesUsername: faker.internet.email(),
    hsesAuthorities: ['ROLE_FEDERAL'],
    email: faker.internet.email(),
    homeRegionId: 1,
    lastLogin: new Date('2021-02-09T15:13:00.000Z'),
    permissions: [],
    flags: [],
    roles: [],
    validationStatus: [],
  };

  const mockRole = {
    id: faker.datatype.number({ min: 10000, max: 99999 }),
    name: faker.random.alpha(3),
    fullName: faker.name.jobTitle(),
    isSpecialist: false,
    mapsTo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  let u;
  let r;

  beforeAll(async () => {
    r = await Role.create(mockRole);
    u = await User.create(mockUserTheFirst);
  });

  afterAll(async () => {
    await UserRole.destroy({ where: { userId: u.id } });
    await User.destroy({ where: { id: u.id } });
    await Role.destroy({ where: { id: r.id } });
    await db.sequelize.close();
  });

  it('does not create a role when the role doesn\'t exist', async () => {
    await createUserRoles({
      roles: [{ fullName: 'does not exist' }],
    }, u.id);

    const userRoles = await UserRole.findAll({ where: { userId: u.id } });

    expect(userRoles.length).toBe(0);
  });

  it('Creates a user role', async () => {
    await createUserRoles({
      roles: [r],
    }, u.id);

    const userRoles = await UserRole.findAll({ where: { userId: u.id } });

    expect(userRoles.length).toBe(1);
    expect(userRoles[0].roleId).toBe(r.id);
  });
});
