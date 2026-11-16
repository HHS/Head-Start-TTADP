import { UniqueConstraintError } from 'sequelize';
import SCOPES from '../../middleware/scopeConstants';
import { createRegion, createUser } from '../../testUtils';
import db from '..';

const { Permission, Region, User } = db;

describe('Permission', () => {
  describe('unique_primary_tta_approver_per_region index', () => {
    let users;
    let regions;

    beforeAll(async () => {
      users = await Promise.all([createUser({}), createUser({}), createUser({})]);
      regions = await Promise.all([createRegion({}), createRegion({})]);
    });

    afterEach(async () => {
      await Permission.destroy({ where: { regionId: regions.map((r) => r.id) } });
    });

    afterAll(async () => {
      await Region.destroy({ where: { id: regions.map((r) => r.id) } });
      await User.destroy({ where: { id: users.map((u) => u.id) } });
      await db.sequelize.close();
    });

    it('rejects a second primary approver in the same region', async () => {
      await Permission.create({
        userId: users[0].id,
        regionId: regions[0].id,
        scopeId: SCOPES.APPROVE_TTA_REQUESTS,
      });

      await expect(
        Permission.create({
          userId: users[1].id,
          regionId: regions[0].id,
          scopeId: SCOPES.APPROVE_TTA_REQUESTS,
        })
      ).rejects.toThrow(UniqueConstraintError);
    });

    it('allows primary approvers in different regions', async () => {
      await Permission.bulkCreate([
        { userId: users[0].id, regionId: regions[0].id, scopeId: SCOPES.APPROVE_TTA_REQUESTS },
        { userId: users[1].id, regionId: regions[1].id, scopeId: SCOPES.APPROVE_TTA_REQUESTS },
      ]);

      expect(
        await Permission.count({
          where: { regionId: regions.map((r) => r.id), scopeId: SCOPES.APPROVE_TTA_REQUESTS },
        })
      ).toBe(2);
    });

    it('allows multiple backup approvers alongside a primary approver in the same region', async () => {
      await Permission.bulkCreate([
        { userId: users[0].id, regionId: regions[0].id, scopeId: SCOPES.APPROVE_TTA_REQUESTS },
        {
          userId: users[1].id,
          regionId: regions[0].id,
          scopeId: SCOPES.BACKUP_APPROVE_TTA_REQUESTS,
        },
        {
          userId: users[2].id,
          regionId: regions[0].id,
          scopeId: SCOPES.BACKUP_APPROVE_TTA_REQUESTS,
        },
      ]);

      expect(await Permission.count({ where: { regionId: regions[0].id } })).toBe(3);
    });
  });
});
