/* eslint-disable jest/no-disabled-tests */
import { INTERNAL_SERVER_ERROR, NOT_FOUND } from 'http-codes';
import { userById } from '../../services/users';
import SCOPES from '../../middleware/scopeConstants';
import {
  changeGoalStatus, createGoals, retrieveGoalByIdAndRecipient, deleteGoal,
} from './handlers';
import {
  updateGoalStatusById,
  createOrUpdateGoals,
  destroyGoal,
  goalByIdWithActivityReportsAndRegions,
  goalByIdAndRecipient,
} from '../../services/goals';

jest.mock('../../services/users', () => ({
  userById: jest.fn(),
}));

jest.mock('../../services/goals', () => ({
  updateGoalStatusById: jest.fn(),
  createOrUpdateGoals: jest.fn(),
  goalByIdWithActivityReportsAndRegions: jest.fn(),
  goalByIdAndRecipient: jest.fn(),
  destroyGoal: jest.fn(),
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
    });

    await changeGoalStatus(req, mockResponse);
    expect(mockResponse.json).toHaveBeenCalledWith(goalWhere);
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
  afterAll(async () => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('checks permissions', async () => {
    const req = {
      params: {
        goalId: 1,
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
      params: {
        goalId: 1,
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

  it('handles failures', async () => {
    const req = {
      params: {
        goalId: 1,
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
      throw new Error();
    });

    await deleteGoal(req, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
  });
});
