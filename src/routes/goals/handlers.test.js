import { INTERNAL_SERVER_ERROR, NOT_FOUND, BAD_REQUEST } from 'http-codes';
import { userById } from '../../services/users';
import SCOPES from '../../middleware/scopeConstants';
import {
  changeGoalStatus,
  createGoals,
  retrieveGoalByIdAndRecipient,
  retrieveGoalsByIds,
  deleteGoal,
  createGoalsForReport,
} from './handlers';
import {
  updateGoalStatusById,
  createOrUpdateGoals,
  destroyGoal,
  goalByIdWithActivityReportsAndRegions,
  goalByIdAndRecipient,
  createOrUpdateGoalsForActivityReport,
  goalsByIdsAndActivityReport,
} from '../../services/goals';
import { currentUserId } from '../../services/currentUser';

jest.mock('../../services/users', () => ({
  userById: jest.fn(),
}));

jest.mock('../../services/currentUser', () => ({
  currentUserId: jest.fn(),
}));

jest.mock('../../services/goals', () => ({
  updateGoalStatusById: jest.fn(),
  createOrUpdateGoals: jest.fn(),
  goalByIdWithActivityReportsAndRegions: jest.fn(),
  goalByIdAndRecipient: jest.fn(),
  destroyGoal: jest.fn(),
  createOrUpdateGoalsForActivityReport: jest.fn(),
  goalsByIdsAndActivityReport: jest.fn(),
}));

jest.mock('../../services/users', () => ({
  userById: jest.fn(),
}));

jest.mock('../../services/accessValidation');

const mockResponse = {
  attachment: jest.fn(),
  json: jest.fn(),
  send: jest.fn(),
  sendStatus: jest.fn(),
  status: jest.fn(() => ({
    end: jest.fn(),
  })),
};

