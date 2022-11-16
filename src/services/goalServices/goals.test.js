// import { Op } from 'sequelize';
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

const mockObjectiveId = 10000001;
const mockGoalId = 10000002;
const mockGoalTemplateId = 10000003;
const mockGrantId = 10000004;
const mockActivityReportGoalId = 10000005;
const mockActivityReportObjectiveId = 10000006;
const mockActivityReportId = 10000007;

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
      ActivityReportGoal.findOne = jest.fn().mockResolvedValue({
        id: mockActivityReportGoalId,
        goalId: mockGoalId,
        activityReportId: mockActivityReportId,
        update: jest.fn(),
      });
      ActivityReportGoal.destroy = jest.fn();
      ActivityReportGoal.update = jest.fn();
      ActivityReportGoal.findOrCreate = jest.fn()
        .mockResolvedValue([{
          id: mockActivityReportGoalId,
          goalId: mockGoalId,
          activityReportId: mockActivityReportId,
          update: jest.fn(),
        }, false]);
      ActivityReportGoal.create = jest.fn();

      ActivityReportObjective.findAll = jest.fn().mockResolvedValue([]);
      ActivityReportObjective.findOne = jest.fn();
      ActivityReportObjective.destroy = jest.fn();
      ActivityReportObjective.findOrCreate = jest.fn().mockResolvedValue([{
        id: mockActivityReportObjectiveId,
        objectiveId: mockObjectiveId,
        update: jest.fn(),
      }]);
      ActivityReportObjective.create = jest.fn().mockResolvedValue({
        id: mockActivityReportObjectiveId,
        objectiveId: mockObjectiveId,
        activityReportId: mockActivityReportId,
        update: jest.fn(),
      });

      Goal.findAll = jest.fn().mockResolvedValue([{
        goalTemplateId: mockGoalTemplateId,
        update: existingGoalUpdate,
        id: mockGoalId,
      }]);
      Goal.findOne = jest.fn();
      Goal.findByPk = jest.fn().mockResolvedValue({
        update: existingGoalUpdate,
        grantId: mockGrantId,
        id: mockGoalId,
        goalTemplateId: mockGoalTemplateId,
      });
      Goal.findOrCreate = jest.fn().mockResolvedValue([{
        id: mockGoalId,
        update: jest.fn(),
      }, false]);
      Goal.destroy = jest.fn();
      Goal.update = jest.fn().mockResolvedValue([1, [{ id: mockGoalId }]]);
      Goal.create = jest.fn().mockResolvedValue({ id: mockGoalId, update: jest.fn() });

      ActivityReportGoal.findAll = jest.fn().mockResolvedValue([]);
      ActivityReportGoal.findOrCreate = jest.fn().mockResolvedValue();

      Objective.destroy = jest.fn();
      Objective.findOne = jest.fn();
      Objective.create = jest.fn().mockResolvedValue({ id: mockObjectiveId });
      Objective.findOrCreate = jest.fn().mockResolvedValue([{ id: mockObjectiveId }]);
      Objective.update = jest.fn().mockResolvedValue({ id: mockObjectiveId });
      Objective.findByPk = jest.fn().mockResolvedValue({
        id: mockObjectiveId,
        update: existingObjectiveUpdate,
      });
    });

    describe('with removed goals', () => {
      it('does not delete the objective', async () => {
        // Find this objective to delete.
        ActivityReportObjective.findAll.mockResolvedValueOnce([
          {
            objectiveId: mockObjectiveId,
            objective: {
              goalId: mockGoalId,
            },
          },
          {
            objectiveId: mockObjectiveId + 1,
            objective: {
              goalId: mockGoalId,
            },
          },
        ]);

        // Prevent the delete of objective 2.
        ActivityReportObjective.findAll.mockResolvedValueOnce([
          {
            objectiveId: mockObjectiveId + 1,
            objective: {
              goalId: mockGoalId,
            },
          },
        ]);
        await saveGoalsForReport([], { id: mockActivityReportId });
        expect(Objective.destroy).not.toHaveBeenCalled();
      });

      it('deletes the ActivityReportObjective', async () => {
        ActivityReportObjective.findAll.mockResolvedValue([]);
        await saveGoalsForReport([], { id: mockActivityReportId });
        // with an empty result set no db call will be made
        expect(ActivityReportObjective.destroy).not.toHaveBeenCalled();
      });

      it('does not delete goals not being used by ActivityReportGoals', async () => {
        ActivityReportObjective.findAll.mockResolvedValue([
          {
            objectiveId: mockObjectiveId,
            objective: {
              goalId: mockGoalId,
              goal: {
                id: mockGoalId,
                objectives: [{ id: mockObjectiveId }],
              },
            },
          },
          {
            objectiveId: mockObjectiveId + 1,
            objective: {
              goalId: mockGoalId + 1,
              goal: {
                id: mockGoalId + 1,
                objectives: [{ id: mockObjectiveId + 1 }],
              },
            },
          },
        ]);

        ActivityReportGoal.findAll.mockResolvedValue([
          {
            goalId: mockGoalId,
          },
        ]);

        await saveGoalsForReport([], { id: mockActivityReportId });
        expect(Goal.destroy).not.toHaveBeenCalled();
      });
    });

    it('creates new goals', async () => {
      ActivityReportGoal.create.mockResolvedValue([
        {
          goalId: mockGoalId,
        },
      ]);

      await saveGoalsForReport([
        {
          isNew: true, grantIds: [mockGrantId], name: 'name', status: 'Closed', objectives: [],
        },
      ], { id: mockActivityReportId });
      expect(Goal.create).toHaveBeenCalledWith({
        createdVia: 'activityReport',
        grantId: mockGrantId,
        name: 'name',
        status: 'Closed',
      });
    });

    it('can use existing goals', async () => {
      ActivityReportGoal.findOne.mockResolvedValue({
        goalId: mockGoalId,
      });
      const existingGoal = {
        id: mockGoalId,
        name: 'name',
        objectives: [],
        grantIds: [mockGrantId, mockGrantId + 1],
        goalIds: [mockGoalId],
      };

      Goal.findOne.mockResolvedValue({ id: mockGoalId, update: jest.fn() });
      await saveGoalsForReport([existingGoal], { id: mockActivityReportId });
      expect(existingGoalUpdate).toHaveBeenCalledWith({
        endDate: null,
        name: 'name',
        status: 'Draft',
      }, { individualHooks: true });
    });

    test.todo('can update an existing goal');

    it('can create new objectives', async () => {
      ActivityReportGoal.findOne.mockResolvedValue([
        {
          id: mockActivityReportGoalId,
          goalId: mockGoalId,
        },
      ]);
      Goal.findOne.mockResolvedValue({
        id: mockGoalId,
        update: jest.fn(),
      });
      ActivityReportObjective.create.mockResolvedValue({
        id: mockActivityReportObjectiveId,
        objectiveId: mockObjectiveId,
        activityReportId: mockActivityReportId,
        update: jest.fn(),
      });
      const existingGoal = {
        id: mockGoalId,
        name: 'name',
        objectives: [],
        update: jest.fn(),
        grantIds: [mockGrantId],
        goalIds: [mockGoalId],
      };

      const goalWithNewObjective = {
        ...existingGoal,
        objectives: [{
          isNew: true,
          goalId: mockGoalId,
          title: 'title',
          ttaProvided: '',
          ActivityReportObjective: {},
          status: '',
        }],
      };
      await saveGoalsForReport([goalWithNewObjective], { id: mockActivityReportId });
      expect(Objective.create).toHaveBeenCalledWith({
        goalId: mockGoalId,
        title: 'title',
        status: 'Not Started',
      });
    });

    it('can update existing objectives', async () => {
      ActivityReportGoal.findOne.mockResolvedValue([
        {
          goalId: mockGoalId,
        },
      ]);
      const existingGoal = {
        id: 1,
        name: 'name',
        objectives: [{
          title: 'title', id: mockObjectiveId, status: 'Closed', goalId: mockGoalId,
        }],
        update: jest.fn(),
        grantIds: [mockGrantId],
        goalIds: [mockGoalId],
      };

      Objective.findOne.mockResolvedValue({ id: mockObjectiveId });
      await saveGoalsForReport([existingGoal], { id: mockActivityReportId });
      expect(existingObjectiveUpdate).toHaveBeenCalledWith({ title: 'title' }, { individualHooks: true });
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
