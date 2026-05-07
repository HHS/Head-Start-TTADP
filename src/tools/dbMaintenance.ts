import { auditLogger } from '../logger';
import { sequelize } from '../models';

const OLD_THRESHOLD = '3 years';
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
        const [queryResults] = await sequelize.query(
          `
            WITH deleted AS (
              DELETE FROM ${quotedTable}
              WHERE "dml_timestamp" < NOW() - INTERVAL '${OLD_THRESHOLD}'
              RETURNING 1
            )
            SELECT COUNT(*) AS count FROM deleted;
          `
        );
        const count = Number(queryResults[0]?.count || 0);
        const [totalQueryResults] = await sequelize.query(
          `SELECT COUNT(*) AS count FROM ${quotedTable};`
        );
        const totalCount = Number(totalQueryResults[0]?.count || 0);
        auditLogger.info(
          `Table: ${table}, Total records: ${totalCount}, Deleted records older than ${OLD_THRESHOLD}: ${count}`
        );
        totalDeletedRecords += count;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        auditLogger.error(`Error querying table ${table}: ${message}`);
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
    auditLogger.error(`Error running db maintenance: ${message}`);
    throw error;
  }
}

export default deleteOldRecords;
