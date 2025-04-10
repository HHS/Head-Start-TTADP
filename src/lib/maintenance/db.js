/* eslint-disable  @typescript-eslint/no-explicit-any */
const { CronJob } = require('cron');
const { sequelize, MaintenanceLog } = require('../../models');
const { MAINTENANCE_TYPE, MAINTENANCE_CATEGORY } = require('../../constants');
const {
  addQueueProcessor,
  enqueueMaintenanceJob,
  maintenanceCommand,
  registerCronEnrollmentFunction,
  addCronJob,
} = require('./common');
const { auditLogger } = require('../../logger');

const numOfModels = Object.values(sequelize.models).length;

/**
 * Executes a maintenance command on the database with logging and benchmarking.
 * @async
 * @function
 * @param {string} command - The SQL command to execute.
 * @param {string} category - The category of the command being executed.
 * @param {string} type - The type of the command being executed.
 * @param {Object} data - Additional data related to the command being executed.
 * @returns {Promise} - A promise that resolves when the command is executed.
 */
const maintenanceDBCommand = async (
  command,
  category,
  type,
  data,
  triggeredById,
) => maintenanceCommand(
  // Execute the given SQL command using Sequelize with logging and benchmarking.
  async (logMessages, logBenchmarkData) => sequelize.query(command, {
    logging: (message, timingMs) => {
      // Add each log message and benchmark data to their respective arrays.
      logMessages.push(message);
      logBenchmarkData.push(timingMs);
    },
    benchmark: true,
  }),
  category,
  type,
  data,
  triggeredById,
);

/**
 * Executes a maintenance command on a database table.
 * @async
 * @function
 * @param {string} command - The command to execute on the table.
 * @param {string} category - The category of the maintenance command.
 * @param {string} type - The type of the maintenance command.
 * @param {Object} model - The database model representing the table.
 * @returns {Promise} A promise that resolves with the result of the maintenance command.
 */
const tableMaintenanceCommand = async (
  command,
  category,
  type,
  model,
  triggeredById,
) => {
  // Get the name of the table from the model
  const tableName = model.getTableName();
  // Execute the maintenance command on the table using the maintenanceDBCommand function
  return maintenanceDBCommand(`${command} "${tableName}";`, category, type, { table: tableName }, triggeredById);
};

/**
 * This function performs a vacuum operation on a database table.
 * @async
 * @function
 * @param {string} model - The name of the database table to perform the vacuum operation on.
 * @returns {Promise<void>}
 */
const vacuumTable = async (model, triggeredById = null) => tableMaintenanceCommand(
  // Execute the tableMaintenanceCommand function with the 'VACUUM ANALYZE' command, maintenance
  // category DB, maintenance type VACUUM, and the provided model parameter.
  'VACUUM ANALYZE',
  MAINTENANCE_CATEGORY.DB,
  MAINTENANCE_TYPE.VACUUM_ANALYZE,
  model,
  triggeredById,
);

/**
 * Asynchronous function that reindexes a database table.
 * @param {string} model - The name of the database table to be reindexed.
 * @returns {Promise} A promise that resolves when the reindexing is complete.
 */
const reindexTable = async (model, triggeredById = null) => tableMaintenanceCommand(
  'REINDEX TABLE', // SQL command to reindex a table
  MAINTENANCE_CATEGORY.DB, // Maintenance category for database maintenance commands
  MAINTENANCE_TYPE.REINDEX, // Maintenance type for reindexing
  model, // Name of the table to be reindexed
  triggeredById,
);

/**
 * Asynchronous function calling a stored procedure that corrects onApprovedAR and onAR flags.
 * @returns {Promise} A promise that resolves when the stored procedure completes.
 */
const correctArFlags = async (triggeredById = null) => tableMaintenanceCommand(
  'SELECT correct_ar_flags()', // SQL command to reindex a table
  MAINTENANCE_CATEGORY.DB, // Maintenance category for database maintenance commands
  MAINTENANCE_TYPE.CORRECT_AR_FLAGS, // Maintenance type for reindexing
  triggeredById,
);

/**
 * This function vacuums all tables in the database using Sequelize ORM.
 * @param {number} offset - The starting index of the models to vacuum.
 * @param {number} limit - The number of models to vacuum.
 * @returns {Promise} - A promise that resolves to an object indicating whether the vacuuming was
 * successful or not.
 */
