import { createTransport } from 'nodemailer';
import Email from 'email-templates';
import * as path from 'path';
import { logger } from '../../logger';

const {
  SMTPHOST, SMTPPORT, SMTPUSER, SMTPPASS, SMTPSECURE, FROMEMAILADDRESS, SENDNOTIFICATIONS,
} = process.env;

const defaultTransport = createTransport({
  host: SMTPHOST,
  port: SMTPPORT,
  secure: SMTPSECURE,
  auth: {
    user: SMTPUSER,
    pass: SMTPPASS,
  },
});

const emailTemplatePath = path.join(process.cwd(), 'src', 'email_templates');

export const changesRequestedByManager = (
  report, transport = defaultTransport, sendNotifications = SENDNOTIFICATIONS,
) => {
  if (sendNotifications) {
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
        // Uncomment the following line to send email in non-production envs
        // send: true,
        transport,
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

export const managerApprovalRequested = (
  report, transport = defaultTransport, sendNotifications = SENDNOTIFICATIONS,
) => {
  if (sendNotifications) {
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
        // Uncomment the following line to send email in non-production envs
        // send: true,
        transport,
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
export default defaultTransport;
