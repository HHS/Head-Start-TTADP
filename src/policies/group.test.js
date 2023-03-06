import SCOPES from '../middleware/scopeConstants';
import Group from './group';

describe('Group', () => {
  describe('canAddToGroup', () => {
    it('should return true if the user has the proper permissions', () => {
      const user = {
        id: 1,
        permissions: [{
          region: 1,
          scopeId: SCOPES.READ_REPORTS,
        }],
      };

      const grants = [{
        region: 1,
      }];

      const g = new Group(user, grants);

      expect(g.canAddToGroup()).toBe(true);
    });

    it('should return false if the user does not have the proper permissions', () => {
      const user = {
        id: 1,
        permissions: [{
          regionId: 1,
          scopeId: SCOPES.READ_REPORTS,
        }],
      };

      const grants = [{
        regionId: 2,
      }];

      const g = new Group(user, grants);

      expect(g.canAddToGroup()).toBe(false);
    });
  });

  describe('ownsGroup', () => {
    it('should return true if the user owns the group', () => {
      const user = { id: 1 };
      const group = { userId: 1 };

      const g = new Group(user, [], group);

      expect(g.ownsGroup()).toBe(true);
    });

    it('should return false if the user does not own the group', () => {
      const user = { id: 1 };
      const group = { userId: 2 };

      const g = new Group(user, [], group);

      expect(g.ownsGroup()).toBe(false);
    });
  });
});
