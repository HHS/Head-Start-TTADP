import { readFileSync } from 'fs';
import importDuration from './importDuration';
import { downloadFile } from '../lib/s3';
import db, { ActivityReport } from '../models';
import { REPORT_STATUSES } from '../constants';

jest.mock('../lib/s3');

const reportObject = {
  activityRecipientType: 'recipient',
  regionId: 1,
  ECLKCResourcesUsed: ['test'],
  submissionStatus: REPORT_STATUSES.APPROVED,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
};

describe('update activity report duration', () => {
  beforeAll(async () => {
    try {
      downloadFile.mockReset();

      // Get CSV.
      const fileName = 'LegacyReportDurationsTest.csv';
      downloadFile.mockResolvedValue({ Body: readFileSync(fileName) });

      // Create Ar's to Update.
      await ActivityReport.create({ ...reportObject, id: 785462, legacyId: 'legacy report 1' });
      await ActivityReport.create({
        ...reportObject, id: 785463, legacyId: 'legacy report 2', duration: 10.5,
      });
      await ActivityReport.create({ ...reportObject, id: 785464, legacyId: 'legacy report 3' });

      await ActivityReport.create({ ...reportObject, id: 785465 });

      // Import duration file.
      await importDuration(fileName);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(`Unable to setup Import Duration test ${error}`);
    }
  });

  afterAll(async () => {
    // Cleanup Ar's.
    await ActivityReport.destroy({ where: { id: [785462, 785463, 785464, 785465] } });
    await db.sequelize.close();
  });

  it('verify Duration updates', async () => {
    const report1 = await ActivityReport.findOne({ where: { id: 785462 } });
    expect(Number(report1.duration)).toBe(6);
    const report2 = await ActivityReport.findOne({ where: { id: 785463 } });
    expect(Number(report2.duration)).toBe(10.5);
    const report3 = await ActivityReport.findOne({ where: { id: 785464 } });
    expect(Number(report3.duration)).toBe(3.5);

    const report4 = await ActivityReport.findOne({ where: { id: 785465 } });
    expect(Number(report4.duration)).toBe(0);
  });
});
