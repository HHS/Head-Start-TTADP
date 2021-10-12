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

/**
 * Process function for changesRequested jobs added to notification queue
 * Sends group email to report author and collaborators about a single approver's requested changes
 */
export const notifyChangesRequested = (job, transport = defaultTransport) => {
  const { report, approver } = job.data;
  // Set these inside the function to allow easier testing
  const { FROM_EMAIL_ADDRESS, SEND_NOTIFICATIONS } = process.env;
  if (SEND_NOTIFICATIONS === 'true') {
    const {
      id,
      author,
      displayId,
      collaborators,
    } = report;
    const approverEmail = approver.user.email;
    const approverName = approver.user.name;
    const approverNote = approver.note;
    logger.info(`MAILER: Notifying users that ${approverEmail} requested changes on report ${displayId}`);
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
        managerName: approverName,
        reportPath,
        displayId,
        comments: approverNote,
      },
    });
  }
  // return a promise so that returns are consistent
  return Promise.resolve(null);
};

/**
 * Process function for reportApproved jobs added to notification queue
 * Sends group email to report author and collaborators about approved status
 */
export const notifyReportApproved = (job, transport = defaultTransport) => {
  const { report } = job.data;
  // Set these inside the function to allow easier testing
  const { FROM_EMAIL_ADDRESS, SEND_NOTIFICATIONS } = process.env;
  if (SEND_NOTIFICATIONS === 'true') {
    const {
      id,
      author,
      displayId,
      collaborators,
    } = report;
    logger.info(`MAILER: Notifying users that report ${displayId}} was approved.`);
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
        reportPath,
        displayId,
      },
    });
  }
  return Promise.resolve(null);
};

/**
 * Process function for approverAssigned jobs added to notification queue
 * Sends email to user about new ability to approve a report
 */
export const notifyApproverAssigned = (job, transport = defaultTransport) => {
// Set these inside the function to allow easier testing
  const { report, newApprover } = job.data;
  const { FROM_EMAIL_ADDRESS, SEND_NOTIFICATIONS } = process.env;
  if (SEND_NOTIFICATIONS === 'true') {
    const {
      id,
      displayId,
    } = report;
    const approverEmail = newApprover.user.email;
    logger.info(`MAILER: Notifying ${approverEmail} that they were requested to approve report ${displayId}`);
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
        to: [approverEmail],
      },
      locals: {
        reportPath,
        displayId,
      },
    });
  }
  return Promise.resolve(null);
};

/**
 * Process function for collaboratorAssigned jobs added to notification queue
 * Sends email to user about new ability to edit a report
 */
export const notifyCollaboratorAssigned = (job, transport = defaultTransport) => {
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

export const collaboratorAssignedNotification = (report, newCollaborators) => {
  // Each collaborator will get an individual notification
  newCollaborators.forEach((collaborator) => {
    try {
      const data = {
        report,
        newCollaborator: collaborator,
      };
      notificationQueue.add('collaboratorAssigned', data);
    } catch (err) {
      auditLogger.error(err);
    }
  });
};

export const approverAssignedNotification = (report, newApprovers) => {
  // Each approver will get an individual notification
  newApprovers.forEach((approver) => {
    try {
      const data = {
        report,
        newApprover: approver,
      };
      notificationQueue.add('approverAssigned', data);
    } catch (err) {
      auditLogger.error(err);
    }
  });
};

export const reportApprovedNotification = (report) => {
  // Send group notification to author and collaborators
  try {
    const data = {
      report,
    };
    notificationQueue.add('reportApproved', data);
  } catch (err) {
    auditLogger.error(err);
  }
};

export const changesRequestedNotification = (report, approver) => {
  // Send group notification to author and collaborators
  try {
    const data = {
      report,
      approver,
    };
    notificationQueue.add('changesRequested', data);
  } catch (err) {
    auditLogger.error(err);
  }
};

export default defaultTransport;
