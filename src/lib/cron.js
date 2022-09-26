import { CronJob } from 'cron';
import updateGrantsRecipients from './updateGrantsRecipients';
import {
  approvedDigest, changesRequestedDigest, collaboratorDigest, submittedDigest,
} from './mailer';
import {
  DIGEST_SUBJECT_FREQ, EMAIL_DIGEST_FREQ,
} from '../constants';
import { logger, auditLogger } from '../logger';

// Set timing parameters.
// Run at 4 am ET
const schedule = '0 4 * * *';
// const dailyEmailDigestSchedule = '*/10 * * * * *';
// Run daily at 4 pm
// const dailySched = '0 16 * * *';
// const dailySched = '*/10 * * * * *';
// const tmpSched = '0 * * * *'; // every hour
const tmpSched = '*/10 * * * * *'; // every hour
// Run at 4 pm every Friday
// const weeklySched = '0 16 * * 5';
// Run at 4 pm on the last of the month
const monthlySched = '0 16 30 * *';
const timezone = 'America/New_York';

const runJob = () => {
  try {
    return updateGrantsRecipients();
  } catch (error) {
    auditLogger.error(`Error processing HSES file: ${error}`);
    logger.error(error.stack);
  }
  return false;
};

const runDailyEmailJob = () => {
  (async () => {
    logger.info('Starting daily digests');
    try {
      await collaboratorDigest(EMAIL_DIGEST_FREQ.DAILY, DIGEST_SUBJECT_FREQ.DAILY);
      await changesRequestedDigest(EMAIL_DIGEST_FREQ.DAILY, DIGEST_SUBJECT_FREQ.DAILY);
      await submittedDigest(EMAIL_DIGEST_FREQ.DAILY, DIGEST_SUBJECT_FREQ.DAILY);
      await approvedDigest(EMAIL_DIGEST_FREQ.DAILY, DIGEST_SUBJECT_FREQ.DAILY);
    } catch (error) {
      auditLogger.error(`Error processing Daily Email Digest job: ${error}`);
      logger.error(`Daily Email Digest Error: ${error.stack}`);
    }
  })();
  return true;
};

const runWeeklyEmailJob = () => {
  (async () => {
    logger.info('Starting weekly digests');
    try {
      await collaboratorDigest(EMAIL_DIGEST_FREQ.WEEKLY, DIGEST_SUBJECT_FREQ.WEEKLY);
      await changesRequestedDigest(EMAIL_DIGEST_FREQ.WEEKLY, DIGEST_SUBJECT_FREQ.WEEKLY);
      await submittedDigest(EMAIL_DIGEST_FREQ.WEEKLY, DIGEST_SUBJECT_FREQ.WEEKLY);
      await approvedDigest(EMAIL_DIGEST_FREQ.WEEKLY, DIGEST_SUBJECT_FREQ.WEEKLY);
    } catch (error) {
      auditLogger.error(`Error processing Weekly Email Digest job: ${error}`);
      logger.error(`Weekly Email Digest Error: ${error.stack}`);
    }
  })();
  return true;
};

const runMonthlyEmailJob = () => {
  (async () => {
    logger.info('Starting montly digests');
    try {
      await collaboratorDigest(EMAIL_DIGEST_FREQ.MONTHLY, DIGEST_SUBJECT_FREQ.MONTHLY);
      await changesRequestedDigest(EMAIL_DIGEST_FREQ.MONTHLY, DIGEST_SUBJECT_FREQ.MONTHLY);
      await submittedDigest(EMAIL_DIGEST_FREQ.MONTHLY, DIGEST_SUBJECT_FREQ.MONTHLY);
      await approvedDigest(EMAIL_DIGEST_FREQ.MONTHLY, DIGEST_SUBJECT_FREQ.MONTHLY);
    } catch (error) {
      auditLogger.error(`Error processing Monthly Email Digest job: ${error}`);
      logger.error(`Monthly Email Digest Error: ${error.stack}`);
    }
  })();
  return true;
};

/**
 * Runs the application's cron jobs
 */
export default function runCronJobs() {
  // Run only on one instance
  if (process.env.CF_INSTANCE_INDEX === '0' && process.env.NODE_ENV === 'production') {
    const job = new CronJob(schedule, () => runJob(), null, true, timezone);
    job.start();
    const dailyJob = new CronJob(tmpSched, () => runDailyEmailJob(), null, true, timezone);
    dailyJob.start();
    const weeklyJob = new CronJob(tmpSched, () => runWeeklyEmailJob(), null, true, timezone);
    weeklyJob.start();
    const monthlyJob = new CronJob(monthlySched, () => runMonthlyEmailJob(), null, true, timezone);
    monthlyJob.start();
  }
}
