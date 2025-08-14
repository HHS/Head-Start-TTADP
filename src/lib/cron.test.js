import { CronJob } from 'cron';
// eslint-disable-next-line import/no-named-default
import { lastDayOfMonth, default as runCronJobs } from './cron';
import updateGrantsRecipients from './updateGrantsRecipients';
import {
  approvedDigest,
  changesRequestedDigest,
  collaboratorDigest,
  submittedDigest,
  recipientApprovedDigest,
  trainingReportTaskDueNotifications,
} from './mailer';

jest.mock('cron', () => ({
  CronJob: jest.fn().mockImplementation((schedule, jobFunction) => ({
    start: jest.fn(),
    schedule,
    jobFunction,
  })),
}));

jest.mock('./updateGrantsRecipients');
jest.mock('./mailer', () => ({
  approvedDigest: jest.fn().mockReturnValue('approvedDigest'),
  changesRequestedDigest: jest.fn().mockReturnValue('changesRequestedDigest'),
  collaboratorDigest: jest.fn().mockReturnValue('collaboratorDigest'),
  submittedDigest: jest.fn().mockReturnValue('submittedDigest'),
  recipientApprovedDigest: jest.fn().mockReturnValue('recipientApprovedDigest'),
  trainingReportTaskDueNotifications: jest.fn().mockReturnValue('trainingReportTaskDueNotifications'),
}));

describe('cron', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

      expect(CronJob).toHaveBeenCalledTimes(3);
    });

    it('starts all cron jobs in production on instance 0 non-cloud.gov', () => {
      process.env.CF_INSTANCE_INDEX = '0';
      process.env.NODE_ENV = 'production';
      process.env.TTA_SMART_HUB_URI = 'https://tta-smart-hub.anything.else';

      runCronJobs();

      expect(CronJob).toHaveBeenCalledTimes(4);
    });

    it('runs the updateGrantsRecipients job on schedule cloud.gov', () => {
      process.env.CF_INSTANCE_INDEX = '0';
      process.env.NODE_ENV = 'production';
      process.env.TTA_SMART_HUB_URI = 'https://tta-smart-hub.anything.else';

      runCronJobs();
      const jobFunction = CronJob.mock.calls[0][1];
      jobFunction();

      expect(updateGrantsRecipients).toHaveBeenCalled();
    });

    it('runs the daily email job on schedule', async () => {
      process.env.CF_INSTANCE_INDEX = '0';
      process.env.NODE_ENV = 'production';
      process.env.TTA_SMART_HUB_URI = 'https://tta-smart-hub.anything.else';

      runCronJobs();
      const jobFunction = CronJob.mock.calls[1][1];

      await jobFunction();

      expect(collaboratorDigest).toHaveBeenCalledWith('today', 'daily');
      expect(changesRequestedDigest).toHaveBeenCalledWith('today', 'daily');
      expect(submittedDigest).toHaveBeenCalledWith('today', 'daily');
      expect(approvedDigest).toHaveBeenCalledWith('today', 'daily');
      expect(recipientApprovedDigest).toHaveBeenCalledWith('today', 'daily');
    });

    it('runs the weekly email job on schedule', async () => {
      process.env.CF_INSTANCE_INDEX = '0';
      process.env.NODE_ENV = 'production';
      process.env.TTA_SMART_HUB_URI = 'https://tta-smart-hub.anything.else';

      runCronJobs();
      const jobFunction = CronJob.mock.calls[2][1];

      await jobFunction();

      expect(collaboratorDigest).toHaveBeenCalledWith('this week', 'weekly');
      expect(changesRequestedDigest).toHaveBeenCalledWith('this week', 'weekly');
      expect(submittedDigest).toHaveBeenCalledWith('this week', 'weekly');
      expect(approvedDigest).toHaveBeenCalledWith('this week', 'weekly');
      expect(recipientApprovedDigest).toHaveBeenCalledWith('this week', 'weekly');
    });

    it('runs the monthly email job only on the last day of the month', async () => {
      process.env.CF_INSTANCE_INDEX = '0';
      process.env.NODE_ENV = 'production';
      process.env.TTA_SMART_HUB_URI = 'https://tta-smart-hub.anything.else';
      const date = new Date('September 30, 2022 10:00:00');
      jest.spyOn(global, 'Date').mockImplementation(() => date);

      runCronJobs();
      const jobFunction = CronJob.mock.calls[3][1];

      await jobFunction();

      expect(collaboratorDigest).toHaveBeenCalledWith('this month', 'monthly');
      expect(changesRequestedDigest).toHaveBeenCalledWith('this month', 'monthly');
      expect(submittedDigest).toHaveBeenCalledWith('this month', 'monthly');
      expect(approvedDigest).toHaveBeenCalledWith('this month', 'monthly');
      expect(recipientApprovedDigest).toHaveBeenCalledWith('this month', 'monthly');
    });

    it('does not run the monthly email job if not the last day of the month', async () => {
      process.env.CF_INSTANCE_INDEX = '0';
      process.env.NODE_ENV = 'production';
      process.env.TTA_SMART_HUB_URI = 'https://tta-smart-hub.anything.else';
      const date = new Date('September 29, 2022 10:00:00');
      jest.spyOn(global, 'Date').mockImplementation(() => date);

      runCronJobs();
      const jobFunction = CronJob.mock.calls[3][1];

      await jobFunction();

      expect(collaboratorDigest).not.toHaveBeenCalled();
      expect(changesRequestedDigest).not.toHaveBeenCalled();
      expect(submittedDigest).not.toHaveBeenCalled();
      expect(approvedDigest).not.toHaveBeenCalled();
      expect(recipientApprovedDigest).not.toHaveBeenCalled();
    });
  });
});
