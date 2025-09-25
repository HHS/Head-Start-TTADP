import faker from '@faker-js/faker';
import db, {
  User, TrainingReport, Permission,
} from '../models';

import {
  usersWithPermissions,
  userById,
  userByEmail,
  setFlag,
  getTrainingReportUsersByRegion,
  getUserNamesByIds,
  findAllUsersWithScope,
} from './users';

import SCOPES from '../middleware/scopeConstants';

describe('Users DB service', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('userById', () => {
    beforeEach(async () => {
      await User.create({
        id: 54,
        name: 'user 54',
        hsesUsername: 'user.54',
        hsesUserId: '54',
        lastLogin: new Date(),
      });
      await User.create({
        id: 55,
        name: 'user 55',
        hsesUsername: 'user.55',
        hsesUserId: '55',
        lastLogin: new Date(),
      });

      // Active user.
      await User.create({
        id: 56,
        name: 'user 56',
        hsesUsername: 'user.56',
        hsesUserId: '56',
        lastLogin: new Date(),
      });

      await Permission.create({
        userId: 56,
        regionId: 14,
        scopeId: SCOPES.SITE_ACCESS,
      });

      await Permission.create({
        userId: 56,
        regionId: 1,
        scopeId: SCOPES.READ_REPORTS,
      });

      // In-active users.
      await User.create({
        id: 57,
        name: 'user 57',
        hsesUsername: 'user.57',
        hsesUserId: '57',
      });

      await Permission.create({
        userId: 57,
        regionId: 1,
        scopeId: SCOPES.READ_REPORTS,
      });
    });

    afterEach(async () => {
      await Permission.destroy({ where: { userId: [56, 57] } });
      await User.destroy({ where: { id: [54, 55, 56, 57] } });
    });

    it('retrieves the correct user', async () => {
      const user = await userById(54);
      expect(user.id).toBe(54);
      expect(user.name).toBe('user 54');
    });

    it('retrieves user if they are active', async () => {
      const user = await userById(56, true);
      expect(user.id).toBe(56);
      expect(user.name).toBe('user 56');
    });

    it('does not retrieve user if they are inactive', async () => {
      const user = await userById(57, true);
      expect(user).toBe(null);
    });
  });

  describe('getUserNamesByIds', () => {
    beforeEach(async () => {
      await User.create({
        id: 54,
        name: 'user 54',
        hsesUsername: 'user.54',
        hsesUserId: '54',
        lastLogin: new Date(),
      });
      await User.create({
        id: 55,
        name: 'user 55',
        hsesUsername: 'user.55',
        hsesUserId: '55',
        lastLogin: new Date(),
      });
    });

    afterEach(async () => {
      await User.destroy({ where: { id: [54, 55] } });
    });

    it('retrieves the correct userNames', async () => {
      const users = await getUserNamesByIds([54, 55]);
      expect(users).toStrictEqual([
        'user 54',
        'user 55',
      ]);
    });
  });

  describe('userByEmail', () => {
    beforeEach(async () => {
      await User.create({
        id: 50,
        name: 'user 50',
        email: 'user50@test.gov',
        hsesUsername: 'user50',
        hsesUserId: '50',
        lastLogin: new Date(),
      });
      await User.create({
        id: 51,
        name: 'user 51',
        email: 'user51@test.gov',
        hsesUsername: 'user51',
        hsesUserId: '51',
        lastLogin: new Date(),
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

  describe('findAllUsersWithScope', () => {
    let user1;
    let user2;
    let user3;

    beforeAll(async () => {
      // User 1.
      user1 = await db.User.create({
        id: faker.datatype.number(),
        name: faker.datatype.string(),
        homeRegionId: 1,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      });

      await db.Permission.create({
        userId: user1.id,
        regionId: 1,
        scopeId: SCOPES.READ_WRITE_TRAINING_REPORTS,
      });

      // User 2.
      user2 = await db.User.create({
        id: faker.datatype.number(),
        name: faker.datatype.string(),
        homeRegionId: 2,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      });

      await db.Permission.create({
        userId: user2.id,
        regionId: 2,
        scopeId: SCOPES.READ_WRITE_REPORTS,
      });

      // User 3.
      user3 = await db.User.create({
        id: faker.datatype.number(),
        name: faker.datatype.string(),
        homeRegionId: 3,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        lastLogin: new Date(),
      });

      await db.Permission.create({
        userId: user3.id,
        regionId: 3,
        scopeId: SCOPES.READ_REPORTS,
      });

      await db.Permission.create({
        userId: user3.id,
        regionId: 1,
        scopeId: SCOPES.READ_WRITE_TRAINING_REPORTS,
      });
    });

    afterAll(async () => {
      // Destroy scopes for user 1, user 2, and user 3.
      await db.Permission.destroy({
        where: {
          userId: [user1.id, user2.id, user3.id],
        },
      });

      // Destroy all users.
      await db.User.destroy({
        where: {
          id: [user1.id, user2.id, user3.id],
        },
      });
    });

    it('returns all users with the scope', async () => {
      const results = await findAllUsersWithScope(SCOPES.READ_WRITE_TRAINING_REPORTS);
      expect(results.length).toBeGreaterThanOrEqual(2);

      // Ensure that user 1 and user 3 are returned.
      const user1Result = results.find((result) => result.id === user1.id);
      expect(user1Result).not.toBe(undefined);

      const user3Result = results.find((result) => result.id === user3.id);
      expect(user3Result).not.toBe(undefined);

      // Ensure any remaining results are not user 2.
      const user2Result = results.find((result) => result.id === user2.id);
      expect(user2Result).toBe(undefined);
    });

    it('returns empty array if invalid scope passed', async () => {
      const results = await findAllUsersWithScope('invalid scope');
      expect(results.length).toBe(0);
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
          lastLogin: new Date(),
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

  describe('setFlag', () => {
    const users = [
      {
        id: 50,
        regionId: 5,
        scopeId: SCOPES.SITE_ACCESS,
      },
      {
        id: 51,
        regionId: 6,
        scopeId: SCOPES.SITE_ACCESS,
      },
      {
        id: 52,
        regionId: 7,
        scopeId: SCOPES.SITE_ACCESS,
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
          lastLogin: new Date(),
        }, { include: [{ model: Permission, as: 'permissions' }] })),
      );
    });

    afterEach(async () => {
      await User.destroy({ where: { id: [50, 51, 52, 53] } });
    });

    it('adds a flag to users that do not have the flag', async () => {
      const result = await setFlag('anv_statistics', true);
      expect(result[1] > 3).toEqual(true);
      const user = await User.findOne({ where: { id: 50 } });
      expect(user.flags[0]).toBe('anv_statistics');
    });
    it('removes a flag from users that have the flag', async () => {
      await setFlag('anv_statistics', true);
      const result = await setFlag('anv_statistics', false);
      expect(result[1] > 3).toEqual(true);
      const user = await User.findOne({ where: { id: 50 } });
      expect(user.flags[0]).toBe(undefined);
    });
    it('does not set a flag for users without permissions', async () => {
      await setFlag('anv_statistics', true);
      const user = await User.findOne({ where: { id: 53 } });
      expect(user.flags[0]).toBe(undefined);
    });
  });

  describe('getTrainingReportUsersByRegion', () => {
    const userIds = [
      faker.datatype.number({ min: 25000 }),
      faker.datatype.number({ min: 25000 }),
      faker.datatype.number({ min: 25000 }),
      faker.datatype.number({ min: 25000 }),
      faker.datatype.number({ min: 25000 }),
      faker.datatype.number({ min: 25000 }),
    ];
    const users = [
      {
        id: userIds[0],
        regionId: 5,
        scopeId: SCOPES.POC_TRAINING_REPORTS,
      },
      {
        id: userIds[1],
        regionId: 5,
        scopeId: SCOPES.POC_TRAINING_REPORTS,
      },
      {
        id: userIds[2],
        regionId: 5,
        scopeId: SCOPES.READ_WRITE_TRAINING_REPORTS,
      },
      {
        id: userIds[3],
        regionId: 7,
        scopeId: SCOPES.READ_WRITE_TRAINING_REPORTS,
      },
      {
        id: userIds[4],
        regionId: 5,
        scopeId: SCOPES.SITE_ACCESS,
      },
      {
        id: userIds[5],
        regionId: 1,
        scopeId: SCOPES.SITE_ACCESS,
      },
    ];

    const trainingReportId = faker.datatype.number({ min: 25000 });

    beforeAll(async () => {
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
          lastLogin: new Date(),
        }, { include: [{ model: Permission, as: 'permissions' }] })),
        TrainingReport.create({
          id: trainingReportId,
          ownerId: userIds[5],
          pocIds: [],
          collaboratorIds: [],
          regionId: [1],
          data: {
            eventId: `-${trainingReportId}`,
          },
          imported: {},
        }),
      );
    });

    afterAll(async () => {
      await User.destroy({ where: { id: userIds } });
      await TrainingReport.destroy({ where: { id: trainingReportId } });
    });

    it('returns a list of users that have permissions on the region', async () => {
      const result = await getTrainingReportUsersByRegion(5);

      const collaboratorIds = result.collaborators.map((u) => u.id);
      const pointOfContact = result.pointOfContact.map((u) => u.id);
      const creators = result.creators.map((u) => u.id);

      expect(collaboratorIds.includes(userIds[2])).toBeTruthy();
      expect(collaboratorIds.length).toBe(1);

      expect(pointOfContact.includes(userIds[0])).toBeTruthy();
      expect(pointOfContact.includes(userIds[1])).toBeTruthy();
      expect(pointOfContact.length).toBe(2);

      expect(creators.includes(userIds[2])).toBeTruthy();
      expect(creators.length).toBe(1);
    });

    it('adds missing creator id when event id is passed', async () => {
      const result = await getTrainingReportUsersByRegion(5, trainingReportId);

      const collaboratorIds = result.collaborators.map((u) => u.id);
      const pointOfContact = result.pointOfContact.map((u) => u.id);
      const creators = result.creators.map((u) => u.id);

      expect(collaboratorIds.includes(userIds[2])).toBeTruthy();
      expect(collaboratorIds.length).toBe(1);

      expect(pointOfContact.includes(userIds[0])).toBeTruthy();
      expect(pointOfContact.includes(userIds[1])).toBeTruthy();
      expect(pointOfContact.length).toBe(2);

      expect(creators.includes(userIds[2])).toBeTruthy();
      expect(creators.includes(userIds[5])).toBeTruthy();
      expect(creators.length).toBe(2);
    });
  });
});
