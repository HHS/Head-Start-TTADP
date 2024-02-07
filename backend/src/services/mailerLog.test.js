import faker from '@faker-js/faker';
import { EMAIL_ACTIONS } from '../constants';
import db, {
  MailerLogs,
} from '../models';
import { createMailerLog } from './mailerLog';

describe('MailerLog DB service', () => {
  const jobId = '2';
  const emailTo = ['test@test.gov'];
  const action = EMAIL_ACTIONS.APPROVED;
  const subject = 'Activity Report AR-09-1234: Approved';
  const activityReports = [1234];
  const success = false;
  const result = {
    errno: -4078, code: 'ESOCKET', syscall: 'connect', address: '127.0.0.1', port: 1025, command: 'CONN',
  };

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('createMailerLog', () => {
    it('creates a mailer log entry', async () => {
      const mailerLog = await createMailerLog({
        jobId,
        emailTo,
        action,
        subject,
        activityReports,
        success,
        result,
      });
      const retrievedMailerLog = await MailerLogs.findOne({
        where: {
          id: mailerLog.id,
        },
      });
      expect(retrievedMailerLog).toBeDefined();
      expect(retrievedMailerLog.id).toEqual(String(mailerLog.id));
      expect(retrievedMailerLog.action).toEqual(action);
      expect(retrievedMailerLog.subject).toEqual(subject);
      expect(retrievedMailerLog.activityReports).toEqual(activityReports);
      expect(retrievedMailerLog.success).toEqual(success);
      expect(retrievedMailerLog.result).toEqual(result);
      expect(retrievedMailerLog.createdAt).toBeDefined();
      expect(retrievedMailerLog.updatedAt).toBeDefined();
      await MailerLogs.destroy({ where: { id: mailerLog.id } });
    });

    it('abbreviates a long subject', async () => {
      const longSentence = faker.lorem.sentence(300);

      const mailerLog = await createMailerLog({
        jobId,
        emailTo,
        action,
        subject: longSentence,
        activityReports,
        success,
        result,
      });
      const retrievedMailerLog = await MailerLogs.findOne({
        where: {
          id: mailerLog.id,
        },
      });
      expect(retrievedMailerLog).toBeDefined();
      expect(retrievedMailerLog.id).toEqual(String(mailerLog.id));
      expect(retrievedMailerLog.action).toEqual(action);
      expect(retrievedMailerLog.subject.length).toBe(255);
      expect(retrievedMailerLog.subject.length).toBeLessThan(longSentence.length);
      expect(retrievedMailerLog.activityReports).toEqual(activityReports);
      expect(retrievedMailerLog.success).toEqual(success);
      expect(retrievedMailerLog.result).toEqual(result);
      expect(retrievedMailerLog.createdAt).toBeDefined();
      expect(retrievedMailerLog.updatedAt).toBeDefined();
      await MailerLogs.destroy({ where: { id: mailerLog.id } });
    });

    it('returns null on error', async () => {
      const mailerLog = await createMailerLog({
        jobId: undefined,
        emailTo,
        action,
        subject,
        activityReports,
        success,
        result,
      });
      expect(mailerLog).toBeNull();
    });
  });
});
