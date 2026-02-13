import { CronJob } from 'cron'
import updateGrantsRecipients from './updateGrantsRecipients'
import {
  approvedDigest,
  changesRequestedDigest,
  collaboratorDigest,
  submittedDigest,
  recipientApprovedDigest,
  trainingReportTaskDueNotifications,
} from './mailer'
import { DIGEST_SUBJECT_FREQ, EMAIL_DIGEST_FREQ } from '../constants'
import { logger, auditLogger } from '../logger'
import { isTrue } from '../envParser'

// Set timing parameters.
// Run at 4 am ET
const schedule = '0 4 * * *'
// Run daily at 4 pm
const dailySched = '1 16 * * 1-5'
// Run at 4 pm every Friday
const weeklySched = '5 16 * * 5'
// Run at 4 pm on the last of the month
const monthlySched = '10 16 28-31 * *'
const timezone = 'America/New_York'

const runUpdateJob = () => {
  try {
    logger.info('Starting update job')
    return updateGrantsRecipients()
  } /* istanbul ignore next: can't force an error here */ catch (error) {
    auditLogger.error(`Error processing HSES file: ${error}`)
    logger.error(error)
  }
  return false
}

const runDailyEmailJob = () =>
  (async () => {
    logger.info('Starting daily digests')
    try {
      await collaboratorDigest(EMAIL_DIGEST_FREQ.DAILY, DIGEST_SUBJECT_FREQ.DAILY)
      await changesRequestedDigest(EMAIL_DIGEST_FREQ.DAILY, DIGEST_SUBJECT_FREQ.DAILY)
      await submittedDigest(EMAIL_DIGEST_FREQ.DAILY, DIGEST_SUBJECT_FREQ.DAILY)
      await approvedDigest(EMAIL_DIGEST_FREQ.DAILY, DIGEST_SUBJECT_FREQ.DAILY)
      await recipientApprovedDigest(EMAIL_DIGEST_FREQ.DAILY, DIGEST_SUBJECT_FREQ.DAILY)
      if (process.env.SEND_TRAININGREPORTTASKDUENOTIFICATION === 'true') {
        await trainingReportTaskDueNotifications(EMAIL_DIGEST_FREQ.DAILY)
      }
      logger.info('Completed daily digests')
    } catch (error) {
      auditLogger.error(`Error processing Daily Email Digest job: ${error}`)
      logger.error(`Daily Email Digest Error: ${error}`)
    }
  })()

const runWeeklyEmailJob = () =>
  (async () => {
    logger.info('Starting weekly digests')
    try {
      await collaboratorDigest(EMAIL_DIGEST_FREQ.WEEKLY, DIGEST_SUBJECT_FREQ.WEEKLY)
      await changesRequestedDigest(EMAIL_DIGEST_FREQ.WEEKLY, DIGEST_SUBJECT_FREQ.WEEKLY)
      await submittedDigest(EMAIL_DIGEST_FREQ.WEEKLY, DIGEST_SUBJECT_FREQ.WEEKLY)
      await approvedDigest(EMAIL_DIGEST_FREQ.WEEKLY, DIGEST_SUBJECT_FREQ.WEEKLY)
      await recipientApprovedDigest(EMAIL_DIGEST_FREQ.WEEKLY, DIGEST_SUBJECT_FREQ.WEEKLY)
      logger.info('Completed weekly digests')
    } catch (error) {
      auditLogger.error(`Error processing Weekly Email Digest job: ${error}`)
      logger.error(`Weekly Email Digest Error: ${error}`)
    }
  })()

export const lastDayOfMonth = (date) => {
  const tomorrow = new Date(date)

  tomorrow.setDate(date.getDate() + 1)

  return tomorrow.getDate() === 1
}

const runMonthlyEmailJob = () =>
  (async () => {
    logger.info('Starting monthly digests')
    if (!lastDayOfMonth(new Date())) {
      return
    }
    try {
      await collaboratorDigest(EMAIL_DIGEST_FREQ.MONTHLY, DIGEST_SUBJECT_FREQ.MONTHLY)
      await changesRequestedDigest(EMAIL_DIGEST_FREQ.MONTHLY, DIGEST_SUBJECT_FREQ.MONTHLY)
      await submittedDigest(EMAIL_DIGEST_FREQ.MONTHLY, DIGEST_SUBJECT_FREQ.MONTHLY)
      await approvedDigest(EMAIL_DIGEST_FREQ.MONTHLY, DIGEST_SUBJECT_FREQ.MONTHLY)
      await recipientApprovedDigest(EMAIL_DIGEST_FREQ.MONTHLY, DIGEST_SUBJECT_FREQ.MONTHLY)
      logger.info('Completed monthly digests')
    } catch (error) {
      auditLogger.error(`Error processing Monthly Email Digest job: ${error}`)
      logger.error(`Monthly Email Digest Error: ${error}`)
    }
  })()

/**
 * Runs the application's cron jobs
 */
export default function runCronJobs() {
  // Run only on one instance
  if ((process.env.CF_INSTANCE_INDEX === '0' && process.env.NODE_ENV === 'production') || isTrue('FORCE_CRON')) {
    // disable updates for non-production environments
    if (process.env.TTA_SMART_HUB_URI && !process.env.TTA_SMART_HUB_URI.endsWith('app.cloud.gov')) {
      const job = new CronJob(schedule, () => runUpdateJob(), null, true, timezone)
      job.start()
    }
    logger.info('Scheduling cron jobs')
    const dailyJob = new CronJob(dailySched, () => runDailyEmailJob(), null, true, timezone)
    dailyJob.start()
    const weeklyJob = new CronJob(weeklySched, () => runWeeklyEmailJob(), null, true, timezone)
    weeklyJob.start()
    const monthlyJob = new CronJob(monthlySched, () => runMonthlyEmailJob(), null, true, timezone)
    monthlyJob.start()
  }
}
