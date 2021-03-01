import moment from 'moment';
import db, { User, Permission, sequelize } from '../models';
import findOrCreateUser, {
  validateUserAuthForAccess,
  validateUserAuthForAdmin,
  getUserReadRegions,
} from './accessValidation';
import { auditLogger } from '../logger';
import SCOPES from '../middleware/scopeConstants';

const {
  SITE_ACCESS, ADMIN, READ_REPORTS, READ_WRITE_REPORTS,
} = SCOPES;

jest.mock('../logger', () => ({
  auditLogger: {
    error: jest.fn(),
    info: jest.fn(),
  },
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
      regionId: 14,
      scopeId: ADMIN,
    },
    {
      userId: 47,
      regionId: 14,
      scopeId: SITE_ACCESS,
    },
  ],
};

const setupUser = async (user) => (
  sequelize.transaction(async (transaction) => {
    await User.destroy({ where: { id: user.id } }, { transaction });
    await User.create(user, {
      include: [{ model: Permission, as: 'permissions' }],
      transaction,
    });
  })
);

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

    it('Updates the lastLogin timestamp when a matching user exists', async () => {
      const userId = 36;
      const user = {
        hsesUserId: '36',
        email: 'test36@test.com',
        homeRegionId: 3,
      };
      const originalLastLogin = moment().subtract(1, 'day');
      await User.destroy({ where: { id: userId } });
      await User.create({ ...user, id: userId, lastLogin: originalLastLogin });

      const retrievedUser = await findOrCreateUser(user);
      expect(retrievedUser.id).toEqual(userId);
      expect(originalLastLogin.isBefore(retrievedUser.lastLogin)).toBe(true);
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

    it('Finds the existing user when email is changed', async () => {
      const userId = 35;
      const oldEmail = 'test35@test.com';
      const updatedEmail = 'new.email35@test.com';
      const user = {
        hsesUserId: '35',
        email: oldEmail,
      };
      // Verify that user 35 is set up as we expect
      await User.destroy({ where: { id: userId } });
      await User.create({ ...user, id: userId });

      const retrievedUser = await findOrCreateUser({
        ...user,
        email: updatedEmail,
      });

      expect(retrievedUser.id).toEqual(userId);

      // TODO: should eventually update email addresses
      expect(retrievedUser.email).toEqual(oldEmail);
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
      await User.destroy({ where: { hsesUserId: '33' } });
      await expect(findOrCreateUser(user)).rejects.toThrow();
      expect(auditLogger.error).toHaveBeenCalledWith('SERVICE:ACCESS_VALIDATION - Error finding or creating user in database - SequelizeValidationError: Validation error: Validation isEmail on email failed');
    });
  });

  describe('validateUserAuthForAccess', () => {
    it('returns true if a user has SITE_ACCESS priviledges', async () => {
      await setupUser(mockUser);

      const valid = await validateUserAuthForAccess(mockUser.id);
      expect(valid).toBe(true);
    });

    it('returns false if a user does not have SITE_ACCESS', async () => {
      const user = {
        ...mockUser,
        permissions: [],
      };
      await setupUser(user);

      const valid = await validateUserAuthForAccess(mockUser.id);
      expect(valid).toBe(false);
    });
  });

  describe('validateUserAuthForAdmin', () => {
    it('returns true if a user has admin priviledges', async () => {
      await setupUser(mockUser);

      const valid = await validateUserAuthForAdmin(mockUser.id);
      expect(valid).toBe(true);
    });

    it('returns false if a user does not have admin priviledges', async () => {
      const user = {
        ...mockUser,
        permissions: [mockUser.permissions[1]],
      };
      await setupUser(user);

      const valid = await validateUserAuthForAdmin(user.id);
      expect(valid).toBe(false);
    });

    it('returns false if a user does not exist in database', async () => {
      await User.destroy({ where: { id: mockUser.id } });

      const valid = await validateUserAuthForAdmin(mockUser.id);
      expect(valid).toBe(false);
    });

    it('Throws on error', async () => {
      await expect(validateUserAuthForAdmin(undefined)).rejects.toThrow();
    });
  });

  describe('getUserReadRegions', () => {
    it('returns an array of regions user has permissions to', async () => {
      await setupUser(mockUser);
      await Permission.create({
        scopeId: READ_REPORTS,
        userId: mockUser.id,
        regionId: 14,
      });
      await Permission.create({
        scopeId: READ_WRITE_REPORTS,
        userId: mockUser.id,
        regionId: 13,
      });

      const regions = await getUserReadRegions(mockUser.id);

      expect(regions[0]).toBe(14);
      expect(regions[1]).toBe(13);
    });

    it('returns an empty array if user has no permissions', async () => {
      await setupUser(mockUser);

      const regions = await getUserReadRegions(mockUser.id);
      expect(regions.length).toBe(0);
    });

    it('returns an empty array if a user does not exist in database', async () => {
      await User.destroy({ where: { id: mockUser.id } });

      const regions = await getUserReadRegions(mockUser.id);
      expect(regions.length).toBe(0);
    });

    it('Throws on error', async () => {
      await expect(getUserReadRegions(undefined)).rejects.toThrow();
    });
  });
});
