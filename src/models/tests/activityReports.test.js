import db, { User, ActivityReport } from '..';
import { REPORT_STATUSES } from '../../constants';
import { activityReportAndRecipientsById, createOrUpdate } from '../../services/activityReports';

describe('Activity Reports model', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });

  const mockUser = {
    name: 'Joe Green',
    role: ['TTAC'],
    phoneNumber: '555-555-554',
    hsesUserId: '49',
    hsesUsername: 'test49@test.com',
    hsesAuthorities: ['ROLE_FEDERAL'],
    email: 'test49@test.com',
    homeRegionId: 1,
    lastLogin: new Date('2021-02-09T15:13:00.000Z'),
    permissions: [
      {
        regionId: 1,
        scopeId: 1,
      },
      {
        regionId: 2,
        scopeId: 1,
      },
    ],
    flags: [],
  };

  const reportIds = [60, 61, 62];

  const sampleReport = {
    approval: {
      submissionStatus: REPORT_STATUSES.DRAFT,
      calculatedStatus: REPORT_STATUSES.DRAFT,
    },
    oldApprovingManagerId: 1,
    numberOfParticipants: 1,
    deliveryMethod: 'method',
    duration: 0,
    endDate: '2020-01-01T12:00:00Z',
    startDate: '2020-01-01T12:00:00Z',
    requester: 'requester',
    programTypes: ['type'],
    reason: ['reason'],
    topics: ['topics'],
    ttaType: ['type'],
    regionId: 1,
    targetPopulations: [],
    owner: {
      user: {
        fullName: 'Kiwi, GS',
        name: 'Kiwi',
        homeRegionId: 1,
      },
      roles: ['Grants Specialist'],
    },
  };

  describe('default scope', () => {
    let user;

    const reports = [
      {
        id: 60,
        creatorRole: 'TTAC',
      },
      {
        id: 61,
        creatorRole: null,
      },
      {
        id: 62,
        creatorRole: 'Early Childhood Manager',
      },
    ];

    beforeEach(async () => {
      user = await User.create(mockUser);

      await Promise.all(
        reports.map((r) => createOrUpdate({
          ...sampleReport,
          id: r.id,
          owner: { user: { name: 'abc 123' }, roles: [{ fullName: r.creatorRole }] },
        })),
      );
    });

    afterEach(async () => {
      await ActivityReport.destroy({
        where: { id: reportIds },
        individualHooks: true,
      });
      await User.destroy({
        where: { id: user.id },
        individualHooks: true,
      });
    });

    it('Properly generates creator with role', async () => {
      // Has both creator and role.
      let [foundReport] = await activityReportAndRecipientsById(60);
      expect(foundReport.creatorNameWithRole).toEqual('Joe Green, TTAC');
      expect(foundReport.creatorName).toEqual('Joe Green, TTAC');

      // Has only creator.
      [foundReport] = await activityReportAndRecipientsById(61);
      expect(foundReport.creatorNameWithRole).toEqual('Joe Green');
      expect(foundReport.creatorName).toEqual('Joe Green');

      // Properly converts role to acronym.
      [foundReport] = await activityReportAndRecipientsById(62);
      expect(foundReport.creatorNameWithRole).toEqual('Joe Green, ECM');
      expect(foundReport.creatorName).toEqual('Joe Green, ECM');
    });
  });
});
