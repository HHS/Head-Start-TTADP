import db, {
  User, Permission,
} from '../models';

import {
  usersWithPermissions, userById, userByEmail,
} from './users';

import SCOPES from '../middleware/scopeConstants';

describe('Users DB service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('userById', () => {
    beforeEach(async () => {
      await User.create({
        id: 54,
        name: 'user 1',
        hsesUsername: 'user.1',
        hsesUserId: '54',
      });
      await User.create({
        id: 55,
        name: 'user 2',
        hsesUsername: 'user.2',
        hsesUserId: '55',
      });
    });

    afterEach(async () => {
      await User.destroy({ where: { id: [54, 55] } });
    });

    it('retrieves the correct user', async () => {
      const user = await userById(54);
      expect(user.id).toBe(54);
      expect(user.name).toBe('user 1');
    });
  });
  describe('userByEmail', () => {
    beforeEach(async () => {
      await User.create({
        id: 50,
        name: 'user 50',
        email: 'user50@test.gov',
        hsesUsername: 'user.50',
        hsesUserId: '50',
      });
      await User.create({
        id: 51,
        name: 'user 51',
        email: 'user51@test.gov',
        hsesUsername: 'user.51',
        hsesUserId: '51',
      });
    });

    afterEach(async () => {
      await User.destroy({ where: { id: [50, 51] } });
    });

    it('retrieves the correct user', async () => {
      const user = await userByEmail('user50@test.gov');
      expect(user.id).toBe(50);
    });
    it('retrieves the correct user if case differs', async () => {
      const user = await userByEmail('User51@Test.Gov');
      expect(user.id).toBe(51);
    });
  });

  describe('usersWithPermissions', () => {
    const users = [
      {
        id: 50,
        regionId: 5,
        scopeId: SCOPES.APPROVE_REPORTS,
      },
      {
        id: 51,
        regionId: 6,
        scopeId: SCOPES.APPROVE_REPORTS,
      },
      {
        id: 52,
        regionId: 7,
        scopeId: SCOPES.APPROVE_REPORTS,
      },
      {
        id: 53,
        regionId: 5,
        scopeId: SCOPES.READ_REPORTS,
      },
    ];

    beforeEach(async () => {
      await Promise.all(
        users.map((u) => User.create({
          id: u.id,
          name: u.id,
          hsesUsername: u.id,
          hsesUserId: u.id,
          permissions: [{
            userId: u.id,
            regionId: u.regionId,
            scopeId: u.scopeId,
          }],
        }, { include: [{ model: Permission, as: 'permissions' }] })),
      );
    });

    afterEach(async () => {
      await User.destroy({ where: { id: [50, 51, 52, 53] } });
    });

    it("returns a list of users that have permissions on the user's regions", async () => {
      const matchingUsers = await usersWithPermissions([5, 6], [SCOPES.APPROVE_REPORTS]);
      const foundIds = matchingUsers.map((u) => u.id);
      expect(foundIds.includes(50)).toBeTruthy();
      expect(foundIds.includes(51)).toBeTruthy();
      expect(foundIds.length).toBe(2);
    });
  });
});
