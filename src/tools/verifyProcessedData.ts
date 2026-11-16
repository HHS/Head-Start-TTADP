import { QueryTypes } from 'sequelize';
import { auditLogger } from '../logger';
import { sequelize } from '../models';
import { hsesUsers, KEPT_AUDIT_TABLES } from './processData';

export interface ProcessedDataCounts {
  // Users whose email was not replaced with a no-send_ address or a bootstrapped HSES test user
  unanonymizedUsers: number;
  // Audit (ZAL) tables that still hold rows; they carry pre-anonymization row data
  nonEmptyAuditTables: number;
  requestErrors: number;
}

export class ProcessedDataVerificationError extends Error {
  constructor(counts: ProcessedDataCounts) {
    super(`Processed data verification failed: ${JSON.stringify(counts)}`);
    this.name = 'ProcessedDataVerificationError';
  }
}

const countUnanonymizedUsers = async (): Promise<number> => {
  const [{ count }] = await sequelize.query<{ count: number }>(
    /* sql */ `
    SELECT COUNT(*)::int AS count
    FROM "Users"
    WHERE email IS NOT NULL
      AND email NOT LIKE 'no-send!_%' ESCAPE '!'
      AND LOWER(TRIM(email)) NOT IN (:hsesEmails)
  `,
    {
      type: QueryTypes.SELECT,
      replacements: { hsesEmails: hsesUsers.map(({ email }) => email.toLowerCase()) },
    }
  );
  return count;
};

export const countNonEmptyAuditTables = async (): Promise<number> => {
  // Alias the column: Sequelize's Postgres dialect special-cases any SQL that starts with
  // "SELECT table_name FROM information_schema.tables" and returns each row as an array of values,
  // ignoring the query type, which would leave tableName undefined below
  const tables = await sequelize.query<{ tableName: string }>(
    /* sql */ `
    SELECT table_name AS "tableName" FROM information_schema.tables
    WHERE
      table_name like 'ZAL%' AND
      table_name not in (:keptAuditTables)
  `,
    { type: QueryTypes.SELECT, replacements: { keptAuditTables: KEPT_AUDIT_TABLES } }
  );

  let nonEmpty = 0;
  for (const { tableName } of tables) {
    const [{ hasRows }] = await sequelize.query<{ hasRows: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM "${tableName.replace(/"/g, '""')}") AS "hasRows"`,
      { type: QueryTypes.SELECT }
    );
    if (hasRows) {
      nonEmpty += 1;
    }
  }
  return nonEmpty;
};

const countRequestErrors = async (): Promise<number> => {
  const [{ count }] = await sequelize.query<{ count: number }>(
    'SELECT COUNT(*)::int AS count FROM "RequestErrors"',
    { type: QueryTypes.SELECT }
  );
  return count;
};

/**
 * Gate run after processData, before the processed database is backed up for lower
 * environments. Checks markers that processData always leaves behind and throws if any are
 * missing, so the nightly job fails (and the raw copy is cleared) instead of shipping data that
 * was not anonymized. Only counts are logged or thrown, never row values.
 */
const verifyProcessedData = async (): Promise<ProcessedDataCounts> => {
  const counts: ProcessedDataCounts = {
    unanonymizedUsers: await countUnanonymizedUsers(),
    nonEmptyAuditTables: await countNonEmptyAuditTables(),
    requestErrors: await countRequestErrors(),
  };

  auditLogger.info(`verifyProcessedData counts: ${JSON.stringify(counts)}`);

  if (Object.values(counts).some((count) => count !== 0)) {
    throw new ProcessedDataVerificationError(counts);
  }

  return counts;
};

export default verifyProcessedData;
