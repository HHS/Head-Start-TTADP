/* eslint-disable jest/no-conditional-expect */
import {
  ActivityReport,
  User,
  sequelize,
} from '../models';
import updateCreatorRoles from './updateCreatorRoles';
import { REPORT_STATUSES } from '../constants';
import { CREATOR_ROLES_REPORTS_TEST_UPDATE } from './creatorRolesToUpdate';

const sampleReport = {
  submissionStatus: REPORT_STATUSES.SUBMITTED,
  calculatedStatus: REPORT_STATUSES.APPROVED,
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
};

const mockUser = {
  name: 'Joe Green',
  role: null,
  phoneNumber: '555-555-554',
  hsesUserId: '49',
  hsesUsername: 'test49@test.com',
  hsesAuthorities: ['ROLE_FEDERAL'],
  email: 'test49@test.com',
  homeRegionId: 1,
  lastLogin: new Date('2021-02-09T15:13:00.000Z'),
  permissions: [
    {
      userId: 49,
      regionId: 1,
      scopeId: 1,
    },
    {
      userId: 49,
      regionId: 2,
      scopeId: 1,
    },
  ],
  flags: [],
};

describe('updateCreatorRole', () => {
  let reportOne;
  let reportTwo;
  let reportThree;
  let reportFour;
  let reportFive;
  let reportSix;
  let reportSeven;
  let reportEight;

  let reportIds;
  let user;

  beforeAll(async () => {
    user = await User.create({
      ...mockUser,
    });

    // Update by Id.
    reportOne = await ActivityReport.create({
      ...sampleReport,
      id: 5452,
      userId: user.id,
    });

    // Update by Legacy Id.
    reportTwo = await ActivityReport.create({
      ...sampleReport,
      legacyId: 'R01-AR-000001',
      userId: user.id,
    });

    // Don't Update by Id value already set.
    reportThree = await ActivityReport.create({
      ...sampleReport,
      id: 5453,
      userId: user.id,
      creatorRole: 'Family Engagement Specialist',
    });

    // Don't Update by Legacy Id value already set.
    reportFour = await ActivityReport.create({
      ...sampleReport,
      legacyId: 'R01-AR-000002',
      userId: user.id,
      creatorRole: 'System Specialist',
    });

    // Reports not in file are preserved.
    reportFive = await ActivityReport.create({
      ...sampleReport,
      id: 5454,
      userId: user.id,
      creatorRole: 'Health Specialist',
    });

    reportSix = await ActivityReport.create({
      ...sampleReport,
      legacyId: 'R01-AR-000003',
      userId: user.id,
      creatorRole: 'Early Childhood Specialist',
    });

    reportSeven = await ActivityReport.create({
      ...sampleReport,
      id: 5455,
      userId: user.id,
    });

    // Update by Id.
    reportEight = await ActivityReport.create({
      ...sampleReport,
      id: 5456,
      userId: user.id,
    });

    reportIds = [
      reportOne.id,
      reportTwo.id,
      reportThree.id,
      reportFour.id,
      reportFive.id,
      reportSix.id,
      reportSeven.id,
      reportEight.id,
    ];
  });

  afterAll(async () => {
    await ActivityReport.destroy({ where: { id: reportIds } });
    await User.destroy({ where: { id: user.id } });
    await sequelize.close();
  });

  it('update creator role', async () => {
    await updateCreatorRoles(CREATOR_ROLES_REPORTS_TEST_UPDATE);

    // Updates by Id.
    const r1 = await ActivityReport.findOne({ where: { id: reportOne.id } });
    expect(r1.creatorRole).toEqual('Early Childhood Specialist');

    // Updates by Legacy Id.
    const r2 = await ActivityReport.findOne({ where: { id: reportTwo.id } });
    expect(r2.creatorRole).toEqual('Grantee Specialist');

    // Doesn't update by Id if Creator Role already set.
    const r3 = await ActivityReport.findOne({ where: { id: reportThree.id } });
    expect(r3.creatorRole).toEqual('Family Engagement Specialist');

    // Doesn't update by Legacy Id if Creator Role already set.
    const r4 = await ActivityReport.findOne({ where: { id: reportFour.id } });
    expect(r4.creatorRole).toEqual('System Specialist');

    // Reports not in file are preserved.
    const r5 = await ActivityReport.findOne({ where: { id: reportFive.id } });
    expect(r5.creatorRole).toEqual('Health Specialist');

    const r6 = await ActivityReport.findOne({ where: { id: reportSix.id } });
    expect(r6.creatorRole).toEqual('Early Childhood Specialist');

    const r7 = await ActivityReport.findOne({ where: { id: reportSeven.id } });
    expect(r7.creatorRole).toBeNull();

    // Update by Id to test count.
    const r8 = await ActivityReport.findOne({ where: { id: reportEight.id } });
    expect(r8.creatorRole).toEqual('Early Childhood Specialist');
  });
});
