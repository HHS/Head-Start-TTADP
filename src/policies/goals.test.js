import Goal from './goals';
import SCOPES from '../middleware/scopeConstants';
import { REPORT_STATUSES } from '../constants';

describe('Goals policies', () => {
  describe('canDelete && canEdit', () => {
    it('returns false if the goal is on an approved activity report', async () => {
      const goal = {
        objectives: [
          {
            activityReports: [
              { id: 1, calculatedStatus: REPORT_STATUSES.APPROVED },
            ],
          },
        ],
        grants: [
          { regionId: 2 },
        ],
      };
      const user = {
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.APPROVE_REPORTS,
          },
        ],
      };

      const policy = new Goal(user, goal);
      expect(policy.canDelete()).toBe(false);
    });

    it('returns false if user\'s permissions don\'t match the region', async () => {
      const goal = {
        objectives: [],
        grants: [
          { regionId: 2 },
        ],
      };
      const user = {
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      };

      const policy = new Goal(user, goal);
      expect(policy.canDelete()).toBe(false);
    });

    it('returns true otherwise', async () => {
      const goal = {
        objectives: [],
        grants: [
          { regionId: 2 },
        ],
      };
      const user = {
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_WRITE_REPORTS,
          },
        ],
      };

      const policy = new Goal(user, goal);
      expect(policy.canDelete()).toBe(true);
    });
  });

  describe('canCreate', () => {
    it('returns false if they can\'t', async () => {
      const goal = {};
      const regionId = 2;
      const user = {
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      };

      const policy = new Goal(user, goal, regionId);

      expect(policy.canCreate()).toBe(false);
    });

    it('returns true if they can read/write', async () => {
      const goal = {};
      const user = {
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_WRITE_REPORTS,
          },
        ],
      };

      const regionId = 2;

      const policy = new Goal(user, goal, regionId);

      expect(policy.canCreate()).toBe(true);
    });

    it('returns true if they can approve', async () => {
      const goal = {};
      const user = {
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.APPROVE_REPORTS,
          },
        ],
      };
      const regionId = 2;

      const policy = new Goal(user, goal, regionId);

      expect(policy.canCreate()).toBe(true);
    });
  });
});
