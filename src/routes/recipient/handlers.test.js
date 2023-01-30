import { INTERNAL_SERVER_ERROR, NOT_FOUND } from 'http-codes';
import { getUserReadRegions } from '../../services/accessValidation';
import {
  getRecipient,
  searchRecipients,
  getGoalsByRecipient,
  getGoalsByIdandRecipient,
} from './handlers';
import {
  getGoalsByActivityRecipient, recipientById, recipientsByName,
} from '../../services/recipient';
import { goalsByIdAndRecipient } from '../../services/goals';
import SCOPES from '../../middleware/scopeConstants';

jest.mock('../../services/recipient', () => ({
  recipientById: jest.fn(),
  recipientsByName: jest.fn(),
  getGoalsByActivityRecipient: jest.fn(),
  getUserReadRegions: jest.fn(),
  updateRecipientGoalStatusById: jest.fn(),
}));

jest.mock('../../services/goals', () => ({
  goalsByIdAndRecipient: jest.fn(),
}));

jest.mock('../../services/accessValidation');

const mockUserById = {
  permissions: [{ scopeId: SCOPES.READ_REPORTS, regionId: 1 }],
};

jest.mock('../../services/users', () => ({
  userById: jest.fn(() => mockUserById),
}));

describe('getRecipient', () => {
  const recipientWhere = { name: 'Mr Thaddeus Q Recipient', grants: [{ regionId: 1 }] };

  const mockResponse = {
    attachment: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    sendStatus: jest.fn(),
    status: jest.fn(() => ({
      end: jest.fn(),
    })),
  };
  it('retrieves a recipient', async () => {
    const req = {
      params: {
        recipientId: 100000,
      },
      query: {
        'region.in': 1,
        modelType: 'grant',
      },
      session: {
        userId: 1,
      },
    };
    recipientById.mockResolvedValue(recipientWhere);
    await getRecipient(req, mockResponse);
    expect(mockResponse.json).toHaveBeenCalledWith(recipientWhere);
  });

  it('returns a 404 when a recipient can\'t be found', async () => {
    const req = {
      params: {
        recipientId: 14565,
      },
      query: {
        'region.in': 1,
        modelType: 'grant',
      },
      session: {
        userId: 1,
      },
    };
    recipientById.mockResolvedValue(null);
    await getRecipient(req, mockResponse);
    expect(mockResponse.sendStatus).toHaveBeenCalledWith(NOT_FOUND);
  });

  it('returns a 500 on error', async () => {
    const req = {};
    await getRecipient(req, mockResponse);
    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
  });

  it('returns unauthorized when user does not have access to region', async () => {
    const req = {
      params: {
        recipientId: 100000,
      },
      query: {
        'region.in': 1,
        modelType: 'grant',
      },
      session: {
        userId: 1,
      },
    };
    recipientById.mockResolvedValue({
      ...recipientWhere,
      grants: [{
        regionId: 5,
      }],
    });
    await getRecipient(req, mockResponse);
    expect(mockResponse.sendStatus).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(recipientWhere);
  });
});

describe('searchRecipient', () => {
  const recipientResults = [
    {
      name: 'City of Florida Mr Thaddeus Q Recipient',
    },
  ];

  const mockResponse = {
    attachment: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    sendStatus: jest.fn(),
    status: jest.fn(() => ({
      end: jest.fn(),
    })),
  };
  it('retrieves matching recipients', async () => {
    const req = {
      query: {
        s: 'City of Florida',
        'region.in': 1,
        modelType: 'grant',
        sortBy: 'name',
        direction: 'asc',
        offset: 0,
      },
    };
    recipientsByName.mockResolvedValue(recipientResults);
    await searchRecipients(req, mockResponse);
    expect(mockResponse.json).toHaveBeenCalledWith(recipientResults);
  });

  it('returns a 404 when a recipient can\'t be found', async () => {
    const req = {
      query: {
        s: 'City of Florida',
        'region.in': 1,
        modelType: 'grant',
        sortBy: 'name',
        direction: 'asc',
        offset: 0,
      },
    };
    recipientsByName.mockResolvedValue(null);
    await searchRecipients(req, mockResponse);
    expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
  });

  it('returns a 500 on error', async () => {
    const req = {};
    await searchRecipients(req, mockResponse);
    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
  });
});

