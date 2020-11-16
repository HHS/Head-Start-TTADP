import db, { User, Permission, sequelize } from '../models';
import findOrCreateUser, { validateUserAuthForAdmin } from './accessValidation';
import logger from '../logger';

jest.mock('../logger', () => (
  {
    error: jest.fn(),
  }));

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
      scopeId: 2,
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

describe('accessValidation', () => {
  beforeEach(async () => {
    await User.destroy({ where: {} });
  });
  afterEach(async () => {
    await User.destroy({ where: {} });
  });
  afterAll(async () => {
    await User.destroy({ where: {} });
    db.sequelize.close();
  });
  describe('findOrCreateUser', () => {
    it('Finds an existing user when a matching user exists', async () => {
      const user = {
        hsesUserId: '33',
        email: 'test@test.com',
        homeRegionId: 3,
      };
      // Verify that there are no users
      const originalUsers = await User.findAll();

      expect(originalUsers.length).toBe(0);

      const createdUser = await findOrCreateUser(user);

      expect(createdUser).toBeInstanceOf(User);

      // Verify that once the user exists, it will be retrieved
      const retrievedUser = await findOrCreateUser(user);
      const allUsers = await User.findAll();

      expect(retrievedUser.hsesUserId).toEqual(user.hsesUserId);
      expect(retrievedUser.email).toEqual(user.email);
      expect(allUsers.length).toBe(1);
    });

    it('Creates a new user when a matching user does not exist', async () => {
      const user = {
        hsesUserId: '33',
        email: 'test@test.com',
        homeRegionId: 3,
      };
      // Check that the above `user` doesn't exist in the DB yet.
      const existingUser = await User.findOne({
        where: {
          hsesUserId: user.hsesUserId,
        },
      });

      expect(existingUser).toBeNull();

      // Now find or create `user2`, and confirm that a new user was created
      const createdUser = await findOrCreateUser(user);

      expect(createdUser.id).toBeDefined();
      expect(createdUser.email).toEqual(user.email);

      // Look up the user that was just created, make sure it can now be found
      const existingUserAfter = await User.findOne({
        where: {
          id: createdUser.id,
        },
      });
      expect(existingUserAfter).toBeInstanceOf(User);
    });

    it('Throws when there is something wrong', async () => {
      await expect(() => findOrCreateUser(undefined)).rejects.toBeInstanceOf(Error);
    });

    it('Logs an error message on error', async () => {
      const user = {
        hsesUserId: '33',
        email: 'invalid',
        homeRegionId: 3,
      };
      await expect(findOrCreateUser(user)).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith('SERVICE:ACCESS_VALIDATION - Error finding or creating User in database.');
    });
  });
  describe('validateUserAuthForAdmin', () => {
    it('returns true if a user has admin priviledges', async () => {
      await sequelize.transaction((transaction) => User.create(mockUser,
        {
          include: [{ model: Permission, as: 'permissions' }],
          transaction,
        }));
      const valid = await validateUserAuthForAdmin(mockRequest);

      expect(valid).toBe(true);
    });

    it('returns false if a user does not have admin priviledges', async () => {
      mockUser.permissions[0].scopeId = 3; // non-admin
      await sequelize.transaction((transaction) => User.create(mockUser,
        {
          include: [{ model: Permission, as: 'permissions' }],
          transaction,
        }));
      const valid = await validateUserAuthForAdmin(mockRequest);

      expect(valid).toBe(false);
    });

    it('returns false if a user does not exist in database', async () => {
      // beforeEach() makes sure there are no users in the db
      const valid = await validateUserAuthForAdmin(mockRequest);

      expect(valid).toBe(false);
    });

    it('Throws on error', async () => {
      mockSession.userId = undefined;
      await expect(validateUserAuthForAdmin(mockRequest)).rejects.toThrow();
    });
  });
});
