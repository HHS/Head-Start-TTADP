import { createTransport } from 'nodemailer';
import { DIGEST_SUBJECT_FREQ, EMAIL_ACTIONS, EMAIL_DIGEST_FREQ } from '../../constants';
import { createMailerLog } from '../../services/mailerLog';
import { monitoringReportsDeliveredInRegionByDate } from '../../services/monitoringDeliveries';
import { usersWithSetting } from '../../services/userSettings';
import {
  DIGEST_CONFIG,
  digestForSetting,
  monitoringDetailsAddedNotification,
  notificationQueue,
  notifyDigest,
  notifyMonitoringDetailsAdded,
} from '.';
import logEmailNotification, { logDigestEmailNotification } from './logNotifications';

jest.mock('bull');
jest.mock('../../logger');
jest.mock('../../services/mailerLog', () => ({
  createMailerLog: jest.fn().mockResolvedValue({ id: 1 }),
}));
jest.mock('../../services/monitoringDeliveries', () => ({
  monitoringReportsDeliveredInRegionByDate: jest.fn(),
}));
jest.mock('../../services/userSettings', () => ({
  usersWithSetting: jest.fn(),
  userSettingOverridesById: jest.fn(),
}));

const jsonTransport = createTransport({ jsonTransport: true });
const oldEnv = { ...process.env };

const delivery = {
  deliveredReviewId: 42,
  mrid: 4200,
  reportDeliveryDate: '2026-11-10',
  recipientId: 500,
  recipientName: 'Little Sprouts Head Start',
  regionId: 3,
  grantIds: [10],
};
const userA = { id: 1, name: 'TTAC A', email: 'a@test.gov', homeRegionId: 3 };
const userB = { id: 2, name: 'GSM B', email: 'b@test.gov', homeRegionId: 3 };

const jobData = {
  report: { id: 42, displayId: 'monitoring report for Little Sprouts Head Start' },
  user: { id: userA.id, name: userA.name, email: userA.email },
  recipientId: 500,
  recipientName: 'Little Sprouts Head Start',
  regionId: 3,
};

