import isAdmin, { allRegionsUserHasPermissionTo } from '../permissions';
import { SCOPE_IDS } from '../Constants';

describe('permissions', () => {
  describe('isAdmin', () => {
    it('returns true if the user is an admin', () => {
      const user = {
        permissions: [
          {
            scopeId: SCOPE_IDS.ADMIN,
          },
        ],
      };
      expect(isAdmin(user)).toBeTruthy();
    });

    it('returns false if the user is not an admin', () => {
      const user = {
        permissions: [],
      };
      expect(isAdmin(user)).toBeFalsy();
    });
  });

  describe('allRegionsUserHasPermissionTo', () => {
    it('returns an array with all the correct regions', () => {
      const user = {
        permissions: [
          {
            scopeId: SCOPE_IDS.ADMIN,
            regionId: 14,
          },
          {
            scopeId: SCOPE_IDS.SITE_ACCESS,
            regionId: 14,
          },
          {
            scopeId: SCOPE_IDS.SITE_ACCESS,
            regionId: 1,
          },
          {
            scopeId: SCOPE_IDS.APPROVE_ACTIVITY_REPORTS,
            regionId: 1,
          },
          {
            scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
            regionId: 3,
          },
          {
            scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
            regionId: 4,
          },
          {
            scopeId: SCOPE_IDS.APPROVE_ACTIVITY_REPORTS,
            regionId: 4,
          },
        ],
      };
      const regions = allRegionsUserHasPermissionTo(user);
      expect(regions).toEqual(expect.arrayContaining([14, 3, 4]));
    });
  });
});
