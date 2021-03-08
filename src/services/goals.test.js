import {
  copyGoalsToGrants, saveGoalsForReport,
} from './goals';

import {
  Goal,
  Grant,
  Objective,
  ActivityReportObjective,
  GrantGoal,
} from '../models';

describe('Goals DB service', () => {
  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('copyGoalsToGrants', () => {
    it('creates a new grantGoal for every grant goal pair', async () => {
      const findAll = jest.fn();
      findAll.mockResolvedValue([{ id: 1, granteeId: 1 }, { id: 2, granteeId: 1 }]);
      Grant.findAll = findAll;
      GrantGoal.bulkCreate = jest.fn();

      await copyGoalsToGrants([{ id: 1 }, { id: 2 }], [1, 2]);

      const expected = [
        {
          grantId: 1,
          granteeId: 1,
          goalId: 1,
        },
        {
          grantId: 1,
          granteeId: 1,
          goalId: 2,
        },
        {
          grantId: 2,
          granteeId: 1,
          goalId: 1,
        },
        {
          grantId: 2,
          granteeId: 1,
          goalId: 2,
        },
      ];
      expect(GrantGoal.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining(expected),
        expect.anything(),
      );
    });
  });

  describe('saveGoalsForReport', () => {
    beforeEach(() => {
      ActivityReportObjective.findAll = jest.fn().mockResolvedValue([]);
      ActivityReportObjective.destroy = jest.fn();
      Goal.findAll = jest.fn().mockResolvedValue([]);
      Goal.destroy = jest.fn();
      Objective.destroy = jest.fn();
      ActivityReportObjective.create = jest.fn();
      Goal.create = jest.fn().mockResolvedValue({ id: 1 });
      Objective.create = jest.fn().mockResolvedValue({ id: 1 });
    });

    describe('with removed goals', () => {
      it('deletes the objective', async () => {
        ActivityReportObjective.findAll.mockResolvedValue([
          {
            objectiveId: 1,
            objective: {
              goalId: 1,
            },
          },
        ]);
        await saveGoalsForReport([], { id: 1 });

        expect(Objective.destroy).toHaveBeenCalledWith(
          {
            where: {
              id: [1],
            },
            transaction: undefined,
          },
        );
      });

      it('deletes the ActivityReportObjective', async () => {
        ActivityReportObjective.findAll.mockResolvedValue([]);
        await saveGoalsForReport([], { id: 1 });
        expect(ActivityReportObjective.destroy).toHaveBeenCalledWith({
          where: {
            activityReportId: 1,
          },
          transaction: undefined,
        });
      });

      it('deletes goals not attached to a grant', async () => {
        ActivityReportObjective.findAll.mockResolvedValue([
          {
            objectiveId: 1,
            objective: {
              goalId: 1,
            },
          },
          {
            objectiveId: 2,
            objective: {
              goalId: 2,
            },
          },
        ]);

        Goal.findAll.mockResolvedValue([
          {
            id: 1,
          },
        ]);

        await saveGoalsForReport([], { id: 1 });
        expect(Goal.destroy).toHaveBeenCalledWith({
          where: {
            id: [2],
          },
          transaction: undefined,
        });
      });
    });

    it('creates new goals', async () => {
      await saveGoalsForReport([{ id: 'new', name: 'name', objectives: [] }], { id: 1 });
      expect(Goal.create).toHaveBeenCalledWith({
        name: 'name',
        objectives: [],
      }, { transaction: undefined });
    });

    it('can use existing goals', async () => {
      await saveGoalsForReport([{ id: 1, name: 'name', objectives: [] }], { id: 1 });
      expect(Goal.create).not.toHaveBeenCalled();
    });

    it('can create new objectives', async () => {
      await saveGoalsForReport([{ id: 1, name: 'name', objectives: [{ title: 'title', new: true }] }], { id: 1 });
      expect(Objective.create).toHaveBeenCalledWith({
        goalId: 1,
        title: 'title',
      }, { transaction: undefined });
    });

    it('can update existing objectives', async () => {
      const objective = {};
      objective.update = jest.fn();
      Objective.findOne = jest.fn().mockResolvedValue(objective);

      await saveGoalsForReport([{ id: 1, name: 'name', objectives: [{ title: 'title', id: 1 }] }], { id: 1 });
      expect(Objective.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(objective.update).toHaveBeenCalledWith({ goalId: 1, title: 'title' }, { transaction: undefined });
    });
  });
});
