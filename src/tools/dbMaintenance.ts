import { auditLogger } from '../logger';
import { sequelize } from '../models';

const OLD_THRESHOLD = '3 years';
const AUDIT_DESCRIPTOR = 'ARCHIVE AUDIT LOG';
const queryInterface = sequelize.getQueryInterface();
const quoteIdentifier = queryInterface.quoteIdentifier.bind(queryInterface);

interface DeleteOldRecordsResult {
  totalDeletedRecords: number;
  tablesProcessed: number;
}

async function deleteOldRecords(): Promise<DeleteOldRecordsResult> {
  try {
    const [tables] = await sequelize.query(`
      SELECT t.table_name
      FROM information_schema.tables t
      INNER JOIN information_schema.columns c
        ON c.table_schema = t.table_schema
        AND c.table_name = t.table_name
        AND c.column_name = 'dml_timestamp'
      WHERE t.table_schema = 'public'
        AND t.table_name LIKE 'ZAL%'
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
    `);
    const tableNames = tables.map((r: { table_name: any }) => r.table_name);

    let totalDeletedRecords = 0;
    const failures: string[] = [];

    for (const table of tableNames) {
      try {
        const quotedTable = quoteIdentifier(table);
        // Keep cleanup scoped to one audit table per transaction. These deletes can touch large
        // tables, so shorter transactions reduce lock duration and avoid keeping the database busy
        // across the full audit-log sweep. ZAL tables also have guard triggers that reject DELETEs
        // unless the session audit descriptor is ARCHIVE AUDIT LOG. The descriptor is set with
        // transaction-local set_config calls, so the setup query and DELETE must run on the same
        // transaction/connection for the trigger to see the archive context.
        const { count, tableSize } = await sequelize.transaction(async (transaction) => {
          await sequelize.query(
            `
              SELECT
                set_config('audit.loggedUser', '0', TRUE) AS "loggedUser",
                set_config('audit.transactionId', NULL, TRUE) AS "transactionId",
                set_config('audit.sessionSig', 'AuditLogCleanup' || NOW()::text, TRUE) AS "sessionSig",
                set_config('audit.auditDescriptor', '${AUDIT_DESCRIPTOR}', TRUE) AS "auditDescriptor";
            `,
            { transaction }
          );

          const [queryResults] = await sequelize.query(
            `
              WITH deleted AS (
                DELETE FROM ${quotedTable}
                WHERE "dml_timestamp" < NOW() - INTERVAL '${OLD_THRESHOLD}'
                RETURNING 1
              )
              SELECT COUNT(*) AS count FROM deleted;
            `,
            { transaction }
          );
          const deletedCount = Number(queryResults[0]?.count || 0);
          const tableRegclass = sequelize.escape(quotedTable);
          const [sizeQueryResults] = await sequelize.query(
            `SELECT pg_size_pretty(pg_total_relation_size(${tableRegclass})) AS "tableSize";`,
            { transaction }
          );

          return {
            count: deletedCount,
            tableSize: sizeQueryResults[0]?.tableSize || 'unknown',
          };
        });
        auditLogger.info(
          `Table: ${table}, Approx table size: ${tableSize}, Deleted records older than ${OLD_THRESHOLD}: ${count}`
        );
        totalDeletedRecords += count;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        auditLogger.error(
          `Error querying table ${table}`,
          error instanceof Error ? error : new Error(message)
        );
        failures.push(`${table}: ${message}`);
      }
    }

    auditLogger.info(`Total deleted records older than ${OLD_THRESHOLD}: ${totalDeletedRecords}`);

    if (failures.length) {
      throw new Error(
        `Failed to clean up ${failures.length} audit log tables: ${failures.join('; ')}`
      );
    }

    return {
      totalDeletedRecords,
      tablesProcessed: tableNames.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    auditLogger.error(
      'Error running db maintenance',
      error instanceof Error ? error : new Error(message)
    );
    throw error;
  }
}

export default deleteOldRecords;