describe('getGoalsByActivityRecipient', () => {
  const recipientWhere = { name: 'Mr Thaddeus Q Recipient' };

  const mockResponse = {
    attachment: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
    sendStatus: jest.fn(),
    status: jest.fn(() => ({
      end: jest.fn(),
    })),
  };
  it('retrieves goals by recipient', async () => {
    const req = {
      params: {
        recipientId: 100000,
        regionId: 1,
      },
      session: {
        userId: 1000,
      },
    };
    recipientById.mockResolvedValue(recipientWhere);
    getUserReadRegions.mockResolvedValue([1]);
    getGoalsByActivityRecipient.mockResolvedValue(recipientWhere);
    await getGoalsByRecipient(req, mockResponse);
    expect(mockResponse.json).toHaveBeenCalledWith(recipientWhere);
  });

  it('returns a 404 when a recipient can\'t be found', async () => {
    const req = {
      params: {
        recipientId: 14565,
        regionId: 1,
      },
      query: {
        'region.in': 1,
        modelType: 'grant',
      },
      session: {
        userId: 1000,
      },
    };
    recipientById.mockResolvedValue(null);
    getUserReadRegions.mockResolvedValue([1]);
    getGoalsByActivityRecipient.mockResolvedValue(null);
    await getGoalsByRecipient(req, mockResponse);
    expect(mockResponse.sendStatus).toHaveBeenCalledWith(NOT_FOUND);
  });

  it('returns a 500 on error', async () => {
    const req = {
      session: {
        userId: 1000,
      },
    };
    recipientById.mockResolvedValue(recipientWhere);
    await getGoalsByRecipient(req, mockResponse);
    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
  });

  it('returns a 403 on region permissions', async () => {
    const req = {
      params: {
        recipientId: 14565,
        regionId: 1,
      },
      session: {
        userId: 1000,
      },
    };
    getUserReadRegions.mockResolvedValue([2]);
    await getGoalsByRecipient(req, mockResponse);
    expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
  });
});

describe('getGoalsByIdAndRecipient', () => {
  it('handles errors', async () => {
    const req = {
      params: {
        recipientId: 100000,
      },
      query: {
        goalIds: [1],
      },
    };

    const mockResponse = {
      attachment: jest.fn(),
      json: jest.fn(),
      send: jest.fn(),
      sendStatus: jest.fn(),
      status: jest.fn(() => ({
        end: jest.fn(),
      })),
    };

    goalsByIdAndRecipient.mockImplementationOnce(() => {
      throw new Error('test error');
    });

    await getGoalsByIdandRecipient(req, mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
  });

  it('handles no goals', async () => {
    const req = {
      params: {
        recipientId: 100000,
      },
      query: {
        goalIds: [1],
      },
    };

    const mockResponse = {
      attachment: jest.fn(),
      json: jest.fn(),
      send: jest.fn(),
      sendStatus: jest.fn(),
      status: jest.fn(() => ({
        end: jest.fn(),
      })),
    };

    goalsByIdAndRecipient.mockResolvedValueOnce([]);

    await getGoalsByIdandRecipient(req, mockResponse);

    expect(mockResponse.sendStatus).toHaveBeenCalledWith(NOT_FOUND);
  });

  it('return goals successfully', async () => {
    const req = {
      params: {
        recipientId: 100000,
      },
      query: {
        goalIds: [1],
      },
    };

    const mockResponse = {
      attachment: jest.fn(),
      json: jest.fn(),
      send: jest.fn(),
      sendStatus: jest.fn(),
      status: jest.fn(() => ({
        end: jest.fn(),
      })),
    };

    goalsByIdAndRecipient.mockResolvedValueOnce([{ name: 'goal' }]);

    await getGoalsByIdandRecipient(req, mockResponse);

    expect(mockResponse.json).toHaveBeenCalledWith([{ name: 'goal' }]);
  });
});
