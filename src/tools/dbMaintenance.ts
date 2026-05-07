import { auditLogger } from '../logger';
import { sequelize } from '../models';

const OLD_THRESHOLD = '3 years';

async function deleteOldRecords(): Promise<void> {
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

    const results = await Promise.allSettled(
      tableNames.map(async (table: any) => {
        const [queryResults] = await sequelize.query(
          `
            WITH deleted AS (
              DELETE FROM "${table}"
              WHERE "dml_timestamp" < NOW() - INTERVAL '${OLD_THRESHOLD}'
              RETURNING 1
            )
            SELECT COUNT(*) AS count FROM deleted;
          `
        );
        const count = Number(queryResults[0]?.count || 0);
        const [totalQueryResults] = await sequelize.query(
          `SELECT COUNT(*) AS count FROM "${table}";`
        );
        const totalCount = Number(totalQueryResults[0]?.count || 0);
        return { table, count, totalCount };
      })
    );

    let totalDeletedRecords = 0;
    results.forEach(
      (
        result: PromiseSettledResult<{ table: string; count: number; totalCount: number }>,
        index: string | number
      ) => {
        if (result.status === 'fulfilled') {
          auditLogger.info(
            `Table: ${result.value.table}, Total records: ${result.value.totalCount}, Deleted records older than ${OLD_THRESHOLD}: ${result.value.count}`
          );
          totalDeletedRecords += result.value.count;
        } else {
          const table = tableNames[index];
          const message =
            result.reason instanceof Error ? result.reason.message : String(result.reason);
          auditLogger.error(`Error querying table ${table}: ${message}`);
          process.exitCode = 1;
        }
      }
    );
    auditLogger.info(`Total deleted records older than ${OLD_THRESHOLD}: ${totalDeletedRecords}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    auditLogger.error(`Error running db maintenance: ${message}`);
    process.exitCode = 1;
  }
}

export default deleteOldRecords;
