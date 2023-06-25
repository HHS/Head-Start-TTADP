const { CronJob } = require('cron');
const { processMaintenanceQueue } = require('./common');
const { enqueueDBMaintenanceJob } = require('./db');
const { MAINTENANCE_TYPE, MAINTENANCE_CATEGORY } = require('../../constants');

const runMaintenanceCronJobs = (timezone) => {
  const dailyDB = new CronJob(
    /**
     * This cron expression breaks down as follows:
     *  0 - The minute when the job will run (in this case, 0 minutes past the hour)
     *  23 - The hour when the job will run (in this case, 11 pm)
     *  * - The day of the month when the job will run (in this case, any day of the month)
     *  * - The month when the job will run (in this case, any month)
     *  * - The day of the week when the job will run (in this case, any day of the week)
     * */
    '0 23 * * *',
    () => enqueueDBMaintenanceJob(
      MAINTENANCE_TYPE.DAILY_DB_MAINTENANCE,
      null,
      0.2, // 20% of the tables each day
    ),
    null,
    true,
    timezone,
  );
  dailyDB.start();

  return [dailyDB];
};

module.exports = {
  processMaintenanceQueue,
  runMaintenanceCronJobs,
};
