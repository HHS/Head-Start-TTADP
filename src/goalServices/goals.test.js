import { Op } from 'sequelize';
import { uniq } from 'lodash';
import { CLOSE_SUSPEND_REASONS } from '@ttahub/common';
import {
  goalsByIdsAndActivityReport,
  goalByIdAndActivityReport,
  createObjectivesForGoal,
  saveGoalsForReport,
  goalsForGrants,
  getReportCountForGoals,
  verifyAllowedGoalStatusTransition,
  updateGoalStatusById,
  createMultiRecipientGoalsFromAdmin,
  goalRegionsById,
  mergeGoals,
  removeRemovedRecipientsGoals,
  setActivityReportGoalAsActivelyEdited,
  createOrUpdateGoals,
  goalByIdWithActivityReportsAndRegions,
  getGoalIdsBySimilarity,
  destroyGoal,
  mapGrantsWithReplacements,
} from './goals';
import {
  sequelize,
  Goal,
  Grant,
  Objective,
  ActivityReportObjective,
  ActivityReportGoal,
  ActivityReport,
  ActivityRecipient,
  GoalTemplate,
  Resource,
  Topic,
  File,
  GoalFieldResponse,
} from '../models';
import { GOAL_STATUS, OBJECTIVE_STATUS, SOURCE_FIELD } from '../constants';
import changeGoalStatus from './changeGoalStatus';
import wasGoalPreviouslyClosed from './wasGoalPreviouslyClosed';
import { auditLogger } from '../logger';
import extractObjectiveAssociationsFromActivityReportObjectives
  from './extractObjectiveAssociationsFromActivityReportObjectives';
import { reduceGoals } from './reduceGoals';
import { setFieldPromptsForCuratedTemplate } from '../services/goalTemplates';
import { similarGoalsForRecipient } from '../services/similarity';
import {
  getSimilarityGroupsByRecipientId,
} from '../services/goalSimilarityGroup';
import {
  mergeCollaborators,
} from '../models/helpers/genericCollaborator';
import getGoalsForReport from './getGoalsForReport';

