import { Op } from 'sequelize';
import {
  saveGoalsForReport, goalsForGrants,
} from '../goals';
import {
  sequelize,
  Goal,
  Grant,
  Objective,
  ActivityReportObjective,
  ActivityReportGoal,
} from '../../models';

describe('Goals DB service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  const existingGoalUpdate = jest.fn();
  const existingObjectiveUpdate = jest.fn();

  describe('saveGoalsForReport', () => {
    beforeEach(() => {
      ActivityReportGoal.findAll = jest.fn().mockResolvedValue([]);
      ActivityReportGoal.destroy = jest.fn();
      ActivityReportGoal.findOrCreate = jest.fn()
        .mockResolvedValue([{
          id: 1, goalId: 1, activityReportId: 1, update: jest.fn(),
        }, false]);
      ActivityReportGoal.create = jest.fn();

      ActivityReportObjective.findAll = jest.fn().mockResolvedValue([]);
      ActivityReportObjective.destroy = jest.fn();
      ActivityReportObjective.findOrCreate = jest.fn()
        .mockResolvedValue([{ id: 1, objectiveId: 1, update: jest.fn() }]);
      ActivityReportObjective.create = jest.fn();

      Goal.findAll = jest.fn().mockResolvedValue([{
        goalTemplateId: 1, update: existingGoalUpdate, id: 1,
      }]);
      Goal.findOne = jest.fn().mockResolvedValue();
      Goal.findByPk = jest.fn().mockResolvedValue({
        update: existingGoalUpdate, grantId: 1, id: 1, goalTemplateId: 1,
      });
      Goal.findOrCreate = jest.fn().mockResolvedValue([{ id: 1, update: jest.fn() }, false]);
      Goal.destroy = jest.fn();
      Goal.update = jest.fn().mockResolvedValue([1, [{ id: 1 }]]);
      Goal.create = jest.fn().mockResolvedValue({ id: 1 });

      ActivityReportGoal.findAll = jest.fn().mockResolvedValue([]);
      ActivityReportGoal.findOrCreate = jest.fn().mockResolvedValue();

      Objective.destroy = jest.fn();
      Objective.create = jest.fn().mockResolvedValue({ id: 1 });
      Objective.findOrCreate = jest.fn().mockResolvedValue([{ id: 1 }]);
      Objective.update = jest.fn().mockResolvedValue({ id: 1 });
      Objective.findByPk = jest.fn().mockResolvedValue({ id: 1, update: existingObjectiveUpdate });
    });

    describe('with removed goals', () => {
      it('does not delete the objective', async () => {
        // Find this objective to delete.
        ActivityReportObjective.findAll.mockResolvedValueOnce([
          {
            objectiveId: 1,
            objective: {
              goalId: 1,
            },
          },
          {
            objectiveId: 2,
            objective: {
              goalId: 1,
            },
          },
        ]);

        // Prevent the delete of objective 2.
        ActivityReportObjective.findAll.mockResolvedValueOnce([
          {
            objectiveId: 2,
            objective: {
              goalId: 1,
            },
          },
        ]);
        await saveGoalsForReport([], { id: 1 });
        expect(Objective.destroy).not.toHaveBeenCalled();
      });

      it('deletes the ActivityReportObjective', async () => {
        ActivityReportObjective.findAll.mockResolvedValue([]);
        await saveGoalsForReport([], { id: 1 });
        expect(ActivityReportObjective.destroy).toHaveBeenCalledWith({
          where: {
            activityReportId: 1,
            objectiveId: [],
          },
        });
      });

      it('does not delete goals not being used by ActivityReportGoals', async () => {
        ActivityReportObjective.findAll.mockResolvedValue([
          {
            objectiveId: 1,
            objective: {
              goalId: 1,
              goal: {
                id: 1,
                objectives: [{ id: 1 }],
              },
            },
          },
          {
            objectiveId: 2,
            objective: {
              goalId: 2,
              goal: {
                id: 2,
                objectives: [{ id: 2 }],
              },
            },
          },
        ]);

        ActivityReportGoal.findAll.mockResolvedValue([
          {
            goalId: 1,
          },
        ]);

        await saveGoalsForReport([], { id: 1 });
        expect(Goal.destroy).not.toHaveBeenCalled();
      });
    });

    it('creates new goals', async () => {
      ActivityReportGoal.findOrCreate.mockResolvedValue([
        {
          goalId: 1,
        },
      ]);
      await saveGoalsForReport([
        {
          isNew: true, grantIds: [1], name: 'name', status: 'Closed', objectives: [],
        },
      ], { id: 1 });
      expect(Goal.findOrCreate).toHaveBeenCalledWith({
        defaults: {
          createdVia: 'activityReport',
          name: 'name',
          status: 'Closed',
        },
        where: {
          grantId: 1,
          name: 'name',
          status: {
            [Op.not]: 'Closed',
          },
        },
      });
    });

    it('can use existing goals', async () => {
      ActivityReportGoal.findOrCreate.mockResolvedValue([
        {
          goalId: 1,
        },
      ]);
      const existingGoal = {
        id: 1,
        name: 'name',
        objectives: [],
        grantIds: [1, 2],
        goalIds: [1],
      };

      await saveGoalsForReport([existingGoal], { id: 1 });
      expect(existingGoalUpdate).toHaveBeenCalledWith({
        name: 'name',
        status: 'Not Started',
      }, { individualHooks: true });
    });

    test.todo('can update an existing goal');

    it('can create new objectives', async () => {
      ActivityReportGoal.findOrCreate.mockResolvedValue([
        {
          id: 1,
          goalId: 1,
        },
      ]);
      const existingGoal = {
        id: 1,
        name: 'name',
        objectives: [],
        update: jest.fn(),
        grantIds: [1],
        goalIds: [1],
      };

      const goalWithNewObjective = {
        ...existingGoal,
        objectives: [{
          isNew: true, goalId: 1, title: 'title', ttaProvided: '', ActivityReportObjective: { }, status: '',
        }],
      };
      await saveGoalsForReport([goalWithNewObjective], { id: 1 });
      expect(Objective.create).toHaveBeenCalledWith({
        goalId: 1,
        title: 'title',
        status: '',
      });
    });

    it('can update existing objectives', async () => {
      ActivityReportGoal.findOrCreate.mockResolvedValue([
        {
          goalId: 1,
        },
      ]);
      const existingGoal = {
        id: 1,
        name: 'name',
        objectives: [{ title: 'title', id: 1, status: 'Closed' }],
        update: jest.fn(),
        grantIds: [1],
        goalIds: [1],
      };

      await saveGoalsForReport([existingGoal], { id: 1 });
      expect(existingObjectiveUpdate).toHaveBeenCalledWith({ title: 'title', status: 'Closed' }, { individualHooks: true });
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

    const { where } = Goal.findAll.mock.calls[0][0];
    expect(where['$grant.id$']).toStrictEqual([
      505,
      506,
    ]);
  });
});
