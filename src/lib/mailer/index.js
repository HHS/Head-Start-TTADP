import { createTransport } from 'nodemailer';
import Email from 'email-templates';
import * as path from 'path';
import { logger } from '../../logger';

const {
  SMTPHOST, SMTPPORT, SMTPUSER, SMTPPASS, SMTPSECURE,
} = process.env;

// nodemailer expects this value as a boolean.
const secure = SMTPSECURE !== 'false';

const defaultTransport = createTransport({
  host: SMTPHOST,
  port: SMTPPORT,
  secure,
  auth: {
    user: SMTPUSER,
    pass: SMTPPASS,
  },
});

// set to true for manual testing
const send = true;

const emailTemplatePath = path.join(process.cwd(), 'src', 'email_templates');

export const changesRequestedByManager = (report, transport = defaultTransport) => {
// Set these inside the function to allow easier testing
  const { FROMEMAILADDRESS, SENDNOTIFICATIONS } = process.env;
  if (SENDNOTIFICATIONS === 'true') {
    try {
      const {
        id,
        author,
        displayId,
        approvingManager,
        collaborators,
        managerNotes,
      } = report;
      const collabArray = collaborators.map((c) => c.email);
      const reportPath = path.join(process.env.TTA_SMART_HUB_URI, 'activity-reports', String(id));
      const email = new Email({
        message: {
          from: FROMEMAILADDRESS,
        },
        send,
        transport,
        htmlToText: {
          wordwrap: 120,
        },
      });
      return email.send({
        template: path.resolve(emailTemplatePath, 'changes_requested_by_manager'),
        message: {
          to: [author.email, ...collabArray],
        },
        locals: {
          managerName: approvingManager.name,
          reportPath,
          displayId,
          comments: managerNotes,
        },
      });
    } catch (err) {
      logger.error(err);
    }
  }
  // return a promise so that returns are consistent
  return Promise.resolve(null);
};

export const reportApproved = (report, transport = defaultTransport) => {
// Set these inside the function to allow easier testing
  const { FROMEMAILADDRESS, SENDNOTIFICATIONS } = process.env;
  if (SENDNOTIFICATIONS === 'true') {
    try {
      const {
        id,
        author,
        displayId,
        approvingManager,
        collaborators,
      } = report;
      const collaboratorEmailAddresses = collaborators.map((c) => c.email);
      const reportPath = path.join(process.env.TTA_SMART_HUB_URI, 'activity-reports', String(id));
      const email = new Email({
        message: {
          from: FROMEMAILADDRESS,
        },
        send,
        transport,
        htmlToText: {
          wordwrap: 120,
        },
      });
      return email.send({
        template: path.resolve(emailTemplatePath, 'report_approved'),
        message: {
          to: [author.email, ...collaboratorEmailAddresses],
        },
        locals: {
          manager: approvingManager.name,
          reportPath,
          displayId,
        },
      });
    } catch (err) {
      logger.error(err);
    }
  }
  return Promise.resolve(null);
};

export const managerApprovalRequested = (report, transport = defaultTransport) => {
// Set these inside the function to allow easier testing
  const { FROMEMAILADDRESS, SENDNOTIFICATIONS } = process.env;
  if (SENDNOTIFICATIONS === 'true') {
    try {
      const {
        id,
        author,
        displayId,
        approvingManager,
      } = report;
      const reportPath = path.join(process.env.TTA_SMART_HUB_URI, 'activity-reports', String(id));
      const email = new Email({
        message: {
          from: FROMEMAILADDRESS,
        },
        send,
        transport,
        htmlToText: {
          wordwrap: 120,
        },
      });
      return email.send({
        template: path.resolve(emailTemplatePath, 'manager_approval_requested'),
        message: {
          to: [approvingManager.email],
        },
        locals: {
          author: author.name,
          reportPath,
          displayId,
        },
      });
    } catch (err) {
      logger.error(err);
    }
  }
  return Promise.resolve(null);
};

export const notifyCollaborator = (report, newCollaborator, transport = defaultTransport) => {
// Set these inside the function to allow easier testing
  const { FROMEMAILADDRESS, SENDNOTIFICATIONS } = process.env;
  if (SENDNOTIFICATIONS === 'true') {
    try {
      const {
        id,
        displayId,
      } = report;
      const reportPath = path.join(process.env.TTA_SMART_HUB_URI, 'activity-reports', String(id));
      const email = new Email({
        message: {
          from: FROMEMAILADDRESS,
        },
        send,
        transport,
        htmlToText: {
          wordwrap: 120,
        },
      });
      return email.send({
        template: path.resolve(emailTemplatePath, 'collaborator_added'),
        message: {
          to: [newCollaborator.email],
        },
        locals: {
          reportPath,
          displayId,
        },
      });
    } catch (err) {
      logger.error(err);
    }
  }
  return Promise.resolve(null);
};

export const collaboratorAdded = (report, newCollaborators, transport = defaultTransport) => {
  newCollaborators.forEach((collaborator) => {
    notifyCollaborator(report, collaborator, transport);
  });
};

export default defaultTransport;