jest.mock('./changeGoalStatus', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('./wasGoalPreviouslyClosed');
jest.mock('./extractObjectiveAssociationsFromActivityReportObjectives');
jest.mock('./reduceGoals');

jest.mock('../services/reportCache');
jest.mock('../services/goalTemplates', () => ({
  setFieldPromptsForCuratedTemplate: jest.fn(),
}));
jest.mock('express-http-context', () => ({
  get: jest.fn().mockReturnValue(1), // Mock userId
}));
jest.mock('../services/similarity', () => ({
  similarGoalsForRecipient: jest.fn(),
}));
jest.mock('../services/goalSimilarityGroup', () => ({
  getSimilarityGroupsByRecipientId: jest.fn(),
  createSimilarityGroup: jest.fn(),
  setSimilarityGroupAsUserMerged: jest.fn(),
}));
jest.mock('../models/helpers/genericCollaborator', () => ({
  mergeCollaborators: jest.fn(),
}));

jest.mock('./getGoalsForReport', () => ({
  __esModule: true, // This property helps Jest handle both default and named exports
  default: jest.fn(),
}));

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

  describe('goalsByIdsAndActivityReport', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    it('should return goals with the correct structure and call associated services', async () => {
      Goal.findAll = jest.fn().mockResolvedValue([
        {
          id: mockGoalId,
          name: 'This is a test goal',
          status: 'Draft',
          endDate: '2023-12-31',
          objectives: [{
            id: 1,
            title: 'This is a test objective',
            status: GOAL_STATUS.IN_PROGRESS,
            goalId: mockGoalId,
            activityReportObjectives: [],
            toJSON: jest.fn().mockReturnValue({
              id: 1,
              title: 'This is a test objective',
              status: GOAL_STATUS.IN_PROGRESS,
              goalId: mockGoalId,
            }),
          }],
        },
      ]);

      wasGoalPreviouslyClosed.mockReturnValue(false);
      extractObjectiveAssociationsFromActivityReportObjectives.mockImplementation((obj, field) => (
        field === 'topics' ? ['Topic 1'] : []));
      reduceGoals.mockReturnValue([
        { id: mockGoalId, name: 'This is a test goal', rtrOrder: 1 },
      ]);

      const result = await goalsByIdsAndActivityReport(mockGoalId, mockActivityReportId);

      expect(Goal.findAll).toHaveBeenCalledWith({
        attributes: [
          'endDate',
          'status',
          ['id', 'value'],
          ['name', 'label'],
          'id',
          'name',
        ],
        where: {
          id: mockGoalId,
        },
        include: expect.any(Array),
      });

      expect(wasGoalPreviouslyClosed).toHaveBeenCalled();
      expect(extractObjectiveAssociationsFromActivityReportObjectives).toHaveBeenCalledWith(expect.any(Array), 'topics');
      expect(reduceGoals).toHaveBeenCalledWith(expect.any(Array));

      expect(result).toEqual([
        { id: mockGoalId, name: 'This is a test goal', rtrOrder: 1 },
      ]);
    });

    it('should return an empty array when no goals are found', async () => {
      Goal.findAll = jest.fn().mockResolvedValue([]);
      reduceGoals.mockReturnValue([]);

      const result = await goalsByIdsAndActivityReport(1, mockActivityReportId);

      expect(Goal.findAll).toHaveBeenCalledWith(expect.any(Object));
      expect(reduceGoals).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should sort reduced goals by rtrOrder in ascending order', async () => {
      const mockGoals = [
        {
          id: 1,
          name: 'Goal 1',
          rtrOrder: 2,
          objectives: [],
        },
        {
          id: 2,
          name: 'Goal 2',
          rtrOrder: 1,
          objectives: [],
        },
        {
          id: 3,
          name: 'Goal 3',
          rtrOrder: 3,
          objectives: [],
        },
      ];

      Goal.findAll = jest.fn().mockResolvedValue(mockGoals);

      reduceGoals.mockReturnValue(mockGoals);

      const result = await goalsByIdsAndActivityReport(1, 1);

      expect(result).toEqual([
        {
          id: 2, name: 'Goal 2', rtrOrder: 1, objectives: [],
        },
        {
          id: 1, name: 'Goal 1', rtrOrder: 2, objectives: [],
        },
        {
          id: 3, name: 'Goal 3', rtrOrder: 3, objectives: [],
        },
      ]);
    });
  });

  describe('goalByIdAndActivityReport', () => {
    it('should call Goal.findOne with the correct query', async () => {
      const mockGoal = {
        id: mockGoalId,
        name: 'This is a test goal',
        status: GOAL_STATUS.IN_PROGRESS,
        endDate: '2023-12-31',
        objectives: [{
          id: 1,
          title: 'This is a test objective',
          status: 'In Progress',
          resources: [],
          activityReportObjectives: [{
            ttaProvided: 'Technical Assistance',
          }],
          topics: [],
          files: [],
        }],
      };

      Goal.findOne = jest.fn().mockResolvedValue(mockGoal);

      const result = await goalByIdAndActivityReport(mockGoalId, mockActivityReportId);

      expect(Goal.findOne).toHaveBeenCalledWith({
        attributes: [
          'endDate',
          'status',
          ['id', 'value'],
          ['name', 'label'],
          'id',
          'name',
        ],
        where: {
          id: mockGoalId,
        },
        include: [
          {
            where: {
              [Op.and]: [
                {
                  title: {
                    [Op.ne]: '',
                  },
                },
                {
                  status: {
                    [Op.notIn]: [OBJECTIVE_STATUS.COMPLETE],
                  },
                },
              ],
            },
            attributes: [
              'id',
              'title',
              'title',
              'status',
            ],
            model: Objective,
            as: 'objectives',
            required: false,
            include: [
              {
                model: Resource,
                as: 'resources',
                attributes: [
                  ['url', 'value'],
                  ['id', 'key'],
                ],
                required: false,
                through: {
                  attributes: [],
                  where: { sourceFields: { [Op.contains]: [SOURCE_FIELD.OBJECTIVE.RESOURCE] } },
                  required: false,
                },
              },
              {
                model: ActivityReportObjective,
                as: 'activityReportObjectives',
                attributes: [
                  'ttaProvided',
                ],
                required: true,
                where: {
                  activityReportId: mockActivityReportId,
                },
              },
              {
                model: Topic,
                as: 'topics',
                attributes: [
                  ['id', 'value'],
                  ['name', 'label'],
                ],
                required: false,
              },
              {
                model: File,
                as: 'files',
                required: false,
              },
            ],
          },
        ],
      });

      expect(result).toEqual(mockGoal);
    });
  });

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
        await saveGoalsForReport([], { id: mockActivityReportId });
        expect(Objective.destroy).not.toHaveBeenCalled();
      });

      it('deletes the ActivityReportObjective', async () => {
        ActivityReportObjective.findAll.mockResolvedValue([]);
        await saveGoalsForReport([], { id: mockActivityReportId });
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

        await saveGoalsForReport([], { id: mockActivityReportId });

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

        await saveGoalsForReport([], { id: mockActivityReportId });
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
      expect(Goal.create).toHaveBeenCalledWith(expect.objectContaining({
        createdVia: 'activityReport',
        grantId: mockGrantId,
        name: 'name',
        status: 'Closed',
      }), { individualHooks: true });
    });

    it('can use existing goals', async () => {
      ActivityReportGoal.findOne.mockResolvedValue({
        goalId: mockGoalId,
        activityReportId: mockActivityReportId,
      });
      const existingGoal = {
        id: mockGoalId,
        name: 'name',
        objectives: [],
        grantIds: [mockGrantId, mockGrantId + 1],
        goalIds: [mockGoalId],
      };

      const set = jest.fn();
      Goal.findOne.mockResolvedValue({
        id: mockGoalId, update: jest.fn(), set, save: jest.fn(),
      });
      await saveGoalsForReport([existingGoal], { id: mockActivityReportId });
      expect(set).toHaveBeenCalledWith({
        name: 'name',
      });
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
      await saveGoalsForReport([goalWithNewObjective], { id: mockActivityReportId });
      expect(Objective.create).toHaveBeenCalledWith({
        createdVia: 'activityReport',
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

    it('should call setFieldPromptsForCuratedTemplate if prompts exist and isMultiRecipientReport is false', async () => {
      const goals = [
        {
          goalIds: [1],
          grantIds: [1],
          name: 'This is a test goal',
          prompts: [{ promptId: 1, response: 'Test Response' }],
          status: 'In Progress',
          endDate: '2023-12-31',
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
        endDate: '2023-12-31',
        save: jest.fn().mockResolvedValue({}),
        set: jest.fn(),
      }];

      Goal.findAll = jest.fn().mockResolvedValue(mockExistingGoals);

      await saveGoalsForReport(goals, report);

      expect(setFieldPromptsForCuratedTemplate).toHaveBeenCalledWith([1], [{ promptId: 1, response: 'Test Response' }]);
    });

    it('creates a new goal when none exists by goalIds or goalTemplateId', async () => {
      const goals = [
        {
          goalIds: [], // no matching goal by ID
          grantIds: [1],
          name: 'New Goal',
          status: 'In Progress',
          endDate: '2023-12-31',
          isActivelyBeingEditing: true,
          goalTemplateId: null,
        },
      ];

      const report = {
        id: 1001,
      };

      Goal.findAll.mockResolvedValue([]);
      Goal.findOne.mockResolvedValue(null);
      Goal.create.mockResolvedValue({
        id: 2,
        grantId: 1,
        name: 'New Goal',
        status: 'In Progress',
        save: jest.fn().mockResolvedValue({}),
        set: jest.fn(),
      });

      await saveGoalsForReport(goals, report);

      expect(Goal.create).toHaveBeenCalledWith(expect.objectContaining({
        createdVia: 'activityReport',
        grantId: 1,
        name: 'New Goal',
        status: 'In Progress',
      }), { individualHooks: true });
    });

    it('creates a new goal when goalTemplateId exists and is curated', async () => {
      const goals = [
        {
          goalIds: [],
          grantIds: [1],
          name: 'New Curated Goal',
          status: 'In Progress',
          endDate: '2023-12-31',
          isActivelyBeingEditing: true,
        },
      ];

      const report = {
        id: 10,
      };

      Goal.findAll.mockResolvedValue([]);
      Goal.findOne.mockResolvedValue(null);
      GoalTemplate.findByPk = jest.fn().mockResolvedValue({
        creationMethod: 'curated',
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

      await saveGoalsForReport(goals, report);

      expect(Goal.create).toHaveBeenCalledWith(expect.objectContaining({
        grantId: 1,
        name: 'New Curated Goal',
        status: 'In Progress',
        createdVia: 'activityReport',
      }), { individualHooks: true });
    });
  });

  describe('createObjectivesForGoal', () => {
    const goal = { id: 1 };
    const objectives = [
      {
        id: 1,
        isNew: false,
        ttaProvided: 'TTA provided details',
        title: 'Objective title 1',
        status: GOAL_STATUS.IN_PROGRESS,
        topics: ['topic1'],
        resources: ['resource1'],
        files: ['file1'],
        courses: ['course1'],
        closeSuspendReason: null,
        closeSuspendContext: null,
        ActivityReportObjective: {},
        supportType: 'supportType1',
        goalId: 1,
        createdHere: false,
      },
      {
        id: 2,
        isNew: true,
        ttaProvided: 'TTA provided details',
        title: 'Objective title 2',
        status: 'NOT_STARTED',
        topics: ['topic2'],
        resources: ['resource2'],
        files: ['file2'],
        courses: ['course2'],
        closeSuspendReason: null,
        closeSuspendContext: null,
        ActivityReportObjective: {},
        supportType: 'supportType2',
        goalId: 2,
        createdHere: true,
      },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return an empty array if no objectives are provided', async () => {
      const result = await createObjectivesForGoal(goal, null);
      expect(result).toEqual([]);
    });

    it('should create new objectives for new items', async () => {
      Objective.findByPk = jest.fn().mockResolvedValue(null);
      Objective.findOne = jest.fn().mockResolvedValue(null);
      Objective.create = jest.fn().mockResolvedValue({
        toJSON: () => ({
          id: 2,
          title: 'Objective title 2',
          status: OBJECTIVE_STATUS.NOT_STARTED,
          goalId: goal.id,
        }),
      });

      const result = await createObjectivesForGoal(goal, objectives);

      expect(Objective.findByPk).toHaveBeenCalledTimes(1);
      expect(Objective.create).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Objective title 2',
        goalId: goal.id,
        status: OBJECTIVE_STATUS.NOT_STARTED,
        createdVia: 'activityReport',
      }));

      expect(result).toHaveLength(2);
      expect(result[1].title).toBe('Objective title 2');
    });

    it('should update existing objectives', async () => {
      Objective.findByPk = jest.fn().mockResolvedValue({
        id: 1,
        title: 'Objective title 1',
        onApprovedAR: false,
        update: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true),
        toJSON: () => ({
          id: 1,
          title: 'Objective title 1',
          status: OBJECTIVE_STATUS.IN_PROGRESS,
          goalId: goal.id,
        }),
      });

      Objective.findOne = jest.fn().mockResolvedValue(null);

      const result = await createObjectivesForGoal(goal, objectives);

      expect(Objective.findByPk).toHaveBeenCalledTimes(1);
      expect(Objective.findByPk).toHaveBeenCalledWith(1);

      expect(Objective.create).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Objective title 2',
        goalId: goal.id,
        status: OBJECTIVE_STATUS.NOT_STARTED,
        createdVia: 'activityReport',
      }));

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Objective title 1');
      expect(result[1].title).toBe('Objective title 2');
    });

    it('should reuse an existing objective if conditions match', async () => {
      Objective.findByPk = jest.fn().mockResolvedValue(null);
      Objective.findOne = jest.fn().mockResolvedValue({
        id: 2,
        title: 'Objective title 2',
        status: OBJECTIVE_STATUS.NOT_STARTED,
        toJSON: () => ({
          id: 2,
          title: 'Objective title 2',
          status: OBJECTIVE_STATUS.NOT_STARTED,
        }),
      });

      const result = await createObjectivesForGoal(goal, objectives);

      expect(Objective.findByPk).toHaveBeenCalledWith(1);
      expect(Objective.findOne).toHaveBeenCalledWith({
        where: expect.objectContaining({
          goalId: goal.id,
          title: 'Objective title 2',
          status: { [Op.not]: OBJECTIVE_STATUS.COMPLETE },
        }),
      });

      expect(result[1].title).toBe('Objective title 2');
    });

    it('should handle undefined fields without throwing an error', async () => {
      const incompleteObjectives = [
        {
          id: 1,
          isNew: false,
          supportType: 'supportType1',
          goalId: 1,
          createdHere: false,
        },
      ];

      Objective.findByPk = jest.fn().mockResolvedValue(null);
      Objective.findOne = jest.fn().mockResolvedValue(null);
      Objective.create = jest.fn().mockResolvedValue({
        toJSON: () => ({
          id: 1,
          title: 'Objective with missing fields',
          status: OBJECTIVE_STATUS.NOT_STARTED,
          goalId: goal.id,
        }),
      });

      const result = await createObjectivesForGoal(goal, incompleteObjectives);

      expect(result).toHaveLength(0);
      expect(Objective.create).not.toHaveBeenCalled();
    });
  });

  describe('verifyAllowedGoalStatusTransition', () => {
    it('should allow transition from DRAFT to CLOSED', () => {
      const result = verifyAllowedGoalStatusTransition(GOAL_STATUS.DRAFT, GOAL_STATUS.CLOSED, []);
      expect(result).toBe(true);
    });

    it('should not allow transition from DRAFT to IN_PROGRESS', () => {
      const result = verifyAllowedGoalStatusTransition(
        GOAL_STATUS.DRAFT,
        GOAL_STATUS.IN_PROGRESS,
        [],
      );
      expect(result).toBe(false);
    });

    it('should allow transition from NOT_STARTED to CLOSED', () => {
      const result = verifyAllowedGoalStatusTransition(
        GOAL_STATUS.NOT_STARTED,
        GOAL_STATUS.CLOSED,
        [],
      );
      expect(result).toBe(true);
    });

    it('should allow transition from NOT_STARTED to SUSPENDED', () => {
      const result = verifyAllowedGoalStatusTransition(
        GOAL_STATUS.NOT_STARTED,
        GOAL_STATUS.SUSPENDED,
        [],
      );
      expect(result).toBe(true);
    });

    it('should allow transition from IN_PROGRESS to CLOSED', () => {
      const result = verifyAllowedGoalStatusTransition(
        GOAL_STATUS.IN_PROGRESS,
        GOAL_STATUS.CLOSED,
        [],
      );
      expect(result).toBe(true);
    });

    it('should allow transition from SUSPENDED to IN_PROGRESS', () => {
      const result = verifyAllowedGoalStatusTransition(
        GOAL_STATUS.SUSPENDED,
        GOAL_STATUS.IN_PROGRESS,
        [GOAL_STATUS.IN_PROGRESS],
      );
      expect(result).toBe(true);
    });

    it('should allow transition from SUSPENDED to a previous status (e.g., IN_PROGRESS)', () => {
      const result = verifyAllowedGoalStatusTransition(
        GOAL_STATUS.SUSPENDED,
        GOAL_STATUS.IN_PROGRESS,
        [GOAL_STATUS.IN_PROGRESS],
      );
      expect(result).toBe(true);
    });

    it('should not allow transition from CLOSED to any other status', () => {
      const result = verifyAllowedGoalStatusTransition(
        GOAL_STATUS.CLOSED,
        GOAL_STATUS.IN_PROGRESS,
        [],
      );
      expect(result).toBe(false);
    });

    it('should handle edge case when oldStatus is not in ALLOWED_TRANSITIONS', () => {
      const result = verifyAllowedGoalStatusTransition('INVALID_STATUS', GOAL_STATUS.CLOSED, []);
      expect(result).toBe(false);
    });

    it('should allow transition from SUSPENDED to CLOSED', () => {
      const result = verifyAllowedGoalStatusTransition(
        GOAL_STATUS.SUSPENDED,
        GOAL_STATUS.CLOSED,
        [GOAL_STATUS.IN_PROGRESS],
      );
      expect(result).toBe(true);
    });

    it('should allow transition from SUSPENDED to the previous status when previous status is provided', () => {
      const result = verifyAllowedGoalStatusTransition(
        GOAL_STATUS.SUSPENDED,
        GOAL_STATUS.IN_PROGRESS,
        [GOAL_STATUS.IN_PROGRESS],
      );
      expect(result).toBe(true);
    });
  });

  describe('updateGoalStatusById', () => {
    const mockGoalIds = [1, 2];
    const mockUserId = 123;
    const mockOldStatus = GOAL_STATUS.IN_PROGRESS;
    const mockNewStatus = 'Closed';
    const mockReason = 'Duplicate goal';
    const mockContext = 'Some context';
    const mockPreviousStatus = [GOAL_STATUS.IN_PROGRESS];

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should call changeGoalStatus when transition is allowed', async () => {
      await updateGoalStatusById(
        mockGoalIds,
        mockUserId,
        mockOldStatus,
        mockNewStatus,
        mockReason,
        mockContext,
        mockPreviousStatus,
      );

      expect(changeGoalStatus).toHaveBeenCalledTimes(mockGoalIds.length);
      expect(changeGoalStatus).toHaveBeenCalledWith({
        goalId: mockGoalIds[0],
        userId: mockUserId,
        newStatus: mockNewStatus,
        reason: mockReason,
        context: mockContext,
      });
      expect(changeGoalStatus).toHaveBeenCalledWith({
        goalId: mockGoalIds[1],
        userId: mockUserId,
        newStatus: mockNewStatus,
        reason: mockReason,
        context: mockContext,
      });
    });

    it('should use default reason "Unknown" if closeSuspendReason is null', async () => {
      await updateGoalStatusById(
        mockGoalIds,
        mockUserId,
        mockOldStatus,
        mockNewStatus,
        null,
        mockContext,
        mockPreviousStatus,
      );

      expect(changeGoalStatus).toHaveBeenCalledWith({
        goalId: mockGoalIds[0],
        userId: mockUserId,
        newStatus: mockNewStatus,
        reason: 'Unknown',
        context: mockContext,
      });
    });

    it('should log an error and return false if the transition is not allowed', async () => {
      const loggerSpy = jest.spyOn(auditLogger, 'error');
      const result = await updateGoalStatusById(
        mockGoalIds,
        mockUserId,
        'Not Started',
        GOAL_STATUS.IN_PROGRESS,
        mockReason,
        mockContext,
        mockPreviousStatus,
      );

      expect(changeGoalStatus).not.toHaveBeenCalled();

      expect(loggerSpy).toHaveBeenCalledWith(
        `UPDATEGOALSTATUSBYID: Goal status transition from Not Started to In Progress not allowed for goal ${mockGoalIds}`,
      );

      expect(result).toBe(false);
    });

    it('should handle multiple goal IDs and call changeGoalStatus for each', async () => {
      await updateGoalStatusById(
        mockGoalIds,
        mockUserId,
        mockOldStatus,
        mockNewStatus,
        mockReason,
        mockContext,
        mockPreviousStatus,
      );

      expect(changeGoalStatus).toHaveBeenCalledTimes(2);
    });
  });

  describe('getReportCountForGoals', () => {
    it('should return an empty object if no goals are provided', () => {
      const result = getReportCountForGoals([]);
      expect(result).toEqual({});
    });

    it('should count goals by activityReportId and grantId correctly', () => {
      const mockGoals = [
        {
          grantId: 1,
          activityReportGoals: [
            { activityReportId: 101, goalId: 1 },
            { activityReportId: 101, goalId: 2 },
          ],
        },
        {
          grantId: 2,
          activityReportGoals: [
            { activityReportId: 101, goalId: 3 },
            { activityReportId: 102, goalId: 4 },
          ],
        },
      ];

      const expected = {
        101: {
          1: 2,
          2: 1,
        },
        102: {
          2: 1,
        },
      };

      const result = getReportCountForGoals(mockGoals);
      expect(result).toEqual(expected);
    });

    it('should handle missing activityReportGoals and return correct counts', () => {
      const mockGoals = [
        {
          grantId: 1,
          activityReportGoals: null,
        },
        {
          grantId: 2,
          activityReportGoals: [
            { activityReportId: 103, goalId: 5 },
          ],
        },
      ];

      const expected = {
        103: {
          2: 1,
        },
      };

      const result = getReportCountForGoals(mockGoals);
      expect(result).toEqual(expected);
    });
  });

  describe('mergeGoals', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create GoalFieldResponse for each goal in grantToGoalDictionary', async () => {
      const finalGoalId = 1;
      const selectedGoalIds = [2, 3];
      const goalSimiliarityGroupId = 10;
      const mockUserId = 1;

      const grantToGoalDictionary = {
        10: 1,
        11: 2,
        12: 3,
      };

      const mockGoals = [
        {
          id: 1,
          grantId: 10,
          name: 'Goal 1',
          startDate: new Date(),
          endDate: new Date(),
          createdAt: new Date(),
          responses: [
            { id: 1, goalTemplateFieldPromptId: 1, response: 'Response 1' },
            { id: 2, goalTemplateFieldPromptId: 2, response: 'Response 2' },
          ],
          activityReportGoals: [],
          goalResources: [],
          objectives: [],
          update: jest.fn(),
        },
        {
          id: 2,
          grantId: 11,
          name: 'Goal 2',
          startDate: new Date(),
          endDate: new Date(),
          createdAt: new Date(),
          responses: [],
          activityReportGoals: [],
          goalResources: [],
          objectives: [],
          update: jest.fn(),
        },
        {
          id: 3,
          grantId: 12,
          name: 'Goal 3',
          startDate: new Date(),
          endDate: new Date(),
          createdAt: new Date(),
          responses: [],
          activityReportGoals: [],
          goalResources: [],
          objectives: [],
          update: jest.fn(),
        },
      ];

      const mockGrantsWithReplacements = [
        { id: 10, status: 'Active' },
        { id: 11, status: 'Active' },
        { id: 12, status: 'Active' },
      ];

      Goal.findAll = jest.fn().mockResolvedValue(mockGoals);
      Grant.findAll = jest.fn().mockResolvedValue(mockGrantsWithReplacements);
      GoalFieldResponse.create = jest.fn().mockResolvedValue({});
      Goal.bulkCreate = jest.fn().mockResolvedValue(
        Object.keys(grantToGoalDictionary).map((grantId) => ({
          grantId: parseInt(grantId, 10),
          id: grantToGoalDictionary[grantId],
        })),
      );
      mergeCollaborators.mockResolvedValue({});

      await mergeGoals(finalGoalId, selectedGoalIds, goalSimiliarityGroupId, mockUserId);

      expect(GoalFieldResponse.create).toHaveBeenCalledTimes(
        mockGrantsWithReplacements.length * mockGoals[0].responses.length,
      );

      mockGrantsWithReplacements.forEach((grant) => {
        mockGoals[0].responses.forEach((response) => {
          expect(GoalFieldResponse.create).toHaveBeenCalledWith(
            {
              goalId: grantToGoalDictionary[grant.id],
              goalTemplateFieldPromptId: response.goalTemplateFieldPromptId,
              response: response.response,
            },
            { individualHooks: true },
          );
        });
      });
    });
    it('should throw an error if no active grants are found to merge goals into', async () => {
      const finalGoalId = 1;
      const selectedGoalIds = [2, 3];
      const goalSimiliarityGroupId = 10;

      const mockGoals = [
        {
          id: 1,
          grantId: 10,
          name: 'Goal 1',
          startDate: new Date(),
          endDate: new Date(),
          createdAt: new Date(),
          responses: [],
          activityReportGoals: [],
          goalResources: [],
          objectives: [],
        },
      ];

      Goal.findAll = jest.fn().mockResolvedValue(mockGoals);

      Grant.findAll = jest.fn().mockResolvedValue([]);

      await expect(mergeGoals(finalGoalId, selectedGoalIds, goalSimiliarityGroupId))
        .rejects
        .toThrow('No active grants found to merge goals into');
    });

    it('should throw an error if the final goal is not found in selected goals', async () => {
      const finalGoalId = 1;
      const selectedGoalIds = [2, 3];
      const goalSimiliarityGroupId = 10;

      const mockGoals = [
        {
          id: 2,
          grantId: 11,
          name: 'Goal 2',
          startDate: new Date(),
          endDate: new Date(),
          createdAt: new Date(),
          responses: [],
          activityReportGoals: [],
          goalResources: [],
          objectives: [],
        },
        {
          id: 3,
          grantId: 12,
          name: 'Goal 3',
          startDate: new Date(),
          endDate: new Date(),
          createdAt: new Date(),
          responses: [],
          activityReportGoals: [],
          goalResources: [],
          objectives: [],
        },
      ];

      Goal.findAll = jest.fn().mockResolvedValue(mockGoals);

      Grant.findAll = jest.fn().mockResolvedValue([{ id: 11, status: 'Active' }, { id: 12, status: 'Active' }]);

      await expect(mergeGoals(finalGoalId, selectedGoalIds, goalSimiliarityGroupId))
        .rejects
        .toThrow(`Goal with id ${finalGoalId} not found in merge goals`);
    });
  });

  describe('goalRegionsById', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return unique region IDs for the provided goal IDs', async () => {
      const mockGoalIds = [1, 2, 3];

      const mockGrants = [
        { regionId: 1, id: 10, goals: [{ id: 1, grantId: 10 }] },
        { regionId: 2, id: 20, goals: [{ id: 2, grantId: 20 }] },
        { regionId: 1, id: 30, goals: [{ id: 3, grantId: 30 }] },
      ];

      Grant.findAll = jest.fn().mockResolvedValue(mockGrants);

      const result = await goalRegionsById(mockGoalIds);

      expect(Grant.findAll).toHaveBeenCalledWith({
        attributes: ['regionId', 'id'],
        include: [{
          attributes: ['id', 'grantId'],
          model: Goal,
          as: 'goals',
          required: true,
          where: {
            id: mockGoalIds,
          },
        }],
      });

      expect(result).toEqual([1, 2]);
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

  describe('createMultiRecipientGoalsFromAdmin', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return an error when no goal name is provided', async () => {
      const data = {
        selectedGrants: JSON.stringify([{ id: 1 }]),
        goalText: '',
      };

      const result = await createMultiRecipientGoalsFromAdmin(data);

      expect(result.isError).toBe(true);
      expect(result.message).toBe('Goal name is required');
    });

    it('should fetch a template if useCuratedGoal is true and templateId is provided', async () => {
      const data = {
        selectedGrants: JSON.stringify([{ id: 1 }]),
        useCuratedGoal: true,
        templateId: 1,
        goalText: 'This is a test goal',
      };

      GoalTemplate.findByPk = jest.fn().mockResolvedValue({ templateName: 'Test Template' });

      await createMultiRecipientGoalsFromAdmin(data);

      expect(GoalTemplate.findByPk).toHaveBeenCalledWith(1);
    });

    it('should return an error if a goal with the same name already exists for a grant', async () => {
      const data = {
        selectedGrants: JSON.stringify([{ id: 1 }]),
        goalText: 'This is a test goal',
      };

      Goal.findAll = jest.fn().mockResolvedValue([{ id: 1, grantId: 1 }]);

      const result = await createMultiRecipientGoalsFromAdmin(data);

      expect(result.isError).toBe(true);
      expect(result.message).toContain('A goal with that name already exists for grants');
    });

    it('should create goals for the correct grant IDs', async () => {
      const data = {
        selectedGrants: JSON.stringify([{ id: 1 }, { id: 2 }]),
        goalText: 'This is a test goal',
      };

      Goal.findAll = jest.fn().mockResolvedValue([]); // No existing goals
      Goal.bulkCreate = jest.fn().mockResolvedValue([
        { id: 1, name: 'Goal 1' },
        { id: 2, name: 'Goal 2' },
      ]);

      await createMultiRecipientGoalsFromAdmin(data);

      expect(Goal.bulkCreate).toHaveBeenCalledWith(
        [
          {
            name: 'This is a test goal',
            grantId: 1,
            source: null,
            endDate: null,
            status: 'Not Started',
            createdVia: 'admin',
            goalTemplateId: null,
          },
          {
            name: 'This is a test goal',
            grantId: 2,
            source: null,
            endDate: null,
            status: 'Not Started',
            createdVia: 'admin',
            goalTemplateId: null,
          },
        ],
        { individualHooks: true },
      );
    });

    it('should call setFieldPromptsForCuratedTemplate if prompt responses exist', async () => {
      const data = {
        selectedGrants: JSON.stringify([{ id: 1 }]),
        goalText: 'This is a test goal',
        goalPrompts: [
          { promptId: 1, fieldName: 'promptResponse1' },
        ],
        promptResponse1: 'Response 1',
        useCuratedGoal: true,
      };

      Goal.findAll = jest.fn().mockResolvedValue([]); // No existing goals
      Goal.bulkCreate = jest.fn().mockResolvedValue([{ id: 1 }]);

      await createMultiRecipientGoalsFromAdmin(data);

      expect(setFieldPromptsForCuratedTemplate).toHaveBeenCalledWith([1], [{ promptId: 1, response: 'Response 1' }]);
    });

    it('should create an activity report when createReport is true', async () => {
      const data = {
        selectedGrants: JSON.stringify([{ id: 1 }]),
        goalText: 'This is a test goal',
        createReport: true,
        creator: 1,
        region: 1,
      };

      Goal.findAll = jest.fn().mockResolvedValue([]); // No existing goals
      Goal.bulkCreate = jest.fn().mockResolvedValue([{ id: 1 }]);
      jest.spyOn(ActivityReport, 'create').mockResolvedValue({ id: 123 });
      jest.spyOn(ActivityReportGoal, 'bulkCreate').mockResolvedValue({});
      jest.spyOn(ActivityRecipient, 'bulkCreate').mockResolvedValue({});

      await createMultiRecipientGoalsFromAdmin(data);

      expect(ActivityReport.create).toHaveBeenCalledWith(expect.objectContaining({
        regionId: 1,
        userId: 1,
      }));
      expect(ActivityReportGoal.bulkCreate).toHaveBeenCalled();
      expect(ActivityRecipient.bulkCreate).toHaveBeenCalled();
    });

    it('should set endDate if goalDate is provided', async () => {
      const data = {
        selectedGrants: JSON.stringify([{ id: 1 }]),
        goalText: 'This is a test goal',
        goalDate: '2023-12-31', // Provide a goalDate to cover this condition
      };

      Goal.findAll = jest.fn().mockResolvedValue([]); // No existing goals
      Goal.bulkCreate = jest.fn().mockResolvedValue([{ id: 1 }]);

      await createMultiRecipientGoalsFromAdmin(data);

      expect(Goal.bulkCreate).toHaveBeenCalledWith(
        [
          {
            name: 'This is a test goal',
            grantId: 1,
            source: null,
            endDate: '2023-12-31',
            status: 'Not Started',
            createdVia: 'admin',
            goalTemplateId: null,
          },
        ],
        { individualHooks: true },
      );
    });

    it('should map through goalsForNameCheck and retrieve goal ids correctly', async () => {
      const data = {
        selectedGrants: JSON.stringify([{ id: 1 }, { id: 2 }]),
        goalText: 'This is a test goal',
        createReport: true,
        creator: 1,
        region: 1,
        createMissingGoals: true,
      };

      const mockGoalsForNameCheck = [
        { id: 1, grant: { number: '123' }, grantId: 1 },
        { id: 2, grant: { number: '456' }, grantId: 2 },
      ];

      Goal.findAll = jest.fn().mockResolvedValue(mockGoalsForNameCheck);

      Goal.bulkCreate = jest.fn().mockResolvedValue([{ id: 3 }, { id: 4 }]);
      ActivityReport.create = jest.fn().mockResolvedValue({ id: 1 });
      ActivityReportGoal.bulkCreate = jest.fn();
      ActivityRecipient.bulkCreate = jest.fn();

      await createMultiRecipientGoalsFromAdmin(data);

      expect(ActivityReportGoal.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ goalId: 1 }),
          expect.objectContaining({ goalId: 2 }),
          expect.objectContaining({ goalId: 3 }),
          expect.objectContaining({ goalId: 4 }),
        ]),
        { individualHooks: true },
      );
    });
  });

  describe('removeRemovedRecipientsGoals', () => {
    let report;

    beforeEach(() => {
      report = {};
    });

    it('should return null if removedRecipientIds is null', async () => {
      const result = await removeRemovedRecipientsGoals(null, report);
      expect(result).toBeNull();
    });

    it('should return null if removedRecipientIds is undefined', async () => {
      const result = await removeRemovedRecipientsGoals(undefined, report);
      expect(result).toBeNull();
    });

    it('should return null if removedRecipientIds is an empty array', async () => {
      const result = await removeRemovedRecipientsGoals([], report);
      expect(result).toBeNull();
    });

    it('should return null if removedRecipientIds is not an array', async () => {
      const result = await removeRemovedRecipientsGoals('notAnArray', report);
      expect(result).toBeNull();
    });
  });

  describe('setActivityReportGoalAsActivelyEdited', () => {
    let auditLoggerSpy;

    beforeEach(() => {
      auditLoggerSpy = jest.spyOn(auditLogger, 'error');

      ActivityReportGoal.update = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });
    });

    afterEach(() => {
      auditLoggerSpy.mockRestore();
    });

    it('should log an error and return an empty array if an error occurs', async () => {
      const result = await setActivityReportGoalAsActivelyEdited();

      expect(auditLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('unable to update ActivityReportGoals table'),
      );

      expect(result).toEqual([]);
    });
  });

  describe('createOrUpdateGoals', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should find an objective when status is COMPLETE and objectiveIds are provided', async () => {
      const goals = [{
        ids: [1],
        grantId: 1,
        recipientId: 1,
        regionId: 14,
        objectives: [
          {
            id: 2,
            title: 'This is a test objective',
            status: OBJECTIVE_STATUS.COMPLETE,
          },
        ],
        name: 'Test Goal Name',
      }];

      const mockGoal = {
        id: 1,
        name: 'Test Goal Name',
        source: 'Different Source',
        objectives: [
          {
            id: 2,
            title: 'This is a test objective',
            status: OBJECTIVE_STATUS.COMPLETE,
            toJSON: jest.fn().mockReturnValue({
              id: 1,
              title: 'This is a test objective',
              status: GOAL_STATUS.IN_COMPLETE,
              goalId: mockGoalId,
            }),
          },
        ],
        set: jest.fn(),
        save: jest.fn().mockResolvedValue({}),
      };

      const mockObjective = {
        id: 2,
        title: 'This is a test objective',
        status: OBJECTIVE_STATUS.COMPLETE,
        toJSON: jest.fn().mockReturnValue({ id: 2, title: 'This is a test objective' }),
        set: jest.fn(),
        save: jest.fn().mockResolvedValue({}),
        dataValues: {
          title: 'This is a test objective',
        },
      };

      Goal.findOne = jest.fn().mockResolvedValue(mockGoal);
      Goal.findAll = jest.fn().mockResolvedValue([mockGoal]);
      Objective.findOne = jest.fn().mockResolvedValue(mockObjective);
      reduceGoals.mockReturnValue([]);

      const result = await createOrUpdateGoals(goals);

      expect(Objective.findOne).toHaveBeenCalledWith({
        attributes: [
          'id',
          'title',
          'status',
          'goalId',
          'onApprovedAR',
          'onAR',
          'rtrOrder',
        ],
        where: {
          id: [2],
          goalId: 1,
          status: 'Complete',
        },
      });
      expect(result).toBeDefined();
      expect(result).toEqual([]);
    });

    it('should update the source if provided and different from existing', async () => {
      const goals = [{
        ids: [1],
        grantId: 1,
        recipientId: 1,
        regionId: 14,
        objectives: [
          {
            id: 2,
            title: 'This is a test objective',
            status: OBJECTIVE_STATUS.COMPLETE,
          },
        ],
        name: 'Test Goal Name',
        source: 'Test Source',
      }];

      const mockGoal = {
        id: 1,
        name: 'Test Goal Name',
        source: 'Different Source',
        set: jest.fn(),
        save: jest.fn().mockResolvedValue({}),
      };

      Goal.findOne = jest.fn().mockResolvedValue(mockGoal);

      await createOrUpdateGoals(goals);

      expect(mockGoal.set).toHaveBeenCalledWith({ source: 'Test Source' });
      expect(mockGoal.save).toHaveBeenCalled();
    });
    it('should set the source if it is different from the new goal\'s current source', async () => {
      const goals = [{
        ids: [1],
        grantId: 1,
        recipientId: 1,
        regionId: 14,
        objectives: [
          {
            id: 2,
            title: 'This is a test objective',
            status: OBJECTIVE_STATUS.COMPLETE,
          },
        ],
        name: 'Test Goal Name',
        source: 'Updated Source',
      }];

      const mockGoal = {
        id: 1,
        name: 'Test Goal Name',
        source: 'Old Source',
        set: jest.fn(),
        save: jest.fn(),
        objectives: [],
      };

      Goal.findOne = jest.fn().mockResolvedValue(mockGoal);

      await createOrUpdateGoals(goals);

      expect(mockGoal.set).toHaveBeenCalledWith({ source: 'Updated Source' });
    });

    it('should set the goalTemplateId if isCurated is true, newGoal.goalTemplateId is missing, and goalTemplateId is provided', async () => {
      const goals = [{
        ids: [1],
        grantId: 1,
        recipientId: 1,
        regionId: 14,
        objectives: [
          {
            id: 2,
            title: 'This is a test objective',
            status: OBJECTIVE_STATUS.COMPLETE,
          },
        ],
        name: 'Test Goal Name',
        isCurated: true,
        goalTemplateId: 5,
      }];

      const mockGoal = {
        id: 1,
        name: 'Test Goal Name',
        goalTemplateId: null,
        set: jest.fn(),
        save: jest.fn(),
        objectives: [],
      };

      Goal.findOne = jest.fn().mockResolvedValue(mockGoal);

      await createOrUpdateGoals(goals);

      expect(mockGoal.set).toHaveBeenCalledWith({ goalTemplateId: 5 });
    });

    it('should call setFieldPromptsForCuratedTemplate if isCurated is true and prompts are provided', async () => {
      const goals = [{
        ids: [1],
        grantId: 1,
        recipientId: 1,
        regionId: 14,
        objectives: [
          {
            id: 2,
            title: 'This is a test objective',
            status: OBJECTIVE_STATUS.COMPLETE,
          },
        ],
        name: 'Test Goal Name',
        isCurated: true,
        prompts: [{ promptId: 1, response: 'Test Response' }],
      }];

      const mockGoal = {
        id: 1,
        name: 'Test Goal Name',
        set: jest.fn(),
        save: jest.fn(),
        objectives: [],
      };

      Goal.findOne = jest.fn().mockResolvedValue(mockGoal);

      setFieldPromptsForCuratedTemplate.mockResolvedValue();

      await createOrUpdateGoals(goals);

      expect(setFieldPromptsForCuratedTemplate).toHaveBeenCalledWith([1], [{ promptId: 1, response: 'Test Response' }]);
    });

    it('should set the endDate if a different endDate is provided', async () => {
      const goals = [{
        ids: [1],
        grantId: 1,
        recipientId: 1,
        regionId: 14,
        objectives: [
          {
            id: 2,
            title: 'This is a test objective',
            status: OBJECTIVE_STATUS.NOT_STARTED,
          },
        ],
        name: 'Test Goal Name',
        endDate: '2024-12-31',
      }];

      const mockGoal = {
        id: 1,
        endDate: '2023-12-31',
        set: jest.fn(),
        save: jest.fn().mockResolvedValue({}),
      };

      Goal.findOne = jest.fn().mockResolvedValue(mockGoal);

      await createOrUpdateGoals(goals);

      expect(mockGoal.set).toHaveBeenCalledWith({ endDate: '2024-12-31' });

      expect(mockGoal.save).toHaveBeenCalled();
    });
  });

  describe('goalByIdWithActivityReportsAndRegions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should set previousStatus if statusChanges exist', async () => {
      const mockGoal = {
        id: 1,
        name: 'Test Goal Name',
        status: 'In Progress',
        createdVia: 'admin',
        statusChanges: [
          { oldStatus: 'Not Started' },
          { oldStatus: 'In Progress' },
        ],
        grant: { regionId: 1 },
        objectives: [],
      };

      Goal.findOne = jest.fn().mockResolvedValue(mockGoal);

      const result = await goalByIdWithActivityReportsAndRegions(1);

      expect(result.previousStatus).toEqual('In Progress');
    });

    it('should not set previousStatus if statusChanges do not exist', async () => {
      const mockGoalWithoutChanges = {
        id: 1,
        name: 'Test Goal Name',
        status: 'In Progress',
        createdVia: 'admin',
        statusChanges: [],
        grant: { regionId: 1 },
        objectives: [],
      };

      Goal.findOne = jest.fn().mockResolvedValue(mockGoalWithoutChanges);

      const result = await goalByIdWithActivityReportsAndRegions(1);

      expect(result.previousStatus).toBeUndefined();
    });
  });

  describe('getGoalIdsBySimilarity', () => {
    it('should correctly convert result to unique goalIdGroups', async () => {
      const mockResult = [
        {
          id: 1,
          matches: [{ id: 2 }, { id: 3 }],
        },
        {
          id: 4,
          matches: [{ id: 5 }],
        },
      ];

      const mockGoals = [
        {
          id: 1,
          status: 'Active',
          name: 'Goal 1',
          source: 'Source 1',
          goalTemplateId: 101,
          grantId: 1,
          responses: [{ response: 'Response 1', goalId: 1 }],
        },
        {
          id: 2,
          status: 'Active',
          name: 'Goal 2',
          source: 'Source 2',
          goalTemplateId: 102,
          grantId: 2,
          responses: [{ response: 'Response 2', goalId: 2 }],
        },
        {
          id: 3,
          status: 'Active',
          name: 'Goal 3',
          source: 'Source 3',
          goalTemplateId: 103,
          grantId: 3,
          responses: [{ response: 'Response 3', goalId: 3 }],
        },
      ];
      const expectedGoalIdGroups = [
        {
          finalGoalId: null,
          goals: [1, 2, 3],
          id: 1,
          recipientId: 1,
          userHasInvalidated: false,
        },
        {
          finalGoalId: null,
          goals: [4, 5],
          id: 4,
          recipientId: 1,
          userHasInvalidated: false,
        },
      ];

      Goal.findAll = jest.fn().mockImplementation((options) => {
        const { where } = options;

        return Promise.resolve(mockGoals.filter((goal) => where.id.includes(goal.id)));
      });

      similarGoalsForRecipient.mockResolvedValue({ result: mockResult });
      getSimilarityGroupsByRecipientId.mockResolvedValue(expectedGoalIdGroups);

      const goalIdGroups = await getGoalIdsBySimilarity(1, 14);

      expect(goalIdGroups).toEqual(expectedGoalIdGroups);
    });

    it('should return an empty goalIdGroups array if no similarity result is provided and no existing groups are found', async () => {
      getSimilarityGroupsByRecipientId.mockResolvedValue([]);

      similarGoalsForRecipient.mockResolvedValue({ result: [] });

      const goalIdGroups = await getGoalIdsBySimilarity(1, 14);

      const expectedGoalIdGroups = [];

      expect(goalIdGroups).toEqual(expectedGoalIdGroups);
    });

    it('should mark a goal as being on an active report if it has activityReportGoals with activityReport', async () => {
      const mockGoals = [
        {
          id: 1,
          status: 'Active',
          name: 'Goal 1',
          source: 'Source 1',
          goalTemplateId: 101,
          grantId: 1,
          activityReportGoals: [
            {
              activityReport: { id: 1, calculatedStatus: 'Submitted' },
              goalId: 1,
            },
          ],
          responses: [{ response: 'Response 1', goalId: 1 }],
        },
        {
          id: 2,
          status: 'Active',
          name: 'Goal 2',
          source: 'Source 2',
          goalTemplateId: 102,
          grantId: 2,
          activityReportGoals: [
            {
              activityReport: null,
              goalId: 2,
            },
          ],
          responses: [{ response: 'Response 2', goalId: 2 }],
        },
      ];

      Goal.findAll = jest.fn().mockImplementation((options) => {
        const { where } = options;
        return Promise.resolve(mockGoals.filter((goal) => where.id.includes(goal.id)));
      });

      similarGoalsForRecipient.mockResolvedValue({
        result: [
          { id: 1, matches: [{ id: 2 }] },
        ],
      });

      getSimilarityGroupsByRecipientId.mockResolvedValue([
        {
          id: 1,
          goals: [1, 2],
          finalGoalId: null,
          recipientId: 1,
          userHasInvalidated: false,
        },
      ]);

      const goalIdGroups = await getGoalIdsBySimilarity(1, 14);

      expect(goalIdGroups).toEqual(expect.any(Array));

      const firstGroup = goalIdGroups[0];
      expect(firstGroup.goals).toContain(1); // Goal with active report
      expect(firstGroup.goals).toContain(2); // Goal without active report
    });

    it('should mark goals correctly based on the absence of activityReport in activityReportGoals', async () => {
      const mockGoals = [
        {
          id: 3,
          status: 'Active',
          name: 'Goal 3',
          source: 'Source 3',
          goalTemplateId: 103,
          grantId: 3,
          activityReportGoals: [
            {
              activityReport: null,
              goalId: 3,
            },
          ],
          responses: [{ response: 'Response 3', goalId: 3 }],
        },
      ];

      Goal.findAll = jest.fn().mockImplementation((options) => {
        const { where } = options;
        return Promise.resolve(mockGoals.filter((goal) => where.id.includes(goal.id)));
      });

      similarGoalsForRecipient.mockResolvedValue({
        result: [
          { id: 3, matches: [] },
        ],
      });

      getSimilarityGroupsByRecipientId.mockResolvedValue([
        {
          id: 1,
          goals: [3],
          finalGoalId: null,
          recipientId: 1,
          userHasInvalidated: false,
        },
      ]);

      const goalIdGroups = await getGoalIdsBySimilarity(1, 14);

      expect(goalIdGroups).toEqual(expect.any(Array));
      expect(goalIdGroups[0].goals).toContain(3);
    });
  });

  describe('destroyGoal', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return 0 when goalIds is not a valid array of numbers', async () => {
      const singleResult = await destroyGoal('notAnArray');
      const arrayResult = await destroyGoal([]);

      expect(singleResult).toEqual(0);
      expect(arrayResult).toEqual({ goalsDestroyed: undefined, objectivesDestroyed: undefined });
    });

    it('should delete objectives and goals if goalIds are provided', async () => {
      const goalIds = [1, 2];
      const objectiveIds = [10, 11];

      Objective.findAll = jest.fn().mockResolvedValue([
        { id: 10 },
        { id: 11 },
      ]);

      Objective.destroy = jest.fn().mockResolvedValue(2);
      Goal.destroy = jest.fn().mockResolvedValue(2);
      ActivityReport.findAll = jest.fn().mockResolvedValue([]);

      const result = await destroyGoal(goalIds);
      expect(Objective.findAll).toHaveBeenCalledWith({
        attributes: ['id'],
        where: { goalId: { [Op.in]: goalIds } },
      });

      expect(Objective.destroy).toHaveBeenCalledWith({
        where: { id: { [Op.in]: objectiveIds } },
        individualHooks: true,
      });

      expect(Goal.destroy).toHaveBeenCalledWith({
        where: { id: { [Op.in]: goalIds } },
        individualHooks: true,
      });

      expect(result).toEqual({
        goalsDestroyed: 2,
        objectivesDestroyed: 2,
      });
    });
  });

  describe('mapGrantsWithReplacements', () => {
    it('should add active grants to the dictionary', () => {
      const grants = [
        { id: 1, status: 'Active', grantRelationships: [] },
        { id: 2, status: 'Inactive', grantRelationships: [] },
      ];

      const result = mapGrantsWithReplacements(grants);

      expect(result).toEqual({
        1: [1],
      });
    });

    it('should add active grants from grantRelationships', () => {
      const grants = [
        {
          id: 1,
          status: 'Inactive',
          grantRelationships: [
            { activeGrant: { id: 3, status: 'Active' }, activeGrantId: 3 },
          ],
        },
      ];

      const result = mapGrantsWithReplacements(grants);

      expect(result).toEqual({
        1: [3],
      });
    });

    it('should add both active grants and active relationship grants', () => {
      const grants = [
        { id: 1, status: 'Active', grantRelationships: [] },
        {
          id: 2,
          status: 'Inactive',
          grantRelationships: [
            { activeGrant: { id: 3, status: 'Active' }, activeGrantId: 3 },
          ],
        },
      ];

      const result = mapGrantsWithReplacements(grants);

      expect(result).toEqual({
        1: [1],
        2: [3],
      });
    });

    it('should handle multiple active grants for a single grant', () => {
      const grants = [
        {
          id: 1,
          status: 'Inactive',
          grantRelationships: [
            { activeGrant: { id: 3, status: 'Active' }, activeGrantId: 3 },
            { activeGrant: { id: 4, status: 'Active' }, activeGrantId: 4 },
          ],
        },
      ];

      const result = mapGrantsWithReplacements(grants);

      expect(result).toEqual({
        1: [3, 4],
      });
    });

    it('should return an empty dictionary if no active grants or relationships are found', () => {
      const grants = [
        { id: 1, status: 'Inactive', grantRelationships: [] },
        {
          id: 2,
          status: 'Inactive',
          grantRelationships: [
            { activeGrant: { id: 3, status: 'Inactive' }, activeGrantId: 3 },
          ],
        },
      ];

      const result = mapGrantsWithReplacements(grants);

      expect(result).toEqual({});
    });
  });
});
