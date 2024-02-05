import { createTransport } from 'nodemailer';
import { REPORT_STATUSES } from '@ttahub/common';
import {
  notifyCollaboratorAssigned,
  notifyApproverAssigned,
  notifyChangesRequested,
  notifyReportApproved,
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
  notificationQueue as notificationDigestQueueMock,
  notifyRecipientReportApproved,
  sendTrainingReportNotification,
  trVisionAndGoalComplete,
  trPocSessionComplete,
  trSessionCreated,
  trSessionCompleted,
  trCollaboratorAdded,
  trPocAdded,
  trPocEventComplete,
  filterAndDeduplicateEmails,
} from '.';
import {
  EMAIL_ACTIONS,
  EMAIL_DIGEST_FREQ,
  DIGEST_SUBJECT_FREQ,
} from '../../constants';
import { auditLogger as logger } from '../../logger';
import { userById } from '../../services/users';
import db, {
  ActivityReport, ActivityReportCollaborator, User, ActivityReportApprover,
} from '../../models';
import { usersWithSetting } from '../../services/userSettings';

const { DAILY, WEEKLY, MONTHLY } = DIGEST_SUBJECT_FREQ;

const mockManager = {
  name: 'Mock Manager',
  email: 'mockManager@test.gov',
};
const mockApprover = {
  user: mockManager,
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
  lastLogin: new Date(),
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
  lastLogin: new Date(),
};

const mockReport = {
  id: 1,
  displayId: 'mockReport-1',
  author: mockAuthor,
  activityReportCollaborators: [mockCollaborator1, mockCollaborator2],
  approvers: [mockApprover],
};

const mockProgramSpecialist = {
  id: 999,
  homeRegionId: 1,
  name: 'Mock Program Specialist',
  email: 'james@bond.com',
};

const mockRecipient = {
  id: 999,
  name: 'ABC Recipient',
};

