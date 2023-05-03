import Objective from './objective';
import SCOPES from '../middleware/scopeConstants';
import { GOAL_STATUS, OBJECTIVE_STATUS } from '../constants';

describe('Objective policies', () => {
  describe('canUpload', () => {
    const baseObjective = {
      status: OBJECTIVE_STATUS.NOT_STARTED,
      goal: {
        status: GOAL_STATUS.NOT_STARTED,
        grant: {
          regionId: 1,
        },
      },
    };
    const baseUser = {
      permissions: [
        {
          scopeId: SCOPES.READ_WRITE_REPORTS,
          regionId: 1,
        },
      ],
    };

    it('is false if objective is complete', () => {
      const objective = {
        ...baseObjective,
        status: OBJECTIVE_STATUS.COMPLETE,
      };
      const policy = new Objective(objective, baseUser);
      expect(policy.canUpload()).toBe(false);
    });

    it('is false if goal is closed', () => {
      const objective = {
        ...baseObjective,
        goal: {
          ...baseObjective.goal,
          status: GOAL_STATUS.CLOSED,
        },
      };
      const policy = new Objective(objective, baseUser);
      expect(policy.canUpload()).toBe(false);
    });

    it('is false if the goal doesn\'t have a grant', () => {
      const objective = {
        ...baseObjective,
        goal: {
          ...baseObjective.goal,
          grant: null,
        },
      };
      const policy = new Objective(objective, baseUser);
      expect(policy.canUpload()).toBe(false);
    });

    it('is false if the user doesn\'t have write permissions in the grant\'s region', () => {
      const objective = {
        ...baseObjective,
      };
      const user = {
        ...baseUser,
        permissions: [],
      };
      const policy = new Objective(objective, user);
      expect(policy.canUpload()).toBe(false);
    });

    it('is true if all the conditions are satisfied', () => {
      const policy = new Objective(baseObjective, baseUser);
      expect(policy.canUpload()).toBe(true);
    });

    it('returns true for other entity objectives that aren\'t complete', () => {
      const objective = {
        ...baseObjective,
        otherEntityId: 1,
        goal: null,
      };
      const policy = new Objective(objective, baseUser);
      expect(policy.canUpload()).toBe(true);
    });
  });
});
