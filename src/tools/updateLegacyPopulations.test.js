import { Op } from 'sequelize';
import { ActivityReport, sequelize } from '../models';
import updateLegacyPopulations from './updateLegacyPopulations';
import { REPORT_STATUSES } from '../constants';

const dumbReport = {
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
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
  userId: 1,
  regionId: 1,
};

describe('updateLegacyPopulations', () => {
  let reports;

  beforeAll(async () => {
    const populationData = [
      ['Infant/Toddlers', 'Preschool', 'Affected by Homelessness'],
      ['Infants and Toddlers (ages birth to 3)', 'Preschool', 'Affected by Homelessness'],
      ['Infants and Toddlers (ages birth to 3)', 'Preschool', 'Children Experiencing Homelessness'],
      ['Infants and Toddlers (ages birth to 3)'],
      ['Dual-Language Learners'],
      [],
    ];

    reports = await Promise.all(
      populationData.map(
        async (targetPopulations) => ActivityReport.create({
          ...dumbReport,
          targetPopulations,
        }),
      ),
    );
  });

  afterAll(async () => {
    await ActivityReport.destroy({
      where: {
        id: reports.map((r) => r.id),
      },
    });

    await sequelize.close();
  });

  it('updates legacy population data', async () => {
    const reportIds = reports.map((report) => report.id);

    const where = {
      id: reportIds,
      targetPopulations: {
        [Op.or]: [
          {
            [Op.contains]: ['Infant/Toddlers'],
          },
          {
            [Op.contains]: ['Preschool'],
          },
          {
            [Op.contains]: ['Affected by Homelessness'],
          },
        ],
      },
    };

    const before = await ActivityReport.findAll({
      where,
    });

    expect(before.length).toBe(3);

    await updateLegacyPopulations();

    const after = await ActivityReport.findAll({
      where: {
        id: reportIds,
      },
    });

    expect(after.length).toBe(6);

    const populations = after.map((report) => report.targetPopulations);
    expect(populations).toEqual(expect.arrayContaining([['Infants and Toddlers (ages birth to 3)', 'Preschool (ages 3-5)', 'Children Experiencing Homelessness']]));
    expect(populations).toEqual(expect.arrayContaining([['Infants and Toddlers (ages birth to 3)']]));
    expect(populations).toEqual(expect.arrayContaining([['Dual-Language Learners']]));
    expect(populations).toEqual(expect.arrayContaining([[]]));

    const sanityCheck = await ActivityReport.findAll({ where });

    expect(sanityCheck.length).toBe(0);
  });
});
