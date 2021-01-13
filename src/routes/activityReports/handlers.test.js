import db, {
  ActivityReport, ActivityParticipant, User, Permission, Grant, Grantee, NonGrantee,
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
      regionId: 1,
      scopeId: SCOPES.READ_WRITE_REPORTS,
    },
    {
      userId: 100,
      regionId: 2,
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
  beforeEach(async () => {
    await User.create(mockUser, { include: [{ model: Permission, as: 'permissions' }] });
  });

  afterEach(async () => {
    await ActivityParticipant.destroy({ where: {} });
    await ActivityReport.destroy({ where: {} });
    await User.destroy({ where: {} });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    db.sequelize.close();
  });

  describe('getApprovers', () => {
    const approverOne = {
      id: 50,
      name: 'region 1',
      permissions: [
        {
          userId: 50,
          regionId: 1,
          scopeId: SCOPES.APPROVE_REPORTS,
        },
      ],
    };
    const approverTwo = {
      id: 51,
      name: 'region 2',
      permissions: [
        {
          userId: 51,
          regionId: 2,
          scopeId: SCOPES.APPROVE_REPORTS,
        },
      ],
    };
    const approverThree = {
      id: 53,
      name: 'region 3',
      permissions: [
        {
          userId: 51,
          regionId: 3,
          scopeId: SCOPES.APPROVE_REPORTS,
        },
      ],
    };

    beforeEach(async () => {
      await User.create(approverOne, { include: [{ model: Permission, as: 'permissions' }] });
      await User.create(approverTwo, { include: [{ model: Permission, as: 'permissions' }] });
      await User.create(approverThree, { include: [{ model: Permission, as: 'permissions' }] });
    });

    afterEach(async () => {
      await User.destroy({ where: {} });
    });

    it("returns a list of users that have approving permissions on the user's regions", async () => {
      await getApprovers({ session: mockSession }, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith([{ id: 50, name: 'region 1' }, { id: 51, name: 'region 2' }]);
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
    afterAll(async () => {
      await Grant.destroy({ where: {} });
      await Grantee.destroy({ where: {} });
    });

    it('creates a new report', async () => {
      const grantee = await Grantee.create({ name: 'test' });
      const grant = await Grant.create({ number: 1, granteeId: grantee.id });
      const beginningARCount = await ActivityReport.count();
      const report = {
        participantType: 'grantee',
        activityParticipants: [{ participantId: grant.id }],
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
    afterEach(async () => {
      Grantee.destroy({ where: {} });
      Grant.destroy({ where: {} });
      NonGrantee.destroy({ where: {} });
    });

    it('retrieves grantees as well as nonGrantees', async () => {
      const grantee = await Grantee.create({ name: 'test' });
      const grant = await Grant.create({ number: 1, granteeId: grantee.id });
      const nonGrantee = await NonGrantee.create({ name: 'nonGrantee' });

      const expected = {
        grants: [{ participantId: grant.id, name: 'test - 1' }],
        nonGrantees: [{ participantId: nonGrantee.id, name: 'nonGrantee' }],
      };

      await getParticipants({ session: mockSession }, mockResponse);
      expect(mockResponse.json).toHaveBeenCalledWith(expected);
    });
  });
});