describe('monitoring details added email (TTAHUB-6004)', () => {
  beforeAll(() => {
    process.env.FROM_EMAIL_ADDRESS = 'fake@test.gov';
  });

  afterAll(() => {
    process.env = oldEnv;
  });

  describe('notifyMonitoringDetailsAdded', () => {
    it('sends the email with the expected subject, body and monitoring link', async () => {
      process.env.SEND_NOTIFICATIONS = 'true';
      const email = await notifyMonitoringDetailsAdded({ data: jobData }, jsonTransport);

      expect(email.envelope.to).toStrictEqual([userA.email]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe(
        'A new monitoring report is available for recipients in your region.'
      );
      expect(message.text).toContain('Hello,');
      expect(message.text).toContain(
        'A monitoring report for Little Sprouts Head Start is available.'
      );
      expect(message.text).toContain(
        `${process.env.TTA_SMART_HUB_URI}/recipient-tta-records/500/region/3/monitoring`
      );
      expect(message.text).toContain('The TTA Hub team');
    });

    it('does not send without SEND_NOTIFICATIONS', async () => {
      process.env.SEND_NOTIFICATIONS = 'false';
      expect(await notifyMonitoringDetailsAdded({ data: jobData }, jsonTransport)).toBeNull();
    });

    it('does not send to no-send addresses', async () => {
      process.env.SEND_NOTIFICATIONS = 'true';
      const data = { ...jobData, user: { ...jobData.user, email: 'no-send_a@test.gov' } };
      expect(await notifyMonitoringDetailsAdded({ data }, jsonTransport)).toBeNull();
    });
  });

  describe('monitoringDetailsAddedNotification', () => {
    it('enqueues one job per user for the recipient/report', () => {
      const addSpy = jest.spyOn(notificationQueue, 'add').mockClear();

      monitoringDetailsAddedNotification(delivery, [userA, userB]);

      expect(addSpy).toHaveBeenCalledTimes(2);
      expect(addSpy).toHaveBeenCalledWith(
        EMAIL_ACTIONS.MONITORING_DETAILS_ADDED,
        expect.objectContaining(jobData)
      );
      expect(addSpy).toHaveBeenCalledWith(
        EMAIL_ACTIONS.MONITORING_DETAILS_ADDED,
        expect.objectContaining({ user: { id: 2, name: 'GSM B', email: 'b@test.gov' } })
      );
    });

    it('enqueues nothing when no users want the email', () => {
      const addSpy = jest.spyOn(notificationQueue, 'add').mockClear();
      monitoringDetailsAddedNotification(delivery, []);
      expect(addSpy).not.toHaveBeenCalled();
    });
  });

  describe('logEmailNotification', () => {
    it('logs the subject and recipient without treating the review as an Activity Report', async () => {
      await logEmailNotification(
        { id: 7, name: EMAIL_ACTIONS.MONITORING_DETAILS_ADDED, data: jobData },
        true,
        {}
      );

      expect(createMailerLog).toHaveBeenCalledWith(
        expect.objectContaining({
          emailTo: [userA.email],
          action: EMAIL_ACTIONS.MONITORING_DETAILS_ADDED,
          subject: 'A new monitoring report is available for recipients in your region.',
          activityReports: [],
        })
      );
    });
  });

  describe('monitoring digest (TTAHUB-6062)', () => {
    const config = DIGEST_CONFIG[EMAIL_ACTIONS.MONITORING_DETAILS_ADDED_DIGEST];
    const recipients = [
      { id: 1, displayId: 'Alpha Start', regionId: 3 },
      { id: 2, displayId: 'Zeta Start', regionId: 3 },
    ];
    const digestUser = { id: 9, name: 'TTAC', email: 'ttac@test.gov' };

    it('is registered for the monitoring email setting and links to the monitoring tab', () => {
      expect(config).toEqual(
        expect.objectContaining({
          settingKey: 'emailWhenMonitoringDetailsAdded',
          reportFetcher: monitoringReportsDeliveredInRegionByDate,
          actionType: 'monitoringDetailsAddedDigest',
          skipEmpty: true,
        })
      );
      expect(config.reportLink(recipients[0])).toBe('/recipient-tta-records/1/region/3/monitoring');
    });

    it('enqueues digests only for users with recipients in the window', async () => {
      const addSpy = jest.spyOn(notificationQueue, 'add').mockClear();
      usersWithSetting.mockResolvedValue([digestUser, { id: 10, email: 'empty@test.gov' }]);
      monitoringReportsDeliveredInRegionByDate.mockImplementation(async (userId) =>
        userId === digestUser.id ? recipients : []
      );

      const result = await digestForSetting({
        ...config,
        freq: EMAIL_DIGEST_FREQ.WEEKLY,
        subjectFreq: DIGEST_SUBJECT_FREQ.WEEKLY,
      });

      expect(usersWithSetting).toHaveBeenCalledWith('emailWhenMonitoringDetailsAdded', [
        EMAIL_DIGEST_FREQ.WEEKLY,
      ]);
      expect(monitoringReportsDeliveredInRegionByDate).toHaveBeenCalledWith(
        digestUser.id,
        "NOW() - INTERVAL '1 WEEK'"
      );
      expect(addSpy).toHaveBeenCalledTimes(1);
      expect(addSpy).toHaveBeenCalledWith(
        EMAIL_ACTIONS.MONITORING_DETAILS_ADDED_DIGEST,
        expect.objectContaining({ user: digestUser, reports: recipients })
      );
      expect(result).toHaveLength(1);
    });

    it.each([
      ['DAILY', 'daily', 'today'],
      ['WEEKLY', 'weekly', 'this week'],
      ['MONTHLY', 'monthly', 'this month'],
    ])('renders the %s digest subject and recipient list', async (key, subjectFreq, freq) => {
      process.env.SEND_NOTIFICATIONS = 'true';
      const email = await notifyDigest(
        {
          data: {
            user: digestUser,
            reports: recipients,
            type: EMAIL_ACTIONS.MONITORING_DETAILS_ADDED_DIGEST,
            freq: EMAIL_DIGEST_FREQ[key],
            subjectFreq: DIGEST_SUBJECT_FREQ[key],
          },
        },
        jsonTransport
      );

      const message = JSON.parse(email.message);
      expect(email.envelope.to).toStrictEqual([digestUser.email]);
      expect(message.subject).toBe(`TTA Hub ${subjectFreq} digest: new monitoring reports`);
      expect(message.text).toContain(`Below are your report notifications for ${freq}.`);
      expect(message.text).toContain(
        'New monitoring reports were added in your region for these recipients:'
      );
      expect(message.html).toContain(
        `href="${process.env.TTA_SMART_HUB_URI}/recipient-tta-records/1/region/3/monitoring"`
      );
      expect(message.html).toContain(
        `href="${process.env.TTA_SMART_HUB_URI}/recipient-tta-records/2/region/3/monitoring"`
      );
      expect(message.text).toContain('Alpha Start');
      expect(message.text).toContain('Zeta Start');
      expect(message.text).not.toContain('activity-reports');
    });

    it('logs the monitoring digest subject without Activity Report ids', async () => {
      createMailerLog.mockClear();
      await logDigestEmailNotification(
        {
          id: 8,
          name: EMAIL_ACTIONS.MONITORING_DETAILS_ADDED_DIGEST,
          data: { user: digestUser, reports: recipients, subjectFreq: 'daily' },
        },
        true,
        {}
      );

      expect(createMailerLog).toHaveBeenCalledWith(
        expect.objectContaining({
          emailTo: [digestUser.email],
          subject: 'TTA Hub daily digest: new monitoring reports',
          activityReports: [],
        })
      );
    });
  });
});
