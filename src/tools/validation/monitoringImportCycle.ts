import { QueryTypes } from 'sequelize';
import { IMPORT_STATUSES } from '../../constants';
import { sequelize } from '../../models';

// The Imports row for the ITAMS monitoring feed (created by migration
// 20240228223541-monitoring-data.js).
const MONITORING_IMPORT_NAME = 'ITAMS Monitoring Data';

export interface MonitoringImportCycle {
  import_id: number | null;
  source_updated_at: Date | null;
}

/**
 * Resolve the current monitoring import "cycle": the most recently PROCESSED
 * ImportFile for the ITAMS monitoring import, as its id plus the source data date
 * from the zip filename (ftpFileInfo.date, what the import writes to
 * sourceUpdatedAt). Returns nulls when no processed import exists. See
 * docs/monitoring-data-validation.md.
 */
export const getMonitoringImportCycle = async (): Promise<MonitoringImportCycle> => {
  const rows = await sequelize.query<{ import_id: number; source_updated_at: Date | null }>(
    `
    SELECT
      imf.id AS import_id,
      NULLIF(imf."ftpFileInfo"->>'date', '')::timestamptz AS source_updated_at
    FROM "ImportFiles" imf
    JOIN "Imports" i ON i.id = imf."importId"
    WHERE i.name = :name
      AND imf.status = :processed
    ORDER BY imf.id DESC
    LIMIT 1
    ;
    `,
    {
      type: QueryTypes.SELECT,
      replacements: { name: MONITORING_IMPORT_NAME, processed: IMPORT_STATUSES.PROCESSED },
    }
  );

  const row = rows[0];
  return {
    import_id: row?.import_id ?? null,
    source_updated_at: row?.source_updated_at ?? null,
  };
};

export default getMonitoringImportCycle;