describe('retrieve goal', () => {
  it('checks permissions', async () => {
    const req = {
      params: {
        goalId: 2,
        recipientId: 2,
      },
      session: {
        userId: 1,
      },
    };

    userById.mockResolvedValueOnce({
      permissions: [],
    });

    goalByIdWithActivityReportsAndRegions.mockResolvedValueOnce({
      objectives: [],
      grant: {
        regionId: 2,
      },
    });

    await retrieveGoalByIdAndRecipient(req, mockResponse);

    expect(mockResponse.sendStatus).toHaveBeenCalledWith(401);
  });
  it('handles success', async () => {
    const req = {
      params: {
        goalId: 2,
        recipientId: 2,
      },
      session: {
        userId: 1,
      },
    };

    userById.mockResolvedValueOnce({
      permissions: [
        {
          regionId: 2,
          scopeId: SCOPES.READ_REPORTS,
        },
      ],
    });

    goalByIdWithActivityReportsAndRegions.mockResolvedValueOnce({
      objectives: [],
      grant: { regionId: 2 },
    });

    goalByIdAndRecipient.mockResolvedValueOnce({});
    await retrieveGoalByIdAndRecipient(req, mockResponse);

    expect(mockResponse.json).toHaveBeenCalledWith({});
  });

  it('handles not found', async () => {
    const req = {
      params: {
        goalId: 2,
        recipientId: 2,
      },
      session: {
        userId: 1,
      },
    };

    userById.mockResolvedValueOnce({
      permissions: [
        {
          regionId: 2,
          scopeId: SCOPES.READ_REPORTS,
        },
      ],
    });

    goalByIdWithActivityReportsAndRegions.mockResolvedValueOnce({
      objectives: [],
      grant: { regionId: 2 },
    });

    goalByIdAndRecipient.mockResolvedValueOnce(null);
    await retrieveGoalByIdAndRecipient(req, mockResponse);

    expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
  });

  it('handles failures', async () => {
    const req = {
      params: {
        goalId: 2,
        recipientId: 2,
      },
      session: {
        userId: 1,
      },
    };

    userById.mockResolvedValueOnce({
      permissions: [
        {
          regionId: 2,
          scopeId: SCOPES.READ_REPORTS,
        },
      ],
    });

    goalByIdWithActivityReportsAndRegions.mockResolvedValueOnce({
      objectives: [],
      grants: [{ regionId: 2 }],
    });

    goalByIdAndRecipient.mockImplementationOnce(() => {
      throw new Error();
    });

    await retrieveGoalByIdAndRecipient(req, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
  });
});

describe('createGoals', () => {
  afterAll(async () => {
    jest.clearAllMocks();
    userById.mockReset();
  });

  it('checks permissions', async () => {
    const req = {
      body: {
        goals: [{
          goalId: 2,
          recipientId: 2,
        }],
      },
      session: {
        userId: 1,
      },
    };

    userById.mockResolvedValueOnce({
      permissions: [
        {
          regionId: 2,
          scopeId: SCOPES.READ_REPORTS,
        },
      ],
    });

    await createGoals(req, mockResponse);

    expect(mockResponse.sendStatus).toHaveBeenCalledWith(401);
  });

  it('handles success', async () => {
    const req = {
      body: {
        goals: [{
          goalId: 2,
          recipientId: 2,
        }],
      },
      session: {
        userId: 1,
      },
    };

    userById.mockResolvedValueOnce({
      permissions: [
        {
          regionId: 2,
          scopeId: SCOPES.READ_WRITE_REPORTS,
        },
      ],
    });

    createOrUpdateGoals.mockResolvedValueOnce({});
    await createGoals(req, mockResponse);

    expect(mockResponse.json).toHaveBeenCalledWith({});
  });

  it('handles failures', async () => {
    const req = {
      body: {
        goals: [{
          goalId: 2,
          recipientId: 2,
        }],
      },
      session: {
        userId: 1,
      },
    };

    userById.mockResolvedValueOnce({
      permissions: [
        {
          regionId: 2,
          scopeId: SCOPES.READ_WRITE_REPORTS,
        },
      ],
    });

    createOrUpdateGoals.mockImplementationOnce(() => {
      throw new Error();
    });

    await createGoals(req, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
  });
});

describe('changeGoalStatus', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    userById.mockReset();
    goalByIdWithActivityReportsAndRegions.mockReset();
  });
  const goalWhere = { name: 'My updated goal' };

  it('updates status goal by id', async () => {
    const req = {
      body: {
        goalIds: [100000],
        newStatus: 'New Status',
        closeSuspendReason: 'TTA complete',
        closeSuspendContext: 'Sample context.',
        regionId: 2,
      },
      session: {
        userId: 1,
      },
    };
    updateGoalStatusById.mockResolvedValueOnce(goalWhere);
    userById.mockResolvedValueOnce({
      permissions: [
        {
          regionId: 2,
          scopeId: SCOPES.READ_WRITE_REPORTS,
        },
      ],
    });

    goalByIdWithActivityReportsAndRegions.mockResolvedValue({
      objectives: [],
      grant: { regionId: 2 },
      previousStatus: 'Was a Fish',
    });

    await changeGoalStatus(req, mockResponse);
    expect(mockResponse.json).toHaveBeenCalledWith(goalWhere);
  });

  it('returns a bad request when the goal status cannot be so updated', async () => {
    const req = {
      body: {
        goalIds: [100000],
        newStatus: 'New Status',
        closeSuspendReason: 'TTA complete',
        closeSuspendContext: 'Sample context.',
        regionId: 2,
      },
      session: {
        userId: 1,
      },
    };
    updateGoalStatusById.mockResolvedValueOnce(false);
    userById.mockResolvedValueOnce({
      permissions: [
        {
          regionId: 2,
          scopeId: SCOPES.READ_WRITE_REPORTS,
        },
      ],
    });

    goalByIdWithActivityReportsAndRegions.mockResolvedValue({
      objectives: [],
      grant: { regionId: 2 },
      previousStatus: 'Was a Fish',
    });

    await changeGoalStatus(req, mockResponse);
    expect(mockResponse.sendStatus).toHaveBeenCalledWith(BAD_REQUEST);
  });

  it('returns a 401 based on permissions checks', async () => {
    const req = {
      body: {
        goalIds: [100000],
        newStatus: 'New Status',
        closeSuspendReason: 'TTA complete',
        closeSuspendContext: 'Sample context.',
        regionId: 1,
      },
      session: {
        userId: 1,
      },
    };
    updateGoalStatusById.mockResolvedValue(goalWhere);
    userById.mockResolvedValue({
      permissions: [
        {
          regionId: 2,
          scopeId: SCOPES.READ_REPORTS,
        },
      ],
    });

    goalByIdWithActivityReportsAndRegions.mockResolvedValue({
      objectives: [],
      grant: { regionId: 2 },
    });

    await changeGoalStatus(req, mockResponse);
    expect(mockResponse.sendStatus).toHaveBeenCalledWith(401);
  });

  it('returns a 404 when a goal can\'t be found', async () => {
    const req = {
      body: {
        goalIds: [100000],
        newStatus: 'New Status',
        closeSuspendReason: 'TTA complete',
        closeSuspendContext: 'Sample context.',
        regionId: 2,
      },
      session: {
        userId: 1,
      },
    };

    userById.mockResolvedValue({
      permissions: [
        {
          regionId: 2,
          scopeId: SCOPES.READ_WRITE_REPORTS,
        },
      ],
    });

    goalByIdWithActivityReportsAndRegions.mockResolvedValue(null);

    updateGoalStatusById.mockResolvedValue(null);
    await changeGoalStatus(req, mockResponse);
    expect(mockResponse.sendStatus).toHaveBeenCalledWith(NOT_FOUND);
  });

  it('returns a 500 on error', async () => {
    const req = {
    };
    await changeGoalStatus(req, mockResponse);
    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
  });
});

