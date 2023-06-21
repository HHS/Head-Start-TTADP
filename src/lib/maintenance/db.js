/* eslint-disable  @typescript-eslint/no-explicit-any */
const { sequelize, DBMaintenanceLog } = require('../../models');
const constants = require('../../constants');
const { auditLogger } = require('../../logger');
const db = require('../../models');

const { DB_MAINTENANCE_TYPE, MAINTENANCE_TYPE } = constants;

/**
 * Runs a maintenance command on the database table and logs the activity in the maintenance log.
 *
 * @param {string} command - The SQL command to be executed on the table.
 * @param {DB_MAINTENANCE_TYPE[keyof typeof DB_MAINTENANCE_TYPE]} type - The type of
 * maintenance activity being performed.
 * @param {*} data - Additional data related to the maintenance activity.
 * @returns {Promise<void>} A Promise that resolves to void.
 * @throws {Error} If an error occurs while running the maintenance command.
 */
const maintenanceCommand = async (
  command: string,
  type: typeof DB_MAINTENANCE_TYPE[keyof typeof DB_MAINTENANCE_TYPE],
  data: any,
): Promise<void> => {
  // Reset the log messages and benchmark data arrays for each operation
  const logMessages: any[] = [];
  const logBenchmarkData: any[] = [];

  // Create a maintenance log entry for this operation
  const log = await DBMaintenanceLog.create({ type, data });

  try {
    // Run the VACUUM FULL command on the table
    const result = await sequelize.query(command, {
      // Log all messages from the query to the logMessages array
      logging: (message) => {
        logMessages.push(message);
      },
      // Enable benchmarking for the query
      benchmark: true,
      // Log all benchmark data to the logBenchmarkData array
      benchmarkLogger: (benchmarkData) => {
        logBenchmarkData.push(benchmarkData);
      },
    });

    // Update the log entry to indicate that the maintenance activity has been completed.
    const updateResult = await DBMaintenanceLog.update(
      {
        data: {
          ...log.data,
          messages: logMessages,
          benchmarks: logBenchmarkData,
        },
        // Check if the log messages contain the word "successfully" to set isSuccessful accordingly
        isSuccessful: logMessages.some((message) => message.toLowerCase().includes('successfully')),
      },
      { where: { id: log.id } },
    );

    if (updateResult[0] === 1) {
      // Log successful update
    }
  } catch (err) {
    // Log error message
    auditLogger.error(`Error occurred while running maintenance command: ${err.message}`);

    // Update the log entry to indicate that the maintenance activity has been completed.
    await DBMaintenanceLog.update(
      {
        data: {
          ...log.data,
          messages: logMessages,
          benchmarks: logBenchmarkData,
        },
        isSuccessful: false,
      },
      { where: { id: log.id } },
    );
  }
};

/**
 * Executes a table maintenance command.
 * @async
 * @param {string} command - The command to be executed.
 * @param {typeof DB_MAINTENANCE_TYPE[keyof typeof DB_MAINTENANCE_TYPE]} type - The type of
 * database maintenance operation to be performed.
 * @param {any} model - The model representing the table to be maintained.
 * @returns {Promise<any>} A promise that resolves with the result of the maintenance operation.
 * @throws {Error} If an error occurs during the maintenance operation.
 */
const tableMaintenanceCommand = async (
  command: string, // The SQL command to execute
  // The type of maintenance command to run
  type: typeof DB_MAINTENANCE_TYPE[keyof typeof DB_MAINTENANCE_TYPE],
  model: any, // The Sequelize model object for the table being maintained
) => {
  // Get the name of the table from the model
  const tableName = model.getTableName();

  // Execute the maintenance command with the table name and return the result
  return maintenanceCommand(`${command} ${tableName};`, type, { table: tableName });
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
const vacuumTable = async (model: any): Promise<void> => tableMaintenanceCommand('VACUUM FULL', DB_MAINTENANCE_TYPE.VACUUM, model);

/**
 * Asynchronously reindexes a table in the database.
 *
 * @param model - The model of the table to be reindexed.
 * @returns A Promise that resolves with void when the reindexing is complete.
 * @throws {Error} If there is an issue with the database maintenance command.
 */
const reindexTable = async (model: any): Promise<void> => tableMaintenanceCommand('REINDEX TABLE', DB_MAINTENANCE_TYPE.REINDEX, model);

/**
 * Asynchronously vacuums all tables in the database using Sequelize ORM.
 * @returns A promise that resolves to an array of any type, representing the result of vacuuming
 * each table.
 * @throws {Error} If there is an error while vacuuming a table.
 */
const vacuumTables = async (): Promise<any[]> => Promise.all(
  db.sequelize.models.map(async (model: any) => vacuumTable(model)),
);

/**
 * Asynchronously reindexes all tables in the database using Sequelize models.
 * @returns A promise that resolves to an array of any type.
 * @throws Throws an error if there is an issue with reindexing a table.
 */
const reindexTables = async (): Promise<any[]> => Promise.all(
  db.sequelize.models.map(async (model: any) => reindexTable(model)),
);

/**
 * Executes daily maintenance tasks asynchronously.
 * @returns A promise that resolves to an array of results from the executed maintenance tasks.
 * @throws {Error} If any of the maintenance tasks fail.
 */
const dailyMaintenance = async (): Promise<any[]> => {
  const vacuumTablesPromise = vacuumTables();
  await Promise.all([vacuumTablesPromise]); // Wait for all vacuumTables promises to resolve
  const reindexTablesPromise = reindexTables();
  return Promise.all([vacuumTablesPromise, reindexTablesPromise]);
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
    // ...data // pass to any maintenance operations that may have had additional data passed.
  } = job.data;

  let action:Promise<any[]> = Promise.reject();

  switch (type) {
    case DB_MAINTENANCE_TYPE.VACUUM:
      action = vacuumTables();
      break;
    case DB_MAINTENANCE_TYPE.REINDEX:
      action = reindexTables();
      break;
    case DB_MAINTENANCE_TYPE.DAILY_MAINTENANCE:
      action = dailyMaintenance();
      break;
    default:
      throw new Error(`Invalid DB maintenance type: ${type}`);
  }

  return action;
};

/**
 * Processes a DB maintenance job from the given queue.
 * @param {Queue} queue - The queue to process the job from.
 * @returns {void}
 * @throws {Error} If the job processing fails.
 */
const processDBMaintenanceJob = (queue) => queue.process(MAINTENANCE_TYPE.DB, dbMaintenance);

/**
 * Adds a job to the maintenance queue for database maintenance.
 * @param type - The type of database maintenance to perform.
 * @param data - Optional data to be included with the maintenance job.
 * @returns void
 * @throws {Error} If an error occurs while adding the job to the maintenance queue.
 */
const queueDBMaintenance = (
  queue,
  type: typeof DB_MAINTENANCE_TYPE[keyof typeof DB_MAINTENANCE_TYPE],
  data: object | null = null,
) => {
  try {
    const jobData = {
      type,
      ...data,
    };
    queue.add(MAINTENANCE_TYPE.DB, jobData);
  } catch (err) {
    auditLogger.error(err);
  }
};

module.exports = {
  maintenanceCommand,
  tableMaintenanceCommand,
  vacuumTable,
  reindexTable,
  vacuumTables,
  reindexTables,
  dailyMaintenance,
  dbMaintenance,
  processDBMaintenanceJob,
  queueDBMaintenance,
};
