const newQueue = require('../queue');
const { auditLogger, logger } = require('../../logger');
const { processDBMaintenanceJob: processDBJob } = require('./db');

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

  processDBJob(maintenanceQueue);
};

module.exports = {
  maintenanceQueue,
  onFailedMaintenance,
  onCompletedMaintenance,
  processMaintenanceQueue,
};
