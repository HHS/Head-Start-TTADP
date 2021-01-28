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
});
