import moment from 'moment';
import { auditLogger, hashForLogging } from '../logger';
import { sequelize, User } from '../models';
import findOrCreateUser from './findOrCreateUser';

jest.mock('../logger', () => ({
  ...jest.requireActual('../logger'),
  hashForLogging: jest.fn(jest.requireActual('../logger').hashForLogging),
  auditLogger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('findOrCreateUser', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('Finds an existing user when a matching user exists', async () => {
    const user = {
      id: 33,
      hsesUserId: '33',
      email: 'test@test.com',
      hsesUsername: 'test@test.com',
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
    expect(retrievedUser.lastLogin).not.toEqual(createdUser.lastLogin);
  });

  it('Handles HSES resets', async () => {
    const user = {
      id: 39,
      hsesUserId: '39',
      email: 'test39@test.com',
      hsesUsername: 'test39@test.com',
      homeRegionId: 3,
    };
    // Verify that the user with id 39 doesn't exist
    await User.destroy({ where: { id: 39 } });
    const noUser = await User.findOne({
      where: {
        id: user.id,
      },
    });

    expect(noUser).toBeNull();

    // Create a user
    const createdUser = await User.create({ ...user, lastLogin: new Date() });
    expect(createdUser).toBeInstanceOf(User);

    // Change user's hsesUserId
    user.hsesUserId = '40';
    const updatedUser = await findOrCreateUser(user);

    expect(updatedUser).toBeInstanceOf(User);
    expect(updatedUser.hsesUserId).toEqual(user.hsesUserId);
    expect(updatedUser.email).toEqual(user.email);
    expect(updatedUser.id).toEqual(user.id);
  });

  it('Updates the lastLogin timestamp when a matching user exists', async () => {
    const userId = 36;
    const user = {
      hsesUserId: '36',
      email: 'test36@test.com',
      hsesUsername: 'test36@test.com',
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
      hsesUsername: 'test34@test.com',
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

    hashForLogging.mockReturnValue('hashed-34');

    // Now find or create `user2`, and confirm that a new user was created
    const createdUser = await findOrCreateUser(user);

    expect(createdUser.id).toBeDefined();
    expect(createdUser.email).toEqual(user.email);

    // Audit log carries a correlation hash, never the raw hsesUsername/email.
    expect(hashForLogging).toHaveBeenCalledWith(user.hsesUsername);
    expect(auditLogger.info).toHaveBeenCalledWith(
      `Created user ${createdUser.id} with no access permissions`,
      { subHash: 'hashed-34' }
    );
    const loggedValues = auditLogger.info.mock.calls.map((call) => JSON.stringify(call));
    expect(loggedValues.join('\n')).not.toMatch(/test34@test\.com/);

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
      hsesUsername: oldEmail,
    };
    // Verify that user 35 is set up as we expect
    await User.destroy({ where: { id: userId } });
    await User.create({ ...user, id: userId, lastLogin: new Date() });

    const retrievedUser = await findOrCreateUser({
      ...user,
      email: updatedEmail,
    });

    expect(retrievedUser.id).toEqual(userId);

    expect(retrievedUser.email).toEqual(updatedEmail);
  });

  it('Backfills hsesUsername by legacy hsesUserId without logging the raw email', async () => {
    const userId = 41;
    await User.destroy({ where: { id: userId } });
    await User.create({
      id: userId,
      hsesUserId: '41',
      email: 'old41@test.com',
      hsesUsername: 'old41@test.com',
      homeRegionId: 3,
      lastLogin: new Date(),
    });

    hashForLogging.mockReturnValue('hashed-41');

    // new hsesUsername not found by username, but hsesUserId matches the existing row
    const updatedUser = await findOrCreateUser({
      hsesUserId: '41',
      hsesUsername: 'new41@test.com',
      email: 'new41@test.com',
      homeRegionId: 3,
    });

    expect(updatedUser.id).toEqual(userId);
    expect(updatedUser.hsesUsername).toEqual('new41@test.com');

    expect(hashForLogging).toHaveBeenCalledWith('new41@test.com');
    expect(auditLogger.warn).toHaveBeenCalledWith(
      `Backfilled user ${userId} by legacy hsesUserId`,
      {
        subHash: 'hashed-41',
      }
    );
    const loggedValues = auditLogger.warn.mock.calls.map((call) => JSON.stringify(call));
    expect(loggedValues.join('\n')).not.toMatch(/new41@test\.com|old41@test\.com/);
  });

  it('Throws when there is something wrong', async () => {
    await expect(() => findOrCreateUser({ id: -1 })).rejects.toBeInstanceOf(Error);
  });

  it('Logs an error message on error', async () => {
    const user = {
      hsesUserId: '33',
      email: 'invalid',
      hsesUsername: 'user33',
      homeRegionId: 3,
    };
    await User.destroy({ where: { hsesUserId: '33' } });
    await expect(findOrCreateUser(user)).rejects.toThrow();
    expect(auditLogger.error).toHaveBeenCalledWith(
      'SERVICE:FIND_OR_CREATE_USER - Error finding or creating user in database - SequelizeValidationError: Validation error: email is invalid'
    );
  });
});
