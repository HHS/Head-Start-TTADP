/* eslint-disable  @typescript-eslint/no-explicit-any */
const { sequelize, MaintenanceLog } = require('../../models');
const { MAINTENANCE_TYPE, MAINTENANCE_CATEGORY } = require('../../constants');
const { auditLogger } = require('../../logger');
const {
  maintenanceQueue,
  addQueueProcessor,
  enqueueMaintenanceJob,
  maintenanceCommand,
} = require('./common');

// const { MAINTENANCE_TYPE, MAINTENANCE_CATEGORY } = constants;
const numOfModels = Object.values(sequelize.models).length;

/**
 * Runs a maintenance command on the database table and logs the activity in the maintenance log.
 *
 * @param {string} command - The SQL command to be executed on the table.
 * @param {MAINTENANCE_CATEGORY[keyof typeof MAINTENANCE_CATEGORY]} category - The category of
 * maintenance activity being performed.
 * @param {MAINTENANCE_TYPE[keyof typeof MAINTENANCE_TYPE]} type - The type of
 * maintenance activity being performed.
 * @param {*} data - Additional data related to the maintenance activity.
 * @returns {Promise<bool>} A Promise that resolves to void.
 * @throws {Error} If an error occurs while running the maintenance command.
 */
const maintenanceDBCommand = async (
  command,
  category,
  type,
  data,
) => maintenanceCommand(
  async (logMessages, logBenchmarkData) => sequelize.query(command, {
    // Log all messages from the query to the logMessages array
    logging: (message, timingMs) => {
      logMessages.push(message);
      logBenchmarkData.push(timingMs);
    },
    // Enable benchmarking for the query
    benchmark: true,
  }),
  category,
  type,
  data,
);

/**
 * Executes a table maintenance command.
 * @async
 * @param {string} command - The command to be executed.
 * @param {typeof MAINTENANCE_CATEGORY[keyof typeof MAINTENANCE_CATEGORY]} category - The
 * category of database maintenance operation to be performed.
 * @param {typeof MAINTENANCE_TYPE[keyof typeof MAINTENANCE_TYPE]} type - The type of
 * database maintenance operation to be performed.
 * @param {any} model - The model representing the table to be maintained.
 * @returns {Promise<any>} A promise that resolves with the result of the maintenance operation.
 * @throws {Error} If an error occurs during the maintenance operation.
 */
const tableMaintenanceCommand = async (
  command, // The SQL command to execute
  // The type of maintenance command to run
  category,
  type,
  model, // The Sequelize model object for the table being maintained
) => {
  console.log({command, category, type, model});
  // Get the name of the table from the model
  const tableName = model.getTableName();

  // Execute the maintenance command with the table name and return the result
  return maintenanceDBCommand(`${command} "${tableName}";`, category, type, { table: tableName });
};

/**
 * Vacuums a table in the database.
 *
 * @async
 * @param {any} model - The model of the table to be vacuumed.
 * @returns {Promise<void>} - A promise that resolves when the table has been vacuumed successfully.
 * @throws {Error} - If there is an error during the table maintenance command execution.
 */
// This function vacuums a table in the database
const vacuumTable = async (model) => tableMaintenanceCommand(
  'VACUUM FULL',
  MAINTENANCE_CATEGORY.DB,
  MAINTENANCE_TYPE.VACUUM,
  model,
);

/**
 * Asynchronously reindexes a table in the database.
 *
 * @param model - The model of the table to be reindexed.
 * @returns A Promise that resolves with void when the reindexing is complete.
 * @throws {Error} If there is an issue with the database maintenance command.
 */
const reindexTable = async (model) => tableMaintenanceCommand(
  'REINDEX TABLE',
  MAINTENANCE_CATEGORY.DB,
  MAINTENANCE_TYPE.REINDEX,
  model,
);

/**
 * Asynchronously vacuums all tables in the database using Sequelize ORM.
 * @returns A promise that resolves to an array of any type, representing the result of vacuuming
 * each table.
 * @throws {Error} If there is an error while vacuuming a table.
 */
const vacuumTables = async (offset = 0, limit = numOfModels) => {
  const models = Object.values(sequelize.models)
    .sort((a, b) => a.getTableName().localeCompare(b.getTableName()))
    .slice(offset, offset + limit);

  return maintenanceCommand(
    async () => ({
      isSuccessful: (await Promise.all(models.map(async (model) => vacuumTable(model))))
        .every((p) => p === true),
    }),
    MAINTENANCE_CATEGORY.DB,
    MAINTENANCE_TYPE.VACUUM_TABLES,
    {
      offset,
      limit,
      models: models.map((m) => m.getTableName()),
    },
  );
};

