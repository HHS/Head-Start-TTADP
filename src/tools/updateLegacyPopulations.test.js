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
      [],
    ];

    const imported = [
      null,
      null,
      null,
      null,
      null,
      {
        targetPopulations: 'Infant/Toddlers\nPregnant Women\nPreschool',
      },
      {
        targetPopulations: 'Infants and Toddlers (ages birth to 3)\nPregnant Women\nPreschool (ages 3-5)',
      },
    ];

    reports = await Promise.all(
      populationData.map(
        async (targetPopulations, index) => ActivityReport.create({
          ...dumbReport,
          targetPopulations,
          imported: imported[index],
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
      [Op.or]: [
        {
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
        },
        {
          imported: {
            targetPopulations: {
              [Op.or]: [
                {
                  [Op.iLike]: '%Infant/Toddlers%',
                },
                {
                  [Op.iLike]: '%Preschool%',
                },
                {
                  [Op.iLike]: '%Affected by Homelessness%',
                },
              ],
            },
          },
        },
      ],
    };

    const before = await ActivityReport.findAll({
      where,
    });

    expect(before.length).toBe(5);

    await updateLegacyPopulations(reportIds);

    const after = await ActivityReport.findAll({
      where: {
        id: reportIds,
      },
    });

    expect(after.length).toBe(7);

    const populations = after.map((report) => report.targetPopulations);
    expect(populations).toEqual(expect.arrayContaining([['Infants and Toddlers (ages birth to 3)', 'Preschool (ages 3-5)', 'Children Experiencing Homelessness']]));
    expect(populations).toEqual(expect.arrayContaining([['Infants and Toddlers (ages birth to 3)']]));
    expect(populations).toEqual(expect.arrayContaining([['Dual-Language Learners']]));
    expect(populations).toEqual(expect.arrayContaining([[]]));

    const imported = after.map((report) => report.imported);
    expect(imported).toEqual(expect.arrayContaining([null]));
    expect(imported).toEqual(expect.arrayContaining([{ targetPopulations: 'Infants and Toddlers (ages birth to 3)\nPregnant Women\nPreschool (ages 3-5)' }]));

    const sanityCheck = await ActivityReport.findAll({ where });

    expect(sanityCheck.length).toBe(2);
    const sanityCheckImported = sanityCheck.map((report) => report.imported);
    expect(sanityCheckImported).toEqual(
      expect.arrayContaining([{
        targetPopulations: 'Infants and Toddlers (ages birth to 3)\nPregnant Women\nPreschool (ages 3-5)',
      }]),
    );
    expect(sanityCheckImported).not.toEqual(
      expect.arrayContaining([{
        targetPopulations: 'Infant/Toddlers\nPregnant Women\nPreschool',
      }]),
    );
  });
});
