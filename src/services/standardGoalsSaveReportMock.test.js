import {
  sequelize,
  Goal,
  Objective,
  ActivityReportObjective,
  ActivityReportGoal,
  GoalTemplate,
} from '../models';
import {
  CREATION_METHOD,
} from '../constants';
import { setFieldPromptsForCuratedTemplate } from './goalTemplates';
import { saveStandardGoalsForReport } from './standardGoals';

jest.mock('./reportCache');
jest.mock('../services/goalTemplates', () => ({
  setFieldPromptsForCuratedTemplate: jest.fn(),
}));
// Mock the model GoalTemplate findByPk method
jest.mock('../models', () => {
  const actual = jest.requireActual('../models');
  return {
    ...actual,
    GoalTemplate: {
      ...actual.GoalTemplate,
      findByPk: jest.fn(),
    },
  };
});

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

  describe('saveStandardGoalsForReport', () => {
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
        save: jest.fn(),
      }]);
      ActivityReportObjective.create = jest.fn().mockResolvedValue({
        id: mockActivityReportObjectiveId,
        objectiveId: mockObjectiveId,
        activityReportId: mockActivityReportId,
        update: jest.fn(),
        save: jest.fn(),
      });

      Goal.findAll = jest.fn().mockResolvedValue([{
        goalTemplateId: mockGoalTemplateId,
        update: existingGoalUpdate,
        id: mockGoalId,
        activityReports: [],
        objectives: [],
        set: jest.fn(),
        save: jest.fn(),
      }]);
      Goal.findOne = jest.fn();
      Goal.findByPk = jest.fn().mockResolvedValue({
        update: existingGoalUpdate,
        grantId: mockGrantId,
        id: mockGoalId,
        goalTemplateId: mockGoalTemplateId,
        save: jest.fn(),
      });
      Goal.findOrCreate = jest.fn().mockResolvedValue([{
        id: mockGoalId,
        update: jest.fn(),
        save: jest.fn(),
      }, false]);
      Goal.destroy = jest.fn();
      Goal.update = jest.fn().mockResolvedValue([1, [{ id: mockGoalId }]]);
      Goal.create = jest.fn().mockResolvedValue({
        id: mockGoalId,
        update: jest.fn(),
        save: jest.fn(),
        set: jest.fn(),
      });
      Goal.save = jest.fn().mockResolvedValue({
        set: jest.fn(),
        save: jest.fn(),
      });

      ActivityReportGoal.findAll = jest.fn().mockResolvedValue([]);
      ActivityReportGoal.findOrCreate = jest.fn().mockResolvedValue();

      Objective.destroy = jest.fn();
      Objective.findOne = jest.fn();
      Objective.create = jest.fn().mockResolvedValue({
        id: mockObjectiveId,
        toJSON: jest.fn().mockResolvedValue({ id: mockObjectiveId }),
      });

      Objective.findOrCreate = jest.fn().mockResolvedValue([{ id: mockObjectiveId }]);
      Objective.update = jest.fn().mockResolvedValue({ id: mockObjectiveId });
      Objective.findByPk = jest.fn().mockResolvedValue({
        id: mockObjectiveId,
        update: existingObjectiveUpdate,
        save: jest.fn(),
        toJSON: jest.fn().mockResolvedValue({
          id: mockObjectiveId,
          update: existingObjectiveUpdate,
        }),
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
        await saveStandardGoalsForReport([], 1, { id: mockActivityReportId });
        expect(Objective.destroy).not.toHaveBeenCalled();
      });

      it('deletes the ActivityReportObjective', async () => {
        ActivityReportObjective.findAll.mockResolvedValue([]);
        await saveStandardGoalsForReport([], 1, { id: mockActivityReportId });
        // with an empty result set no db call will be made
        expect(ActivityReportObjective.destroy).not.toHaveBeenCalled();
      });

      it('deletes goals not being used by ActivityReportGoals or Objectives', async () => {
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

        await saveStandardGoalsForReport([], 1, { id: mockActivityReportId });

        expect(Goal.destroy).toHaveBeenCalled();
      });

      it('does not delete goals not being used by ActivityReportGoals', async () => {
        Goal.findAll = jest.fn().mockResolvedValue([{
          goalTemplateId: mockGoalTemplateId,
          update: existingGoalUpdate,
          id: mockGoalId,
          activityReports: [{ id: 1 }],
          objectives: [],
        }]);

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

        await saveStandardGoalsForReport([], 1, { id: mockActivityReportId });
        expect(Goal.destroy).not.toHaveBeenCalled();
      });

      it('does not delete goals not being used by Objectives', async () => {
        Goal.findAll = jest.fn().mockResolvedValue([{
          goalTemplateId: mockGoalTemplateId,
          update: existingGoalUpdate,
          id: mockGoalId,
          activityReports: [],
          objectives: [{ id: 1 }],
        }]);

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

        await saveStandardGoalsForReport([], 1, { id: mockActivityReportId });
        expect(Goal.destroy).not.toHaveBeenCalled();
      });
    });

    it('creates new goals', async () => {
      ActivityReportGoal.create.mockResolvedValue([
        {
          goalId: mockGoalId,
        },
      ]);

      GoalTemplate.findByPk.mockResolvedValue({
        id: 1,
        templateName: 'Create a new goal',
        standard: 'Standard',
      });

      await saveStandardGoalsForReport([
        {
          isNew: true, grantIds: [mockGrantId], name: 'name', status: 'Closed', objectives: [],
        },
      ], 1, { id: mockActivityReportId });
      expect(Goal.create).toHaveBeenCalledWith(expect.objectContaining({
        createdVia: 'activityReport',
        goalTemplateId: 1,
        name: 'Create a new goal',
        grantId: mockGrantId,
        status: 'Not Started',
      }), { individualHooks: true });
    });

    it('does not create a monitoring goal when the grant does not have an existing monitoring goal', async () => {
      GoalTemplate.findByPk = jest.fn().mockResolvedValue({ standard: 'Monitoring' });
      Goal.findAll = jest.fn().mockResolvedValue([]);
      await saveStandardGoalsForReport([
        {
          isNew: true, grantIds: [mockGrantId], name: 'Dont create a monitoring goal', status: 'In progress', objectives: [], goalTemplateId: 1,
        },
      ], 1, { id: mockActivityReportId });

      expect(Goal.create).not.toHaveBeenCalledWith();
    });

    it('doesn\'t creates a monitoring goal for grants that donn\'t have an existing monitoring goal', async () => {
      GoalTemplate.findByPk = jest.fn().mockResolvedValue({ id: 1, templateName: 'Monitoring Goal', standard: 'Monitoring' });
      const mockMonitoringGoal = {
        id: 2,
        grantId: 2,
        name: 'Monitoring Goal',
        status: 'In Progress',
        objectives: [],
        goalTemplateId: 1,
      };

      GoalTemplate.findByPk = jest.fn().mockResolvedValue({ id: 1, templateName: 'Monitoring Goal', standard: 'Monitoring' });

      Goal.findAll = jest.fn().mockResolvedValue([
        { ...mockMonitoringGoal, grantId: 2 },
      ]);

      await saveStandardGoalsForReport([
        {
          isNew: true, grantIds: [1, 2, 3], name: 'Create some monitoring goals', status: 'In progress', objectives: [], goalTemplateId: 1,
        },
      ], 1, { id: mockActivityReportId });

      expect(Goal.create).not.toHaveBeenCalled();
    });

    it('can create new objectives', async () => {
      ActivityReportGoal.findOne.mockResolvedValue([
        {
          id: mockActivityReportGoalId,
          goalId: mockGoalId,
        },
      ]);
      Goal.findOne.mockResolvedValue({
        id: mockGoalId,
        set: jest.fn(),
        save: jest.fn(),
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
      GoalTemplate.findByPk.mockResolvedValue({
        id: 1,
        templateName: 'title',
        standard: 'Standard',
      });
      await saveStandardGoalsForReport([goalWithNewObjective], 1, { id: mockActivityReportId });
      expect(Objective.create).toHaveBeenCalledWith({
        createdVia: 'activityReport',
        goalId: mockGoalId,
        title: 'title',
        status: 'Not Started',
        createdViaActivityReportId: mockActivityReportId,
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

      GoalTemplate.findByPk.mockResolvedValue({
        id: 1,
        templateName: 'title',
        standard: 'Standard',
      });

      Objective.findOne.mockResolvedValue({ id: mockObjectiveId });
      await saveStandardGoalsForReport([existingGoal], 1, { id: mockActivityReportId });
      expect(existingObjectiveUpdate).toHaveBeenCalledWith({ title: 'title' }, { individualHooks: true });
    });

    it('should call setFieldPromptsForCuratedTemplate if prompts exist', async () => {
      const goals = [
        {
          goalTemplateId: 2,
          goalIds: [1],
          grantIds: [1],
          name: 'This is a test goal',
          prompts: [{ grantId: 1, promptId: 1, response: 'Test Response' }],
          status: 'In Progress',
          isActivelyBeingEditing: true,
        },
      ];

      const report = {
        id: 1001,
      };

      const mockExistingGoals = [{
        id: 1,
        grantId: 1,
        name: 'This is a test goal',
        onApprovedAR: false,
        source: null,
        save: jest.fn().mockResolvedValue({}),
        set: jest.fn(),
      }];

      GoalTemplate.findByPk.mockResolvedValue(
        {
          id: 1,
          templateName: 'This is a test goal',
          standard: 'Standard',
          creationMethod: CREATION_METHOD.CURATED,
        },
      );

      Goal.findAll = jest.fn().mockResolvedValue(mockExistingGoals);

      await saveStandardGoalsForReport(goals, 1, report);

      expect(setFieldPromptsForCuratedTemplate).toHaveBeenCalledWith([mockGoalId], [{
        grantId: 1,
        promptId: 1,
        response: 'Test Response',
      }]);
    });

    it('creates a new goal when none exists by goalIds', async () => {
      const goals = [
        {
          goalIds: [], // no matching goal by ID
          grantIds: [1],
          name: 'New Goal',
          status: 'In Progress',
          isActivelyBeingEditing: true,
          goalTemplateId: null,
        },
      ];

      const report = {
        id: 1001,
      };

      Goal.findAll.mockResolvedValue([]);
      Goal.findOne.mockResolvedValue(null);
      GoalTemplate.findByPk.mockResolvedValue({ id: 1, templateName: 'did it create the goal for the template', standard: 'Standard' });
      Goal.create.mockResolvedValue({
        id: 2,
        grantId: 1,
        name: 'New Goal',
        status: 'In Progress',
        save: jest.fn().mockResolvedValue({}),
        set: jest.fn(),
      });

      await saveStandardGoalsForReport(goals, 1, report);

      expect(Goal.create).toHaveBeenCalledWith(expect.objectContaining({
        createdVia: 'activityReport',
        grantId: 1,
        goalTemplateId: 1,
        name: 'did it create the goal for the template',
        status: 'Not Started',
      }), { individualHooks: true });
    });

    it('creates a new goal when goalTemplateId exists and is curated', async () => {
      const goals = [
        {
          goalIds: [],
          grantIds: [1],
          name: 'New Curated Goal',
          status: 'In Progress',
          isActivelyBeingEditing: true,
          goalTemplateId: 1,
        },
      ];

      const report = {
        id: 10,
      };

      Goal.findAll.mockResolvedValue([]);
      Goal.findOne.mockResolvedValue(null);
      GoalTemplate.findByPk = jest.fn().mockResolvedValue({
        id: 1,
        templateName: 'New Curated Goal',
        creationMethod: 'curated',
        standard: 'Standard',
      });
      Goal.create.mockResolvedValue({
        id: 3,
        grantId: 1,
        name: 'New Curated Goal',
        status: 'In Progress',
        createdVia: 'activityReport',
        save: jest.fn().mockResolvedValue({}),
        set: jest.fn(),
      });

      await saveStandardGoalsForReport(goals, 1, report);

      expect(Goal.create).toHaveBeenCalledWith(expect.objectContaining({
        grantId: 1,
        name: 'New Curated Goal',
        goalTemplateId: 1,
        status: 'Not Started',
        createdVia: 'activityReport',
      }), { individualHooks: true });
    });
  });
});
