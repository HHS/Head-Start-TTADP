const { Op } = require('sequelize');
const { CronJob } = require('cron');
const { default: newQueue, increaseListeners } = require('../queue');
const { MaintenanceLog } = require('../../models');
const { MAINTENANCE_TYPE, MAINTENANCE_CATEGORY } = require('../../constants');
const { auditLogger, logger } = require('../../logger');
const { isTrue } = require('../../envParser');
const { default: LockManager } = require('../lockManager');
const { default: transactionQueueWrapper } = require('../../workers/transactionWrapper');
const { default: referenceData } = require('../../workers/referenceData');

const maintenanceQueue = newQueue('maintenance');
const maintenanceQueueProcessors = {};

const lockManagers = {};

const cronEnrollmentFunctions = [];
const maintenanceCronJobs = {};

// Function to remove a specific job by ID
async function removeCompletedJob(job) {
  try {
    if (job && job.isCompleted()) {
      await job.remove();
      auditLogger.log('info', `Removed completed job with ID ${job.id}`);
    }
  } catch (error) {
    auditLogger.error(`Error removing job: ${job.id}`, error);
  }
}

/**
 * Logs an error message to the audit logger when a maintenance job fails.
 *
 * @param {Object} job - The maintenance job that failed.
 * @param {Error} error - The error that caused the job to fail.
 */
const onFailedMaintenance = (job, error) => {
  // Log an error message with details about the failed job and error.
  auditLogger.error(`job ${job.name} failed for ${job.data.type} with error ${error}`);
  // Intentionally not awaited
  removeCompletedJob(job);
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
    logger.info(`Successfully performed ${job.name} maintenance for ${job.data?.type}`);
  } else {
    // Log failed maintenance with job name, category and type
    logger.error(`Failed to perform ${job.name} maintenance for ${job.data?.type}`);
  }
  // Intentionally not awaited
  removeCompletedJob(job);
};

/**
 * Adds a queue processor to the specified category.
 *
 * @param {string} category - The category to add the processor to.
 * @param {function} processor - The function that processes the queue.
 */
const addQueueProcessor = (category, processor, runInTransaction = true) => {
  // Assigns the processor function to the specified category in the queueProcessors object.
  if (!maintenanceQueueProcessors[category]) {
    maintenanceQueueProcessors[category] = { processor, runInTransaction };
  }
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
  increaseListeners(maintenanceQueue, Object.entries(maintenanceQueueProcessors).length);

  // Process each category in the queue using its corresponding processor
  Object.entries(maintenanceQueueProcessors)
    .map(([category, { processor, runInTransaction }]) => maintenanceQueue.process(
      category,
      runInTransaction
        ? transactionQueueWrapper(
          processor,
          category,
        )
        : processor,
    ));
};

/**
 * Adds a maintenance job to the queue if a processor is defined for the given type.
 */
const enqueueMaintenanceJob = async ({
  category,
  data = {},
  requiredLaunchScript = null,
  requiresLock = false,
  holdLock = false,
  jobSettings = {},
}) => {
  const action = async () => {
    // Check if there is a processor defined for the given type
    if (category in maintenanceQueueProcessors) {
      try {
        // Add the job to the maintenance queue
        maintenanceQueue.add(category, { ...data, ...referenceData() }, jobSettings);
      } catch (err) {
        // Log any errors that occur when adding the job to the queue
        auditLogger.error(err);
      }
    } else {
      // If no processor is defined for the given type, log an error
      const err = new Error(`Maintenance Queue Error: no processor defined for ${category}`);
      auditLogger.error(err);
    }
  };

  try {
    const launchScript = process.argv[1]?.split('/')?.slice(-1)[0]?.split('.')?.[0];
    if (requiredLaunchScript) {
      if (launchScript === requiredLaunchScript) {
        if (requiresLock) {
          let lockManager = lockManagers[`${category}-${data?.type}`];
          if (!lockManager) {
            lockManager = new LockManager(`maintenanceLock-${category}-${data?.type}`);
            lockManagers[`${category}-${data?.type}`] = lockManager;
          }
          await lockManager.executeWithLock(action, holdLock);
        } else {
          await action();
        }
      }
    } else {
      await action();
    }
  } catch (err) {
    auditLogger.error(err);
    throw err;
  }
};

/**
 * Registers an async cron enrollment function to be executed later.
 * @param {function} enrollFunction - An async function that takes (instanceId, contextId)
 */
const registerCronEnrollmentFunction = (enrollFunction) => {
  cronEnrollmentFunctions.push(enrollFunction);
};

