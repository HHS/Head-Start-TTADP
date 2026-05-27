import { CronJob } from 'cron';
import { auditLogger, logger } from '../logger';
import deleteOldRecords from '../tools/dbMaintenance';
import { lastDayOfMonth, runCronJobs } from './cron';
import { DIGEST_CONFIG, digestForSetting, recipientApprovedDigest } from './mailer';
import updateGrantsRecipients from './updateGrantsRecipients';

jest.mock('cron', () => ({
  CronJob: jest.fn().mockImplementation((schedule, jobFunction) => ({
    start: jest.fn(),
    schedule,
    jobFunction,
  })),
}));

jest.mock('../logger', () => ({
  auditLogger: {
    error: jest.fn(),
  },
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('./updateGrantsRecipients');
jest.mock('../tools/dbMaintenance');
jest.mock('./mailer', () => ({
  DIGEST_CONFIG: [
    {
      settingKey: 'collaborator',
      reportFetcher: 'collaboratorFetcher',
      actionType: 'collaboratorAction',
      logKey: 'CollaboratorDigest',
    },
    {
      settingKey: 'changesRequested',
      reportFetcher: 'changesRequestedFetcher',
      actionType: 'changesRequestedAction',
      logKey: 'ChangesRequestedDigest',
    },
    {
      settingKey: 'submitted',
      reportFetcher: 'submittedFetcher',
      actionType: 'submittedAction',
      logKey: 'SubmittedDigest',
    },
    {
      settingKey: 'approved',
      reportFetcher: 'approvedFetcher',
      actionType: 'approvedAction',
      logKey: 'ApprovedDigest',
    },
  ],
  digestForSetting: jest.fn().mockResolvedValue('digestForSetting'),
  recipientApprovedDigest: jest.fn().mockReturnValue('recipientApprovedDigest'),
  trainingReportTaskDueNotifications: jest
    .fn()
    .mockReturnValue('trainingReportTaskDueNotifications'),
}));

describe('cron', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getScheduledJob = (jobName) => {
    const job = CronJob.mock.results
      .map(({ value }) => value)
      .find(({ jobFunction }) => jobFunction.name === jobName);

    expect(job).toBeDefined();
    return job;
  };

  describe('lastDayOfMonth', () => {
    it('returns true if it is the last day of the month', () => {
      const today = new Date('September 30, 2022 10:00:00');
      expect(lastDayOfMonth(today)).toBe(true);
    });

    it('returns false if it is not the last day of the month', () => {
      const today = new Date('February 28, 2024 10:00:00');
      expect(lastDayOfMonth(today)).toBe(false);
    });
  });

  describe('runCronJobs', () => {
    let envBackup;

    beforeEach(() => {
      envBackup = { ...process.env };
    });

    afterEach(() => {
      process.env = envBackup;
      jest.restoreAllMocks();
    });

    it('does not start cron jobs if CF_INSTANCE_INDEX is not 0', () => {
      process.env.CF_INSTANCE_INDEX = '1';
      process.env.NODE_ENV = 'production';

      runCronJobs();

      expect(CronJob).not.toHaveBeenCalled();
    });

    it('does not start cron jobs if NODE_ENV is not production', () => {
      process.env.CF_INSTANCE_INDEX = '0';
      process.env.NODE_ENV = 'development';

      runCronJobs();

      expect(CronJob).not.toHaveBeenCalled();
    });

    it('does not start the updateGrantsRecipients job if TTA_SMART_HUB_URI is non-production', () => {
      process.env.CF_INSTANCE_INDEX = '0';
      process.env.NODE_ENV = 'production';
      process.env.TTA_SMART_HUB_URI = 'https://staging.app.com';

      runCronJobs();

      expect(updateGrantsRecipients).not.toHaveBeenCalled();
    });

    it('starts all cron jobs in production on instance 0', () => {
      process.env.CF_INSTANCE_INDEX = '0';
      process.env.NODE_ENV = 'production';
      process.env.TTA_SMART_HUB_URI = 'https://tta-smart-hub.app.cloud.gov';

      runCronJobs();

      expect(CronJob).toHaveBeenCalledTimes(4);
    });

    it('starts all cron jobs in production on instance 0 non-cloud.gov', () => {
      process.env.CF_INSTANCE_INDEX = '0';
      process.env.NODE_ENV = 'production';
      process.env.TTA_SMART_HUB_URI = 'https://tta-smart-hub.anything.else';

      runCronJobs();

      expect(CronJob).toHaveBeenCalledTimes(5);
    });

    it('runs the updateGrantsRecipients job on schedule', () => {
      process.env.CF_INSTANCE_INDEX = '0';
      process.env.NODE_ENV = 'production';
      process.env.TTA_SMART_HUB_URI = 'https://tta-smart-hub.anything.else';

      runCronJobs();
      const { jobFunction } = getScheduledJob('runUpdateJob');

      jobFunction();

      expect(updateGrantsRecipients).toHaveBeenCalled();
    });

    it('runs the daily email job on schedule', async () => {
      process.env.CF_INSTANCE_INDEX = '0';
      process.env.NODE_ENV = 'production';
      process.env.TTA_SMART_HUB_URI = 'https://tta-smart-hub.anything.else';

      runCronJobs();
      const { jobFunction } = getScheduledJob('runDailyEmailJob');

      await jobFunction();

      expect(digestForSetting).toHaveBeenCalledTimes(DIGEST_CONFIG.length);
      expect(digestForSetting).toHaveBeenNthCalledWith(1, {
        ...DIGEST_CONFIG[0],
        freq: 'today',
        subjectFreq: 'daily',
      });
      expect(digestForSetting).toHaveBeenNthCalledWith(2, {
        ...DIGEST_CONFIG[1],
        freq: 'today',
        subjectFreq: 'daily',
      });
      expect(digestForSetting).toHaveBeenNthCalledWith(3, {
        ...DIGEST_CONFIG[2],
        freq: 'today',
        subjectFreq: 'daily',
      });
      expect(digestForSetting).toHaveBeenNthCalledWith(4, {
        ...DIGEST_CONFIG[3],
        freq: 'today',
        subjectFreq: 'daily',
      });
      expect(recipientApprovedDigest).toHaveBeenCalledWith('today', 'daily');
    });

    it('runs the weekly email job on schedule', async () => {
      process.env.CF_INSTANCE_INDEX = '0';
      process.env.NODE_ENV = 'production';
      process.env.TTA_SMART_HUB_URI = 'https://tta-smart-hub.anything.else';

      runCronJobs();
      const { jobFunction } = getScheduledJob('runWeeklyEmailJob');

      await jobFunction();

      expect(digestForSetting).toHaveBeenCalledTimes(DIGEST_CONFIG.length);
      expect(digestForSetting).toHaveBeenNthCalledWith(1, {
        ...DIGEST_CONFIG[0],
        freq: 'this week',
        subjectFreq: 'weekly',
      });
      expect(digestForSetting).toHaveBeenNthCalledWith(2, {
        ...DIGEST_CONFIG[1],
        freq: 'this week',
        subjectFreq: 'weekly',
      });
      expect(digestForSetting).toHaveBeenNthCalledWith(3, {
        ...DIGEST_CONFIG[2],
        freq: 'this week',
        subjectFreq: 'weekly',
      });
      expect(digestForSetting).toHaveBeenNthCalledWith(4, {
        ...DIGEST_CONFIG[3],
        freq: 'this week',
        subjectFreq: 'weekly',
      });
      expect(recipientApprovedDigest).toHaveBeenCalledWith('this week', 'weekly');
    });

    it('runs the monthly email job only on the last day of the month', async () => {
      process.env.CF_INSTANCE_INDEX = '0';
      process.env.NODE_ENV = 'production';
      process.env.TTA_SMART_HUB_URI = 'https://tta-smart-hub.anything.else';
      const date = new Date('September 30, 2022 10:00:00');
      jest.spyOn(global, 'Date').mockImplementation(() => date);

      runCronJobs();
      const { jobFunction } = getScheduledJob('runMonthlyEmailJob');

      await jobFunction();

      expect(digestForSetting).toHaveBeenCalledTimes(DIGEST_CONFIG.length);
      expect(digestForSetting).toHaveBeenNthCalledWith(1, {
        ...DIGEST_CONFIG[0],
        freq: 'this month',
        subjectFreq: 'monthly',
      });
      expect(digestForSetting).toHaveBeenNthCalledWith(2, {
        ...DIGEST_CONFIG[1],
        freq: 'this month',
        subjectFreq: 'monthly',
      });
      expect(digestForSetting).toHaveBeenNthCalledWith(3, {
        ...DIGEST_CONFIG[2],
        freq: 'this month',
        subjectFreq: 'monthly',
      });
      expect(digestForSetting).toHaveBeenNthCalledWith(4, {
        ...DIGEST_CONFIG[3],
        freq: 'this month',
        subjectFreq: 'monthly',
      });
      expect(recipientApprovedDigest).toHaveBeenCalledWith('this month', 'monthly');
    });

    it('runs the audit log cleanup job on schedule', async () => {
      process.env.CF_INSTANCE_INDEX = '0';
      process.env.NODE_ENV = 'production';
      process.env.TTA_SMART_HUB_URI = 'https://tta-smart-hub.app.cloud.gov';

      runCronJobs();
      const { jobFunction } = getScheduledJob('runDBCleanupJob');

      await jobFunction();

      expect(deleteOldRecords).toHaveBeenCalled();
    });

    it('logs audit log cleanup errors with normalized messages and stack details', async () => {
      process.env.CF_INSTANCE_INDEX = '0';
      process.env.NODE_ENV = 'production';
      process.env.TTA_SMART_HUB_URI = 'https://tta-smart-hub.app.cloud.gov';
      const error = new Error('cleanup failed');
      deleteOldRecords.mockRejectedValueOnce(error);

      runCronJobs();
      const { jobFunction } = getScheduledJob('runDBCleanupJob');

      await jobFunction();

      expect(auditLogger.error).toHaveBeenCalledWith(
        'Error processing Audit Log Cleanup job: cleanup failed'
      );
      expect(logger.error).toHaveBeenCalledWith('Audit Log Cleanup Error: cleanup failed');
      expect(logger.error).toHaveBeenCalledWith(error.stack);
    });

    it('logs non-error cron failures without losing object details', async () => {
      process.env.CF_INSTANCE_INDEX = '0';
      process.env.NODE_ENV = 'production';
      process.env.TTA_SMART_HUB_URI = 'https://tta-smart-hub.anything.else';
      digestForSetting.mockRejectedValueOnce({ reason: 'digest failed' });

      runCronJobs();
      const { jobFunction } = getScheduledJob('runDailyEmailJob');

      await jobFunction();

      expect(auditLogger.error).toHaveBeenCalledWith(
        'Error processing daily Email Digest job: {"reason":"digest failed"}'
      );
      expect(logger.error).toHaveBeenCalledWith(
        'daily Email Digest Error: {"reason":"digest failed"}'
      );
      expect(logger.error).toHaveBeenCalledWith({ reason: 'digest failed' });
    });

    it('does not run the monthly email job if not the last day of the month', async () => {
      process.env.CF_INSTANCE_INDEX = '0';
      process.env.NODE_ENV = 'production';
      process.env.TTA_SMART_HUB_URI = 'https://tta-smart-hub.anything.else';
      const date = new Date('September 29, 2022 10:00:00');
      jest.spyOn(global, 'Date').mockImplementation(() => date);

      runCronJobs();
      const { jobFunction } = getScheduledJob('runMonthlyEmailJob');

      await jobFunction();

      expect(digestForSetting).not.toHaveBeenCalled();
      expect(recipientApprovedDigest).not.toHaveBeenCalled();
    });
  });
});
