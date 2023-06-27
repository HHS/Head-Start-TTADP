const { default: newQueue } = require('../queue');
const { MAINTENANCE_TYPE, MAINTENANCE_CATEGORY } = require('../../constants');
const { MaintenanceLog } = require('../../models');
const { auditLogger, logger } = require('../../logger');

const maintenanceQueue = newQueue('maintenance');
const maintenanceQueueProcessors = {};

const maintenanceCronJobs = {};

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
  maintenanceQueueProcessors[category] = processor;
};

/**
 * Checks if the specified category has a queue processor.
 *
 * @param {string} category - The category to check for a queue processor.
 * @returns {boolean} - Returns true if the category has a queue processor, false otherwise.
 */
const hasQueueProcessor = (category) => !!maintenanceQueueProcessors[category];

/**
 * Removes a queue processor for a given category from the queueProcessors object.
 *
 * @param {string} category - The category of the queue processor to remove.
 */
const removeQueueProcessor = (category) => {
  // Check if the category exists in the queueProcessors object
  if (category in maintenanceQueueProcessors) {
    // If it does, delete the category and its corresponding queue processor
    delete maintenanceQueueProcessors[category];
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
  Object.entries(maintenanceQueueProcessors)
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
  if (category in maintenanceQueueProcessors) {
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
 * Adds a cron job to the maintenanceCronJobs object.
 *
 * @param {string} category - The category of the cron job.
 * @param {string} type - The type of the cron job.
 * @param {function} job - The function to be executed as the cron job.
 */
const addCronJob = (category, type, jobCommand, schedule) => {
  // Check if the category exists, if not create a new object for it
  if (!maintenanceCronJobs[category]) {
    maintenanceCronJobs[category] = {};
  }
  // Accesses the maintenanceCronJobs object and sets the value of the specified category
  // and type to the provided job function.
  maintenanceCronJobs[category][type] = { jobCommand, schedule };
};

/**
 * Checks if a maintenance cron job exists for the given category and type.
 *
 * @param {string} category - The category of the maintenance cron job.
 * @param {string} type - The type of the maintenance cron job.
 * @returns {boolean} - Returns true if a maintenance cron job exists for the given category
 * and type, otherwise returns false.
 */
const hasCronJob = (category, type) => {
  // Check if there are any maintenance cron jobs for the given category
  if (!maintenanceCronJobs[category]) {
    return false; // If not, return false
  }
  // Return true if a maintenance cron job exists for the given category and type, else return false
  return !!maintenanceCronJobs[category][type];
};

/**
 * Sets the schedule for a cron job of a given category and type.
 * @param {string} category - The category of the cron job.
 * @param {string} type - The type of the cron job.
 * @param {string} schedule - The new schedule for the cron job.
 */
const setCronJobSchedule = (category, type, schedule) => {
  // Check if the cron job exists before setting its schedule
  if (hasCronJob(category, type)) {
    // Set the new schedule for the cron job
    maintenanceCronJobs[category][type].schedule = schedule;
  }
};

/**
 * Removes a cron job from the maintenanceCronJobs object based on its category and type.
 * @param {string} category - The category of the cron job to be removed.
 * @param {string} type - The type of the cron job to be removed.
 */
const removeCronJob = (category, type) => {
  // Check if the key exists in the maintenanceCronJobs object.
  if (hasCronJob(category, type)) {
    // If the key exists, delete the corresponding cron job from the maintenanceCronJobs object.
    if (Object.keys(maintenanceCronJobs[category]).length === 1) {
      delete maintenanceCronJobs[category]; // delete the entire category if it only has one job
    } else {
    // delete the specific job if there are multiple jobs in the category
      delete maintenanceCronJobs[category][type];
    }
  }
};

/**
 * Creates a new job with the given parameters and starts it.
 * @param {string} category - The category of the job.
 * @param {string} type - The type of the job.
 * @param {string} timezone - The timezone for the job schedule.
 * @param {Object} schedule - The schedule object for the job.
 * @param {function} jobCommand - The function to create the job.
 * @returns {Object} - An object containing the job with its type as the key.
 */
const createJob = (category, type, timezone, schedule, jobCommand) => {
  // Create the job using the jobCommand function and the given parameters.
  const job = jobCommand(category, type, timezone, schedule);
  // Start the job.
  job.start();
  // Return an object containing the job with its type as the key.
  return { [type]: job };
};

/**
 * Creates a category object with jobs for each type of job.
 * @param {string} category - The name of the category.
 * @param {Object} typeJobs - An object containing the types of jobs and their corresponding
 * commands.
 * @param {Object} schedules - An object containing the schedules for each category and type of job.
 * @param {string} timezone - The timezone to use for the jobs.
 * @returns {Object} - A category object with jobs for each type of job.
 */
const createCategory = (category, typeJobs, schedules, timezone) => {
  // Create an object containing jobs for each type of job in the category.
  const jobs = Object.entries(typeJobs).reduce(
    (
      acc,
      [type, { jobCommand, schedule }],
    ) => ({
      ...acc,
      ...createJob(category, type, timezone, schedule, jobCommand),
    }),
    {},
  );
  // Return the category object with the jobs for each type of job.
  return { [category]: jobs };
};

/**
 * Runs maintenance cron jobs based on provided schedules and timezone.
 *
 * @param {string} timezone - The timezone to use for the cron jobs.
 * @param {Object} schedules - An object containing the schedules for each job type.
 * @returns {Array} - An array of categories containing their respective cron jobs.
 */
const runMaintenanceCronJobs = (timezone = 'America/New_York', schedules = {}) => {
  const categories = Object.entries(maintenanceCronJobs).reduce((acc, [category, typeJobs]) => {
    const categoryObj = createCategory(category, typeJobs, schedules, timezone);
    acc[categoryObj.name] = categoryObj.jobs;
    return acc;
  }, {});

  return categories;
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
    createCategory,
    createJob,
  },
  addQueueProcessor,
  hasQueueProcessor,
  removeQueueProcessor,
  processMaintenanceQueue,
  enqueueMaintenanceJob,
  addCronJob,
  hasCronJob,
  removeCronJob,
  runMaintenanceCronJobs,
  maintenanceCommand,
};
