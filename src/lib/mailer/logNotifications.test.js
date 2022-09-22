import { EMAIL_ACTIONS } from '../../constants';
import db from '../../models';
import logEmailNotification, { logDigestEmailNotification } from './logNotifications';
import * as mailerLogM from '../../services/mailerLog';
import { logger } from '../../logger';

jest.mock('../../logger');

const createMailerLogMock = jest.spyOn(mailerLogM, 'createMailerLog');

describe('Email Notifications', () => {
  const mockJob = {
    id: '3',
    name: EMAIL_ACTIONS.COLLABORATOR_ADDED,
    data: {
      report: {
        id: 1235,
        displayId: 'AR-04-1235',
        author: {
          email: 'mockAuthor@test.gov',
          name: 'Mock Author',
        },
        activityReportCollaborators: [{
          user: {
            email: 'mockCollaborator@test.gov',
            name: 'Mock Collaborator',
          },
        }],
      },
      newCollaborator: {
        email: 'mockNewCollaborator@test.gov',
        name: 'Mock New Collaborator',
      },
      newApprover: {
        User: {
          email: 'mockNewApprover@test.gov',
          name: 'Mock New Approver',
        },
      },
    },
  };
  const mockJobDigest = {
    id: '3',
    name: EMAIL_ACTIONS.COLLABORATOR_DIGEST,
    data: {
      user: {
        email: 'mockUser@test.gov',
      },
      reports: [{
        id: 1235,
        displayId: 'AR-04-1235',
      }, {
        id: 2345,
        displayId: 'AR-08-2345',
      }],
    },
  };

  const success = false;
  const result = {
    errno: -4078, code: 'ESOCKET', syscall: 'connect', address: '127.0.0.1', port: 1025, command: 'CONN',
  };

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('on demand', () => {
    it('create a mailer log entry for a collaborator added', async () => {
      const mailerLog = await logEmailNotification(mockJob, success, result);
      expect(mailerLog).not.toBeNull();
      expect(mailerLog.emailTo.length).toEqual(1);
      expect(mailerLog.emailTo[0]).toEqual('mockNewCollaborator@test.gov');
      expect(mailerLog.subject).toEqual('Activity Report AR-04-1235: Added as collaborator');
      expect(mailerLog.success).toEqual(false);
      expect(mailerLog.result).toEqual(result);
    });
    it('create a mailer log entry for a submitted report', async () => {
      mockJob.name = EMAIL_ACTIONS.SUBMITTED;
      const mailerLog = await logEmailNotification(mockJob, success, result);
      expect(mailerLog).not.toBeNull();
      expect(mailerLog.emailTo.length).toEqual(1);
      expect(mailerLog.emailTo[0]).toEqual('mockNewApprover@test.gov');
      expect(mailerLog.subject).toEqual('Activity Report AR-04-1235: Submitted for review');
      expect(mailerLog.success).toEqual(false);
      expect(mailerLog.result).toEqual(result);
    });
    it('create a mailer log entry for a needs action report', async () => {
      mockJob.name = EMAIL_ACTIONS.NEEDS_ACTION;
      const mailerLog = await logEmailNotification(mockJob, success, result);
      expect(mailerLog).not.toBeNull();
      expect(mailerLog.emailTo.length).toEqual(2);
      expect(mailerLog.emailTo[0]).toEqual('mockAuthor@test.gov');
      expect(mailerLog.emailTo[1]).toEqual('mockCollaborator@test.gov');
      expect(mailerLog.subject).toEqual('Activity Report AR-04-1235: Changes requested');
      expect(mailerLog.success).toEqual(false);
      expect(mailerLog.result).toEqual(result);
    });
    it('create a mailer log entry for an approved report', async () => {
      mockJob.name = EMAIL_ACTIONS.APPROVED;
      const mailerLog = await logEmailNotification(mockJob, success, result);
      expect(mailerLog).not.toBeNull();
      expect(mailerLog.emailTo.length).toBe(2);
      expect(mailerLog.emailTo[0]).toEqual('mockAuthor@test.gov');
      expect(mailerLog.emailTo[1]).toEqual('mockCollaborator@test.gov');
      expect(mailerLog.subject).toEqual('Activity Report AR-04-1235: Approved');
      expect(mailerLog.success).toEqual(false);
      expect(mailerLog.result).toEqual(result);
    });
    it('logs on error', async () => {
      createMailerLogMock.mockRejectedValueOnce(new Error('Problem creating mailer log'));
      mockJob.name = EMAIL_ACTIONS.APPROVED;
      const mailerLog = await logEmailNotification(mockJob, success, result);
      expect(logger.error).toHaveBeenCalled();
      expect(mailerLog).toBeNull();
    });
    it('returns null on unknown job name', async () => {
      mockJob.name = 'unknown';
      const mailerLog = await logEmailNotification(mockJob, success, result);
      expect(logger.error).toHaveBeenCalled();
      expect(mailerLog).toBeNull();
    });
  });

  describe('digest', () => {
    it('create a mailer log entry for a collaborator added', async () => {
      const mailerLog = await logDigestEmailNotification(mockJobDigest, success, result);
      expect(mailerLog).not.toBeNull();
      expect(mailerLog.emailTo.length).toEqual(1);
      expect(mailerLog.emailTo[0]).toEqual('mockUser@test.gov');
      expect(mailerLog.subject).toEqual('TTA Hub digest: added as collaborator');
      expect(mailerLog.success).toEqual(false);
      expect(mailerLog.result).toEqual(result);
      expect(mailerLog.jobId).toEqual('3');
      expect(mailerLog.activityReports).toEqual([1235, 2345]);
    });
    it('create a mailer log entry for a submitted report', async () => {
      mockJobDigest.name = EMAIL_ACTIONS.SUBMITTED_DIGEST;
      const mailerLog = await logDigestEmailNotification(mockJobDigest, success, result);
      expect(mailerLog).not.toBeNull();
      expect(mailerLog.emailTo.length).toEqual(1);
      expect(mailerLog.emailTo[0]).toEqual('mockUser@test.gov');
      expect(mailerLog.subject).toEqual('TTA Hub digest: reports for review');
      expect(mailerLog.success).toEqual(false);
      expect(mailerLog.result).toEqual(result);
      expect(mailerLog.jobId).toEqual('3');
      expect(mailerLog.activityReports).toEqual([1235, 2345]);
    });
    it('create a mailer log entry for a needs action report', async () => {
      mockJobDigest.name = EMAIL_ACTIONS.NEEDS_ACTION_DIGEST;
      const mailerLog = await logDigestEmailNotification(mockJobDigest, success, result);
      expect(mailerLog).not.toBeNull();
      expect(mailerLog.emailTo.length).toEqual(1);
      expect(mailerLog.emailTo[0]).toEqual('mockUser@test.gov');
      expect(mailerLog.subject).toEqual('TTA Hub digest: changes requested');
      expect(mailerLog.success).toEqual(false);
      expect(mailerLog.result).toEqual(result);
      expect(mailerLog.jobId).toEqual('3');
      expect(mailerLog.activityReports).toEqual([1235, 2345]);
    });
    it('create a mailer log entry for an approved report', async () => {
      mockJobDigest.name = EMAIL_ACTIONS.APPROVED_DIGEST;
      const mailerLog = await logDigestEmailNotification(mockJobDigest, success, result);
      expect(mailerLog).not.toBeNull();
      expect(mailerLog.emailTo.length).toBe(1);
      expect(mailerLog.emailTo[0]).toEqual('mockUser@test.gov');
      expect(mailerLog.subject).toEqual('TTA Hub digest: approved reports');
      expect(mailerLog.success).toEqual(false);
      expect(mailerLog.result).toEqual(result);
    });
    it('logs on error', async () => {
      createMailerLogMock.mockRejectedValueOnce(new Error('Problem creating digest mailer log'));
      mockJobDigest.name = EMAIL_ACTIONS.APPROVED_DIGEST;
      const record = await logDigestEmailNotification(mockJobDigest, success, result);
      expect(logger.error).toHaveBeenCalled();
      expect(record).toBeNull();
    });
  });
});