/**
 * Executes all registered async cron enrollment functions with the current instance,
 * context, and env.
 * @param {string} instanceId - The Cloud Foundry instance ID
 * @param {number} contextId - A unique identifier for the deployment or environment
 * @param {string} env - The application environment (e.g., 'production', 'staging', 'development')
 * @returns {Promise<void>}
 */
const executeCronEnrollmentFunctions = async (instanceId, contextId, env) => {
  auditLogger.log('info', `Executing cron enrollment functions for instance ${instanceId}, context ${contextId}, env ${env}`);

  // Execute all registered functions asynchronously
  await Promise.all(cronEnrollmentFunctions.map(async (fn) => {
    try {
      await fn(instanceId, contextId, env);
    } catch (err) {
      auditLogger.error(`Error executing cron enrollment function: ${err.message}`, err);
    }
  }));
};

/**
 * Adds a cron job to the maintenanceCronJobs object.
 *
 * @param {string} category - The category of the cron job.
 * @param {string} type - The type of the cron job.
 * @param {function} job - The function to be executed as the cron job.
 */
const addCronJob = (category, type, jobCommand, schedule, name = '') => {
  // Check if the category exists, if not create a new object for it
  if (!maintenanceCronJobs[category]) {
    maintenanceCronJobs[category] = {};
  }
  if (!maintenanceCronJobs[category][type]) {
    maintenanceCronJobs[category][type] = {};
  }
  // Accesses the maintenanceCronJobs object and sets the value of the specified category
  // and type to the provided job function.
  maintenanceCronJobs[category][type][name] = { jobCommand, schedule, started: false };
};

/**
 * Checks if a maintenance cron job exists for the given category and type.
 *
 * @param {string} category - The category of the maintenance cron job.
 * @param {string} type - The type of the maintenance cron job.
 * @param {string} name - The name of the maintenance cron job.
 * @returns {boolean} - Returns true if a maintenance cron job exists for the given category
 * and type, otherwise returns false.
 */
const hasCronJob = (category, type, name = '') => !!maintenanceCronJobs?.[category]?.[type]?.[name];

/**
 * Checks if a specific cron job has been started based on the given category and type.
 *
 * @param {string} category - The category of the maintenance cron jobs.
 * @param {string} type - The specific type of cron job within the category.
 * @param {string} name - The name of the maintenance cron job.
 * @returns {boolean} - Returns true if the cron job has been marked as started, otherwise false.
 */
// Define a function to check if a cron job has been started for a given category and type
const hasCronJobBeenStarted = (
  category,
  type,
  name,
) => !!maintenanceCronJobs?.[category]?.[type]?.[name]?.started;

/**
 * Sets the schedule for a cron job of a given category and type.
 * @param {string} category - The category of the cron job.
 * @param {string} type - The type of the cron job.
 * @param {string} schedule - The new schedule for the cron job.
 */
const setCronJobSchedule = (category, type, name, schedule) => {
  // Check if the cron job exists before setting its schedule
  if (hasCronJob(category, type, name)) {
    // Set the new schedule for the cron job
    maintenanceCronJobs[category][type][name].schedule = schedule;
  }
};

/**
 * Removes a cron job from the maintenanceCronJobs object based on its category and type.
 * @param {string} category - The category of the cron job to be removed.
 * @param {string} type - The type of the cron job to be removed.
 */
