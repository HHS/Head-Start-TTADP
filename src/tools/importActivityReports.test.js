import { readFileSync } from 'fs';
import { Op } from 'sequelize';
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
  beforeAll(async () => {
  });
  afterAll(async () => {
    await ActivityRecipient.destroy({ where: {} });
    await ActivityReport.destroy({ where: {} });
    await db.sequelize.close();
  });
  it('should import ActivityReports table', async () => {
    const fileName = 'R14ActivityReportsTest.csv';

    downloadFile.mockResolvedValue({ Body: readFileSync(fileName) });
    const recordsBefore = await ActivityReport.findAll({
      attributes: ['id', 'legacyId', 'requester'],
      where: { legacyId: { [Op.ne]: null } },
    });

    await importActivityReports(fileName, 14);

    const records = await ActivityReport.findAll({
      attributes: ['id', 'legacyId', 'requester'],
      where: { legacyId: { [Op.ne]: null } },
    });
    expect(records).toBeDefined();
    expect(records.length).toBe(recordsBefore.length + 10);

    expect(records).toContainEqual(
      expect.objectContaining({ id: expect.anything(), legacyId: 'R14-AR-000279', requester: 'Regional Office' }),
    );

    expect(records).toContainEqual(
      expect.objectContaining({ id: expect.anything(), legacyId: 'R14-AR-001132', requester: 'Grantee' }),
    );
  });
});
