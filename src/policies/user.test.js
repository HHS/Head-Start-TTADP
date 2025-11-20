import User from './user';
import SCOPES from '../middleware/scopeConstants';

describe('User policies', () => {
  describe('canViewUsersInRegion', () => {
    const user = {
      permissions: [{
        regionId: 1,
        scopeId: SCOPES.READ_WRITE_REPORTS,
      }],
    };
    it('is true if the user has read/write permissions', () => {
      const policy = new User(user);
      expect(policy.canViewUsersInRegion(1)).toBeTruthy();
    });

    it('is false if the user does not have read/write permissions', () => {
      const policy = new User(user);
      expect(policy.canViewUsersInRegion(2)).toBeFalsy();
    });
  });

  describe('canWriteInAtLeastOneRegion', () => {
    it('returns true if the user can', () => {
      const user = {
        permissions: [{
          regionId: 1,
          scopeId: SCOPES.READ_WRITE_REPORTS,
        }],
      };
      const policy = new User(user);
      expect(policy.canWriteInAtLeastOneRegion()).toBeTruthy();
    });

    it('returns false if the user cannot', () => {
      const user = {
        permissions: [{
          regionId: 1,
          scopeId: SCOPES.READ_REPORTS,
        }],
      };
      const policy = new User(user);
      expect(policy.canWriteInAtLeastOneRegion()).toBeFalsy();
    });
  });

  describe('isAdmin', () => {
    it('returns true if a user is an admin', () => {
      const user = {
        permissions: [{
          regionId: 1,
          scopeId: SCOPES.ADMIN,
        }],
      };
      const policy = new User(user);
      expect(policy.isAdmin()).toBeTruthy();
    });

    it('returns false if a user is not an admin', () => {
      const user = {
        permissions: [{
          regionId: 1,
          scopeId: SCOPES.READ_WRITE_REPORTS,
        }],
      };
      const policy = new User(user);
      expect(policy.isAdmin()).toBeFalsy();
    });
  });

  describe('canSeeBehindFeatureFlags', () => {
    const user = {
      permissions: [{
        regionId: 1,
        scopeId: SCOPES.READ_WRITE_REPORTS,
      }],
      flags: ['grantee_record_page'],
    };
    it('is true if the user has the flag', () => {
      const policy = new User(user);
      expect(policy.canSeeBehindFeatureFlag('grantee_record_page')).toBeTruthy();
    });

    it('is false if the user does not have read/write permissions', () => {
      const policy = new User(user);
      expect(policy.canSeeBehindFeatureFlag('helicopter_specification_page')).toBeFalsy();
    });

    it('returns true if the user is an admin', () => {
      const userTwo = {
        permissions: [{
          regionId: 1,
          scopeId: SCOPES.ADMIN,
        }],
        flags: [],
      };
      const policy = new User(userTwo);
      expect(policy.canSeeBehindFeatureFlag('grantee_record_page')).toBeTruthy();
    });
  });

  describe('canWriteInRegion', () => {
    const user = {
      permissions: [{
        regionId: 1,
        scopeId: SCOPES.READ_WRITE_REPORTS,
      }],
    };
    it('is true if the user has read/write permissions', () => {
      const policy = new User(user);
      expect(policy.canWriteInRegion(1)).toBeTruthy();
    });

    it('is false if the user does not have read/write permissions', () => {
      const policy = new User(user);
      expect(policy.canWriteInRegion(2)).toBeFalsy();
    });
  });

  describe('canAccessRegion', () => {
    const user = {
      get: () => ({
        permissions: [
          { scopeId: SCOPES.READ_REPORTS, regionId: 1 },
          { scopeId: SCOPES.APPROVE_REPORTS, regionId: 2 },
          { scopeId: SCOPES.READ_WRITE_REPORTS, regionId: 3 },
        ],
        roles: [{ name: 'Admin' }],
        flags: ['feature-flag-1', 'feature-flag-2'],
      }),
    };

    it('should return true if user can access a region', () => {
      const policy = new User(user);
      expect(policy.canAccessRegion(1)).toBe(true);
      expect(policy.canAccessRegion(2)).toBe(true);
      expect(policy.canAccessRegion(3)).toBe(true);
    });

    it('should return false if user cannot access a region', () => {
      const policy = new User(user);
      expect(policy.canAccessRegion(4)).toBe(false);
    });
  });

  describe('getAllAccessibleRegions', () => {
    const user = {
      get: () => ({
        permissions: [
          { scopeId: SCOPES.READ_REPORTS, regionId: 1 },
          { scopeId: SCOPES.APPROVE_REPORTS, regionId: 2 },
          { scopeId: SCOPES.READ_WRITE_REPORTS, regionId: 3 },
        ],
        roles: [{ name: 'Admin' }],
        flags: ['feature-flag-1', 'feature-flag-2'],
      }),
    };

    it('should return all accessible regions', () => {
      const policy = new User(user);
      const accessibleRegions = policy.getAllAccessibleRegions();
      expect(accessibleRegions).toEqual([1, 2, 3]);
    });
  });
  describe('filterRegions', () => {
    const user = {
      get: () => ({
        permissions: [
          { scopeId: SCOPES.READ_REPORTS, regionId: 1 },
          { scopeId: SCOPES.APPROVE_REPORTS, regionId: 2 },
          { scopeId: SCOPES.READ_WRITE_REPORTS, regionId: 3 },
        ],
        roles: [{ name: 'Admin' }],
        flags: ['feature-flag-1', 'feature-flag-2'],
      }),
    };

    it('should filter regions based on user permissions', () => {
      const policy = new User(user);
      const regionList = [1, 2, 3, 4];
      const filteredRegions = policy.filterRegions(regionList);
      expect(filteredRegions).toEqual([1, 2, 3]);
    });

    it('should return all accessible regions if region list is empty', () => {
      const policy = new User(user);
      const filteredRegions = policy.filterRegions([]);
      expect(filteredRegions).toEqual([1, 2, 3]);
    });

    it('should return an empty array if user has no permissions', () => {
      const emptyUser = { get: () => ({ permissions: [] }) };
      const policy = new User(emptyUser);
      const filteredRegions = policy.filterRegions([]);
      expect(filteredRegions).toEqual([]);
    });
  });

  describe('canViewCitationsInRegion', () => {
    const writeUser = {
      permissions: [{
        regionId: 1,
        scopeId: SCOPES.READ_WRITE_REPORTS,
      }],
    };
    const approveUser = {
      permissions: [{
        regionId: 1,
        scopeId: SCOPES.APPROVE_REPORTS,
      }],
    };
    const readUser = {
      permissions: [{
        regionId: 1,
        scopeId: SCOPES.READ_REPORTS,
      }],
    };

    it('is true if the user has read/write permissions', () => {
      const policy = new User(writeUser);
      expect(policy.canViewCitationsInRegion(1)).toBeTruthy();
    });

    it('is true if the user has read permissions', () => {
      const policy = new User(readUser);
      expect(policy.canViewCitationsInRegion(1)).toBeTruthy();
    });

    it('is true if the user has approve permissions', () => {
      const policy = new User(approveUser);
      expect(policy.canViewCitationsInRegion(1)).toBeTruthy();
    });

    it('is false if the user does not have read/write permissions', () => {
      const policy = new User(writeUser);
      expect(policy.canViewCitationsInRegion(2)).toBeFalsy();
    });
  });

  describe('checkPermissions', () => {
    const userWithFeatureFlag = {
      permissions: [{ regionId: 1, scopeId: SCOPES.READ_WRITE_REPORTS }],
      flags: ['featureA'],
    };

    const userWithoutFeatureFlag = {
      permissions: [{ regionId: 1, scopeId: SCOPES.READ_WRITE_REPORTS }],
      flags: [],
    };

    it('returns true if targetString contains matchString and user can see the feature flag', () => {
      const policy = new User(userWithFeatureFlag);
      const result = policy.checkPermissions('targetString', ['target'], 'featureA');
      expect(result).toBeTruthy();
    });

    it('returns false if targetString contains matchString but user cannot see the feature flag', () => {
      const policy = new User(userWithoutFeatureFlag);
      const result = policy.checkPermissions('targetString', ['target'], 'featureA');
      expect(result).toBeFalsy();
    });

    it('returns true if targetString does not contain any matchStrings', () => {
      const policy = new User(userWithoutFeatureFlag);
      const result = policy.checkPermissions('noMatchString', ['target'], 'featureA');
      expect(result).toBeTruthy();
    });

    it('returns true if matchStrings is an empty array', () => {
      const policy = new User(userWithFeatureFlag);
      const result = policy.checkPermissions('targetString', [], 'featureA');
      expect(result).toBeTruthy();
    });

    it('returns true if targetString is empty and matchStrings is not empty', () => {
      const policy = new User(userWithoutFeatureFlag);
      const result = policy.checkPermissions('', ['target'], 'featureA');
      expect(result).toBeTruthy();
    });
  });
});
