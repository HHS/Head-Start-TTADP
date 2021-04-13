import { createTransport } from 'nodemailer';
import Email from 'email-templates';
import * as path from 'path';
import { auditLogger, logger } from '../../logger';
import newQueue from '../queue';

export const notificationQueue = newQueue('notifications');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE,
  NODE_ENV,
  SEND_NON_PRODUCTION_NOTIFICATIONS,
} = process.env;

// nodemailer expects this value as a boolean.
const secure = SMTP_SECURE !== 'false';

const defaultTransport = createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

const send = NODE_ENV === 'production' || SEND_NON_PRODUCTION_NOTIFICATIONS === 'true';

const emailTemplatePath = path.join(process.cwd(), 'src', 'email_templates');

export const changesRequestedByManager = (job, transport = defaultTransport) => {
  const { report } = job.data;
  // Set these inside the function to allow easier testing
  const { FROM_EMAIL_ADDRESS, SEND_NOTIFICATIONS } = process.env;
  if (SEND_NOTIFICATIONS === 'true') {
    logger.info(`MAILER: ${report.approvingManager.name} requested changes on report ${report.displayId}}`);
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
        from: FROM_EMAIL_ADDRESS,
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
  }
  // return a promise so that returns are consistent
  return Promise.resolve(null);
};

export const reportApproved = (job, transport = defaultTransport) => {
  const { report } = job.data;
  // Set these inside the function to allow easier testing
  const { FROM_EMAIL_ADDRESS, SEND_NOTIFICATIONS } = process.env;
  if (SEND_NOTIFICATIONS === 'true') {
    logger.info(`MAILER: ${report.approvingManager.name} approved report ${report.displayId}}`);
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
        from: FROM_EMAIL_ADDRESS,
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
  }
  return Promise.resolve(null);
};

export const managerApprovalRequested = (job, transport = defaultTransport) => {
// Set these inside the function to allow easier testing
  const { report } = job.data;
  const { FROM_EMAIL_ADDRESS, SEND_NOTIFICATIONS } = process.env;
  if (SEND_NOTIFICATIONS === 'true') {
    logger.info(`MAILER: Notifying ${report.approvingManager.email} that they were requested to approve report ${report.displayId}`);
    const {
      id,
      author,
      displayId,
      approvingManager,
    } = report;
    const reportPath = path.join(process.env.TTA_SMART_HUB_URI, 'activity-reports', String(id));
    const email = new Email({
      message: {
        from: FROM_EMAIL_ADDRESS,
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
  }
  return Promise.resolve(null);
};

export const notifyCollaborator = (job, transport = defaultTransport) => {
  const { report, newCollaborator } = job.data;
  // Set these inside the function to allow easier testing
  const { FROM_EMAIL_ADDRESS, SEND_NOTIFICATIONS } = process.env;
  if (SEND_NOTIFICATIONS === 'true') {
    logger.info(`MAILER: Notifying ${newCollaborator.email} that they were added as a collaborator to report ${report.displayId}`);
    const {
      id,
      displayId,
    } = report;
    const reportPath = path.join(process.env.TTA_SMART_HUB_URI, 'activity-reports', String(id));
    const email = new Email({
      message: {
        from: FROM_EMAIL_ADDRESS,
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
  }
  return Promise.resolve(null);
};

export const collaboratorAddedNotification = (report, newCollaborators) => {
  newCollaborators.forEach((collaborator) => {
    try {
      const data = {
        report,
        newCollaborator: collaborator,
      };
      notificationQueue.add('collaboratorAdded', data);
    } catch (err) {
      auditLogger.error(err);
    }
  });
};

export const managerApprovalNotification = (report) => {
  try {
    const data = {
      report,
    };
    notificationQueue.add('managerApproval', data);
  } catch (err) {
    auditLogger.error(err);
  }
};

export const reportApprovedNotification = (report) => {
  try {
    const data = {
      report,
    };
    notificationQueue.add('reportApproved', data);
  } catch (err) {
    auditLogger.error(err);
  }
};

export const changesRequestedNotification = (report) => {
  try {
    const data = {
      report,
    };
    notificationQueue.add('changesRequested', data);
  } catch (err) {
    auditLogger.error(err);
  }
};

export default defaultTransport;
