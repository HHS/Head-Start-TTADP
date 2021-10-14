import { createTransport } from 'nodemailer';
import * as path from 'path';
import {
  notifyCollaboratorAssigned, notifyApproverAssigned, notifyChangesRequested, notifyReportApproved,
} from '.';

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
  name: 'Mock Collaborator1',
  email: 'mockCollaborator1@test.gov',
};
const mockCollaborator2 = {
  name: 'Mock Collaborator2',
  email: 'mockCollaborator2@test.gov',
};

const mockReport = {
  id: 1,
  displayId: 'mockReport-1',
  author: mockAuthor,
  collaborators: [mockCollaborator1, mockCollaborator2],
  approvers: [mockApprover],
};

const reportPath = path.join(process.env.TTA_SMART_HUB_URI, 'activity-reports', String(mockReport.id));
const jsonTransport = createTransport({ jsonTransport: true });

const oldEnv = process.env;
process.env.FROM_EMAIL_ADDRESS = 'fake@test.gov';

describe('mailer tests', () => {
  afterAll(() => {
    process.env = oldEnv;
  });
  describe('Changes requested by manager', () => {
    it('Tests that an email is sent', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyChangesRequested(
        { data: { report: mockReport, approver: mockApprover } }, jsonTransport,
      );
      expect(email.envelope.from).toBe(process.env.FROM_EMAIL_ADDRESS);
      expect(email.envelope.to).toStrictEqual([
        mockAuthor.email,
        mockCollaborator1.email,
        mockCollaborator2.email,
      ]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe(`Changes were requested to Activity Report ${mockReport.displayId}`);
      expect(message.text).toContain(`${mockManager.name} has requested changed to report ${mockReport.displayId}`);
      expect(message.text).toContain(mockApprover.note);
      expect(message.text).toContain(reportPath);
    });
    it('Tests that emails are not sent without SEND_NOTIFICATIONS', async () => {
      process.env.SEND_NOTIFICATIONS = false;
      await expect(notifyChangesRequested(
        { data: { report: mockReport } }, jsonTransport,
      )).resolves.toBeNull();
    });
  });
  describe('Report Approved', () => {
    it('Tests that an email is sent', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyReportApproved(
        { data: { report: mockReport } }, jsonTransport,
      );
      expect(email.envelope.from).toBe(process.env.FROM_EMAIL_ADDRESS);
      expect(email.envelope.to).toStrictEqual([
        mockAuthor.email,
        mockCollaborator1.email,
        mockCollaborator2.email,
      ]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe(`Activity Report ${mockReport.displayId} has been approved`);
      expect(message.text).toContain(`Activity Report ${mockReport.displayId} has been approved.`);
      expect(message.text).toContain(reportPath);
    });
    it('Tests that emails are not sent without SEND_NOTIFICATIONS', async () => {
      process.env.SEND_NOTIFICATIONS = false;
      await expect(notifyChangesRequested(
        { data: { report: mockReport } }, jsonTransport,
      )).resolves.toBeNull();
    });
  });
  describe('Manager Approval Requested', () => {
    it('Tests that an email is sent', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyApproverAssigned(
        { data: { report: mockReport, newApprover: mockApprover } }, jsonTransport,
      );
      expect(email.envelope.from).toBe(process.env.FROM_EMAIL_ADDRESS);
      expect(email.envelope.to).toStrictEqual([mockManager.email]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe(`Activity Report ${mockReport.displayId} submitted for approval`);
      expect(message.text).toContain(
        `Activity Report ${mockReport.displayId} was submitted for your review.`,
      );
      expect(message.text).toContain(reportPath);
    });
    it('Tests that emails are not sent without SEND_NOTIFICATIONS', async () => {
      process.env.SEND_NOTIFICATIONS = false;
      await expect(notifyApproverAssigned(
        { data: { report: mockReport } }, jsonTransport,
      )).resolves.toBeNull();
    });
  });
  describe('Add Collaborators', () => {
    it('Tests that an email is sent', async () => {
      process.env.SEND_NOTIFICATIONS = true;
      const email = await notifyCollaboratorAssigned(
        { data: { report: mockReport, newCollaborator: mockCollaborator1 } }, jsonTransport,
      );
      expect(email.envelope.from).toBe(process.env.FROM_EMAIL_ADDRESS);
      expect(email.envelope.to).toStrictEqual([mockCollaborator1.email]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe(`You have been added as a collaborator on Activity Report ${mockReport.displayId}`);
      expect(message.text).toContain(
        `You have been added as a collaborator on Activity Report ${mockReport.displayId}`,
      );
      expect(message.text).toContain(reportPath);
    });
    it('Tests that emails are not sent without SEND_NOTIFICATIONS', async () => {
      process.env.SEND_NOTIFICATIONS = false;
      await expect(notifyCollaboratorAssigned(
        { data: { report: mockReport, newCollaborator: mockCollaborator1 } }, jsonTransport,
      )).resolves.toBeNull();
    });
  });
});
