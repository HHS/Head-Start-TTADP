/* eslint-disable jest/no-conditional-expect */
import {
  ActivityReport,
  User,
  sequelize,
} from '../models';
import updateChildInvolvementTargetPopulation from './updateChildInvolvementTargetPopulation';
import { REPORT_STATUSES } from '../constants';

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

describe('updateChildInvolvementTargetPopulations', () => {
  let reportOne;
  let reportTwo;
  let reportThree;
  let reportFour;
  let reportFive;

  let reportIds;
  let user;

  beforeAll(async () => {
    user = await User.create({
      ...mockUser,
    });

    // Contains incorrect value.
    reportOne = await ActivityReport.create({
      ...sampleReport,
      userId: user.id,
      targetPopulations: [
        'Dual-Language Learners',
        'Infants and Toddlers (ages birth to 3)',
        'Affected by Child Welfare involvement',
        'Preschool (ages 3-5)',
      ],
    });

    // Contains corrected value.
    reportTwo = await ActivityReport.create({
      ...sampleReport,
      userId: user.id,
      targetPopulations: [
        'Dual-Language Learners',
        'Affected by Child Welfare Involvement',
      ],
    });

    // Contains no values.
    reportThree = await ActivityReport.create({
      ...sampleReport,
      userId: user.id,
      targetPopulations: [],
    });

    // Contains other values.
    reportFour = await ActivityReport.create({
      ...sampleReport,
      userId: user.id,
      targetPopulations: [
        'Children Experiencing Homelessness',
        'Children with Special Health Care Needs',
        'Preschool (ages 3-5)',
      ],
    });

    // Contains only bad value.
    reportFive = await ActivityReport.create({
      ...sampleReport,
      userId: user.id,
      targetPopulations: [
        'Affected by Child Welfare involvement',
      ],
    });

    reportIds = [reportOne.id, reportTwo.id, reportThree.id, reportFour.id, reportFive.id];
  });

  afterAll(async () => {
    await ActivityReport.destroy({ where: { id: reportIds } });
    await User.destroy({ where: { id: user.id } });
    await sequelize.close();
  });

  it('update bad child involvement target populations', async () => {
    await updateChildInvolvementTargetPopulation();

    const r1 = await ActivityReport.findOne({ where: { id: reportOne.id } });
    expect(r1.targetPopulations).toEqual(
      [
        'Dual-Language Learners',
        'Infants and Toddlers (ages birth to 3)',
        'Affected by Child Welfare Involvement',
        'Preschool (ages 3-5)',
      ],
    );

    const r2 = await ActivityReport.findOne({ where: { id: reportTwo.id } });
    expect(r2.targetPopulations).toEqual(
      [
        'Dual-Language Learners',
        'Affected by Child Welfare Involvement',
      ],
    );

    const r3 = await ActivityReport.findOne({ where: { id: reportThree.id } });
    expect(r3.targetPopulations).toEqual([]);

    const r4 = await ActivityReport.findOne({ where: { id: reportFour.id } });
    expect(r4.targetPopulations).toEqual(
      [
        'Children Experiencing Homelessness',
        'Children with Special Health Care Needs',
        'Preschool (ages 3-5)',
      ],
    );

    const r5 = await ActivityReport.findOne({ where: { id: reportFive.id } });
    expect(r5.targetPopulations).toEqual(
      [
        'Affected by Child Welfare Involvement',
      ],
    );
  });
});
