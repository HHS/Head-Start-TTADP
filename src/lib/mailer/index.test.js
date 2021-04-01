import { createTransport } from 'nodemailer';
import * as path from 'path';
import { managerApprovalRequested, changesRequestedByManager, reportApproved } from '.';

const mockManager = {
  name: 'Mock Manager',
  email: 'mockManager@test.gov',
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
  approvingManager: mockManager,
  collaborators: [mockCollaborator1, mockCollaborator2],
  managerNotes: 'You are awesome! Nice work!',
};

const reportPath = path.join(process.env.TTA_SMART_HUB_URI, 'activity-reports', String(mockReport.id));
const jsonTransport = createTransport({ jsonTransport: true });

const oldEnv = process.env;
process.env.FROMEMAILADDRESS = 'fake@test.gov';

describe('mailer tests', () => {
  afterAll(() => {
    process.env = oldEnv;
  });
  describe('Changes requested by manager', () => {
    it('Tests that an email is sent', async () => {
      process.env.SENDNOTIFICATIONS = true;
      const email = await changesRequestedByManager(mockReport, jsonTransport, true);
      expect(email.envelope.from).toBe(process.env.FROMEMAILADDRESS);
      expect(email.envelope.to).toStrictEqual([
        mockAuthor.email,
        mockCollaborator1.email,
        mockCollaborator2.email,
      ]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe(`Changes requested to report ${mockReport.displayId}`);
      expect(message.text).toContain(`${mockManager.name} has requested changed to report ${mockReport.displayId}`);
      expect(message.text).toContain(reportPath);
      expect(message.text).toContain(mockReport.managerNotes);
    });
    it('Tests that emails are not sent without SENDNOTIFICATIONS', async () => {
      process.env.SENDNOTIFICATIONS = false;
      await expect(changesRequestedByManager(mockReport, jsonTransport)).resolves.toBeNull();
    });
  });
  describe('Report Approved', () => {
    it('Tests that an email is sent', async () => {
      process.env.SENDNOTIFICATIONS = true;
      const email = await reportApproved(mockReport, jsonTransport, true);
      expect(email.envelope.from).toBe(process.env.FROMEMAILADDRESS);
      expect(email.envelope.to).toStrictEqual([
        mockAuthor.email,
        mockCollaborator1.email,
        mockCollaborator2.email,
      ]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe(`Report ${mockReport.displayId} has been approved`);
      expect(message.text).toContain(`Report ${mockReport.displayId} [${reportPath}] has been approved by ${mockManager.name}.`);
    });
    it('Tests that emails are not sent without SENDNOTIFICATIONS', async () => {
      process.env.SENDNOTIFICATIONS = false;
      await expect(changesRequestedByManager(mockReport, jsonTransport)).resolves.toBeNull();
    });
  });
  describe('Manager Approval Requested', () => {
    it('Tests that an email is sent', async () => {
      process.env.SENDNOTIFICATIONS = true;
      const email = await managerApprovalRequested(mockReport, jsonTransport, true);
      expect(email.envelope.from).toBe(process.env.FROMEMAILADDRESS);
      expect(email.envelope.to).toStrictEqual([mockManager.email]);
      const message = JSON.parse(email.message);
      expect(message.subject).toBe(`Report ${mockReport.displayId} submitted for approval`);
      expect(message.text).toContain(
        `${mockAuthor.name} has submitted report ${mockReport.displayId}`,
      );
    });
    it('Tests that emails are not sent without SENDNOTIFICATIONS', async () => {
      process.env.SENDNOTIFICATIONS = false;
      await expect(managerApprovalRequested(mockReport, jsonTransport))
        .resolves.toBeNull();
    });
  });
});
