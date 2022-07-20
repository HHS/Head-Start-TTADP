import { QueryTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { sequelize } from '../models';
import { auditLogger } from '../logger';

const loggedUser = '0';
const sessionSig = __filename;
const auditDescriptor = 'DB MAINTENANCE';
const transactionId = uuidv4();

let descriptorId;

const logJob = async (
  command,
  type,
  schema,
  identity,
  result,
) => sequelize.query(
  `INSERT INTO "ZALJobs"
  (
    "command_tag",
    "object_type",
    "schema_name",
    "object_identity",
    "exit_status",
    "timestamp",
    "by",
    "txid",
    "session_sig",
    "descriptor_id"
  )
  VALUES
  (
    '${command}',
    '${type}',
    '${schema}',
    '${identity}',
    '${result}',
    '${(new Date()).toISOString()}',
    ${loggedUser},
    '${transactionId}',
    '${sessionSig}',
    '${descriptorId}'
  );`,
);

const vacuumTables = async (tables) => Promise.all(tables.map(async (data) => {
  try {
    await sequelize.query(`VACUUM "${data.schemaname}"."${data.relname}";`, {
      type: QueryTypes.RAW,
      raw: true,
      rawErrors: true,
    });
  } catch (err) {
    await logJob('VACUUM', 'table', data.schemaname, data.relname, err.code);
    throw err;
  }
  return logJob('VACUUM', 'table', data.schemaname, data.relname, null);
}));

const reindexTables = async (tables) => Promise.all(tables.map(async (data) => {
  try {
    await sequelize.query(`REINDEX TABLE "${data.schemaname}"."${data.relname}";`, {
      type: QueryTypes.RAW,
      raw: true,
      rawErrors: true,
    });
  } catch (err) {
    await logJob('REINDEX', 'table', data.schemaname, data.relname, err.code);
    throw err;
  }
  return logJob('REINDEX', 'table', data.schemaname, data.relname, null);
}));

const dbMaintenance = async () => {
  const promises = [];
  try {
    const descriptor = await sequelize.query(
      `SELECT"ZAFDescriptorToID"(NULLIF(('${auditDescriptor}')::TEXT, '')) "descriptorId";`,
    );

    descriptorId = descriptor[0][0].descriptorId;

    const tables = await sequelize.query(
      `SELECT schemaname, relname
      FROM pg_stat_user_tables
      order by relname;`,
    );
    promises.push(await vacuumTables(tables[0]));
    promises.push(await reindexTables(tables[0]));
  } catch (err) {
    auditLogger.error(JSON.stringify(err));
    throw err;
  }
  return Promise.all(promises);
};

export {
  vacuumTables,
  reindexTables,
  dbMaintenance,
};
