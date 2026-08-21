import { v4 as uuidv4 } from 'uuid';
import { IMPORT_STATUSES } from '../../constants';
import { Import, ImportFile, sequelize } from '../../models';
import { getMonitoringImportCycle } from './monitoringImportCycle';

describe('getMonitoringImportCycle', () => {
  let monitoringImportId;
  let newerId;
  const createdIds = [];
  const newerDate = new Date('2026-08-01T00:00:00.000Z');

  const makeFile = (status, date) =>
    ImportFile.create({
      importId: monitoringImportId,
      status,
      ftpFileInfo: { name: `${uuidv4()}.zip`, date: date.toISOString() },
    });

  beforeAll(async () => {
    // Created by migration 20240228223541-monitoring-data.js
    const imp = await Import.findOne({ where: { name: 'ITAMS Monitoring Data' } });
    monitoringImportId = imp.id;
  });

  afterAll(async () => {
    await ImportFile.destroy({ where: { id: createdIds }, force: true });
    await sequelize.close();
  });

  it('returns the latest PROCESSED import file id and its source date', async () => {
    const older = await makeFile(IMPORT_STATUSES.PROCESSED, new Date('2026-07-01T00:00:00.000Z'));
    const newer = await makeFile(IMPORT_STATUSES.PROCESSED, newerDate);
    newerId = newer.id;
    createdIds.push(older.id, newer.id);

    const cycle = await getMonitoringImportCycle();
    expect(cycle.import_id).toBe(newer.id);
    expect(new Date(cycle.source_updated_at).toISOString()).toBe(newerDate.toISOString());
  });

  it('ignores import files that have not finished processing', async () => {
    // A newer-but-unprocessed file must not win over the PROCESSED one above.
    const collecting = await makeFile(
      IMPORT_STATUSES.COLLECTING,
      new Date('2027-01-01T00:00:00.000Z')
    );
    createdIds.push(collecting.id);

    const cycle = await getMonitoringImportCycle();
    expect(cycle.import_id).toBe(newerId);
  });
});