describe('deleteGoal', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.resetModules();
  });

  it('checks permissions', async () => {
    const req = {
      query: {
        goalIds: [1],
      },
      session: {
        userId: 1,
      },
    };

    userById.mockResolvedValueOnce({
      permissions: [
        {
          regionId: 2,
          scopeId: SCOPES.READ_REPORTS,
        },
      ],
    });

    goalByIdWithActivityReportsAndRegions.mockResolvedValueOnce({
      objectives: [],
      grant: { regionId: 2 },
    });

    await deleteGoal(req, mockResponse);

    expect(mockResponse.sendStatus).toHaveBeenCalledWith(401);
  });

  it('handles success', async () => {
    const req = {
      query: {
        goalIds: [1],
      },
      session: {
        userId: 1,
      },
    };

    goalByIdWithActivityReportsAndRegions.mockResolvedValueOnce({
      objectives: [],
      grant: { regionId: 2 },
    });

    userById.mockResolvedValueOnce({
      permissions: [
        {
          regionId: 2,
          scopeId: SCOPES.READ_WRITE_REPORTS,
        },
      ],
    });

    destroyGoal.mockResolvedValueOnce(1);
    await deleteGoal(req, mockResponse);

    expect(mockResponse.json).toHaveBeenCalledWith(1);
  });

  it('handles no goal to delete', async () => {
    const req = {
      query: {
        goalIds: [1],
      },
      session: {
        userId: 1,
      },
    };

    goalByIdWithActivityReportsAndRegions.mockResolvedValueOnce({
      objectives: [],
      grant: { regionId: 2 },
    });

    userById.mockResolvedValueOnce({
      permissions: [
        {
          regionId: 2,
          scopeId: SCOPES.READ_WRITE_REPORTS,
        },
      ],
    });

    destroyGoal.mockResolvedValueOnce(0);
    await deleteGoal(req, mockResponse);

    expect(mockResponse.sendStatus).toHaveBeenCalledWith(NOT_FOUND);
  });

  it('handles failures', async () => {
    const req = {
      query: {
        goalIds: [1],
      },
      session: {
        userId: 1,
      },
    };

    goalByIdWithActivityReportsAndRegions.mockResolvedValueOnce({
      objectives: [],
      grants: [{ regionId: 2 }],
    });

    userById.mockResolvedValueOnce({
      permissions: [
        {
          regionId: 2,
          scopeId: SCOPES.READ_WRITE_REPORTS,
        },
      ],
    });

    destroyGoal.mockImplementationOnce(() => {
      throw new Error('This is an error');
    });

    await deleteGoal(req, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
  });
});

