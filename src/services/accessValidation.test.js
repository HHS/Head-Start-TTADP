import db, { User, Permission, sequelize } from '../models';
import {
  validateUserAuthForAccess,
  validateUserAuthForAdmin,
  getUserReadRegions,
  setReadRegions,
} from './accessValidation';
import SCOPES from '../middleware/scopeConstants';

const {
  SITE_ACCESS, ADMIN, READ_REPORTS, READ_WRITE_REPORTS,
} = SCOPES;

const mockUser = {
  id: 47,
  name: 'Joe Green',
  title: null,
  phoneNumber: '555-555-554',
  hsesUserId: '47',
  email: 'test47@test.com',
  hsesUsername: 'test47@test.com',
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
    await db.sequelize.close();
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

      expect(regions.length).toBe(2);
      expect(regions).toContain(13);
      expect(regions).toContain(14);
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

  describe('setReadRegions', () => {
    it('filters out regions user does not have permissions to', async () => {
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

      const query = { 'region.in': [1, 13, 14] };

      const queryWithFilteredRegions = await setReadRegions(query, mockUser.id);

      expect(queryWithFilteredRegions).toStrictEqual({ 'region.in': [13, 14] });
    });

    it('returns all regions user has permissions to if region not specified', async () => {
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

      const query = {};

      const queryWithFilteredRegions = await setReadRegions(query, mockUser.id);
      const queryRegions = queryWithFilteredRegions['region.in'];
      expect(queryRegions.length).toBe(2);

      [14, 13].forEach((region) => {
        expect(queryRegions).toContain(region);
      });
    });

    it('returns an empty array if user has no permissions', async () => {
      await setupUser(mockUser);

      const query = { 'region.in': [1, 13, 14] };

      const queryWithFilteredRegions = await setReadRegions(query, mockUser.id);

      expect(queryWithFilteredRegions).toStrictEqual({ 'region.in': [] });
    });

    it('returns an empty array if a user does not exist in database', async () => {
      await User.destroy({ where: { id: mockUser.id } });

      const query = { 'region.in': [1, 13, 14] };

      const queryWithFilteredRegions = await setReadRegions(query, mockUser.id);

      expect(queryWithFilteredRegions).toStrictEqual({ 'region.in': [] });
    });
  });
});
