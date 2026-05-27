import { CronJob } from 'cron';
import { DIGEST_SUBJECT_FREQ, EMAIL_DIGEST_FREQ } from '../constants';
import { isTrue } from '../envParser';
import { auditLogger, logger } from '../logger';
import deleteOldRecords from '../tools/dbMaintenance';
import {
  DIGEST_CONFIG,
  digestForSetting,
  recipientApprovedDigest,
  trainingReportTaskDueNotifications,
} from './mailer';
import updateGrantsRecipients from './updateGrantsRecipients';

// Set timing parameters.
// Run at 4 am ET
const dailyNightSched = '0 4 * * *';
// Run daily at 4 PM
const dailyDaySched = '1 16 * * 1-5';
// Run at 4 PM every Friday
const weeklySched = '5 16 * * 5';
// Run at 4 PM on the last of the month
const monthlySched = '10 16 28-31 * *';
const timezone = 'America/New_York';

const errorMessage = (error) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch (_err) {
    return String(error);
  }
};

const logCronError = (auditMessage, loggerMessage, error) => {
  const message = errorMessage(error);
  auditLogger.error(`${auditMessage}: ${message}`);
  logger.error(`${loggerMessage}: ${message}`);
  logger.error(error instanceof Error ? error.stack || error : error);
};

const runUpdateJob = () => {
  try {
    logger.info('Starting update job');
    return updateGrantsRecipients();
  } /* istanbul ignore next: can't force an error here */ catch (error) {
    logCronError('Error processing HSES file', 'HSES file Error', error);
  }
  return false;
};

const runDigestJob =
  (freqKey, { checkLastDay = false, includeTrainingReport = false } = {}) =>
  () =>
    (async () => {
      const label = freqKey.toLowerCase();
      logger.info(`Starting ${label} digests`);
      if (checkLastDay && !lastDayOfMonth(new Date())) {
        return;
      }
      try {
        for (const config of DIGEST_CONFIG) {
          // eslint-disable-next-line no-await-in-loop
          await digestForSetting({
            ...config,
            freq: EMAIL_DIGEST_FREQ[freqKey],
            subjectFreq: DIGEST_SUBJECT_FREQ[freqKey],
          });
        }
        await recipientApprovedDigest(EMAIL_DIGEST_FREQ[freqKey], DIGEST_SUBJECT_FREQ[freqKey]);
        if (
          includeTrainingReport &&
          process.env.SEND_TRAININGREPORTTASKDUENOTIFICATION === 'true'
        ) {
          await trainingReportTaskDueNotifications(EMAIL_DIGEST_FREQ[freqKey]);
        }
        logger.info(`Completed ${label} digests`);
      } catch (error) {
        logCronError(
          `Error processing ${label} Email Digest job`,
          `${label} Email Digest Error`,
          error
        );
      }
    })();

export const lastDayOfMonth = (date) => {
  const tomorrow = new Date(date);

  tomorrow.setDate(date.getDate() + 1);

  return tomorrow.getDate() === 1;
};

const dailyDigestJob = runDigestJob('DAILY', { includeTrainingReport: true });
const weeklyDigestJob = runDigestJob('WEEKLY');
const monthlyDigestJob = runDigestJob('MONTHLY', { checkLastDay: true });

const runDailyEmailJob = () => dailyDigestJob();
const runWeeklyEmailJob = () => weeklyDigestJob();
const runMonthlyEmailJob = () => monthlyDigestJob();

const runDBCleanupJob = () =>
  (async () => {
    logger.info('Starting audit log cleanup');
    try {
      await deleteOldRecords();
      logger.info('Completed audit log cleanup');
    } catch (error) {
      logCronError('Error processing Audit Log Cleanup job', 'Audit Log Cleanup Error', error);
    }
  })();

/**
 * Runs the application's cron jobs
 */
function runCronJobs() {
  // Run only on one instance
  if (
    (process.env.CF_INSTANCE_INDEX === '0' && process.env.NODE_ENV === 'production') ||
    isTrue('FORCE_CRON')
  ) {
    // disable updates for non-production environments
    if (process.env.TTA_SMART_HUB_URI && !process.env.TTA_SMART_HUB_URI.endsWith('app.cloud.gov')) {
      const job = new CronJob(dailyNightSched, runUpdateJob, null, true, timezone);
      job.start();
    }
    logger.info('Scheduling cron jobs');
    const dailyJob = new CronJob(dailyDaySched, runDailyEmailJob, null, true, timezone);
    dailyJob.start();
    const weeklyJob = new CronJob(weeklySched, runWeeklyEmailJob, null, true, timezone);
    weeklyJob.start();
    const monthlyJob = new CronJob(monthlySched, runMonthlyEmailJob, null, true, timezone);
    monthlyJob.start();
    const dbCleanupJob = new CronJob(dailyNightSched, runDBCleanupJob, null, true, timezone);
    dbCleanupJob.start();
    logger.info('Cron jobs scheduled');
  }
}

export { dailyDaySched, dailyNightSched, monthlySched, runCronJobs, weeklySched };
