import { INTERNAL_SERVER_ERROR, NOT_FOUND } from 'http-codes';
import { changeGoalStatus } from './handlers';
import { updateGoalStatusById } from '../../services/goals';

jest.mock('../../services/goals', () => ({
  updateGoalStatusById: jest.fn(),
}));

jest.mock('../../services/accessValidation');

describe('changeGoalStatus', () => {
  const goalWhere = { name: 'My updated goal' };

  const mockResponse = {
    attachment: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    sendStatus: jest.fn(),
    status: jest.fn(() => ({
      end: jest.fn(),
    })),
  };
  it('updates status goal by id', async () => {
    const req = {
      params: {
        goalId: 100000,
      },
      body: {
        newStatus: 'New Status',

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
