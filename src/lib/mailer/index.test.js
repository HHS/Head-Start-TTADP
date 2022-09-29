import { createTransport } from 'nodemailer';
import {
  notifyCollaboratorAssigned, notifyApproverAssigned, notifyChangesRequested, notifyReportApproved,
  collaboratorAssignedNotification,
  approverAssignedNotification,
  reportApprovedNotification,
  changesRequestedNotification,
  notifyDigest,
  collaboratorDigest,
  changesRequestedDigest,
  submittedDigest,
  approvedDigest,
  notificationQueue as notificationQueueMock,
  notificationDigestQueue as notificationDigestQueueMock,
} from '.';
import {
  EMAIL_ACTIONS, EMAIL_DIGEST_FREQ, REPORT_STATUSES,
  DIGEST_SUBJECT_FREQ,
} from '../../constants';
import { auditLogger as logger } from '../../logger';

import db, {
  ActivityReport, ActivityReportCollaborator, User, ActivityReportApprover,
} from '../../models';
import { usersWithSetting } from '../../services/userSettings';
import { createOrUpdate } from '../../services/activityReports';

const { DAILY, WEEKLY, MONTHLY } = DIGEST_SUBJECT_FREQ;

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

const mockUser = {
  id: 2115665161,
  homeRegionId: 1,
  name: 'user2115665161',
  hsesUsername: 'user2115665161',
  hsesUserId: 'user2115665161',
  role: ['Grants Specialist', 'Health Specialist'],
};

const digestMockCollab = {
  id: 22161330,
  homeRegionId: 1,
  name: 'b',
  hsesUserId: 'b',
  hsesUsername: 'b',
  role: [],
};

const digestMockApprover = {
  id: 32161330,
  homeRegionId: 1,
  name: 'bu',
  hsesUserId: 'bu',
  hsesUsername: 'bu',
  role: [],
};

const mockReport = {
  id: 1,
  displayId: 'mockReport-1',
  author: mockAuthor,
  activityReportCollaborators: [mockCollaborator1, mockCollaborator2],
  approvers: [mockApprover],
};

const reportObject = {
  activityRecipientType: 'recipient',
  submissionStatus: REPORT_STATUSES.DRAFT,
  userId: mockUser.id,
  regionId: 1,
  lastUpdatedById: mockUser.id,
};

const submittedReport = {
  ...reportObject,
  activityRecipients: [{ grantId: 1 }],
  submissionStatus: REPORT_STATUSES.SUBMITTED,
  // calculatedStatus: REPORT_STATUSES.SUBMITTED,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 0,
  endDate: '2020-09-01T12:00:00Z',
  startDate: '2020-09-01T12:00:00Z',
  requester: 'requester',
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
};

jest.mock('../../services/userSettings', () => ({
  usersWithSetting: jest.fn().mockReturnValue(Promise.resolve([{ id: digestMockCollab.id }])),
}));

