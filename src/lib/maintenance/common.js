const { default: newQueue } = require('../queue');
const { MAINTENANCE_TYPE, MAINTENANCE_CATEGORY } = require('../../constants');
const { MaintenanceLog } = require('../../models');
const { auditLogger, logger } = require('../../logger');

const maintenanceQueue = newQueue('maintenance');
const queueProcessors = {};

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
    logger.info(`Successfully performed ${job.name} maintenance for ${job.data?.category} ${job.data?.type}`);
  } else {
    logger.error(`Failed to perform ${job.name} maintenance for ${job.data?.category} ${job.data?.type}`);
  }
};

/**
 * Adds a processor function to the queue for a given type.
 *
 * @param {string} category - The type of queue to add the processor to.
 * @param {function} processor - The processor function to add to the queue.
 * @throws {TypeError} Will throw an error if the 'type' parameter is not a string or if the
 * 'processor' parameter is not a function.
 */
const addQueueProcessor = (category, processor) => {
  queueProcessors[category] = processor;
};

/**
 * Adds a processor function to the queue for a given type.
 *
 * @param {string} category - The category of processor to add the queue.
 * @param {function} processor - The processor function to add to the queue.
 * @throws {TypeError} Will throw an error if the 'type' parameter is not a string or if the
 * 'processor' parameter is not a function.
 */
const removeQueueProcessor = (category) => {
  if (category in queueProcessors) {
    delete queueProcessors[category];
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

  Object.entries(queueProcessors)
    .map(([category, processor]) => maintenanceQueue.process(category, processor));
};

/**
 * Adds a job to the maintenance queue.
 * @param type - The type of database maintenance to perform.
 * @param data - Optional data to be included with the maintenance job.
 * @returns void
 * @throws {Error} If an error occurs while adding the job to the maintenance queue.
 */
const enqueueMaintenanceJob = (
  type,
  data = null,
) => {
  if (type in queueProcessors) {
    try {
      maintenanceQueue.add(type, data);
    } catch (err) {
      auditLogger.error(err);
    }
  } else {
    const error = new Error(`Maintenance Queue Error: no processor defined for ${type}`);
    auditLogger.error(error);
  }
};

/**
 * Runs a maintenance command on the database table and logs the activity in the maintenance log.
 *
 * @param {string} callback - a function to run.
 * @param {MAINTENANCE_CATEGORY[keyof typeof MAINTENANCE_CATEGORY]} category - The category of
 * maintenance activity being performed.
 * @param {MAINTENANCE_TYPE[keyof typeof MAINTENANCE_TYPE]} type - The type of
 * maintenance activity being performed.
 * @param {*} data - Additional data related to the maintenance activity.
 * @returns {Promise<bool>} A Promise that resolves to void.
 * @throws {Error} If an error occurs while running the maintenance command.
 */
const maintenanceCommand = async (
  callback,
  category,
  type,
  data = {},
) => {
  // Reset the log messages and benchmark data arrays for each operation
  const logMessages = [];
  const logBenchmarkData = [];
  let isSuccessful = false;

  // Create a maintenance log entry for this operation
  const log = await MaintenanceLog.create({ category, type, data });
  try {
    // Run the command
    const result = await callback(logMessages, logBenchmarkData);
    console.log({category, type, result});

    // Check if the log messages contain the word "successfully" to set isSuccessful accordingly
    isSuccessful = logMessages.some((message) => message.toLowerCase().includes('successfully')
      || message.toLowerCase().includes('executed'))
      || result?.isSuccessful;
    const newData = {
      ...log.data,
      ...(result?.data && { ...result.data }),
      ...(logMessages.length > 0 && { messages: logMessages }),
      ...(logBenchmarkData.length > 0 && { benchmarks: logBenchmarkData }),
    };
  console.log({category, type, newData});

    // Update the log entry to indicate that the maintenance activity has been completed.
    await MaintenanceLog.update(
      { data: newData, isSuccessful },
      { where: { id: log.id }, logging: console.log },
    );
    console.log({category, type});
  } catch (err) {
    // Log error message
    auditLogger.error(`Error occurred while running maintenance command: ${err.message}`);

    // Update the log entry to indicate that the maintenance activity has been completed.
    await MaintenanceLog.update(
      {
        data: {
          ...log.data,
          ...(logMessages.length > 0 && { messages: logMessages }),
          ...(logBenchmarkData.length > 0 && { benchmarks: logBenchmarkData }),
          error: JSON.parse(JSON.stringify(err)),
          errorMessage: err.message,
        },
        isSuccessful,
      },
      { where: { id: log.id } },
    );
  }

  return isSuccessful;
};

module.exports = {
  maintenanceQueue,
  onFailedMaintenance,
  onCompletedMaintenance,
  addQueueProcessor,
  removeQueueProcessor,
  processMaintenanceQueue,
  enqueueMaintenanceJob,
  maintenanceCommand,
};
