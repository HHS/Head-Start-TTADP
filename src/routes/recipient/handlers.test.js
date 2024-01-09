import {
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  UNAUTHORIZED,
  BAD_REQUEST,
} from 'http-codes';
import { getUserReadRegions } from '../../services/accessValidation';
import {
  getRecipient,
  searchRecipients,
  getGoalsByRecipient,
  getGoalsByIdandRecipient,
  getRecipientAndGrantsByUser,
  getRecipientLeadership,
  getMergeGoalPermissions,
} from './handlers';
import {
  getGoalsByActivityRecipient,
  recipientById,
  recipientLeadership,
  recipientsByName,
  recipientsByUserId,
  allArUserIdsByRecipientAndRegion,
} from '../../services/recipient';
import { goalsByIdAndRecipient } from '../../goalServices/goals';
import SCOPES from '../../middleware/scopeConstants';
import { currentUserId } from '../../services/currentUser';
import { userById } from '../../services/users';

jest.mock('../../services/currentUser', () => ({
  currentUserId: jest.fn(),
}));

jest.mock('../../services/recipient', () => ({
  recipientById: jest.fn(),
  recipientsByName: jest.fn(),
  getGoalsByActivityRecipient: jest.fn(),
  getUserReadRegions: jest.fn(),
  updateRecipientGoalStatusById: jest.fn(),
  recipientsByUserId: jest.fn(),
  recipientLeadership: jest.fn(),
  allArUserIdsByRecipientAndRegion: jest.fn(),
}));

jest.mock('../../goalServices/goals', () => ({
  goalsByIdAndRecipient: jest.fn(),
}));

jest.mock('../../services/accessValidation');

const mockUserById = {
  id: 1000,
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

describe('getRecipientLeadership', () => {
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
    recipientById.mockResolvedValue({});
    getUserReadRegions.mockResolvedValue([1]);
    recipientLeadership.mockResolvedValue([]);
    await getRecipientLeadership(req, mockResponse);
    expect(mockResponse.json).toHaveBeenCalledWith([]);
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
    recipientLeadership.mockResolvedValue(null);
    await getRecipientLeadership(req, mockResponse);
    expect(mockResponse.sendStatus).toHaveBeenCalledWith(NOT_FOUND);
  });

  it('returns a 500 on error', async () => {
    const req = {
      session: {
        userId: 1000,
      },
    };
    recipientById.mockResolvedValue({});
    await getRecipientLeadership(req, mockResponse);
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
    await getRecipientLeadership(req, mockResponse);
    expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
  });
});

describe('getRecipientAndGrantsByUser', () => {
  it('retrieves a recipient and grants by user', async () => {
    const req = {
      session: {
        userId: 1000,
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

    currentUserId.mockResolvedValueOnce(1000);
    recipientsByUserId.mockResolvedValueOnce([{ id: 1, name: 'test' }]);

    await getRecipientAndGrantsByUser(req, mockResponse);

    expect(mockResponse.json).toHaveBeenCalledWith([{ id: 1, name: 'test' }]);
  });

  it('returns a 401 if there is no current user', async () => {
    const req = {
      session: {
        userId: 1000,
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

    currentUserId.mockResolvedValueOnce(null);

    await getRecipientAndGrantsByUser(req, mockResponse);

    expect(mockResponse.sendStatus).toHaveBeenCalledWith(UNAUTHORIZED);
  });

  it('returns a 500 on error', async () => {
    const req = {
      session: {
        userId: 1000,
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

    currentUserId.mockResolvedValueOnce(1000);
    recipientsByUserId.mockRejectedValueOnce(new Error('test error'));

    await getRecipientAndGrantsByUser(req, mockResponse);
    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
  });

  it('returns a 404 if there are no recipients', async () => {
    const req = {
      session: {
        userId: 1000,
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

    currentUserId.mockResolvedValueOnce(1000);
    recipientsByUserId.mockResolvedValueOnce(null);

    await getRecipientAndGrantsByUser(req, mockResponse);
    expect(mockResponse.sendStatus).toHaveBeenCalledWith(NOT_FOUND);
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

  describe('getMergeGoalPermissions', () => {
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

    afterEach(() => jest.clearAllMocks());

    it('returns true when user is on AR', async () => {
      const req = {
        params: {
          recipientId: 100000,
          regionId: 1,
        },
        session: {
          userId: 1000,
        },
      };
      currentUserId.mockResolvedValue(1000);
      userById.mockResolvedValue({
        id: 1000,
        roles: [
          {
            name: 'Small',
          },
        ],
        permissions: [],
      });
      recipientById.mockResolvedValue({ recipientWhere, grants: [] });
      allArUserIdsByRecipientAndRegion.mockResolvedValue([1000]);
      await getMergeGoalPermissions(req, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith({ canMergeGoalsForRecipient: true });
    });

    it('returns true when user is TTAC w regional permissions', async () => {
      const req = {
        params: {
          recipientId: 100000,
          regionId: 1,
        },
        session: {
          userId: 1000,
        },
      };
      currentUserId.mockResolvedValue(1000);
      userById.mockResolvedValue({
        id: 1000,
        roles: [
          {
            name: 'TTAC',
          },
        ],
        permissions: [{
          scopeId: SCOPES.READ_WRITE_REPORTS,
          regionId: 1,
        }],
      });
      recipientById.mockResolvedValue({ recipientWhere, grants: [{ regionId: 1 }] });
      allArUserIdsByRecipientAndRegion.mockResolvedValue([2000]);
      await getMergeGoalPermissions(req, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith({ canMergeGoalsForRecipient: true });
    });

    it('returns true when user is admin', async () => {
      const req = {
        params: {
          recipientId: 100000,
          regionId: 1,
        },
        session: {
          userId: 1000,
        },
      };
      currentUserId.mockResolvedValue(1000);
      userById.mockResolvedValue({
        id: 1000,
        roles: [
          {
            name: 'small',
          },
        ],
        permissions: [{
          scopeId: SCOPES.ADMIN,
          regionId: 1,
        }],
      });
      recipientById.mockResolvedValue({ recipientWhere, grants: [{ regionId: 1 }] });
      allArUserIdsByRecipientAndRegion.mockResolvedValue([2000]);
      await getMergeGoalPermissions(req, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith({ canMergeGoalsForRecipient: true });
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
      await getMergeGoalPermissions(req, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(NOT_FOUND);
    });
    it('returns a 401 when missing recipient param', async () => {
      const req = {
        params: {
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
      await getMergeGoalPermissions(req, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(BAD_REQUEST);
    });
    it('returns a 401 when missing region param', async () => {
      const req = {
        params: {
          recipientId: 1,
        },
        query: {
          'region.in': 1,
          modelType: 'grant',
        },
        session: {
          userId: 1000,
        },
      };
      await getMergeGoalPermissions(req, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(BAD_REQUEST);
    });
    it('returns a 500 on error', async () => {
      const req = {
        session: {
          userId: 1000,
        },
      };
      await getMergeGoalPermissions(req, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
    });
  });
});
