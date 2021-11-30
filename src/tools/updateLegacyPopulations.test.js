import faker from 'faker';
import updateLegacyPopulations from './updateLegacyPopulations';
import { createReport, destroyReport } from '../testUtils';

describe('updateLegacyPopulations', () => {
  const reports = [];
  beforeAll(() => {
    const populationData = [
      ['Infants/Toddlers', 'Preschool', 'Affected by Homelessness'],
      ['Infants and Toddlers (ages birth to 3)', 'Preschool', 'Affected by Homelessness'],
      ['Infants and Toddlers (ages birth to 3)', 'Preschool', 'Children Experiencing Homelessness'],
      ['Infants and Toddlers (ages birth to 3)'],
      ['Dual-Language Learners'],
      [],
    ];

    populationData.forEach(async (targetPopulations) => {
      const report = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
        targetPopulations,
      });

      reports.push(report);
    });
  });

  afterAll(async () => {
    await Promise.all(reports.map(async (report) => {
      await destroyReport(report);
    }));
  });

  it('updates legacy population data', async () => {
    const reportIds = reports.map((report) => report.id);
    await updateLegacyPopulations(reportIds);
  });
});