/**
 * Asynchronously reindexes all tables in the database using Sequelize models.
 * @returns A promise that resolves to an array of any type.
 * @throws Throws an error if there is an issue with reindexing a table.
 */
const reindexTables = async (offset = 0, limit = numOfModels) => {
  const models = Object.values(sequelize.models)
    .sort((a, b) => a.getTableName().localeCompare(b.getTableName()))
    .slice(offset, offset + limit);

  return maintenanceCommand(
    async () => ({
      isSuccessful: (await Promise.all(models.map(async (model) => reindexTable(model))))
        .every((p) => p === true),
    }),
    MAINTENANCE_CATEGORY.DB,
    MAINTENANCE_TYPE.REINDEX_TABLES,
    {
      offset,
      limit,
      models: models.map((m) => m.getTableName()),
    },
  );
};

/**
 * Executes daily maintenance tasks asynchronously.
 * @returns A promise that resolves to an array of results from the executed maintenance tasks.
 * @throws {Error} If any of the maintenance tasks fail.
 */
const dailyMaintenance = async (offset = 0, limit = numOfModels) => maintenanceCommand(
  async () => {
    try {
      const vacuumTablesPromise = vacuumTables(offset, limit);
      await Promise.all([vacuumTablesPromise]); // Wait for all vacuumTables promises to resolve
      const reindexTablesPromise = reindexTables(offset, limit);
      const results = await Promise.all([vacuumTablesPromise, reindexTablesPromise]);

      return { isSuccessful: results.every((r) => r === true) };
    } catch (err) {
      return { isSuccessful: false, error: err };
    }
  },
  MAINTENANCE_CATEGORY.DB,
  MAINTENANCE_TYPE.DAILY_DB_MAINTENANCE,
  {
    offset,
    limit,
  },
);

const nextBlock = async (type, percent = null) => {
  const { offset = 0, limit = numOfModels } = await MaintenanceLog.findOne({
    where: {
      category: MAINTENANCE_CATEGORY.DB,
      type,
      isSuccessful: true,
    },
    order: [['id', 'DESC']],
    raw: true,
  });
  return {
    offset: offset + limit < numOfModels
      ? offset + limit
      : 0,
    limit: percent === null
      ? limit
      : Math.floor(numOfModels * percent),
  };
};

/**
 * Performs maintenance operations on a database based on the given job data.
 * @async
 * @param {Object} job - The job object containing the maintenance type and any additional data
 * required for the operation.
 * @param {string} job.type - The type of maintenance operation to perform.
 * @returns {Promise<any[]>} A promise that resolves with an array of results from the maintenance
 * operation.
 * @throws {Error} If an invalid DB maintenance type is provided.
 */
const dbMaintenance = async (job) => {
  const {
    type,
    offset = 0,
    limit = numOfModels,
    // ...data // pass to any maintenance operations that may have had additional data passed.
  } = job.data;

  let action;

  switch (type) {
    case MAINTENANCE_TYPE.VACUUM:
      action = vacuumTables(offset, limit);
      break;
    case MAINTENANCE_TYPE.REINDEX:
      action = reindexTables(offset, limit);
      break;
    case MAINTENANCE_TYPE.DAILY_DB_MAINTENANCE:
      action = dailyMaintenance(offset, limit);
      break;
    default:
      throw new Error(`Invalid DB maintenance type: ${type}`);
  }

  return action;
};

/**
 * Adds a queue processor for database maintenance tasks.
 */
addQueueProcessor(MAINTENANCE_CATEGORY.DB, dbMaintenance);

/**
 * Adds a job to the maintenance queue for database maintenance.
 * @param type - The type of database maintenance to perform.
 * @param data - Optional data to be included with the maintenance job.
 * @returns void
 * @throws {Error} If an error occurs while adding the job to the maintenance queue.
 */
const enqueueDBMaintenanceJob = async (
  type,
  data,
  percent = null,
) => enqueueMaintenanceJob(
  MAINTENANCE_CATEGORY.DB,
  {
    type,
    ...(!data
      ? await nextBlock(type, percent)
      : data),
  },
);

module.exports = {
  maintenanceCommand: maintenanceDBCommand,
  tableMaintenanceCommand,
  vacuumTable,
  reindexTable,
  vacuumTables,
  reindexTables,
  dailyMaintenance,
  dbMaintenance,
  enqueueDBMaintenanceJob,
};
