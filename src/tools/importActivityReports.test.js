import { readFileSync } from 'fs';
import importActivityReports from './importActivityReports';
import { downloadFile } from '../lib/s3';
import db, {
  ActivityReport,
  ActivityRecipient,
} from '../models';

jest.mock('../lib/s3');

describe('Import Activity Reports', () => {
  beforeEach(() => {
    downloadFile.mockReset();
  });
  afterAll(async () => {
    await ActivityReport.destro({ where: {} });
    await ActivityRecipient.destroy({ where: {} });
    await db.sequelize.close();
  });
  it('should import ActivityReports table', async () => {
    const fileName = 'R14ActivityReportsTest.csv';

    downloadFile.mockResolvedValue({ Body: readFileSync(fileName) });

    await ActivityReport.destroy({ where: {} });
    const reportsBefore = await ActivityReport.findAll();

    expect(reportsBefore.length).toBe(0);
    await importActivityReports(fileName, 14);

    const records = await ActivityReport.findAll({
      attributes: ['id', 'legacyId', 'requester'],
    });

    expect(records).toBeDefined();
    expect(records.length).toBe(10);

    expect(records).toContainEqual(
      expect.objectContaining({ id: expect.anything(), legacyId: 'R14-AR-000279', requester: 'Regional Office' }),
    );

    expect(records).toContainEqual(
      expect.objectContaining({ id: expect.anything(), legacyId: 'R14-AR-001132', requester: 'Grantee' }),
    );
  });
});