jest.mock('../../logger');

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
        data: {
          report: mockReport,
          approver: mockApprover,
          authorWithSetting: mockReport.author,
          collabsWithSettings: [mockCollaborator1, mockCollaborator2],
        },
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
    it('Tests that an email is not sent if no recipients', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyChangesRequested({
        data: {
          report: mockReport,
          approver: mockApprover,
          authorWithSetting: null,
          collabsWithSettings: [],
        },
      }, jsonTransport);
      expect(email).toBe(null);
    });
    it('Tests that emails are not sent without SEND_NOTIFICATIONS', async () => {
      process.env.SEND_NOTIFICATIONS = false;
      await expect(notifyChangesRequested({
        data: { report: mockReport },
      }, jsonTransport)).toBeNull();
    });
  });
  describe('Report Approved', () => {
    it('Tests that an email is sent', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyReportApproved({
        data: {
          report: mockReport,
          approver: mockApprover,
          authorWithSetting: mockReport.author,
          collabsWithSettings: [mockCollaborator1, mockCollaborator2],
        },
      }, jsonTransport);
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
    it('Tests that an email is not sent if no recipients', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyReportApproved({
        data: {
          report: mockReport,
          approver: mockApprover,
          authorWithSetting: null,
          collabsWithSettings: [],
        },
      }, jsonTransport);
      expect(email).toBe(null);
    });
    it('Tests that emails are not sent without SEND_NOTIFICATIONS', async () => {
      process.env.SEND_NOTIFICATIONS = false;
      await expect(notifyReportApproved({
        data: { report: mockReport },
      }, jsonTransport)).toBeNull();
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
          subjectFreq: DAILY,
        },
      }, jsonTransport);
      expect(email.envelope.from).toBe(process.env.FROM_EMAIL_ADDRESS);
      expect(email.envelope.to).toStrictEqual([mockNewCollaborator.email]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe(`TTA Hub ${DAILY} digest: added as collaborator`);
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
          subjectFreq: WEEKLY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe(`TTA Hub ${WEEKLY} digest: added as collaborator`);
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
          subjectFreq: MONTHLY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe(`TTA Hub ${MONTHLY} digest: added as collaborator`);
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
    it('tests that an email is sent if there are no new collaborator notifications', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyDigest({
        data: {
          user: mockNewCollaborator,
          reports: [],
          type: EMAIL_ACTIONS.COLLABORATOR_DIGEST,
          freq: EMAIL_DIGEST_FREQ.DAILY,
          subjectFreq: DAILY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe(`TTA Hub ${DAILY} digest: no new collaborator notifications`);
      expect(message.text).toContain(
        `Hello ${mockNewCollaborator.name}`,
      );
      expect(message.text).toContain(
        'You haven\'t been added as a collaborator on any activity reports today.',
      );
      expect(message.text).not.toContain(reportPath);
    });

    it('tests that emails are not sent without SEND_NOTIFICATIONS', async () => {
      process.env.SEND_NOTIFICATIONS = false;
      await expect(notifyDigest({
        data: {
          user: mockNewCollaborator,
          reports: [],
          type: EMAIL_ACTIONS.COLLABORATOR_DIGEST,
          freq: EMAIL_DIGEST_FREQ.DAILY,
        },
      }, jsonTransport)).toBeNull();
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
          subjectFreq: DAILY,
        },
      }, jsonTransport);
      expect(email.envelope.from).toBe(process.env.FROM_EMAIL_ADDRESS);
      expect(email.envelope.to).toStrictEqual([mockNewCollaborator.email]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe('TTA Hub daily digest: changes requested');
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
          subjectFreq: WEEKLY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe('TTA Hub weekly digest: changes requested');
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
          subjectFreq: MONTHLY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe('TTA Hub monthly digest: changes requested');
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
    it('tests that an email is sent if there are no changes requested notifications', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyDigest({
        data: {
          user: mockNewCollaborator,
          reports: [],
          type: EMAIL_ACTIONS.NEEDS_ACTION_DIGEST,
          freq: EMAIL_DIGEST_FREQ.WEEKLY,
          subjectFreq: WEEKLY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe('TTA Hub weekly digest: no new changes requested');
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
          subjectFreq: DAILY,
        },
      }, jsonTransport);
      expect(email.envelope.from).toBe(process.env.FROM_EMAIL_ADDRESS);
      expect(email.envelope.to).toStrictEqual([mockNewCollaborator.email]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe('TTA Hub daily digest: reports for review');
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
          subjectFreq: WEEKLY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe('TTA Hub weekly digest: reports for review');
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
          subjectFreq: MONTHLY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe('TTA Hub monthly digest: reports for review');
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
    it('tests that an email is sent if there are no submitted notifications', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyDigest({
        data: {
          user: mockNewCollaborator,
          reports: [],
          type: EMAIL_ACTIONS.SUBMITTED_DIGEST,
          freq: EMAIL_DIGEST_FREQ.MONTHLY,
          subjectFreq: MONTHLY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe('TTA Hub monthly digest: no new reports for review');
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
          subjectFreq: DAILY,
        },
      }, jsonTransport);
      expect(email.envelope.from).toBe(process.env.FROM_EMAIL_ADDRESS);
      expect(email.envelope.to).toStrictEqual([mockNewCollaborator.email]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe('TTA Hub daily digest: approved reports');
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
          subjectFreq: WEEKLY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe('TTA Hub weekly digest: approved reports');
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
          subjectFreq: MONTHLY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe('TTA Hub monthly digest: approved reports');
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
    it('tests that an email is sent if there are no approved reports notifications', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyDigest({
        data: {
          user: mockNewCollaborator,
          reports: [],
          type: EMAIL_ACTIONS.APPROVED_DIGEST,
          freq: EMAIL_DIGEST_FREQ.MONTHLY,
          subjectFreq: MONTHLY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe('TTA Hub monthly digest: no new approved reports');
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
    beforeEach(async () => {
      await User.create(digestMockCollab, { validate: false }, { individualHooks: false });
      await User.create(digestMockApprover, { validate: false }, { individualHooks: false });
      await User.create(mockUser, { validate: false }, { individualHooks: false });

      jest.spyOn(notificationQueueMock, 'add').mockImplementation(async () => Promise.resolve());
      jest.spyOn(notificationDigestQueueMock, 'add').mockImplementation(async () => Promise.resolve());
    });
    afterEach(async () => {
      await ActivityReportCollaborator.destroy({ where: { userId: digestMockCollab.id } });
      await ActivityReportApprover.destroy({
        where: {
          userId: digestMockApprover.id,
        },
        force: true,
      });
      await ActivityReport.destroy({ where: { userId: mockUser.id } });
      await User.destroy({ where: { id: digestMockCollab.id } });
      await User.destroy({ where: { id: digestMockApprover.id } });
      await User.destroy({ where: { id: mockUser.id } });
    });
    afterAll(async () => {
      await db.sequelize.close();
    });

    it('"collaborators added" on the notificationQueue', async () => {
      const report = await createOrUpdate(reportObject);

      collaboratorAssignedNotification(
        report,
        [mockCollaborator1, mockCollaborator2],
      );
      expect(notificationQueueMock.add).toHaveBeenCalled();
    });

    it('"collaborators added" which logs on error', async () => {
      jest.clearAllMocks();
      const mock = jest.spyOn(notificationQueueMock, 'add');

      mock.mockImplementationOnce(() => {
        throw new Error('Christmas present!');
      });
      const report = await createOrUpdate(reportObject);

      collaboratorAssignedNotification(
        report,
        [mockCollaborator1, mockCollaborator2],
      );
      expect(logger.error).toHaveBeenCalledWith(new Error('Christmas present!'));
    });

    it('"approver assigned" on the notificationQueue', async () => {
      const report = await createOrUpdate(reportObject);

      approverAssignedNotification(
        report,
        [mockApprover],
      );
      expect(notificationQueueMock.add).toHaveBeenCalled();
    });

    it('"approver assigned" which logs on error', async () => {
      jest.clearAllMocks();
      const mock = jest.spyOn(notificationQueueMock, 'add');

      mock.mockImplementationOnce(() => {
        throw new Error('Something is not right');
      });
      const report = await createOrUpdate(reportObject);

      approverAssignedNotification(report, [mockApprover]);
      expect(logger.error).toHaveBeenCalledWith(new Error('Something is not right'));
    });

    it('"report approved" on the notificationQueue', async () => {
      const report = await createOrUpdate(reportObject);

      reportApprovedNotification(report, null, []);
      expect(notificationQueueMock.add).toHaveBeenCalled();
    });

    it('"report approved" which logs on error', async () => {
      jest.clearAllMocks();
      const mock = jest.spyOn(notificationQueueMock, 'add');

      mock.mockImplementationOnce(() => {
        throw new Error('Something is not right');
      });
      const report = await createOrUpdate(reportObject);

      reportApprovedNotification(report);
      expect(logger.error).toHaveBeenCalledWith(new Error('Something is not right'));
    });

    it('"changes requested" on the notificationQueue', async () => {
      const report = await createOrUpdate(reportObject);

      changesRequestedNotification(report, mockApprover, null, []);
      expect(notificationQueueMock.add).toHaveBeenCalled();
    });

    it('"changes requested" which logs on error', async () => {
      jest.clearAllMocks();
      const mock = jest.spyOn(notificationQueueMock, 'add');

      mock.mockImplementationOnce(() => {
        throw new Error('Christmas present!');
      });
      const report = await createOrUpdate(reportObject);

      changesRequestedNotification(report);
      expect(logger.error).toHaveBeenCalledWith(new Error('Christmas present!'));
    });

    it('"collaborator added" digest on the notificationDigestQueue', async () => {
      const report = await createOrUpdate({
        ...reportObject,
        collaborators: [{ userId: digestMockCollab.id }],
      });
      const result = await collaboratorDigest('today');
      expect(notificationDigestQueueMock.add).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].freq).toBe('today');
      expect(result[0].reports.length).toBe(1);
      expect(result[0].reports[0].id).toBe(report.id);
    });

    it('"collaborator added" digest which logs on error', async () => {
      usersWithSetting.mockReturnValueOnce(Promise.reject(new Error('Unfortunately, it does not work')));
      await expect(collaboratorDigest('this month')).rejects.toThrow();
    });

    it('"collaborator added" digest which logs on bad date', async () => {
      await expect(collaboratorDigest('')).rejects.toThrow();
    });

    it('"changes requested" digest on the notificationDigestQueue', async () => {
      const report = await createOrUpdate({
        ...submittedReport,
        approval: {
          calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
        },
        collaborators: [{ userId: digestMockCollab.id }],
      });
      const result = await changesRequestedDigest('today');
      expect(notificationDigestQueueMock.add).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].freq).toBe('today');
      expect(result[0].reports.length).toBe(1);
      expect(result[0].reports[0].id).toBe(report.id);
    });

    it('"changes requested" digest which logs on error', async () => {
      usersWithSetting.mockReturnValueOnce(Promise.reject(new Error('Something is off')));
      await expect(changesRequestedDigest('this month')).rejects.toThrow();
    });

    it('"changes requested" digest which logs on bad date', async () => {
      await expect(changesRequestedDigest('')).rejects.toThrow();
    });

    it('"submitted" digest on the notificationDigestQueue', async () => {
      const result = await submittedDigest('this week');
      expect(notificationDigestQueueMock.add).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].freq).toBe('this week');
    });

    it('"submitted" digest which logs on error', async () => {
      usersWithSetting.mockReturnValueOnce(Promise.reject(new Error('Christmas present!')));
      await expect(submittedDigest('this month')).rejects.toThrow();
    });

    it('"submitted" digest which logs on bad date', async () => {
      await expect(submittedDigest('')).rejects.toThrow();
    });

    it('"approved" digest on the notificationDigestQueue', async () => {
      const report = await createOrUpdate({
        ...submittedReport,
        approval: { calculatedStatus: REPORT_STATUSES.APPROVED },
        collaborators: [{ userId: digestMockCollab.id }],
      });
      const result = await approvedDigest('this month');
      expect(notificationDigestQueueMock.add).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].freq).toBe('this month');
      expect(result[0].reports.length).toBe(1);
      expect(result[0].reports[0].id).toBe(report.id);
    });

    it('"approved" digest which logs on error', async () => {
      usersWithSetting.mockReturnValueOnce(Promise.reject(new Error('Issue here')));
      await expect(approvedDigest('this month')).rejects.toThrow();
    });

    it('"approved" digest which logs on bad date', async () => {
      await expect(approvedDigest('')).rejects.toThrow();
    });
  });
});
