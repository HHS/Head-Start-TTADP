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
  hsesUserId: '47',
  email: 'test47@test.com',
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
  afterAll(async () => {
    db.sequelize.close();
  });
  describe('findOrCreateUser', () => {
    it('Finds an existing user when a matching user exists', async () => {
      const user = {
        id: 33,
        hsesUserId: '33',
        email: 'test@test.com',
        homeRegionId: 3,
      };
      // Verify that the user with id 33 doesn't exist
      await User.destroy({ where: { id: 33 } });
      const noUser = await User.findOne({
        where: {
          id: user.id,
        },
      });

      expect(noUser).toBeNull();

      const createdUser = await findOrCreateUser(user);

      expect(createdUser).toBeInstanceOf(User);

      const retrievedUser = await findOrCreateUser(user);

      expect(retrievedUser.hsesUserId).toEqual(user.hsesUserId);
      expect(retrievedUser.email).toEqual(user.email);
      expect(retrievedUser.id).toEqual(user.id);
    });

    it('Creates a new user when a matching user does not exist', async () => {
      const user = {
        id: 34,
        hsesUserId: '34',
        email: 'test34@test.com',
        homeRegionId: 3,
      };
      // Check that the above `user` doesn't exist in the DB yet.
      await User.destroy({ where: { id: 34 } });
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
      expect(logger.error).toHaveBeenCalledWith('SERVICE:ACCESS_VALIDATION - Error finding or creating user in database - SequelizeValidationError: Validation error: Validation isEmail on email failed');
    });
  });
  describe('validateUserAuthForAdmin', () => {
    it('returns true if a user has admin priviledges', async () => {
      await User.destroy({ where: { id: mockUser.id } });
      await sequelize.transaction((transaction) => User.create(mockUser,
        {
          include: [{ model: Permission, as: 'permissions' }],
          transaction,
        }));

      const valid = await validateUserAuthForAdmin(mockRequest);

      expect(valid).toBe(true);
    });

    it('returns false if a user does not have admin priviledges', async () => {
      mockUser.permissions[0].scopeId = 3; // change to non-admin
      mockUser.id = 48;
      mockUser.hsesUserId = '48';
      mockUser.email = 'test48@test.com';
      mockUser.permissions[0].userId = mockUser.id;
      mockUser.permissions[1].userId = mockUser.id;
      mockSession.userId = 48;

      await User.destroy({ where: { id: 48 } });
      await sequelize.transaction((transaction) => User.create(mockUser,
        {
          include: [{ model: Permission, as: 'permissions' }],
          transaction,
        }));
      const valid = await validateUserAuthForAdmin(mockRequest);

      expect(valid).toBe(false);
    });

    it('returns false if a user does not exist in database', async () => {
      mockUser.id = 49;
      mockUser.hsesUserId = '49';
      mockUser.email = 'test49@test.com';
      mockUser.permissions[0].userId = mockUser.id;
      mockUser.permissions[1].userId = mockUser.id;
      mockSession.userId = 49;

      const valid = await validateUserAuthForAdmin(mockRequest);

      expect(valid).toBe(false);
    });

    it('Throws on error', async () => {
      mockSession.userId = undefined;
      await expect(validateUserAuthForAdmin(mockRequest)).rejects.toThrow();
    });
  });
});
