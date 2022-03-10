import Goal from './goals';
import SCOPES from '../middleware/scopeConstants';

describe('Goals policies', () => {
  describe('canWriteInRegion', () => {
    it('returns false if they can\'t', async () => {
      const goal = { regionId: 2 };
      const user = {
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      };

      const policy = new Goal(user, goal);

      expect(policy.canWriteInRegion()).toBe(false);
    });

    it('returns true if they can read/write', async () => {
      const goal = { regionId: 2 };
      const user = {
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_WRITE_REPORTS,
          },
        ],
      };

      const policy = new Goal(user, goal);

      expect(policy.canWriteInRegion()).toBe(true);
    });

    it('returns true if they can approve', async () => {
      const goal = { regionId: 2 };
      const user = {
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.APPROVE_REPORTS,
          },
        ],
      };

      const policy = new Goal(user, goal);

      expect(policy.canWriteInRegion()).toBe(true);
    });
  });
});
