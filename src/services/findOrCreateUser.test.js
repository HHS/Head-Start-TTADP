import moment from 'moment';
import findOrCreateUser from './findOrCreateUser';
import { User, sequelize } from '../models';
import { auditLogger } from '../logger';

jest.mock('../logger');

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
    const createdUser = await User.create(user);
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
      hsesUsername: oldEmail,
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
      hsesUsername: 'user33',
      homeRegionId: 3,
    };
    await User.destroy({ where: { hsesUserId: '33' } });
    await expect(findOrCreateUser(user)).rejects.toThrow();
    expect(auditLogger.error).toHaveBeenCalledWith('SERVICE:FIND_OR_CREATE_USER - Error finding or creating user in database - SequelizeValidationError: Validation error: email is invalid');
  });
});
