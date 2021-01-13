import db, {
  ActivityReport, ActivityParticipant, User, Permission,
} from '../../models';
import {
  getApprovers, saveReport, createReport, getReport, getParticipants,
} from './handlers';

import SCOPES from '../../middleware/scopeConstants';

const mockUser = {
  id: 100,
  homeRegionId: 1,
  permissions: [
    {
      userId: 100,
      regionId: 5,
      scopeId: SCOPES.READ_WRITE_REPORTS,
    },
    {
      userId: 100,
      regionId: 6,
      scopeId: SCOPES.READ_WRITE_REPORTS,
    },
  ],
};

const mockSession = jest.fn();
mockSession.userId = mockUser.id;

const mockResponse = {
  json: jest.fn(),
  sendStatus: jest.fn(),
  status: jest.fn(() => ({
    end: jest.fn(),
  })),
};

const reportObject = {
  participantType: 'gratnee',
  status: 'draft',
  userId: mockUser.id,
  lastUpdatedById: mockUser.id,
  resourcesUsed: 'test',
};

describe('Activity Report handlers', () => {
  let user;

  beforeAll(async () => {
    user = await User.create(mockUser, { include: [{ model: Permission, as: 'permissions' }] });
  });

  afterAll(async () => {
    await ActivityParticipant.destroy({ where: {} });
    await ActivityReport.destroy({ where: {} });
    await User.destroy({ where: { id: user.id } });
    db.sequelize.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getApprovers', () => {
    const approverOne = {
      id: 50,
      name: 'region 5',
      permissions: [
        {
          userId: 50,
          regionId: 5,
          scopeId: SCOPES.APPROVE_REPORTS,
        },
      ],
    };
    const approverTwo = {
      id: 51,
      name: 'region 6',
      permissions: [
        {
          userId: 51,
          regionId: 6,
          scopeId: SCOPES.APPROVE_REPORTS,
        },
      ],
    };

    const approvers = [
      {
        id: 50,
        name: 'region 5',
      },
      {
        id: 51,
        name: 'region 6',
      },
    ];

    beforeEach(async () => {
      await User.create(approverOne, { include: [{ model: Permission, as: 'permissions' }] });
      await User.create(approverTwo, { include: [{ model: Permission, as: 'permissions' }] });
    });

    afterEach(async () => {
      await User.destroy({ where: { id: [50, 51] } });
    });

    it("returns a list of users that have approving permissions on the user's regions", async () => {
      await getApprovers({ session: mockSession }, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(approvers);
    });
  });

  describe('saveReport', () => {
    it('updates an already saved report', async () => {
      const res = await ActivityReport.create(reportObject);
      const request = {
        session: mockSession,
        params: { activityReportId: res.dataValues.id },
        body: {
          resourcesUsed: 'updated',
        },
      };
      const expected = {
        id: res.dataValues.id,
        ...reportObject,
        resourcesUsed: 'updated',
      };

      await saveReport(request, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining(expected));
    });

    it('handles reports that are not found', async () => {
      const request = {
        session: mockSession,
        params: { activityReportId: 1000 },
        body: {},
      };
      await saveReport(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
    });

    it('handles empty requests', async () => {
      const request = {
        session: mockSession,
        params: { activityReportId: 1000 },
      };
      await saveReport(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('createReport', () => {
    it('creates a new report', async () => {
      const beginningARCount = await ActivityReport.count();
      const report = {
        participantType: 'grantee',
        activityParticipants: [{ participantId: 1 }],
      };
      const request = {
        body: report,
        session: mockSession,
      };

      await createReport(request, mockResponse);
      const endARCount = await ActivityReport.count();
      expect(endARCount - beginningARCount).toBe(1);
    });

    it('handles empty requests', async () => {
      const request = {
        session: mockSession,
      };
      await createReport(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getReport', () => {
    it('sends a previously saved activity report', async () => {
      const res = await ActivityReport.create(reportObject);
      const request = {
        session: mockSession,
        params: { activityReportId: res.dataValues.id },
      };
      const expected = {
        id: res.dataValues.id,
        ...reportObject,
      };

      await getReport(request, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining(expected));
    });

    it('handles reports that are not found', async () => {
      const request = {
        session: mockSession,
        params: { activityReportId: 1000 },
      };
      await getReport(request, mockResponse);
      expect(mockResponse.sendStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('getParticipants', () => {
    const expectedNonGrantees = [
      {
        name: 'CCDF / Child Care Administrator',
        participantId: 1,
      },
      {
        name: 'Head Start Collaboration Office',
        participantId: 2,
      },
      {
        name: 'QRIS System',
        participantId: 3,
      },
      {
        name: 'Regional Head Start Association',
        participantId: 4,
      },
      {
        name: 'Regional TTA/Other Specialists',
        participantId: 5,
      },
      {
        name: 'State CCR&R',
        participantId: 6,
      },
      {
        name: 'State Early Learning Standards',
        participantId: 7,
      },
      {
        name: 'State Education System',
        participantId: 8,
      },
      {
        name: 'State Health System',
        participantId: 9,
      },
      {
        name: 'State Head Start Association',
        participantId: 10,
      },
      {
        name: 'State Professional Development / Continuing Education',
        participantId: 11,
      },
    ];

    const expectedGrants = [
      {
        participantId: 1,
        name: 'Grantee Name - 14CH1234',
      },
      {
        participantId: 2,
        name: 'Stroman, Cronin and Boehm - 14CH10000',
      },
      {
        participantId: 3,
        name: 'Jakubowski-Keebler - 14CH00001',
      },
      {
        participantId: 4,
        name: 'Johnston-Romaguera - 14CH00002',
      },
      {
        participantId: 5,
        name: 'Johnston-Romaguera - 14CH00003',
      },
      {
        participantId: 6,
        name: 'Agency 1, Inc. - 09CH011111',
      },
      {
        participantId: 7,
        name: 'Agency 2, Inc. - 09CH022222',
      },
      {
        participantId: 8,
        name: 'Agency 3, Inc. - 09CH033333',
      },
      {
        participantId: 9,
        name: 'Agency 4, Inc. - 09HP044444',
      },
    ];

    it('retrieves grantees as well as nonGrantees', async () => {
      const expected = {
        grants: expectedGrants,
        nonGrantees: expectedNonGrantees,
      };

      await getParticipants({ session: mockSession }, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining(expected));
    });
  });
});
