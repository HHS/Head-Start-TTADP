import { auditLogger } from '../logger';
import { sequelize } from '../models';

const OLD_THRESHOLD = '3 years';

async function logOldRecordsCount() {
  try {
    // List of tables to check for old records
    const [tables] = await sequelize.query(`
      SELECT DISTINCT t.table_name
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

    const results = await Promise.allSettled(
      tables.map(async (table) => {
        const [queryResults] = await sequelize.query(
          `SELECT COUNT(*) AS count FROM "${table}" WHERE "dml_timestamp" < NOW() - INTERVAL '${OLD_THRESHOLD}';`,
        );
        const count = queryResults[0]?.count || 0;
        return { table, count };
      }),
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        auditLogger.info(
          `Table: ${result.value.table}, Records older than ${OLD_THRESHOLD}: ${result.value.count}`,
        );
      } else {
        const table = tables[index];
        const message = result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
        auditLogger.error(`Error querying table ${table}: ${message}`);
        process.exitCode = 1;
      }
    });
  } catch (e) {
    auditLogger.error(`Error running db maintenance: ${e.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  logOldRecordsCount()
    .then(() => sequelize.close())
    .then(() => {
      process.exit(process.exitCode || 0);
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      auditLogger.error(`Error running db maintenance: ${message}`);
      sequelize.close().finally(() => {
        process.exit(1);
      });
    });
}

export default logOldRecordsCount;
