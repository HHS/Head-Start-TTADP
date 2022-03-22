import { INTERNAL_SERVER_ERROR, NOT_FOUND } from 'http-codes';
import { changeGoalStatus, createGoals } from './handlers';
import { updateGoalStatusById, createOrUpdateGoals } from '../../services/goals';
import { userById } from '../../services/users';
import SCOPES from '../../middleware/scopeConstants';

jest.mock('../../services/users', () => ({
  userById: jest.fn(),
}));

jest.mock('../../services/goals', () => ({
  updateGoalStatusById: jest.fn(),
  createOrUpdateGoals: jest.fn(),
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

describe('createGoals', () => {
  afterAll(async () => {
    jest.clearAllMocks();
  });

  it('checks permissions', async () => {
    const req = {
      body: {
        goals: [
          { regionId: 2 },
        ],
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
        goals: [
          { regionId: 2 },
        ],
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
        goals: [
          { regionId: 2 },
        ],
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
  const goalWhere = { name: 'My updated goal' };

  it('updates status goal by id', async () => {
    const req = {
      params: {
        goalId: 100000,
      },
      body: {
        newStatus: 'New Status',
        closeSuspendReason: 'TTA complete',
        closeSuspendContext: 'Sample context.',
      },
    };
    updateGoalStatusById.mockResolvedValue(goalWhere);
    await changeGoalStatus(req, mockResponse);
    expect(mockResponse.json).toHaveBeenCalledWith(goalWhere);
  });

  it('returns a 404 when a goal can\'t be found', async () => {
    const req = {
      params: {
        goalId: 100000,
      },
      body: {
        newStatus: 'New Status',
        closeSuspendReason: 'TTA complete',
        closeSuspendContext: 'Sample context.',
      },
    };
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