describe('createGoalsForReport', () => {
  it('handles success', async () => {
    const req = {
      body: {
        activityReportId: 1,
        regionId: 2,
        goals: [
          {
            name: 'Goal 1',
            objectives: [
              {
                name: 'Objective 1',
              },
            ],
          },
        ],
      },
      session: {
        userId: 1,
      },
    };

    currentUserId.mockResolvedValueOnce(1);
    userById.mockResolvedValueOnce({
      permissions: [
        {
          regionId: 2,
          scopeId: SCOPES.READ_WRITE_REPORTS,
        },
      ],
    });

    createOrUpdateGoalsForActivityReport.mockResolvedValueOnce(1);
    await createGoalsForReport(req, mockResponse);

    expect(mockResponse.json).toHaveBeenCalledWith(1);
  });

  it('rejects based on permissions', async () => {
    const req = {
      body: {
        activityReportId: 1,
        regionId: 2,
        goals: [
          {
            name: 'Goal 1',
            objectives: [
              {
                name: 'Objective 1',
              },
            ],
          },
        ],
      },
      session: {
        userId: 1,
      },
    };

    currentUserId.mockResolvedValueOnce(1);
    userById.mockResolvedValueOnce({
      permissions: [],
    });

    await createGoalsForReport(req, mockResponse);
    expect(mockResponse.sendStatus).toHaveBeenCalledWith(401);
  });

  it('handles errors', async () => {
    const req = {
      body: {
        activityReportId: 1,
        regionId: 2,
        goals: [
          {
            name: 'Goal 1',
            objectives: [
              {
                name: 'Objective 1',
              },
            ],
          },
        ],
      },
      session: {
        userId: 1,
      },
    };

    currentUserId.mockResolvedValueOnce(1);
    userById.mockResolvedValueOnce({
      permissions: [
        {
          regionId: 2,
          scopeId: SCOPES.READ_WRITE_REPORTS,
        },
      ],
    });

    createOrUpdateGoalsForActivityReport.mockImplementationOnce(() => {
      throw new Error('a test error for the goals handler');
    });
    await createGoalsForReport(req, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
  });
});

describe('retrieveGoalsByIds', () => {
  it('success with array in query paramter', async () => {
    const req = {
      query: {
        goalIds: [1, 2],
      },
      session: {
        userId: 1,
      },
    };

    currentUserId.mockResolvedValueOnce(1);
    userById.mockResolvedValueOnce({
      permissions: [
        {
          regionId: 2,
          scopeId: SCOPES.READ_REPORTS,
        },
      ],
    });

    goalByIdWithActivityReportsAndRegions.mockResolvedValue({
      objectives: [],
      grant: { regionId: 2 },
    });

    goalsByIdsAndActivityReport.mockResolvedValueOnce([
      {
        id: 1,
        name: 'Goal 1',
        objectives: [
          {
            id: 1,
            name: 'Objective 1',
          },
        ],
      },
      {
        id: 2,
        name: 'Goal 2',
        objectives: [
          {
            id: 2,
            name: 'Objective 2',
          },
        ],
      },
    ]);

    await retrieveGoalsByIds(req, mockResponse);

    expect(mockResponse.json).toHaveBeenCalledWith([
      {
        id: 1,
        name: 'Goal 1',
        objectives: [
          {
            id: 1,
            name: 'Objective 1',
          },
        ],
      },
      {
        id: 2,
        name: 'Goal 2',
        objectives: [
          {
            id: 2,
            name: 'Objective 2',
          },
        ],
      },
    ]);
  });

  it('handles success with single number in query parameter', async () => {
    const req = {
      query: {
        goalIds: 1,
      },
      session: {
        userId: 1,
      },
    };

    currentUserId.mockResolvedValueOnce(1);
    userById.mockResolvedValueOnce({
      permissions: [
        {
          regionId: 2,
          scopeId: SCOPES.READ_REPORTS,
        },
      ],
    });

    goalByIdWithActivityReportsAndRegions.mockResolvedValue({
      objectives: [],
      grant: { regionId: 2 },
    });

    goalsByIdsAndActivityReport.mockResolvedValueOnce([
      {
        id: 1,
        name: 'Goal 1',
        objectives: [
          {
            id: 1,
            name: 'Objective 1',
          },
        ],
      },
    ]);

    await retrieveGoalsByIds(req, mockResponse);

    expect(mockResponse.json).toHaveBeenCalledWith([
      {
        id: 1,
        name: 'Goal 1',
        objectives: [
          {
            id: 1,
            name: 'Objective 1',
          },
        ],
      },
    ]);
  });

  it('rejects based on permissions', async () => {
    const req = {
      query: {
        goalIds: [1],
      },
      session: {
        userId: 1,
      },
    };

    goalByIdWithActivityReportsAndRegions.mockResolvedValue({
      objectives: [],
      grant: { regionId: 2 },
    });

    currentUserId.mockResolvedValueOnce(1);
    userById.mockResolvedValueOnce({
      permissions: [],
    });

    await retrieveGoalsByIds(req, mockResponse);
    expect(mockResponse.sendStatus).toHaveBeenCalledWith(401);
  });

  it('handles goal not found', async () => {
    const req = {
      query: {
        goalIds: [1],
      },
      session: {
        userId: 1,
      },
    };

    currentUserId.mockResolvedValueOnce(1);
    userById.mockResolvedValueOnce({
      permissions: [
        {
          regionId: 2,
          scopeId: SCOPES.READ_REPORTS,
        },
      ],
    });

    goalByIdWithActivityReportsAndRegions.mockResolvedValue({
      objectives: [],
      grant: { regionId: 2 },
    });

    goalsByIdsAndActivityReport.mockResolvedValueOnce([]);

    await retrieveGoalsByIds(req, mockResponse, true);
    expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
  });

  it('the reducer returning null', async () => {
    const req = {
      query: {
        goalIds: [1],
      },
      session: {
        userId: 1,
      },
    };

    currentUserId.mockResolvedValueOnce(1);
    userById.mockResolvedValueOnce({
      permissions: [
        {
          regionId: 2,
          scopeId: SCOPES.READ_REPORTS,
        },
      ],
    });

    goalByIdWithActivityReportsAndRegions.mockResolvedValue({
      objectives: [],
      grant: { regionId: 2 },
    });

    goalsByIdsAndActivityReport.mockResolvedValueOnce(null);

    await retrieveGoalsByIds(req, mockResponse);
    expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
  });

  it('handles error', async () => {
    const req = {
      query: {
        goalIds: [1],
      },
      session: {
        userId: 1,
      },
    };

    currentUserId.mockResolvedValueOnce(1);
    userById.mockResolvedValueOnce({
      permissions: [
        {
          regionId: 2,
          scopeId: SCOPES.READ_REPORTS,
        },
      ],
    });

    goalByIdWithActivityReportsAndRegions.mockResolvedValue({
      objectives: [],
      grant: { regionId: 2 },
    });

    goalsByIdsAndActivityReport.mockImplementationOnce(() => {
      throw new Error('a test error for the goals handler');
    });

    await retrieveGoalsByIds(req, mockResponse);
    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
  });
});
