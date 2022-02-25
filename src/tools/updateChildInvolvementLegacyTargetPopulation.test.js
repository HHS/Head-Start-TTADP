/* eslint-disable jest/no-conditional-expect */
import {
  ActivityReport,
  User,
  ActivityReportCollaborator,
  sequelize,
} from '../models';
import updateChildInvolvementLegacyTargetPopulation from './updateChildInvolvementLegacyTargetPopulation';
import { REPORT_STATUSES } from '../constants';
import { destroyReport } from '../testUtils';

const baseReport = {
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
  targetPopulations: ['Dual-Language Learners'],
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

describe('updateChildInvolvementLegacyTargetPopulation', () => {
  let reportOne;
  let reportTwo;
  let reportThree;
  let reportFour;

  let user;

  beforeAll(async () => {
    user = await User.create(mockUser);

    reportOne = await ActivityReport.create({
      ...baseReport,
      userId: user.id,
      imported: {
        tta: 'Technical Assistance 1',
        goal1: 'Goal 1',
        duration: '1',
        targetPopulations: 'Affected by Child Welfare involvement\nChildren Experiencing Homelessness\nPreschool (ages 3-5)',
      },
    });
    reportTwo = await ActivityReport.create({
      ...baseReport,
      userId: user.id,
      imported: {
        tta: 'Technical Assistance 2',
        goal1: 'Goal 2',
        duration: '2',
        targetPopulations: 'Children Experiencing Homelessness\nPreschool (ages 3-5)',
      },
    });
    reportThree = await ActivityReport.create({
      ...baseReport,
      userId: user.id,
      imported: {
        tta: 'Technical Assistance 3',
        goal1: 'Goal 3',
        duration: '3',
        targetPopulations: 'Children Experiencing Homelessness\nAffected by Child Welfare Involvement',
      },
    });
    reportFour = await ActivityReport.create({
      ...baseReport,
      userId: user.id,
      imported: {
        tta: 'Technical Assistance 4',
        goal1: 'Goal 4',
        duration: '4',
        targetPopulations: null,
      },
    });
  });

  afterAll(async () => {
    const reports = [
      reportOne, reportTwo, reportThree, reportFour,
    ];

    const reportIds = reports.map((r) => r.id);

    await ActivityReportCollaborator.destroy({
      where: {
        activityReportId: reportIds,
      },
    });

    await Promise.all(reports.map((r) => destroyReport(r)));

    await User.destroy({
      where: {
        id: user.id,
      },
    });

    await sequelize.close();
  });

  it('updates legacy imported target populations', async () => {
    await updateChildInvolvementLegacyTargetPopulation();

    const r1 = await ActivityReport.findOne({ where: { id: reportOne.id } });
    expect(r1.imported).toEqual(
      {
        tta: 'Technical Assistance 1',
        goal1: 'Goal 1',
        duration: '1',
        targetPopulations: 'Affected by Child Welfare Involvement\nChildren Experiencing Homelessness\nPreschool (ages 3-5)',
      },
    );

    const r2 = await ActivityReport.findOne({ where: { id: reportTwo.id } });
    expect(r2.imported).toEqual(
      {
        tta: 'Technical Assistance 2',
        goal1: 'Goal 2',
        duration: '2',
        targetPopulations: 'Children Experiencing Homelessness\nPreschool (ages 3-5)',
      },
    );

    const r3 = await ActivityReport.findOne({ where: { id: reportThree.id } });
    expect(r3.imported).toEqual(
      {
        tta: 'Technical Assistance 3',
        goal1: 'Goal 3',
        duration: '3',
        targetPopulations: 'Children Experiencing Homelessness\nAffected by Child Welfare Involvement',
      },
    );

    const r4 = await ActivityReport.findOne({ where: { id: reportFour.id } });
    expect(r4.imported).toEqual(
      {
        tta: 'Technical Assistance 4',
        goal1: 'Goal 4',
        duration: '4',
        targetPopulations: null,
      },
    );
  });
});
