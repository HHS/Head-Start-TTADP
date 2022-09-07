import { createTransport } from 'nodemailer';
import {
  notifyCollaboratorAssigned, notifyApproverAssigned, notifyChangesRequested, notifyReportApproved,
  notifyDigest,
  collaboratorDigest,
  notificationDigestQueue as notificationDigestQueueMock,
} from '.';
import { EMAIL_ACTIONS, EMAIL_DIGEST_FREQ } from '../../constants';

import db from '../../models';

const mockManager = {
  name: 'Mock Manager',
  email: 'mockManager@test.gov',
};
const mockApprover = {
  User: mockManager,
  note: 'You are awesome! Nice work!',
};
const mockAuthor = {
  name: 'Mock Author',
  email: 'mockAuthor@test.gov',
};
const mockCollaborator1 = {
  user: {
    name: 'Mock Collaborator1',
    email: 'mockCollaborator1@test.gov',
  },
};
const mockCollaborator2 = {
  user: {
    name: 'Mock Collaborator2',
    email: 'mockCollaborator2@test.gov',
  },
};
const mockNewCollaborator = {
  name: 'Mock New Collaborator',
  email: 'mockNewCollaborator@test.gov',
};

const mockReport = {
  id: 1,
  displayId: 'mockReport-1',
  author: mockAuthor,
  activityReportCollaborators: [mockCollaborator1, mockCollaborator2],
  approvers: [mockApprover],
};

const reportPath = `${process.env.TTA_SMART_HUB_URI}/activity-reports/${mockReport.id}`;

const jsonTransport = createTransport({ jsonTransport: true });

const oldEnv = process.env;
process.env.FROM_EMAIL_ADDRESS = 'fake@test.gov';