const vacuumTables = async (offset = 0, limit = numOfModels, triggeredById = null) => {
  // Get all models from Sequelize and sort them alphabetically by table name.
  const models = Object.values(sequelize.models)
    .sort((a, b) => a.getTableName().localeCompare(b.getTableName()))
    .slice(offset, offset + limit);

  // Call maintenanceCommand function with an async function that vacuums each model's table.
  return maintenanceCommand(
    async (logMessages, logBenchmarks, triggered) => ({
      isSuccessful: (await Promise.all(models.map(async (model) => vacuumTable(
        model,
        triggered,
      ))))
        .every((p) => p === true),
    }),
    MAINTENANCE_CATEGORY.DB,
    MAINTENANCE_TYPE.VACUUM_TABLES,
    {
      offset,
      limit,
      models: models.map((m) => m.getTableName()),
    },
    triggeredById,
  );
};

/**
 * This function reindexes tables in the database.
 * @param {number} offset - The starting index of the models to reindex.
 * @param {number} limit - The number of models to reindex.
 * @returns {Promise<object>} - A promise that resolves to an object with a boolean indicating
 * if the reindexing was successful.
 */
const reindexTables = async (offset = 0, limit = numOfModels, triggeredById = null) => {
  // Get all models from sequelize and sort them by table name.
  const models = Object.values(sequelize.models)
    .sort((a, b) => a.getTableName().localeCompare(b.getTableName()))
    .slice(offset, offset + limit);

  // Call maintenanceCommand with a callback function that reindexes each model's table.
  return maintenanceCommand(
    async (logMessages, logBenchmarks, triggered) => ({
      isSuccessful: (await Promise.all(models.map(async (model) => reindexTable(
        model,
        triggered,
      ))))
        .every((p) => p === true),
    }),
    MAINTENANCE_CATEGORY.DB,
    MAINTENANCE_TYPE.REINDEX_TABLES,
    {
      offset,
      limit,
      models: models.map((m) => m.getTableName()),
    },
    triggeredById,
  );
};

/**
 * This function performs daily maintenance on the database by vacuuming and reindexing tables.
 * @param {number} offset - The starting index of the tables to be maintained.
 * @param {number} limit - The maximum number of tables to be maintained.
 * @returns {Promise<{isSuccessful: boolean, error?: any}>} - A promise that resolves to an
 * object containing a boolean indicating whether the maintenance was successful and an optional
 * error if one occurred.
 */
