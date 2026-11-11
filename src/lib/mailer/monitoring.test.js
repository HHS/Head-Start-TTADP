import { createTransport } from 'nodemailer';
import { EMAIL_ACTIONS } from '../../constants';
import { createMailerLog } from '../../services/mailerLog';
import {
  monitoringDetailsAddedNotification,
  notificationQueue,
  notifyMonitoringDetailsAdded,
} from '.';
import logEmailNotification from './logNotifications';

jest.mock('bull');
jest.mock('../../logger');
jest.mock('../../services/mailerLog', () => ({
  createMailerLog: jest.fn().mockResolvedValue({ id: 1 }),
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
});
