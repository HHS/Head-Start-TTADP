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
});