const dailyMaintenance = async (offset = 0, limit = numOfModels) => maintenanceCommand(
  async (logMessages, logBenchmarks, triggeredById) => {
    try {
      // Vacuum tables to reclaim space and improve performance.
      const vacuumTablesPromise = vacuumTables(offset, limit, triggeredById);
      await Promise.all([vacuumTablesPromise]);
      // Reindex tables to optimize queries.
      const reindexTablesPromise = reindexTables(offset, limit, triggeredById);
      // Correct onApprovedAR and onAR flags for Goals and Objectives.
      const correctArFlagsPromise = correctArFlags(triggeredById);
      // Wait for all promises to resolve.
      const results = await Promise.all([vacuumTablesPromise, reindexTablesPromise, correctArFlagsPromise]);

      // Return an object indicating whether all promises resolved successfully.
      return { isSuccessful: results.every((r) => r === true) };
    } catch (err) {
      // If an error occurs, return an object with the error and a false isSuccessful flag.
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

/**
 * Returns an object with the offset and limit for the next block of data to be retrieved.
 * @async
 * @function
 * @param {string} type - The type of maintenance log to retrieve.
 * @param {number|null} percent - The percentage of total models to retrieve, or null to
 * retrieve the default limit.
 * @returns {Promise<{offset: number, limit: number}>} - An object containing the offset
 * and limit for the next block of data.
 */
const nextBlock = async (type, percent = null) => {
  // Find the latest successful maintenance log for the given type and category.
  const log = await MaintenanceLog.findOne({
    where: {
      category: MAINTENANCE_CATEGORY.DB,
      type,
      isSuccessful: true,
    },
    order: [['id', 'DESC']],
    raw: true,
  });

  const { offset = 0, limit = numOfModels } = log?.data ?? { offset: 0, limit: numOfModels };
  // Calculate the new offset based on the current offset and limit.
  // If the new offset exceeds the total number of models, reset it to 0.
  const newOffset = offset + limit < numOfModels
    ? offset + limit
    : 0;

  // Calculate the new limit based on the percentage of total models requested.
  // If no percentage is provided, use the default limit.
  const newLimit = percent === null
    ? limit
    : Math.floor(numOfModels * percent);

  return {
    offset: newOffset,
    limit: newLimit,
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
  // Destructure the job object to get the maintenance type, offset, limit, and any additional data.
  const {
    type,
    offset = 0,
    limit = numOfModels, // If limit is not provided, set it to the value of numOfModels.
    // ...data // pass to any maintenance operations that may have had additional data passed.
  } = job.data;

  let action; // Declare a variable to hold the maintenance action.

  switch (type) {
    case MAINTENANCE_TYPE.VACUUM_ANALYZE:
      // Set the action to vacuumTables function with the provided offset and limit.
      action = vacuumTables(offset, limit);
      break;
    case MAINTENANCE_TYPE.REINDEX:
      // Set the action to reindexTables function with the provided offset and limit.
      action = reindexTables(offset, limit);
      break;
    case MAINTENANCE_TYPE.DAILY_DB_MAINTENANCE:
      // Set the action to dailyMaintenance function with the provided offset and limit.
      action = dailyMaintenance(offset, limit);
      break;
    default:
      // Throw an error if an invalid maintenance type is provided.
      throw new Error(`Invalid DB maintenance type: ${type}`);
  }

  return action; // Return the maintenance action.
};

/**
 * Adds a job to the maintenance queue for database maintenance.
 * @param {string} type - The type of database maintenance to perform.
 * @param {*} data - Optional data to be included with the maintenance job.
 * @param {number} percent - Optional percentage value.
 * @returns {void}
 * @throws {Error} If an error occurs while adding the job to the maintenance queue.
 */
const enqueueDBMaintenanceJob = async (
  type,
  data,
  percent = null, // optional parameter with default value of null
) => enqueueMaintenanceJob({
  category: MAINTENANCE_CATEGORY.DB, // constant representing the category of maintenance
  data: {
    type, // shorthand property notation for type: type
    ...(!data // spread operator used to merge properties of two objects
      // if data is not provided, call nextBlock function and merge its result
      ? await nextBlock(type, percent)
      : data), // otherwise, merge the provided data object
  },
});

// This code adds a queue processor for database maintenance tasks.
// The MAINTENANCE_CATEGORY.DB is used to identify the category of maintenance task.
// The dbMaintenance function is passed as the callback function to be executed when
// a task in this category is processed.
addQueueProcessor(MAINTENANCE_CATEGORY.DB, dbMaintenance, false);

registerCronEnrollmentFunction(async (instanceId, contextId, env) => {
  if (env !== 'production') {
    auditLogger.log('info', `Skipping DB cron job enrollment in non-production environment (${env})`);
    return;
  }

  if (instanceId !== '0') {
    auditLogger.log('info', `Skipping DB cron job enrollment on instance ${instanceId} in environment ${env}`);
    return;
  }

  if (contextId !== 1) {
    auditLogger.log('info', `Skipping DB cron job enrollment on context ${contextId} in environment ${env} instance ${instanceId}`);
    return;
  }

  auditLogger.log('info', `Registering DB maintenance cron jobs for context ${contextId} in environment ${env} instance ${instanceId}`);

  // Adds a cron job with the specified maintenance category, type, and function to execute
  addCronJob(
    MAINTENANCE_CATEGORY.DB, // The maintenance category is "DB"
    MAINTENANCE_TYPE.DAILY_DB_MAINTENANCE, // The maintenance type is "DAILY_DB_MAINTENANCE"
    // The function to execute takes in the category, type, timezone, and schedule parameters
    (category, type, timezone, schedule) => new CronJob(
      schedule, // The schedule parameter specifies when the job should run
      () => enqueueDBMaintenanceJob( // Enqueues a database maintenance job
        MAINTENANCE_TYPE.DAILY_DB_MAINTENANCE, // The maintenance type is "DAILY_DB_MAINTENANCE"
        null, // no extra data passed
        0.2, // Only 20% of the tables will be maintained each day
      ),
      null,
      true,
      timezone, // The timezone parameter specifies the timezone in which the job should run
    ),
    /**
     * This cron expression breaks down as follows:
     *  0 - The minute when the job will run (in this case, 0 minutes past the hour)
     *  23 - The hour when the job will run (in this case, 11 pm)
     *  * - The day of the month when the job will run (in this case, any day of the month)
     *  * - The month when the job will run (in this case, any month)
     *  * - The day of the week when the job will run (in this case, any day of the week)
     * */
    '0 23 * * *',
  );
});

module.exports = {
  nextBlock,
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
