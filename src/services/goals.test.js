import { Op } from 'sequelize';
import {
  copyGoalsToGrants, saveGoalsForReport, goalsForGrants,
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
      Grant.findAll = jest.fn();
      Grant.findAll.mockResolvedValue([{ id: 1, recipientId: 1 }, { id: 2, recipientId: 1 }]);

      GrantGoal.bulkCreate = jest.fn();

      await copyGoalsToGrants([{ id: 1 }, { id: 2 }], [1, 2]);

      const expected = [
        {
          grantId: 1,
          recipientId: 1,
          goalId: 1,
        },
        {
          grantId: 1,
          recipientId: 1,
          goalId: 2,
        },
        {
          grantId: 2,
          recipientId: 1,
          goalId: 1,
        },
        {
          grantId: 2,
          recipientId: 1,
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
      Goal.findOne = jest.fn().mockResolvedValue();
      Goal.destroy = jest.fn();
      Goal.upsert = jest.fn();
      Objective.destroy = jest.fn();
      ActivityReportObjective.create = jest.fn();
      Goal.create = jest.fn().mockResolvedValue({ id: 1 });
      Objective.create = jest.fn().mockResolvedValue({ id: 1 });
      Objective.upsert = jest.fn().mockResolvedValue([{ id: 1 }]);
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
      expect(Goal.upsert).toHaveBeenCalledWith({
        name: 'name',
        objectives: [],
      }, { returning: true, transaction: undefined });
    });

    it('can use existing goals', async () => {
      const existingGoal = {
        id: 1,
        name: 'name',
        objectives: [],
      };
      await saveGoalsForReport([existingGoal], { id: 1 });
      expect(Goal.upsert).toHaveBeenCalledWith({ id: 1, name: 'name', objectives: [] }, { returning: true, transaction: undefined });
    });

    test.todo('can update an existing goal');

    it('can create new objectives', async () => {
      const existingGoal = {
        id: 1,
        name: 'name',
        objectives: [],
        update: jest.fn(),
      };

      Goal.upsert.mockResolvedValue([{ id: 1 }]);

      const goalWithNewObjective = {
        ...existingGoal,
        objectives: [{ title: 'title' }],
      };
      await saveGoalsForReport([goalWithNewObjective], { id: 1 });
      expect(Objective.upsert).toHaveBeenCalledWith({
        goalId: 1,
        title: 'title',
      }, { returning: true, transaction: undefined });
    });

    it('can update existing objectives', async () => {
      const existingGoal = {
        id: 1,
        name: 'name',
        objectives: [{ title: 'title', id: 1 }],
        update: jest.fn(),
      };

      Goal.upsert.mockResolvedValue([{ id: 1 }]);

      await saveGoalsForReport([existingGoal], { id: 1 });
      expect(Objective.upsert).toHaveBeenCalledWith({ id: 1, goalId: 1, title: 'title' }, { returning: true, transaction: undefined });
    });
  });
});

describe('goalsForGrants', () => {
  beforeAll(async () => {
    jest.resetAllMocks();
  });

  it('finds the correct list of goals', async () => {
    Grant.findAll = jest.fn();
    Grant.findAll.mockResolvedValue([{ id: 505, oldGrantId: 506 }]);
    Goal.findAll = jest.fn();
    Goal.findAll.mockResolvedValue([{ id: 505 }, { id: 506 }]);

    await goalsForGrants([506]);

    expect(Goal.findAll).toHaveBeenCalledWith({
      where: {
        [Op.or]: [
          {
            status: 'Not Started',
          },
          {
            status: 'In Progress',
          },
          {
            status: null,
          },
        ],
      },
      include: [
        {
          model: Grant,
          as: 'grants',
          attributes: ['id'],
          where: {
            id: [505, 506],
          },
        },
      ],
      order: ['createdAt'],
    });
  });
});
