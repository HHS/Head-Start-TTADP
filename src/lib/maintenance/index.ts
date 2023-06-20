const newQueue = require('../queue');
const { auditLogger, logger } = require('../../logger');
const { dbMaintenance } = require('./db');
const constants = require('../../constants');

const { DB_MAINTENANCE_TYPE, MAINTENANCE_TYPE } = constants;
const maintenanceQueue = newQueue('maintenance');

/**
 * Logs an error message to the audit logger when a maintenance job fails.
 * @param job - The maintenance job that failed.
 * @param error - The error that caused the failure.
 * @returns void
 * @throws This function does not throw any exceptions or errors.
 */
const onFailedMaintenance = (job, error) => auditLogger
  .error(`job ${job.name} failed for report ${job.data.type} with error ${error}`);

/**
 * Handles the completion of a maintenance job.
 * @param {object} job - The maintenance job that was completed.
 * @param {any} result - The result of the completed job.
 * @returns {void}
 * @throws This function does not throw any exceptions or errors.
 */
const onCompletedMaintenance = (job, result) => {
  if (result != null) {
    logger.info(`Successfully performed ${job.name} maintenance for ${job.data.type}`);
  } else {
    logger.info(`Failed to perform ${job.name} maintenance for ${job.data.type}`);
  }
};

/**
 * Sets up event listeners for the maintenance queue and processes the DB maintenance task.
 * @returns void
 * @throws {Error} If there is an issue with setting up the event listeners or processing the
 * maintenance task.
 */
const processMaintenanceQueue = () => {
  maintenanceQueue.on('failed', onFailedMaintenance);
  maintenanceQueue.on('completed', onCompletedMaintenance);

  maintenanceQueue.process(MAINTENANCE_TYPE.DB, dbMaintenance);
};

/**
 * Adds a job to the maintenance queue for database maintenance.
 * @param type - The type of database maintenance to perform.
 * @param data - Optional data to be included with the maintenance job.
 * @returns void
 * @throws {Error} If an error occurs while adding the job to the maintenance queue.
 */
const queueDBMaintenance = (
  type: typeof DB_MAINTENANCE_TYPE[keyof typeof DB_MAINTENANCE_TYPE],
  data: object | null = null,
) => {
  try {
    const jobData = {
      type,
      ...data,
    };
    maintenanceQueue.add(MAINTENANCE_TYPE.DB, jobData);
  } catch (err) {
    auditLogger.error(err);
  }
};

module.exports = {
  maintenanceQueue,
  processMaintenanceQueue,
  queueDBMaintenance,
};
