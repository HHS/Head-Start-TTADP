import { QueryTypes } from 'sequelize';
import { sequelize } from '../models';
import { auditLogger } from '../logger';

const runSelectQuery = (query) => (
  sequelize.query(query, { type: QueryTypes.SELECT })
);

const countAndLastUpdated = async (tableName) => {
  const updatedAtQuery = `SELECT "updatedAt" FROM "${tableName}" ORDER BY "updatedAt" DESC LIMIT 1`;
  const [results] = await runSelectQuery(updatedAtQuery);
  let updatedAt = '';
  if (results) { updatedAt = results.updatedAt; }
  const countQuery = `SELECT count(*) FROM "${tableName}"`;
  const [{ count }] = await runSelectQuery(countQuery);
  return {
    updatedAt,
    count,
  };
};

const dataValidation = async () => {
  let query;
  let results;
  const tableNames = [
    'ActivityReports',
    'Files',
    'Goals',
    'Objectives',
    'NextSteps',
    'Recipients',
    'Grants',
    'Users',
  ];
  const tableChecks = tableNames.map(async (table) => {
    const { updatedAt, count } = await countAndLastUpdated(table);
    auditLogger.info(`${table} has ${count} records, last updated at: ${updatedAt}`);
  });
  await Promise.allSettled(tableChecks);

  query = 'SELECT "regionId", "status", count(*) FROM "Grants" GROUP BY "regionId", "status" ORDER BY "regionId", "status"';
  results = await runSelectQuery(query);
  auditLogger.info(`Grants data counts: ${JSON.stringify(results, null, 2)}`);

  query = 'SELECT "regionId", "submissionStatus", count(*) FROM "ActivityReports" GROUP BY "regionId", "submissionStatus" ORDER BY "regionId", "submissionStatus"';
  results = await runSelectQuery(query);
  auditLogger.info(`ActivityReports data counts: ${JSON.stringify(results, null, 2)}`);
};

export {
  runSelectQuery,
  countAndLastUpdated,
};
export default dataValidation;