describe('mailer tests', () => {
  afterAll(async () => {
    process.env = oldEnv;
    await db.sequelize.close();
  });
  describe('Changes requested by manager', () => {
    it('Tests that an email is sent', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyChangesRequested({
        data: { report: mockReport, approver: mockApprover },
      }, jsonTransport);
      expect(email.envelope.from).toBe(process.env.FROM_EMAIL_ADDRESS);
      expect(email.envelope.to).toStrictEqual([
        mockAuthor.email,
        mockCollaborator1.user.email,
        mockCollaborator2.user.email,
      ]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe(`Activity Report ${mockReport.displayId}: Changes requested`);
      expect(message.text).toContain(`${mockManager.name} requested changed to report ${mockReport.displayId}.`);
      expect(message.text).toContain(mockApprover.note);
      expect(message.text).toContain(reportPath);
    });
    it('Tests that emails are not sent without SEND_NOTIFICATIONS', async () => {
      process.env.SEND_NOTIFICATIONS = false;
      await expect(notifyChangesRequested({
        data: { report: mockReport },
      }, jsonTransport)).resolves.toBeNull();
    });
  });
  describe('Report Approved', () => {
    it('Tests that an email is sent', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyReportApproved({ data: { report: mockReport } }, jsonTransport);
      expect(email.envelope.from).toBe(process.env.FROM_EMAIL_ADDRESS);
      expect(email.envelope.to).toStrictEqual([
        mockAuthor.email,
        mockCollaborator1.user.email,
        mockCollaborator2.user.email,
      ]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe(`Activity Report ${mockReport.displayId}: Approved`);
      expect(message.text).toContain(`Activity Report ${mockReport.displayId} has been approved.`);
      expect(message.text).toContain(reportPath);
    });
    it('Tests that emails are not sent without SEND_NOTIFICATIONS', async () => {
      process.env.SEND_NOTIFICATIONS = false;
      await expect(notifyChangesRequested({
        data: { report: mockReport },
      }, jsonTransport)).resolves.toBeNull();
    });
  });
  describe('Manager Approval Requested', () => {
    it('Tests that an email is sent', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyApproverAssigned({
        data: { report: mockReport, newApprover: mockApprover },
      }, jsonTransport);
      expect(email.envelope.from).toBe(process.env.FROM_EMAIL_ADDRESS);
      expect(email.envelope.to).toStrictEqual([mockManager.email]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe(`Activity Report ${mockReport.displayId}: Submitted for review`);
      expect(message.text).toContain(
        `Activity Report ${mockReport.displayId} was submitted for your review.`,
      );
      expect(message.text).toContain(reportPath);
    });
    it('Tests that emails are not sent without SEND_NOTIFICATIONS', async () => {
      process.env.SEND_NOTIFICATIONS = false;
      await expect(notifyApproverAssigned({
        data: { report: mockReport },
      }, jsonTransport)).resolves.toBeNull();
    });
  });
  describe('Add Collaborators', () => {
    it('Tests that an email is sent', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyCollaboratorAssigned({
        data: { report: mockReport, newCollaborator: mockNewCollaborator },
      }, jsonTransport);
      expect(email.envelope.from).toBe(process.env.FROM_EMAIL_ADDRESS);
      expect(email.envelope.to).toStrictEqual([mockNewCollaborator.email]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe(`Activity Report ${mockReport.displayId}: Added as collaborator`);
      expect(message.text).toContain(
        `You've been added as a collaborator on Activity Report ${mockReport.displayId}.`,
      );
      expect(message.text).toContain(reportPath);
    });
    it('Tests that emails are not sent without SEND_NOTIFICATIONS', async () => {
      process.env.SEND_NOTIFICATIONS = false;
      await expect(notifyCollaboratorAssigned({
        data: { report: mockReport, newCollaborator: mockCollaborator1 },
      }, jsonTransport)).resolves.toBeNull();
    });
  });

  describe('Collaborators digest', () => {
    it('tests that an email is sent for a daily setting', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyDigest({
        data: {
          user: mockNewCollaborator,
          reports: [mockReport],
          type: EMAIL_ACTIONS.COLLABORATOR_DIGEST,
          freq: EMAIL_DIGEST_FREQ.DAILY,
        },
      }, jsonTransport);
      expect(email.envelope.from).toBe(process.env.FROM_EMAIL_ADDRESS);
      expect(email.envelope.to).toStrictEqual([mockNewCollaborator.email]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe('TTA Hub digest: added as collaborator');
      expect(message.text).toContain(
        `Hello ${mockNewCollaborator.name}`,
      );
      expect(message.text).toContain(
        'Below are your report notifications for today.',
      );
      expect(message.text).toContain(
        'You were added as a collaborator on these activity reports:',
      );
      expect(message.text).toContain(`* ${mockReport.displayId}`);
      expect(message.text).toContain(reportPath);
    });
    it('tests that an email is sent for a weekly setting', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyDigest({
        data: {
          user: mockNewCollaborator,
          reports: [mockReport],
          type: EMAIL_ACTIONS.COLLABORATOR_DIGEST,
          freq: EMAIL_DIGEST_FREQ.WEEKLY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.text).toContain(
        `Hello ${mockNewCollaborator.name}`,
      );
      expect(message.text).toContain(
        'Below are your report notifications for this week.',
      );
      expect(message.text).toContain(
        'You were added as a collaborator on these activity reports:',
      );
      expect(message.text).toContain(`* ${mockReport.displayId}`);
      expect(message.text).toContain(reportPath);
    });
    it('tests that an email is sent for a monthly setting', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyDigest({
        data: {
          user: mockNewCollaborator,
          reports: [mockReport],
          type: EMAIL_ACTIONS.COLLABORATOR_DIGEST,
          freq: EMAIL_DIGEST_FREQ.MONTHLY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.text).toContain(
        `Hello ${mockNewCollaborator.name}`,
      );
      expect(message.text).toContain(
        'Below are your report notifications for this month.',
      );
      expect(message.text).toContain(
        'You were added as a collaborator on these activity reports:',
      );
      expect(message.text).toContain(`* ${mockReport.displayId}`);
      expect(message.text).toContain(reportPath);
    });
    it('tests that an email is sent if there are no notifications', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyDigest({
        data: {
          user: mockNewCollaborator,
          reports: [],
          type: EMAIL_ACTIONS.COLLABORATOR_DIGEST,
          freq: EMAIL_DIGEST_FREQ.DAILY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe('TTA Hub digest: no new notifications');
      expect(message.text).toContain(
        `Hello ${mockNewCollaborator.name}`,
      );
      expect(message.text).toContain(
        'You haven\'t been added as a collaborator on any activity reports today.',
      );
      expect(message.text).not.toContain(reportPath);
    });
  });

  describe('Changes requested digest', () => {
    it('tests that an email is sent for a daily setting', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyDigest({
        data: {
          user: mockNewCollaborator,
          reports: [mockReport],
          type: EMAIL_ACTIONS.NEEDS_ACTION_DIGEST,
          freq: EMAIL_DIGEST_FREQ.DAILY,
        },
      }, jsonTransport);
      expect(email.envelope.from).toBe(process.env.FROM_EMAIL_ADDRESS);
      expect(email.envelope.to).toStrictEqual([mockNewCollaborator.email]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe('TTA Hub digest: changes requested');
      expect(message.text).toContain(
        `Hello ${mockNewCollaborator.name}`,
      );
      expect(message.text).toContain(
        'Below are your report notifications for today.',
      );
      expect(message.text).toContain(
        'Changes were requested to these activity reports:',
      );
      expect(message.text).toContain(`* ${mockReport.displayId}`);
      expect(message.text).toContain(reportPath);
    });
    it('tests that an email is sent for a weekly setting', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyDigest({
        data: {
          user: mockNewCollaborator,
          reports: [mockReport],
          type: EMAIL_ACTIONS.NEEDS_ACTION_DIGEST,
          freq: EMAIL_DIGEST_FREQ.WEEKLY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.text).toContain(
        `Hello ${mockNewCollaborator.name}`,
      );
      expect(message.text).toContain(
        'Below are your report notifications for this week.',
      );
      expect(message.text).toContain(
        'Changes were requested to these activity reports:',
      );
      expect(message.text).toContain(`* ${mockReport.displayId}`);
      expect(message.text).toContain(reportPath);
    });
    it('tests that an email is sent for a monthly setting', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyDigest({
        data: {
          user: mockNewCollaborator,
          reports: [mockReport],
          type: EMAIL_ACTIONS.NEEDS_ACTION_DIGEST,
          freq: EMAIL_DIGEST_FREQ.MONTHLY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.text).toContain(
        `Hello ${mockNewCollaborator.name}`,
      );
      expect(message.text).toContain(
        'Below are your report notifications for this month.',
      );
      expect(message.text).toContain(
        'Changes were requested to these activity reports:',
      );
      expect(message.text).toContain(`* ${mockReport.displayId}`);
      expect(message.text).toContain(reportPath);
    });
    it('tests that an email is sent if there are no notifications', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyDigest({
        data: {
          user: mockNewCollaborator,
          reports: [],
          type: EMAIL_ACTIONS.NEEDS_ACTION_DIGEST,
          freq: EMAIL_DIGEST_FREQ.WEEKLY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe('TTA Hub digest: no new notifications');
      expect(message.text).toContain(
        `Hello ${mockNewCollaborator.name}`,
      );
      expect(message.text).toContain(
        'No changes were requested to any reports this week.',
      );
      expect(message.text).not.toContain(reportPath);
    });
  });

  describe('Submitted digest', () => {
    it('tests that an email is sent for a daily setting', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyDigest({
        data: {
          user: mockNewCollaborator,
          reports: [mockReport],
          type: EMAIL_ACTIONS.SUBMITTED_DIGEST,
          freq: EMAIL_DIGEST_FREQ.DAILY,
        },
      }, jsonTransport);
      expect(email.envelope.from).toBe(process.env.FROM_EMAIL_ADDRESS);
      expect(email.envelope.to).toStrictEqual([mockNewCollaborator.email]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe('TTA Hub digest: reports for review');
      expect(message.text).toContain(
        `Hello ${mockNewCollaborator.name}`,
      );
      expect(message.text).toContain(
        'Below are your report notifications for today.',
      );
      expect(message.text).toContain(
        'These activity reports were submitted for your review:',
      );
      expect(message.text).toContain(`* ${mockReport.displayId}`);
      expect(message.text).toContain(reportPath);
    });
    it('tests that an email is sent for a weekly setting', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyDigest({
        data: {
          user: mockNewCollaborator,
          reports: [mockReport],
          type: EMAIL_ACTIONS.SUBMITTED_DIGEST,
          freq: EMAIL_DIGEST_FREQ.WEEKLY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.text).toContain(
        `Hello ${mockNewCollaborator.name}`,
      );
      expect(message.text).toContain(
        'Below are your report notifications for this week.',
      );
      expect(message.text).toContain(
        'These activity reports were submitted for your review:',
      );
      expect(message.text).toContain(`* ${mockReport.displayId}`);
      expect(message.text).toContain(reportPath);
    });
    it('tests that an email is sent for a monthly setting', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyDigest({
        data: {
          user: mockNewCollaborator,
          reports: [mockReport],
          type: EMAIL_ACTIONS.SUBMITTED_DIGEST,
          freq: EMAIL_DIGEST_FREQ.MONTHLY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.text).toContain(
        `Hello ${mockNewCollaborator.name}`,
      );
      expect(message.text).toContain(
        'Below are your report notifications for this month.',
      );
      expect(message.text).toContain(
        'These activity reports were submitted for your review:',
      );
      expect(message.text).toContain(`* ${mockReport.displayId}`);
      expect(message.text).toContain(reportPath);
    });
    it('tests that an email is sent if there are no notifications', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyDigest({
        data: {
          user: mockNewCollaborator,
          reports: [],
          type: EMAIL_ACTIONS.SUBMITTED_DIGEST,
          freq: EMAIL_DIGEST_FREQ.MONTHLY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe('TTA Hub digest: no new notifications');
      expect(message.text).toContain(
        `Hello ${mockNewCollaborator.name}`,
      );
      expect(message.text).toContain(
        'No reports were submitted for your review this month.',
      );
      expect(message.text).not.toContain(reportPath);
    });
  });

  describe('Approved digest', () => {
    it('tests that an email is sent for a daily setting', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyDigest({
        data: {
          user: mockNewCollaborator,
          reports: [mockReport],
          type: EMAIL_ACTIONS.APPROVED_DIGEST,
          freq: EMAIL_DIGEST_FREQ.DAILY,
        },
      }, jsonTransport);
      expect(email.envelope.from).toBe(process.env.FROM_EMAIL_ADDRESS);
      expect(email.envelope.to).toStrictEqual([mockNewCollaborator.email]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe('TTA Hub digest: approved reports');
      expect(message.text).toContain(
        `Hello ${mockNewCollaborator.name}`,
      );
      expect(message.text).toContain(
        'Below are your report notifications for today.',
      );
      expect(message.text).toContain(
        'These activity reports were approved:',
      );
      expect(message.text).toContain(`* ${mockReport.displayId}`);
      expect(message.text).toContain(reportPath);
    });
    it('tests that an email is sent for a weekly setting', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyDigest({
        data: {
          user: mockNewCollaborator,
          reports: [mockReport],
          type: EMAIL_ACTIONS.APPROVED_DIGEST,
          freq: EMAIL_DIGEST_FREQ.WEEKLY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.text).toContain(
        `Hello ${mockNewCollaborator.name}`,
      );
      expect(message.text).toContain(
        'Below are your report notifications for this week.',
      );
      expect(message.text).toContain(
        'These activity reports were approved:',
      );
      expect(message.text).toContain(`* ${mockReport.displayId}`);
      expect(message.text).toContain(reportPath);
    });
    it('tests that an email is sent for a monthly setting', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyDigest({
        data: {
          user: mockNewCollaborator,
          reports: [mockReport],
          type: EMAIL_ACTIONS.APPROVED_DIGEST,
          freq: EMAIL_DIGEST_FREQ.MONTHLY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.text).toContain(
        `Hello ${mockNewCollaborator.name}`,
      );
      expect(message.text).toContain(
        'Below are your report notifications for this month.',
      );
      expect(message.text).toContain(
        'These activity reports were approved:',
      );
      expect(message.text).toContain(`* ${mockReport.displayId}`);
      expect(message.text).toContain(reportPath);
    });
    it('tests that an email is sent if there are no notifications', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyDigest({
        data: {
          user: mockNewCollaborator,
          reports: [],
          type: EMAIL_ACTIONS.APPROVED_DIGEST,
          freq: EMAIL_DIGEST_FREQ.MONTHLY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe('TTA Hub digest: no new notifications');
      expect(message.text).toContain(
        `Hello ${mockNewCollaborator.name}`,
      );
      expect(message.text).toContain(
        'No reports have been approved this month.',
      );
      expect(message.text).not.toContain(reportPath);
    });
  });

  describe('enqueue', () => {
    beforeEach(() => {
      jest.spyOn(notificationDigestQueueMock, 'add').mockImplementation(async () => Promise.resolve());
    });

    afterEach(() => {
      notificationDigestQueueMock.add.mockRestore();
    });
    it('on the notificationDigestQueue', async () => {
      const result = await collaboratorDigest('today');
      expect(notificationDigestQueueMock.add).toHaveBeenCalled();
      expect(result.freq).toBe('today');
    });
  });
});
