import { Op } from 'sequelize';
import {
  createObjectivesForGoal, saveGoalsForReport, goalsForGrants, getReportCountForGoals, verifyAllowedGoalStatusTransition, updateGoalStatusById
} from './goals';
import {
  sequelize,
  Goal,
  Grant,
  Objective,
  ActivityReportObjective,
  ActivityReportGoal,
} from '../models';
const { OBJECTIVE_STATUS } = require('../constants');
import { GOAL_STATUS } from '../constants';
import changeGoalStatus from './changeGoalStatus';
import { auditLogger } from '../logger';

jest.mock('./changeGoalStatus', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../services/reportCache');

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
  });

  describe('createObjectivesForGoal', () => {
    const goal = { id: 1 };
    const objectives = [
      {
        id: 1,
        isNew: false,
        ttaProvided: 'TTA provided details',
        title: 'Objective title 1',
        status: 'IN_PROGRESS',
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
      }
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
          goalId: goal.id
        })
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
          goalId: goal.id
        })
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
      const objectives = [
        {
          id: 1,
          isNew: false,
          supportType: 'supportType1',
          goalId: 1,
          createdHere: false,
        }
      ];

      Objective.findByPk = jest.fn().mockResolvedValue(null);
      Objective.findOne = jest.fn().mockResolvedValue(null);
      Objective.create = jest.fn().mockResolvedValue({
        toJSON: () => ({
          id: 1,
          title: 'Objective with missing fields',
          status: OBJECTIVE_STATUS.NOT_STARTED,
          goalId: goal.id,
        })
      });

      const result = await createObjectivesForGoal(goal, objectives);

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
    const result = verifyAllowedGoalStatusTransition(GOAL_STATUS.DRAFT, GOAL_STATUS.IN_PROGRESS, []);
    expect(result).toBe(false);
  });

  it('should allow transition from NOT_STARTED to CLOSED', () => {
    const result = verifyAllowedGoalStatusTransition(GOAL_STATUS.NOT_STARTED, GOAL_STATUS.CLOSED, []);
    expect(result).toBe(true);
  });

  it('should allow transition from NOT_STARTED to SUSPENDED', () => {
    const result = verifyAllowedGoalStatusTransition(GOAL_STATUS.NOT_STARTED, GOAL_STATUS.SUSPENDED, []);
    expect(result).toBe(true);
  });

  it('should allow transition from IN_PROGRESS to CLOSED', () => {
    const result = verifyAllowedGoalStatusTransition(GOAL_STATUS.IN_PROGRESS, GOAL_STATUS.CLOSED, []);
    expect(result).toBe(true);
  });

  it('should allow transition from SUSPENDED to IN_PROGRESS', () => {
    const result = verifyAllowedGoalStatusTransition(GOAL_STATUS.SUSPENDED, GOAL_STATUS.IN_PROGRESS, [GOAL_STATUS.IN_PROGRESS]);
    expect(result).toBe(true);
  });

  it('should allow transition from SUSPENDED to a previous status (e.g., IN_PROGRESS)', () => {
    const result = verifyAllowedGoalStatusTransition(GOAL_STATUS.SUSPENDED, GOAL_STATUS.IN_PROGRESS, [GOAL_STATUS.IN_PROGRESS]);
    expect(result).toBe(true);
  });

  it('should not allow transition from CLOSED to any other status', () => {
    const result = verifyAllowedGoalStatusTransition(GOAL_STATUS.CLOSED, GOAL_STATUS.IN_PROGRESS, []);
    expect(result).toBe(false);
  });

  it('should handle edge case when oldStatus is not in ALLOWED_TRANSITIONS', () => {
    const result = verifyAllowedGoalStatusTransition('INVALID_STATUS', GOAL_STATUS.CLOSED, []);
    expect(result).toBe(false);
  });

  it('should allow transition from SUSPENDED to CLOSED', () => {
    const result = verifyAllowedGoalStatusTransition(GOAL_STATUS.SUSPENDED, GOAL_STATUS.CLOSED, [GOAL_STATUS.IN_PROGRESS]);
    expect(result).toBe(true);
  });

  it('should allow transition from SUSPENDED to the previous status when previous status is provided', () => {
    const result = verifyAllowedGoalStatusTransition(GOAL_STATUS.SUSPENDED, GOAL_STATUS.IN_PROGRESS, [GOAL_STATUS.IN_PROGRESS]);
    expect(result).toBe(true);
  });
});

describe('updateGoalStatusById', () => {
  const mockGoalIds = [1, 2];
  const mockUserId = 123;
  const mockOldStatus = 'In Progress';
  const mockNewStatus = 'Closed';
  const mockReason = 'Duplicate goal';
  const mockContext = 'Some context';
  const mockPreviousStatus = ['In Progress'];

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
      mockPreviousStatus
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
      mockPreviousStatus
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
      'In Progress',
      mockReason,
      mockContext,
      mockPreviousStatus
    );

    expect(changeGoalStatus).not.toHaveBeenCalled();

    expect(loggerSpy).toHaveBeenCalledWith(
      `UPDATEGOALSTATUSBYID: Goal status transition from Not Started to In Progress not allowed for goal ${mockGoalIds}`
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
      mockPreviousStatus
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
