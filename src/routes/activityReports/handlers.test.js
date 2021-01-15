import db, {
  ActivityReport, ActivityParticipant, User, Permission,
} from '../../models';
import {
  getApprovers, saveReport, createReport, getReport,
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
  participantType: 'grantee',
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
});
