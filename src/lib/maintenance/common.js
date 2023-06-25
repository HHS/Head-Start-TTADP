const { default: newQueue } = require('../queue');
const { MAINTENANCE_TYPE, MAINTENANCE_CATEGORY } = require('../../constants');
const { MaintenanceLog } = require('../../models');
const { auditLogger, logger } = require('../../logger');

const maintenanceQueue = newQueue('maintenance');
const queueProcessors = {};

/**
 * Logs an error message to the audit logger when a maintenance job fails.
 *
 * @param {Object} job - The maintenance job that failed.
 * @param {Error} error - The error that caused the job to fail.
 */
const onFailedMaintenance = (job, error) => {
  // Log an error message with details about the failed job and error.
  auditLogger.error(`job ${job.name} failed for report ${job.data.type} with error ${error}`);
};

/**
 * This function is a callback that logs the result of a maintenance job.
 * @param {Object} job - The maintenance job object.
 * @param {any} result - The result of the maintenance job.
 */
const onCompletedMaintenance = (job, result) => {
  // Check if the result is not null
  if (result != null) {
    // Log successful maintenance with job name, category and type
    logger.info(`Successfully performed ${job.name} maintenance for ${job.data?.category} ${job.data?.type}`);
  } else {
    // Log failed maintenance with job name, category and type
    logger.error(`Failed to perform ${job.name} maintenance for ${job.data?.category} ${job.data?.type}`);
  }
};

/**
 * Adds a queue processor to the specified category.
 *
 * @param {string} category - The category to add the processor to.
 * @param {function} processor - The function that processes the queue.
 */
const addQueueProcessor = (category, processor) => {
  // Assigns the processor function to the specified category in the queueProcessors object.
  queueProcessors[category] = processor;
};

/**
 * Checks if the specified category has a queue processor.
 *
 * @param {string} category - The category to check for a queue processor.
 * @returns {boolean} - Returns true if the category has a queue processor, false otherwise.
 */
const hasQueueProcessor = (category) => !!queueProcessors[category];

/**
 * Removes a queue processor for a given category from the queueProcessors object.
 *
 * @param {string} category - The category of the queue processor to remove.
 */
const removeQueueProcessor = (category) => {
  // Check if the category exists in the queueProcessors object
  if (category in queueProcessors) {
    // If it does, delete the category and its corresponding queue processor
    delete queueProcessors[category];
  }
};

/**
 * This function processes the maintenance queue by attaching event listeners for failed
 * and completed tasks, and then processing each category using its corresponding processor.
 */
const processMaintenanceQueue = () => {
  // Attach event listener for failed tasks
  maintenanceQueue.on('failed', onFailedMaintenance);
  // Attach event listener for completed tasks
  maintenanceQueue.on('completed', onCompletedMaintenance);

  // Process each category in the queue using its corresponding processor
  Object.entries(queueProcessors)
    .map(([category, processor]) => maintenanceQueue.process(category, processor));
};

/**
 * Adds a maintenance job to the queue if a processor is defined for the given type.
 *
 * @param {string} category - The type of maintenance job to add to the queue.
 * @param {*} [data=null] - Optional data to include with the maintenance job.
 */
const enqueueMaintenanceJob = (
  category,
  data = null,
) => {
  // Check if there is a processor defined for the given type
  if (category in queueProcessors) {
    try {
      // Add the job to the maintenance queue
      maintenanceQueue.add(category, data);
    } catch (err) {
      // Log any errors that occur when adding the job to the queue
      auditLogger.error(err);
    }
  } else {
    // If no processor is defined for the given type, log an error
    const error = new Error(`Maintenance Queue Error: no processor defined for ${category}`);
    auditLogger.error(error);
  }
};

/**
 * Asynchronous function that creates a maintenance log with the given category, type, and data.
 * @param {string} category - The category of the maintenance log.
 * @param {string} type - The type of the maintenance log.
 * @param {object} data - The data associated with the maintenance log.
 * @returns {Promise<object>} - A promise that resolves to the created maintenance log object.
 */
const createMaintenanceLog = async (category, type, data, triggeredById) => {
  // Create a new maintenance log object with the given category, type, and data.
  const log = await MaintenanceLog.create({
    category,
    type,
    data,
    triggeredById,
  });
  // Return the created maintenance log object.
  return log;
};

/**
 * Updates a maintenance log with new data and success status.
 * @async
 * @function updateMaintenanceLog
 * @param {object} log - The maintenance log to be updated.
 * @param {object} newData - The new data to replace the existing data in the log.
 * @param {boolean} isSuccessful - The success status of the maintenance log update.
 * @returns {Promise<void>} - A promise that resolves when the maintenance log has
 * been successfully updated.
 */
const updateMaintenanceLog = async (log, newData, isSuccessful) => {
  // Update the MaintenanceLog table with the new data and success status for the specified log ID.
  await MaintenanceLog.update(
    { data: newData, isSuccessful },
    { where: { id: log.id } },
  );
};

/**
 * This function is used to execute maintenance commands and log the results.
 * @param {Function} callback - The function to be executed as part of the maintenance command.
 * @param {string} category - The category of the maintenance command.
 * @param {string} type - The type of the maintenance command.
 * @param {Object} data - Additional data to be logged with the maintenance command.
 * @param {integer} triggeredById - The id of the maintenance log that triggered this command.
 * @returns {boolean} - Whether the maintenance command was successful or not.
 */
const maintenanceCommand = async (
  callback,
  category,
  type,
  data = {},
  triggeredById = null,
) => {
  // Initialize variables for logging and tracking success
  const logMessages = [];
  const logBenchmarks = [];
  let isSuccessful = false;

  // Create a new maintenance log
  const log = await createMaintenanceLog(category, type, data, triggeredById);
  try {
    // Execute the provided callback function and capture any returned data
    const result = await callback(logMessages, logBenchmarks, log.id);

    // Determine if the maintenance command was successful based on log messages and returned data
    isSuccessful = logMessages.some((message) => message.toLowerCase().includes('successfully')
      || message.toLowerCase().includes('executed'))
      || result?.isSuccessful;

    // Merge any returned data into the original data object and update the maintenance log
    const newData = {
      ...log.data,
      ...(result?.data && { ...result.data }),
      ...(logMessages.length > 0 && { messages: logMessages }),
      ...(logBenchmarks.length > 0 && { benchmarks: logBenchmarks }),
    };
    await updateMaintenanceLog(log, newData, isSuccessful);
  } catch (err) {
    // Log any errors that occur during the maintenance command execution
    auditLogger.error(`Error occurred while running maintenance command: ${err.message}`);

    // Update the maintenance log with the error information
    await updateMaintenanceLog(log, {
      ...log.data,
      ...(logMessages.length > 0 && { messages: logMessages }),
      ...(logBenchmarks.length > 0 && { benchmarks: logBenchmarks }),
      error: JSON.parse(JSON.stringify(err)),
      errorMessage: err.message,
    }, isSuccessful);
  }

  // Return whether the maintenance command was successful or not
  return isSuccessful;
};

module.exports = {
  testingOnly: {
    maintenanceQueue,
    onFailedMaintenance,
    onCompletedMaintenance,
    createMaintenanceLog,
    updateMaintenanceLog,
  },
  addQueueProcessor,
  hasQueueProcessor,
  removeQueueProcessor,
  processMaintenanceQueue,
  enqueueMaintenanceJob,
  maintenanceCommand,
};
