import { SCOPE_IDS } from '@ttahub/common';
import isAdmin, {
  hasReadWrite,
  allRegionsUserHasPermissionTo,
  getRegionWithReadWrite,
  hasApproveActivityReport,
  hasApproveActivityReportInRegion,
  canSeeBehindFeatureFlag,
  canChangeObjectiveStatus,
  canChangeGoalStatus,
  canEditOrCreateGoals,
  hasTrainingReportWritePermissions,
  canEditOrCreateSessionReports,
} from '../permissions';

describe('permissions', () => {
  describe('canCreateOrEditGoals', () => {
    it('returns true if the user has read/write to a region', () => {
      const user = {
        permissions: [
          {
            scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
            regionId: 1,
          },
        ],
      };
      expect(canEditOrCreateGoals(user, 1)).toBeTruthy();
    });
    it('returns false if the user does not have read/write to a region', () => {
      const user = {
        permissions: [
          {
            scopeId: SCOPE_IDS.READ_REPORTS,
            regionId: 1,
          },
        ],
      };
      expect(canEditOrCreateGoals(user, 1)).toBeFalsy();
    });
    it('returns true if the user has approve in a region', () => {
      const user = {
        permissions: [
          {
            scopeId: SCOPE_IDS.APPROVE_ACTIVITY_REPORTS,
            regionId: 1,
          },
        ],
      };
      expect(canEditOrCreateGoals(user, 1)).toBeTruthy();
    });
  });
  describe('canChangeObjectiveStatus', () => {
    it('returns true if the user has read/write to a region', () => {
      const user = {
        permissions: [
          {
            scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
            regionId: 1,
          },
        ],
      };
      expect(canChangeObjectiveStatus(user, 1)).toBeTruthy();
    });
    it('returns false if the user does not have read/write to a region', () => {
      const user = {
        permissions: [
          {
            scopeId: SCOPE_IDS.READ_REPORTS,
            regionId: 1,
          },
        ],
      };
      expect(canChangeObjectiveStatus(user, 1)).toBeFalsy();
    });
    it('returns true if the user has approve in a region', () => {
      const user = {
        permissions: [
          {
            scopeId: SCOPE_IDS.APPROVE_ACTIVITY_REPORTS,
            regionId: 1,
          },
        ],
      };
      expect(canChangeObjectiveStatus(user, 1)).toBeTruthy();
    });
  });
  describe('canChangeGoalStatus', () => {
    it('returns true if the user has read/write to a region', () => {
      const user = {
        permissions: [
          {
            scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
            regionId: 1,
          },
        ],
      };
      expect(canChangeGoalStatus(user, 1)).toBeTruthy();
    });
    it('returns false if the user does not have read/write to a region', () => {
      const user = {
        permissions: [
          {
            scopeId: SCOPE_IDS.READ_REPORTS,
            regionId: 1,
          },
        ],
      };
      expect(canChangeGoalStatus(user, 1)).toBeFalsy();
    });
    it('returns true if the user has approve in a region', () => {
      const user = {
        permissions: [
          {
            scopeId: SCOPE_IDS.APPROVE_ACTIVITY_REPORTS,
            regionId: 1,
          },
        ],
      };
      expect(canChangeGoalStatus(user, 1)).toBeTruthy();
    });
  });
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
            scopeId: SCOPE_IDS.UNLOCK_APPROVED_REPORTS,
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
          {
            scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
            regionId: 3,
          },
        ],
      };
      const includeAdmin = true;
      const regions = allRegionsUserHasPermissionTo(user, includeAdmin);
      expect(regions).toEqual(expect.arrayContaining([14, 3, 4, 3]));
    });

    it('returns empty array when user has no permissions', () => {
      const user = {};
      const regions = allRegionsUserHasPermissionTo(user);
      expect(regions).toEqual([]);
    });
  });

  describe('hasReadWrite', () => {
    it('returns true if the user has read/write to a region', () => {
      const user = {
        permissions: [
          {
            scopeId: 3,
            regionId: 1,
          },
        ],
      };
      expect(hasReadWrite(user)).toBeTruthy();
    });

    it('returns false if the user does not have read/write to a region', () => {
      const user = {
        permissions: [
          {
            scopeId: 2,
            regionId: 1,
          },
        ],
      };
      expect(hasReadWrite(user)).toBeFalsy();
    });
  });

  describe('hasApproveActivityReport', () => {
    it('returns true if the user has approve activity report permission', () => {
      const user = {
        permissions: [
          {
            scopeId: 5,
            regionId: 1,
          },
        ],
      };
      expect(hasApproveActivityReport(user)).toBeTruthy();
    });

    it('returns false if the user does not have approve activity report permission', () => {
      const user = {
        permissions: [
          {
            scopeId: 2,
            regionId: 1,
          },
        ],
      };
      expect(hasApproveActivityReport(user)).toBeFalsy();
    });
  });

  describe('hasApproveActivityReportInRegion', () => {
    it('returns true if the user has the appropriate permission', () => {
      const user = {
        permissions: [
          {
            scopeId: 5,
            regionId: 1,
          },
        ],
      };
      expect(hasApproveActivityReportInRegion(user, 1)).toBeTruthy();
    });

    it('returns false if the user does not have the appropriate permission', () => {
      const user = {
        permissions: [
          {
            scopeId: 2,
            regionId: 1,
          },
        ],
      };
      expect(hasApproveActivityReportInRegion(user, 1)).toBeFalsy();
    });

    it('returns false if the user does not have the appropriate region', () => {
      const user = {
        permissions: [
          {
            scopeId: 5,
            regionId: 2,
          },
        ],
      };
      expect(hasApproveActivityReportInRegion(user, 1)).toBeFalsy();
    });
  });

  describe('getRegionWithReadWrite', () => {
    it('returns region where user has permission', () => {
      const user = {
        permissions: [
          {
            regionId: 4,
            scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
          },
          {
            regionId: 1,
            scopeId: SCOPE_IDS.ADMIN,
          },
          {
            regionId: 2,
            scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
          },
        ],
      };

      const region = getRegionWithReadWrite(user);
      expect(region).toBe(2);
    });

    it('returns no region', () => {
      const user = {
        permissions: [
          {
            regionId: 4,
            scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
          },
          {
            regionId: 1,
            scopeId: SCOPE_IDS.ADMIN,
          },
        ],
      };

      const region = getRegionWithReadWrite(user);
      expect(region).toBe(-1);
    });

    it('returns region because user object has no permissions', () => {
      const user = {};

      const region = getRegionWithReadWrite(user);
      expect(region).toBe(-1);
    });
  });

  describe('canSeeBehindFeatureFlag', () => {
    it('returns false if no user', () => {
      const flag = 'flag1';
      const result = canSeeBehindFeatureFlag(null, flag);
      expect(result).toBe(false);
    });

    it('returns false if no flags', () => {
      const flag = 'flag1';
      const result = canSeeBehindFeatureFlag({}, flag);
      expect(result).toBe(false);
    });

    it('returns true if the user has the specified flag', () => {
      const user = {
        flags: ['flag1', 'flag2'],
      };
      const flag = 'flag1';
      const result = canSeeBehindFeatureFlag(user, flag);
      expect(result).toBe(true);
    });

    it('returns true if the user is an admin', () => {
      const user = {
        flags: [],
        permissions: [
          {
            scopeId: SCOPE_IDS.ADMIN,
          },
        ],
      };
      const flag = 'flag1';
      const result = canSeeBehindFeatureFlag(user, flag);
      expect(result).toBe(true);
    });

    it('returns false if the user does not have the specified flag and is not an admin', () => {
      const user = {
        flags: ['flag2', 'flag3'],
        permissions: [],
      };
      const flag = 'flag1';
      const result = canSeeBehindFeatureFlag(user, flag);
      expect(result).toBe(false);
    });
  });

  describe('hasTrainingReportWritePermissions', () => {
    it('returns true if the user has read_write_training_repotrs', () => {
      const user = {
        permissions: [
          {
            scopeId: SCOPE_IDS.READ_WRITE_TRAINING_REPORTS,
            regionId: 1,
          },
        ],
      };
      expect(hasTrainingReportWritePermissions(user)).toBeTruthy();
    });

    it('returns true if the user has POC training reports', () => {
      const user = {
        permissions: [
          {
            scopeId: SCOPE_IDS.POC_TRAINING_REPORTS,
            regionId: 1,
          },
        ],
      };
      expect(hasTrainingReportWritePermissions(user)).toBeTruthy();
    });

    it('returns true if the user has ADMIN permission', () => {
      const user = {
        permissions: [
          {
            scopeId: SCOPE_IDS.ADMIN,
            regionId: 1,
          },
        ],
      };
      expect(hasTrainingReportWritePermissions(user)).toBeTruthy();
    });

    it('returns false otherwise', () => {
      const user = {
        permissions: [
          {
            scopeId: SCOPE_IDS.READ_REPORTS,
            regionId: 1,
          },
        ],
      };
      expect(hasTrainingReportWritePermissions(user)).toBeFalsy();
    });
  });

  describe('canEditOrCreateSessionReports', () => {
    it('returns true if the user is an admin', () => {
      const user = {
        permissions: [
          {
            scopeId: SCOPE_IDS.ADMIN,
          },
        ],
      };
      expect(canEditOrCreateSessionReports(user, 1)).toBeTruthy();
    });

    it('returns true if the user has read_write_training_reports', () => {
      const user = {
        permissions: [
          {
            scopeId: SCOPE_IDS.READ_WRITE_TRAINING_REPORTS,
            regionId: 1,
          },
        ],
      };
      expect(canEditOrCreateSessionReports(user, 1)).toBeTruthy();
    });

    it('returns false otherwise', () => {
      const user = {
        permissions: [
          {
            scopeId: SCOPE_IDS.READ_REPORTS,
            regionId: 1,
          },
        ],
      };
      expect(canEditOrCreateSessionReports(user, 1)).toBeFalsy();
    });
  });
});