const reportObject = {
  activityRecipientType: 'recipient',
  submissionStatus: REPORT_STATUSES.DRAFT,
  userId: mockUser.id,
  regionId: 1,
  lastUpdatedById: mockUser.id,
  version: 2,
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

jest.mock('../../services/users', () => ({
  userById: jest.fn().mockReturnValue(Promise.resolve(mockUser)),
}));

jest.mock('../../logger');

const reportPath = `${process.env.TTA_SMART_HUB_URI}/activity-reports/${mockReport.id}`;

const jsonTransport = createTransport({ jsonTransport: true });

const oldEnv = process.env;
process.env.FROM_EMAIL_ADDRESS = 'fake@test.gov';

jest.mock('bull');

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
  describe('Program Specialists: Recipient Report Approved', () => {
    it('Tests that an email is sent', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyRecipientReportApproved({
        data: {
          report: mockReport,
          programSpecialists: [mockProgramSpecialist],
          recipients: [mockRecipient],
        },
      }, jsonTransport);
      expect(email.envelope.from).toBe(process.env.FROM_EMAIL_ADDRESS);
      expect(email.envelope.to).toStrictEqual([mockProgramSpecialist.email]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe(`${mockRecipient.name}: Activity Report approved in TTA Hub`);
      expect(message.text).toContain(`${mockReport.displayId}`);
      expect(message.text).toContain('An Activity Report associated with one of your recipients has been approved.');
      expect(message.text).toContain(reportPath);
    });
    it('Tests that an email is not sent if no program specialists/recipients', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyRecipientReportApproved({
        data: {
          report: mockReport,
          programSpecialists: [],
          recipients: [mockRecipient],
        },
      }, jsonTransport);
      expect(email).toBe(null);
    });
    it('Tests that emails are not sent without SEND_NOTIFICATIONS', async () => {
      process.env.SEND_NOTIFICATIONS = false;
      await expect(notifyRecipientReportApproved({
        data: {
          report: mockReport,
          programSpecialists: [mockProgramSpecialist],
          recipients: [mockRecipient],
        },
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
      expect(notifyApproverAssigned({
        data: { report: mockReport },
      }, jsonTransport)).toBeNull();
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
      expect(notifyCollaboratorAssigned({
        data: { report: mockReport, newCollaborator: mockCollaborator1 },
      }, jsonTransport)).toBeNull();
    });
  });

  describe('sendTrainingReportNotification', () => {
    it('Tests that an email is sent', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      process.env.CI = '';
      const data = {
        emailTo: [mockNewCollaborator.email],
        templatePath: 'tr_session_completed',
        debugMessage: 'Congrats dude',
        displayId: 'TR-04-1235',
        reportPath: '/asdf/',
        report: {
          id: 1,
          displayId: 'mockReport-1',
        },
      };
      const email = await sendTrainingReportNotification({
        data,
      }, jsonTransport);
      expect(email.envelope.from).toBe(process.env.FROM_EMAIL_ADDRESS);
      expect(email.envelope.to).toStrictEqual([mockNewCollaborator.email]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe(`A session has been completed for Training Report ${data.displayId}`);
      expect(message.text).toContain(
        `A session has been completed for Training Report ${data.displayId}`,
      );
      expect(message.text).toContain('/asdf/');
    });
    it('Honors no send', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      process.env.CI = '';
      const data = {
        emailTo: [`no-send_${mockNewCollaborator.email}`],
        templatePath: 'tr_session_completed',
        debugMessage: 'Congrats dude',
        displayId: 'TR-04-1235',
        reportPath: '/asdf/',
        report: {
          id: 1,
          displayId: 'mockReport-1',
        },
      };
      const email = await sendTrainingReportNotification({
        data,
      }, jsonTransport);
      expect(email).toBeNull();
    });
    it('Tests that emails are not sent without SEND_NOTIFICATIONS', async () => {
      process.env.SEND_NOTIFICATIONS = false;
      const data = {
        emailTo: [mockNewCollaborator.email],
        templatePath: 'tr_session_completed',
        debugMessage: 'Congrats dude',
        displayId: 'TR-04-1235',
        reportPath: '/asdf/',
        report: {
          id: 1,
          displayId: 'mockReport-1',
        },
      };
      await expect(sendTrainingReportNotification({
        data,
      }, jsonTransport)).resolves.toBeNull();
    });

    it('Tests that emails are not sent on CI', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      process.env.CI = true;
      const data = {
        emailTo: [mockNewCollaborator.email],
        templatePath: 'tr_session_completed',
        debugMessage: 'Congrats dude',
        displayId: 'TR-04-1235',
        reportPath: '/asdf/',
        report: {
          id: 1,
          displayId: 'mockReport-1',
        },
      };
      await expect(sendTrainingReportNotification({
        data,
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

  describe('Program Specialist: Report approved digest', () => {
    it('tests that an email is sent for a daily setting', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyDigest({
        data: {
          reports: [mockReport],
          user: mockProgramSpecialist,
          type: EMAIL_ACTIONS.RECIPIENT_REPORT_APPROVED_DIGEST,
          freq: EMAIL_DIGEST_FREQ.DAILY,
          subjectFreq: DAILY,
        },
      }, jsonTransport);
      expect(email.envelope.from).toBe(process.env.FROM_EMAIL_ADDRESS);
      expect(email.envelope.to).toStrictEqual([mockProgramSpecialist.email]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe('TTA Hub daily digest: your recipients\' approved Activity Reports');
      expect(message.text).toContain(`Hello ${mockProgramSpecialist.name}`);
      expect(message.text).toContain(
        'Below are your report notifications for today.',
      );
      expect(message.text).toContain(
        'Activity Reports associated with your recipients were approved:',
      );
      expect(message.text).toContain(`* ${mockReport.displayId}`);
      expect(message.text).toContain(reportPath);
    });
    it('tests that an email is sent for a weekly setting', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyDigest({
        data: {
          reports: [mockReport],
          user: mockProgramSpecialist,
          type: EMAIL_ACTIONS.RECIPIENT_REPORT_APPROVED_DIGEST,
          freq: EMAIL_DIGEST_FREQ.WEEKLY,
          subjectFreq: WEEKLY,
        },
      }, jsonTransport);
      expect(email.envelope.from).toBe(process.env.FROM_EMAIL_ADDRESS);
      expect(email.envelope.to).toStrictEqual([mockProgramSpecialist.email]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe('TTA Hub weekly digest: your recipients\' approved Activity Reports');
      expect(message.text).toContain(`Hello ${mockProgramSpecialist.name}`);
      expect(message.text).toContain(
        'Below are your report notifications for this week.',
      );
      expect(message.text).toContain(
        'Activity Reports associated with your recipients were approved:',
      );
      expect(message.text).toContain(`* ${mockReport.displayId}`);
      expect(message.text).toContain(reportPath);
    });
    it('tests that an email is sent for a monthly setting', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyDigest({
        data: {
          reports: [mockReport],
          user: mockProgramSpecialist,
          type: EMAIL_ACTIONS.RECIPIENT_REPORT_APPROVED_DIGEST,
          freq: EMAIL_DIGEST_FREQ.MONTHLY,
          subjectFreq: MONTHLY,
        },
      }, jsonTransport);
      expect(email.envelope.from).toBe(process.env.FROM_EMAIL_ADDRESS);
      expect(email.envelope.to).toStrictEqual([mockProgramSpecialist.email]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe('TTA Hub monthly digest: your recipients\' approved Activity Reports');
      expect(message.text).toContain(`Hello ${mockProgramSpecialist.name}`);
      expect(message.text).toContain(
        'Below are your report notifications for this month.',
      );
      expect(message.text).toContain(
        'Activity Reports associated with your recipients were approved:',
      );
      expect(message.text).toContain(`* ${mockReport.displayId}`);
      expect(message.text).toContain(reportPath);
    });
    it('tests that an email is sent if there are no approved reports notifications', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyDigest({
        data: {
          reports: [],
          user: mockProgramSpecialist,
          type: EMAIL_ACTIONS.RECIPIENT_REPORT_APPROVED_DIGEST,
          freq: EMAIL_DIGEST_FREQ.MONTHLY,
          subjectFreq: MONTHLY,
        },
      }, jsonTransport);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe('TTA Hub monthly digest: no new approved reports');
      expect(message.text).toContain(`Hello ${mockProgramSpecialist.name}`);
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
      const report = await ActivityReport.create(reportObject);

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
      const report = await ActivityReport.create(reportObject);

      collaboratorAssignedNotification(
        report,
        [mockCollaborator1, mockCollaborator2],
      );
      expect(logger.error).toHaveBeenCalledWith(new Error('Christmas present!'));
    });

    it('"approver assigned" on the notificationQueue', async () => {
      const report = await ActivityReport.create(reportObject);

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
      const report = await ActivityReport.create(reportObject);

      approverAssignedNotification(report, [mockApprover]);
      expect(logger.error).toHaveBeenCalledWith(new Error('Something is not right'));
    });

    it('"report approved" on the notificationQueue', async () => {
      const report = await ActivityReport.create(reportObject);

      reportApprovedNotification(report, null, []);
      expect(notificationQueueMock.add).toHaveBeenCalled();
    });

    it('"report approved" which logs on error', async () => {
      jest.clearAllMocks();
      const mock = jest.spyOn(notificationQueueMock, 'add');

      mock.mockImplementationOnce(() => {
        throw new Error('Something is not right');
      });
      const report = await ActivityReport.create(reportObject);

      reportApprovedNotification(report);
      expect(logger.error).toHaveBeenCalledWith(new Error('Something is not right'));
    });

    it('"changes requested" on the notificationQueue', async () => {
      const report = await ActivityReport.create(reportObject);

      changesRequestedNotification(report, mockApprover, null, []);
      expect(notificationQueueMock.add).toHaveBeenCalled();
    });

    it('"changes requested" which logs on error', async () => {
      jest.clearAllMocks();
      const mock = jest.spyOn(notificationQueueMock, 'add');

      mock.mockImplementationOnce(() => {
        throw new Error('Christmas present!');
      });
      const report = await ActivityReport.create(reportObject);

      changesRequestedNotification(report);
      expect(logger.error).toHaveBeenCalledWith(new Error('Christmas present!'));
    });

    it('"collaborator added" digest on the notificationDigestQueue', async () => {
      const report = await ActivityReport.create(reportObject);

      // Add Collaborator.
      await ActivityReportCollaborator.create({
        activityReportId: report.id,
        userId: digestMockCollab.id,
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
      const report = await ActivityReport.create({
        ...submittedReport,
        calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
      });

      // Add Collaborator.
      await ActivityReportCollaborator.create({
        activityReportId: report.id,
        userId: digestMockCollab.id,
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
      const report = await ActivityReport.create({
        ...submittedReport,
        calculatedStatus: REPORT_STATUSES.APPROVED,
      });

      // Add Collaborator.
      await ActivityReportCollaborator.create({
        activityReportId: report.id,
        userId: digestMockCollab.id,
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

  describe('training report notifications', () => {
    afterAll(() => {
      jest.clearAllMocks();
    });
    beforeEach(() => {
      notificationQueueMock.add.mockClear();
      logger.error.mockClear();
      process.env.CI = '';
    });
    afterEach(() => {
      process.env.CI = '';
    });
    const mockEvent = {
      id: 1,
      ownerId: 1,
      collaboratorIds: [2, 3],
      pocIds: [4, 5],
      data: {
        eventId: 'tr-1234',
      },
    };
    it('trVisionAndGoalComplete success', async () => {
      userById.mockImplementation(() => Promise.resolve({ email: 'user@user.com' }));
      await trVisionAndGoalComplete({
        id: 1,
        ownerId: 1,
        collaboratorIds: [2, 3],
        pocIds: [4, 5],
        data: { val: JSON.stringify(mockEvent.data) },
      });
      expect(notificationQueueMock.add).toHaveBeenCalledTimes(3);
      expect(notificationQueueMock.add)
        .toHaveBeenCalledWith(
          EMAIL_ACTIONS.TRAINING_REPORT_POC_VISION_GOAL_COMPLETE,
          expect.any(Object),
        );
    });
    it('trVisionAndGoalComplete error', async () => {
      userById.mockImplementation(() => Promise.resolve({ email: 'user@user.com' }));
      await trVisionAndGoalComplete();
      expect(notificationQueueMock.add).toHaveBeenCalledTimes(0);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
    it('trVisionAndGoal on CI', async () => {
      process.env.CI = 'true';
      userById.mockImplementation(() => Promise.resolve({ email: 'user@user.com' }));
      await trVisionAndGoalComplete(mockEvent);
      expect(notificationQueueMock.add).toHaveBeenCalledTimes(0);
      expect(logger.error).toHaveBeenCalledTimes(0);
    });
    it('trPocSessionComplete success', async () => {
      userById.mockImplementation(() => Promise.resolve({ email: 'user@user.com' }));
      await trPocSessionComplete(mockEvent);
      expect(notificationQueueMock.add).toHaveBeenCalledTimes(3);
      expect(notificationQueueMock.add)
        .toHaveBeenCalledWith(
          EMAIL_ACTIONS.TRAINING_REPORT_POC_SESSION_COMPLETE,
          expect.any(Object),
        );
    });
    it('trPocSessionComplete on CI', async () => {
      process.env.CI = 'true';
      userById.mockImplementation(() => Promise.resolve({ email: 'user@user.com' }));
      await trPocSessionComplete(mockEvent);
      expect(notificationQueueMock.add).toHaveBeenCalledTimes(0);
      expect(logger.error).toHaveBeenCalledTimes(0);
    });
    it('trPocSessionComplete error', async () => {
      userById.mockImplementation(() => Promise.resolve({ email: 'user@user.com' }));
      await trPocSessionComplete();
      expect(notificationQueueMock.add).toHaveBeenCalledTimes(0);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
    it('trSessionCreated success', async () => {
      userById.mockImplementation(() => Promise.resolve({ email: 'user@user.com' }));
      await trSessionCreated(mockEvent);
      expect(notificationQueueMock.add).toHaveBeenCalledTimes(2);
      expect(notificationQueueMock.add)
        .toHaveBeenCalledWith(
          EMAIL_ACTIONS.TRAINING_REPORT_SESSION_CREATED,
          expect.any(Object),
        );
    });
    it('trSessionCreated error', async () => {
      userById.mockImplementation(() => Promise.resolve({ email: 'user@user.com' }));
      await trSessionCreated();
      expect(notificationQueueMock.add).toHaveBeenCalledTimes(0);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
    it('trSessionCreated early return on CI', async () => {
      process.env.CI = 'true';
      userById.mockImplementation(() => Promise.resolve({ email: 'user@user.com' }));
      await trSessionCreated(mockEvent);
      expect(notificationQueueMock.add).toHaveBeenCalledTimes(0);
      expect(logger.error).toHaveBeenCalledTimes(0);
    });
    it('trSessionCompleted success', async () => {
      userById.mockImplementation(() => Promise.resolve({ email: 'user@user.com' }));
      await trSessionCompleted(mockEvent);
      expect(notificationQueueMock.add).toHaveBeenCalledTimes(2);
      expect(notificationQueueMock.add)
        .toHaveBeenCalledWith(
          EMAIL_ACTIONS.TRAINING_REPORT_SESSION_COMPLETED,
          expect.any(Object),
        );
    });
    it('trSessionCompleted error', async () => {
      userById.mockImplementation(() => Promise.resolve({ email: 'user@user.com' }));
      await trSessionCompleted();
      expect(notificationQueueMock.add).toHaveBeenCalledTimes(0);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
    it('trSessionCompleted early return on CI', async () => {
      process.env.CI = 'true';
      userById.mockImplementation(() => Promise.resolve({ email: 'user@user.com' }));
      await trSessionCompleted(mockEvent);
      expect(notificationQueueMock.add).toHaveBeenCalledTimes(0);
      expect(logger.error).toHaveBeenCalledTimes(0);
    });
    it('trCollaboratorAdded success', async () => {
      userById.mockImplementation(() => Promise.resolve({ email: 'user@user.com' }));
      await trCollaboratorAdded({
        id: 1, dataValues: { data: { val: JSON.stringify(mockEvent.data) } },
      }, 1);
      expect(notificationQueueMock.add).toHaveBeenCalledTimes(1);
      expect(notificationQueueMock.add)
        .toHaveBeenCalledWith(
          EMAIL_ACTIONS.TRAINING_REPORT_COLLABORATOR_ADDED,
          expect.any(Object),
        );
    });
    it('trCollaboratorAdded error', async () => {
      userById.mockImplementation(() => Promise.resolve({ email: 'user@user.com' }));
      await trCollaboratorAdded();
      expect(notificationQueueMock.add).toHaveBeenCalledTimes(0);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
    it('trCollaboratorAdded early return', async () => {
      process.env.CI = 'true';
      userById.mockImplementation(() => Promise.resolve({ email: 'user@user.com' }));
      await trCollaboratorAdded();
      expect(notificationQueueMock.add).toHaveBeenCalledTimes(0);
      expect(logger.error).toHaveBeenCalledTimes(0);
    });
    it('trPocAdded success', async () => {
      userById.mockImplementation(() => Promise.resolve({ email: 'user@user.com' }));
      await trPocAdded({
        id: 1, dataValues: { data: { val: JSON.stringify(mockEvent.data) } },
      }, 1);
      expect(notificationQueueMock.add).toHaveBeenCalledTimes(1);
      expect(notificationQueueMock.add)
        .toHaveBeenCalledWith(
          EMAIL_ACTIONS.TRAINING_REPORT_POC_ADDED,
          expect.any(Object),
        );
    });
    it('trPocAdded error', async () => {
      userById.mockImplementation(() => Promise.resolve({ email: 'user@user.com' }));
      await trPocAdded();
      expect(notificationQueueMock.add).toHaveBeenCalledTimes(0);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
    it('trPocAdded early return', async () => {
      process.env.CI = 'true';
      userById.mockImplementation(() => Promise.resolve({ email: 'user@user.com' }));
      await trPocAdded(mockEvent);
      expect(notificationQueueMock.add).toHaveBeenCalledTimes(0);
      expect(logger.error).toHaveBeenCalledTimes(0);
    });
    it('trPocEventComplete success', async () => {
      userById.mockImplementation(() => Promise.resolve({ email: 'user@user.com' }));
      await trPocEventComplete({
        id: 1, data: { val: JSON.stringify(mockEvent.data) }, pocIds: [4, 5],
      });
      expect(notificationQueueMock.add).toHaveBeenCalledTimes(2);
      expect(notificationQueueMock.add)
        .toHaveBeenCalledWith(
          EMAIL_ACTIONS.TRAINING_REPORT_EVENT_COMPLETED,
          expect.any(Object),
        );
    });
    it('trPocEventComplete error', async () => {
      userById.mockImplementation(() => Promise.resolve({ email: 'user@user.com' }));
      await trPocEventComplete();
      expect(notificationQueueMock.add).toHaveBeenCalledTimes(0);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
    it('trPocEventComplete early return on CI', async () => {
      process.env.CI = 'true';
      userById.mockImplementation(() => Promise.resolve({ email: 'user@user.com' }));
      await trPocEventComplete({
        id: 1, data: { val: JSON.stringify(mockEvent) }, pocIds: [4, 5],
      });
      expect(notificationQueueMock.add).toHaveBeenCalledTimes(0);
      expect(logger.error).toHaveBeenCalledTimes(0);
    });
  });
  describe('filterAndDeduplicateEmails', () => {
    it('should return an array with unique emails when given an array with duplicate emails', () => {
      const emails = ['test@example.com', 'test@example.com', 'another@example.com'];
      const result = filterAndDeduplicateEmails(emails);
      expect(result).toEqual(['test@example.com', 'another@example.com']);
    });

    it('should return an array without emails starting with "no-send_"', () => {
      const emails = ['test@example.com', 'test@example.com', 'another@example.com', 'unique@example.com', 'no-send_test@example.com'];
      const result = filterAndDeduplicateEmails(emails);
      expect(result).toEqual(['test@example.com', 'another@example.com', 'unique@example.com']);
    });

    it('should return an empty array when given an empty array', () => {
      const emails = [];
      const result = filterAndDeduplicateEmails(emails);
      expect(result).toEqual([]);
    });
  });
});
