import { Op } from 'sequelize';
import { CronJob } from 'cron';
import db from '../../models';
import {
  MAINTENANCE_TYPE,
  MAINTENANCE_CATEGORY,
  REPORT_TYPE,
} from '../../constants';
import {
  addQueueProcessor,
  enqueueMaintenanceJob,
  maintenanceCommand,
  addCronJob,
} from './common';
import {
  getAll,
} from '../../services/reports';

const { sequelize, MaintenanceLog } = db;

const spreadCompletedReports = async (reportId) => maintenanceCommand(
  async (ogMessages, logBenchmarks, triggeredById) => {
    try {
    // TODO: call service to spread for report
      return { isSuccessful: results.every((r) => r === true) };
    } catch (err) {
      return { isSuccessful: false, error: err };
    }
  },
  MAINTENANCE_CATEGORY.REPORT,
  MAINTENANCE_TYPE.SPREAD_COMPLETED_REPORTS,
);

const identifyAndSpreadReports = async () => maintenanceCommand(
  async (logMessages, logBenchmarks, triggeredById) => {
    try {
      // TODO: do work here
      /**
       * 1. Identify all reports that have reached a terminal status that have been touched
       * in the last week
       *  note: log the number of reports checked
       * 2. for each report call function to verify goals and objectives are spread to all
       * recipients on the report
       * note: log number of goals & objectives created and updated
       */
      const reportIds = await getAll(
        REPORT_TYPE.REPORT_TRAINING_SESSION,
        undefined,
        {
          updatedAt: { [Op.gte]: new Date(new Date().setDate(new Date().getDate() - 7)) },
        },
        [],
      );
      const results = await Promise.all(reportIds.map(async (
        reportId,
      ) => spreadCompletedReports(reportId)));

      return { isSuccessful: results.every((r) => r === true) };
    } catch (err) {
      return { isSuccessful: false, error: err };
    }
  },
  MAINTENANCE_CATEGORY.REPORT,
  MAINTENANCE_TYPE.IDENTIFY_SPREAD_COMPLETED_REPORTS,
);

/**
 * Performs maintenance operations on a database based on the given job data.
 * @async
 * @param {Object} job - The job object containing the maintenance type and any additional data
 * required for the operation.
 * @param {string} job.type - The type of maintenance operation to perform.
 * @returns {Promise<any[]>} A promise that resolves with an array of results from the maintenance
 * operation.
 * @throws {Error} If an invalid Report maintenance type is provided.
 */
const reportMaintenance = async (job) => {
  // Destructure the job object to get the maintenance type, offset, limit, and any additional data.
  const {
    type,
  } = job.data;

  let action; // Declare a variable to hold the maintenance action.

  switch (type) {
    case MAINTENANCE_TYPE.IDENTIFY_SPREAD_COMPLETED_REPORTS:
      // Set the action to vacuumTables function with the provided offset and limit.
      action = identifyAndSpreadReports();
      break;
    default:
      // Throw an error if an invalid maintenance type is provided.
      throw new Error(`Invalid Report maintenance type: ${type}`);
  }

  return action; // Return the maintenance action.
};

/**
 * Adds a job to the maintenance queue for database maintenance.
 * @param {string} type - The type of report maintenance to perform.
 * @returns {void}
 * @throws {Error} If an error occurs while adding the job to the maintenance queue.
 */
const enqueueReportMaintenanceJob = async (
  type,
) => enqueueMaintenanceJob(
  MAINTENANCE_CATEGORY.REPORT, // constant representing the category of maintenance
  {
    type, // shorthand property notation for type: type
  },
);

// This code adds a queue processor for report maintenance tasks.
// The MAINTENANCE_CATEGORY.REPORT is used to identify the category of maintenance task.
// The reportMaintenance function is passed as the callback function to be executed when
// a task in this category is processed.
addQueueProcessor(MAINTENANCE_CATEGORY.REPORT, reportMaintenance);

// Adds a cron job with the specified maintenance category, type, and function to execute
addCronJob(
  MAINTENANCE_CATEGORY.REPORT, // The maintenance category is "REPORT"
  // The maintenance type is "IDENTIFY_SPREAD_COMPLETED_REPORTS"
  MAINTENANCE_TYPE.IDENTIFY_SPREAD_COMPLETED_REPORTS,
  // The function to execute takes in the category, type, timezone, and schedule parameters
  (category, type, timezone, schedule) => new CronJob(
    schedule, // The schedule parameter specifies when the job should run
    () => enqueueReportMaintenanceJob( // Enqueues a database maintenance job
      // The maintenance type is "IDENTIFY_SPREAD_COMPLETED_REPORTS"
      MAINTENANCE_TYPE.IDENTIFY_SPREAD_COMPLETED_REPORTS,
    ),
    null,
    true,
    timezone, // The timezone parameter specifies the timezone in which the job should run
  ),
  /**
   * This cron expression breaks down as follows:
   *  0 - The minute when the job will run (in this case, 0 minutes past the hour)
   *  22 - The hour when the job will run (in this case, 10 pm)
   *  * - The day of the month when the job will run (in this case, any day of the month)
   *  * - The month when the job will run (in this case, any month)
   *  * - The day of the week when the job will run (in this case, any day of the week)
   * */
  '0 22 * * *',
);