const removeCronJob = (category, type, name) => {
  // Check if the key exists in the maintenanceCronJobs object.
  if (hasCronJob(category, type, name)) {
    delete maintenanceCronJobs[category][type][name];

    if (Object.keys(maintenanceCronJobs[category][type]).length === 0) {
      delete maintenanceCronJobs[category][type];
    }

    // If the key exists, delete the corresponding cron job from the maintenanceCronJobs object.
    if (Object.keys(maintenanceCronJobs[category]).length === 0) {
      delete maintenanceCronJobs[category]; // delete the entire category if it only has one job
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
const createJob = (category, type, name, timezone, schedule, jobCommand) => {
  // Create the job using the jobCommand function and the given parameters.
  const job = jobCommand(category, type, timezone, schedule);
  // Start the job.
  try {
    if (!job.running) {
      job.start();
    }
  } catch (err) {
    auditLogger.error(err);
  }
  maintenanceCronJobs[category][type][name].started = true;
  // Return an object containing the job with its type as the key.
  return { [type]: job };
};

/**
 * Creates a category object with jobs for each type of job.
 * @param {string} category - The name of the category.
 * @param {Object} typeJobs - An object containing the types of jobs and their corresponding
 * commands.
 * @param {string} timezone - The timezone to use for the jobs.
 * @returns {Object} - A category object with jobs for each type of job.
 */
const createCategory = (category, typeJobs, timezone) => {
  // Create an object containing jobs for each type of job in the category.
  const jobs = Object.entries(typeJobs).reduce((acc, [type, names]) => {
    // Iterate over the nested structure
    const namedJobs = Object.entries(names)
      .reduce((typeAcc, [name, { jobCommand, schedule, started }]) => {
        // Only add the job if it hasn't started
        if (!started) {
          auditLogger.log('info', `Maintenance: createCategory: category: ${category}, type: ${type}, name: ${name}, schedule: ${schedule}`);
          return {
            ...typeAcc,
            ...createJob(category, type, name, timezone, schedule, jobCommand),
          };
        }
        return typeAcc;
      }, {});

    // Combine the jobs for each type
    return {
      ...acc,
      ...namedJobs,
    };
  }, {});

  // Return the category object with the jobs for each type of job.
  return { [category]: jobs };
};

/**
 * Runs maintenance cron jobs based on provided schedules and timezone.
 *
 * @param {string} timezone - The timezone to use for the cron jobs.
 * @returns {Array} - An array of categories containing their respective cron jobs.
 */
const runMaintenanceCronJobs = (timezone = 'America/New_York') => {
  const categories = Object.entries(maintenanceCronJobs)
    .reduce((acc, [category, typeJobs]) => {
      auditLogger.log('info', `Maintenance: runMaintenanceCronJobs: category: ${category}`);
      const categoryObj = createCategory(category, typeJobs, timezone);
      // Extract the category name from the returned object
      const categoryName = Object.keys(categoryObj)[0];
      acc[categoryName] = categoryObj[categoryName];
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
  let log;
  try {
    // Create a new maintenance log
    log = await createMaintenanceLog(category, type, data, triggeredById);
  } catch (err) {
    auditLogger.error(`Error occurred while logging maintenance command: ${err} ${err.message}`);
    return false;
  }
  try {
    // Execute the provided callback function and capture any returned data
    const result = await callback(logMessages, logBenchmarks, log.id);

    // Determine if the maintenance command was successful based on log messages and returned data
    isSuccessful = logMessages.some((message) => message.toLowerCase().includes('successfully')
      || message.toLowerCase().includes('executed'))
      || !!result?.isSuccessful;

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
      ...(log?.data && log.data),
      ...(logMessages.length > 0 && { messages: logMessages }),
      ...(logBenchmarks.length > 0 && { benchmarks: logBenchmarks }),
      error: JSON.parse(JSON.stringify(err)),
      errorMessage: err.message,
    }, isSuccessful);
  }

  // Return whether the maintenance command was successful or not
  return isSuccessful;
};

/**
 * Returns a new Date object with the date shifted back by the specified number of days.
 * @param {number} dateOffSet - The number of days to shift the date back by.
 * @returns {Date} - A new Date object representing the shifted date and time.
 */
const backDate = (dateOffSet) => {
  // Create a new Date object representing today's date and time.
  const today = new Date();
  // Calculate the shifted date by subtracting the specified number of days in milliseconds
  // from today's date.
  const shiftedDate = new Date(today.getTime() - (dateOffSet * 24 * 60 * 60 * 1000));
  // Create a new Date object representing the shifted date and today's time.
  const shiftedDateTime = new Date(
    shiftedDate.getFullYear(),
    shiftedDate.getMonth(),
    shiftedDate.getDate(),
    today.getHours(),
    today.getMinutes(),
    today.getSeconds(),
  );
  // Return the shifted date and time as a Date object.
  return shiftedDateTime;
};

/**
 * Asynchronous function that clears maintenance logs older than a certain date.
 * @param {Object} data - Additional data to be passed to the maintenance command.
 * @param {string} triggeredById - ID of the user who triggered the maintenance command.
 * @returns {Promise} A promise that resolves with the result of the maintenance command.
 */
const clearMaintenanceLogs = async (data, triggeredById) => {
  // Get the date that is a week ago from today's date
  // If data.dateOffSet exists, use it as the offset value. Otherwise, use 90 as the
  // default offset value.
  const olderThen = backDate(data.dateOffSet || 90);
  return maintenanceCommand(
    // Call the destroy method on the MaintenanceLog model to delete all logs created
    // before the specified date
    async (logMessages, logBenchmarkData, triggered) => {
      const result = await MaintenanceLog.destroy({
        where: {
          createdAt: { [Op.lt]: olderThen },
          id: { [Op.not]: triggered },
        },
        // Log messages and benchmark data for debugging purposes
        logging: (message, timingMs) => {
          logMessages.push(message);
          logBenchmarkData.push(timingMs);
        },
        benchmark: true,
      });
      return typeof result === 'number'
        ? { rowsDeleted: result, isSuccessful: true }
        : result;
    },
    MAINTENANCE_CATEGORY.MAINTENANCE,
    MAINTENANCE_TYPE.CLEAR_MAINTENANCE_LOGS,
    {
      ...data,
      olderThen,
    },
    triggeredById,
  );
};

/**
 * This function performs maintenance operations based on the provided job object.
 *
 * @param {Object} job - The job object containing information about the maintenance operation
 * to perform.
 * @returns {Promise} - A promise that resolves with the maintenance action to perform.
 */
const maintenance = async (job) => {
  // Destructure the job object to get the maintenance type, offset, limit, and any additional data.
  const {
    type,
    ...data // pass to any maintenance operations that may have had additional data passed.
  } = job.data;

  let action; // Declare a variable to hold the maintenance action.

  switch (type) {
    case MAINTENANCE_TYPE.CLEAR_MAINTENANCE_LOGS:
      // Set the action to vacuumTables function with the provided offset and limit.
      action = clearMaintenanceLogs(data);
      break;
    default:
      // Throw an error if an invalid maintenance type is provided.
      throw new Error(`Invalid maintenance type: ${type}`);
  }

  return action; // Return the maintenance action.
};

// This code adds a queue processor for maintenance tasks.
// The MAINTENANCE_CATEGORY.MAINTENANCE is used to identify the category of maintenance task.
// The maintenance function is passed as the callback function to be executed when
// a task in this category is processed.
addQueueProcessor(MAINTENANCE_CATEGORY.MAINTENANCE, maintenance);

/**
 * Registers maintenance cron jobs using the common cron enrollment mechanism.
 */
registerCronEnrollmentFunction(async (instanceId, contextId, env) => {
  if (!isTrue('FORCE_CRON')) {
    if (instanceId !== '0') {
      auditLogger.log('info', `Skipping maintenance cron job enrollment on instance ${instanceId} in environment ${env}`);
      return;
    }

    if (env !== 'production') {
      auditLogger.log('info', `Skipping maintenance cron job enrollment in non-production environment (${env})`);
      return;
    }

    if (contextId !== 1) {
      auditLogger.log('info', `Skipping maintenance cron job enrollment on context ${contextId} in environment ${env} for instance ${instanceId}`);
      return;
    }
  }
  auditLogger.log('info', `Registering maintenance cron jobs for context ${contextId} in environment ${env} for instance ${instanceId}`);

  addCronJob(
    MAINTENANCE_CATEGORY.MAINTENANCE, // The maintenance category is "DB"
    MAINTENANCE_TYPE.CLEAR_MAINTENANCE_LOGS, // The maintenance type is "DAILY_DB_MAINTENANCE"
    // The function to execute takes in the category, type, timezone, and schedule parameters
    (category, type, timezone, schedule) => new CronJob(
      schedule, // The schedule parameter specifies when the job should run
      () => enqueueMaintenanceJob({
        // constant representing the category of maintenance
        category: MAINTENANCE_CATEGORY.MAINTENANCE,
        data: {
          // shorthand property notation for type: type
          type: MAINTENANCE_TYPE.CLEAR_MAINTENANCE_LOGS,
          dateOffSet: 90, // otherwise, merge the provided data object
        },
      }),
      null,
      true,
      timezone, // The timezone parameter specifies the timezone in which the job should run
    ),
    /**
     * This cron expression breaks down as follows:
     *  30 - The minute when the job will run (in this case, 30 minutes past the hour)
     *  22 - The hour when the job will run (in this case, 10 pm)
     *  * - The day of the month when the job will run (in this case, any day of the month)
     *  * - The month when the job will run (in this case, any month)
     *  * - The day of the week when the job will run (in this case, any day of the week)
     * */
    '30 22 * * *',
  );
});

module.exports = {
  // testing only exports
  ...(process.env.NODE_ENV !== 'production' && {
    maintenanceQueue,
    onFailedMaintenance,
    onCompletedMaintenance,
    createMaintenanceLog,
    updateMaintenanceLog,
    createCategory,
    createJob,
    backDate,
    clearMaintenanceLogs,
    maintenance,
  }),
  // queue exports
  addQueueProcessor,
  hasQueueProcessor,
  removeQueueProcessor,
  processMaintenanceQueue,
  enqueueMaintenanceJob,
  // cron exports
  registerCronEnrollmentFunction,
  executeCronEnrollmentFunctions,
  addCronJob,
  hasCronJob,
  removeCronJob,
  setCronJobSchedule,
  runMaintenanceCronJobs,
  // execute and log maintenance
  maintenanceCommand,
};
