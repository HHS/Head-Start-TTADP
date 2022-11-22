import { createTransport } from 'nodemailer';
import Email from 'email-templates';
import * as path from 'path';
import { auditLogger, logger } from '../../logger';
import newQueue from '../queue';
import { EMAIL_ACTIONS, EMAIL_DIGEST_FREQ, USER_SETTINGS } from '../../constants';
import { usersWithSetting } from '../../services/userSettings';
import {
  activityReportsWhereCollaboratorByDate,
  activityReportsChangesRequestedByDate,
  activityReportsSubmittedByDate,
  activityReportsApprovedByDate,
} from '../../services/activityReports';

export const notificationQueue = newQueue('notifications');
export const notificationDigestQueue = newQueue('digestNotifications');

const {
  SMTP_HOST,
  SMTP_PORT,
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
  ignoreTLS: true,
});

const send = NODE_ENV === 'production' || SEND_NON_PRODUCTION_NOTIFICATIONS === 'true';

const emailTemplatePath = path.join(process.cwd(), 'email_templates');

/**
 * Converts the timeframe to SQL friendly string.
 *
 * @param {String} freq - frequency of the needs action digests (daily/weekly/monthly)
 *
 */
export const frequencyToInterval = (freq) => {
  let date = null;
  switch (freq) {
    case EMAIL_DIGEST_FREQ.DAILY:
      date = 'NOW() - INTERVAL \'1 DAY\'';
      break;
    case EMAIL_DIGEST_FREQ.WEEKLY:
      date = 'NOW() - INTERVAL \'1 WEEK\'';
      break;
    case EMAIL_DIGEST_FREQ.MONTHLY:
      date = 'NOW() - INTERVAL \'1 MONTH\'';
      break;
    default:
      break;
  }
  return date;
};

/**
 * Process function for changesRequested jobs added to notification queue
 * Sends group email to report author and collaborators about a single approver's requested changes
 */
export const notifyChangesRequested = (job, transport = defaultTransport) => {
  const toEmails = [];
  const {
    report, approver, authorWithSetting, collabsWithSettings,
  } = job.data;
  // Set these inside the function to allow easier testing
  const { FROM_EMAIL_ADDRESS, SEND_NOTIFICATIONS } = process.env;
  if (SEND_NOTIFICATIONS === 'true') {
    const {
      id,
      displayId,
    } = report;
    const approverEmail = approver.User.email;
    const approverName = approver.User.name;
    const approverNote = approver.note;
    logger.debug(`MAILER: Notifying users that ${approverEmail} requested changes on report ${displayId}`);

    const collabArray = collabsWithSettings.map((c) => c.user.email);
    const reportPath = `${process.env.TTA_SMART_HUB_URI}/activity-reports/${id}`;
    if (authorWithSetting) {
      toEmails.push(authorWithSetting.email);
    }
    if (collabArray && collabArray.length > 0) {
      toEmails.push(collabArray);
    }

    if (toEmails.length === 0) {
      return null;
    }
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
        to: toEmails,
      },
      locals: {
        managerName: approverName,
        reportPath,
        displayId,
        comments: approverNote,
      },
    });
  }

  return null;
};

/**
 * Process function for reportApproved jobs added to notification queue
 * Sends group email to report author and collaborators about approved status
 */
export const notifyReportApproved = (job, transport = defaultTransport) => {
  const toEmails = [];
  const { report, authorWithSetting, collabsWithSettings } = job.data;
  // Set these inside the function to allow easier testing
  const { FROM_EMAIL_ADDRESS, SEND_NOTIFICATIONS } = process.env;
  if (SEND_NOTIFICATIONS === 'true') {
    const {
      id,
      displayId,
    } = report;
    logger.info(`MAILER: Notifying users that report ${displayId} was approved.`);
    const collaboratorEmailAddresses = collabsWithSettings.map((c) => c.user.email);
    const reportPath = `${process.env.TTA_SMART_HUB_URI}/activity-reports/${id}`;
    if (authorWithSetting) {
      toEmails.push(authorWithSetting.email);
    }
    if (collaboratorEmailAddresses && collaboratorEmailAddresses.length > 0) {
      toEmails.push(collaboratorEmailAddresses);
    }

    if (toEmails.length === 0) {
      return null;
    }
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
        to: toEmails,
      },
      locals: {
        reportPath,
        displayId,
      },
    });
  }
  return null;
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
    const approverEmail = newApprover.User.email;
    logger.debug(`MAILER: Notifying ${approverEmail} that they were requested to approve report ${displayId}`);
    const reportPath = `${process.env.TTA_SMART_HUB_URI}/activity-reports/${id}`;
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
  const {
    id,
    displayId,
  } = report;
  // Set these inside the function to allow easier testing
  const { FROM_EMAIL_ADDRESS, SEND_NOTIFICATIONS } = process.env;

  logger.debug(`MAILER: Notifying ${newCollaborator.email} that they were added as a collaborator to report ${report.displayId}`);

  if (SEND_NOTIFICATIONS === 'true') {
    const reportPath = `${process.env.TTA_SMART_HUB_URI}/activity-reports/${id}`;
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
        newCollaborator: collaborator.user,
      };
      notificationQueue.add(EMAIL_ACTIONS.COLLABORATOR_ADDED, data);
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
      notificationQueue.add(EMAIL_ACTIONS.SUBMITTED, data);
    } catch (err) {
      auditLogger.error(err);
    }
  });
};

export const reportApprovedNotification = (report, authorWithSetting, collabsWithSettings) => {
  // Send group notification to author and collaborators
  try {
    const data = {
      report,
      authorWithSetting,
      collabsWithSettings,
    };
    notificationQueue.add(EMAIL_ACTIONS.APPROVED, data);
  } catch (err) {
    auditLogger.error(err);
  }
};

export const changesRequestedNotification = (
  report,
  approver,
  authorWithSetting,
  collabsWithSettings,
) => {
  // Send group notification to author and collaborators
  try {
    const data = {
      report,
      approver,
      authorWithSetting,
      collabsWithSettings,
    };
    notificationQueue.add(EMAIL_ACTIONS.NEEDS_ACTION, data);
  } catch (err) {
    auditLogger.error(err);
  }
};

/**
 * Finds users that are subscribed to the collaborator digest.
 * For each user it retrieves the relevant report ids based on the timeframe.
 *
 * @param {String} freq - frequency of the collaborator digests (daily/weekly/monthly)
 *
 */
export async function collaboratorDigest(freq, subjectFreq) {
  let data = null;
  const date = frequencyToInterval(freq);
  logger.info(`MAILER: Starting CollaboratorDigest with freq ${freq}`);
  try {
    if (!date) {
      throw new Error('date is null');
    }
    // Find users having collaborator digest preferences
    const users = await usersWithSetting(USER_SETTINGS.EMAIL.KEYS.COLLABORATOR_ADDED, [freq]);

    const records = users.map(async (user) => {
      const reports = await activityReportsWhereCollaboratorByDate(user.id, date);

      data = {
        user,
        reports,
        type: EMAIL_ACTIONS.COLLABORATOR_DIGEST,
        freq,
        subjectFreq,
      };
      notificationDigestQueue.add(EMAIL_ACTIONS.COLLABORATOR_DIGEST, data);
      return data;
    });
    return Promise.all(records);
  } catch (err) {
    logger.info(`MAILER: CollaboratorDigest with key ${USER_SETTINGS.EMAIL.KEYS.COLLABORATOR_ADDED} freq ${freq} error ${err}`);
    throw err;
  }
}

/**
 * Finds users that are subscribed to the needs action digest.
 * For each user it retrieves the relevant report ids based on the timeframe.
 *
 * @param {String} freq - frequency of the needs action digests (daily/weekly/monthly)
 *
 */
export async function changesRequestedDigest(freq, subjectFreq) {
  let data;
  const date = frequencyToInterval(freq);
  logger.info(`MAILER: Starting ChangesRequestedDigest with freq ${freq}`);
  try {
    if (!date) {
      throw new Error('date is null');
    }
    // Find Users with preference
    const users = await usersWithSetting(USER_SETTINGS.EMAIL.KEYS.CHANGE_REQUESTED, [freq]);
    const records = users.map(async (user) => {
      const reports = await activityReportsChangesRequestedByDate(user.id, date);

      data = {
        user,
        reports,
        type: EMAIL_ACTIONS.NEEDS_ACTION_DIGEST,
        freq,
        subjectFreq,
      };

      notificationDigestQueue.add(EMAIL_ACTIONS.NEEDS_ACTION_DIGEST, data);
      return data;
    });
    return Promise.all(records);
  } catch (err) {
    logger.info(`MAILER: ChangesRequestedDigest with key ${USER_SETTINGS.EMAIL.KEYS.CHANGE_REQUESTED} freq ${freq} error ${err}`);
    throw err;
  }
}

/**
 * Finds users that are subscribed to the submitted digest.
 * For each user it retrieves the relevant report ids based on the timeframe.
 *
 * @param {String} freq - frequency of the submitted digests (daily/weekly/monthly)
 *
 */
export async function submittedDigest(freq, subjectFreq) {
  let data = null;
  const date = frequencyToInterval(freq);
  logger.info(`MAILER: Starting SubmittedDigest with freq ${freq}`);
  try {
    if (!date) {
      throw new Error('date is null');
    }
    // Find Users with preferences
    const users = await usersWithSetting(USER_SETTINGS.EMAIL.KEYS.SUBMITTED_FOR_REVIEW, [freq]);
    const records = users.map(async (user) => {
      const reports = await activityReportsSubmittedByDate(user.id, date);

      data = {
        user,
        reports,
        type: EMAIL_ACTIONS.SUBMITTED_DIGEST,
        freq,
        subjectFreq,
      };

      notificationDigestQueue.add(EMAIL_ACTIONS.SUBMITTED_DIGEST, data);
      return data;
    });
    return Promise.all(records);
  } catch (err) {
    logger.info(`MAILER: submittedDigest with key ${USER_SETTINGS.EMAIL.KEYS.SUBMITTED_FOR_REVIEW} freq ${freq} error ${err}`);
    throw err;
  }
}

/**
 * Finds users that are subscribed to the approved digest.
 * For each user it retrieves the relevant report ids based on the timeframe.
 *
 * @param {String} freq - frequency of the approved digests (daily/weekly/monthly)
 *
 */
export async function approvedDigest(freq, subjectFreq) {
  let data = null;
  const date = frequencyToInterval(freq);
  logger.info(`MAILER: Starting ApprovedDigest with freq ${freq}`);
  try {
    if (!date) {
      throw new Error('date is null');
    }
    // Find Users with preferences
    const users = await usersWithSetting(USER_SETTINGS.EMAIL.KEYS.APPROVAL, [freq]);

    const records = users.map(async (user) => {
      const reports = await activityReportsApprovedByDate(user.id, date);

      data = {
        user,
        reports,
        type: EMAIL_ACTIONS.APPROVED_DIGEST,
        freq,
        subjectFreq,
      };

      notificationDigestQueue.add(EMAIL_ACTIONS.APPROVED_DIGEST, data);
      return data;
    });
    return Promise.all(records);
  } catch (err) {
    logger.info(`MAILER: ApprovedDigest with key ${USER_SETTINGS.EMAIL.KEYS.APPROVAL} freq ${freq} error ${err}`);
    throw err;
  }
}

/**
 * Retrieves the correct template based on parameters and send a digest email.
 *
 * @param {*} job - job containing data
 * @param {*} transport - nodemailer transport
 *
 */
export const notifyDigest = (job, transport = defaultTransport) => {
  const {
    user, reports, type, freq, subjectFreq,
  } = job.data;

  // Set these inside the function to allow easier testing
  const { FROM_EMAIL_ADDRESS, SEND_NOTIFICATIONS } = process.env;

  logger.debug(`MAILER: Creating ${user.email}'s ${type} digest for ${freq}`);

  if (SEND_NOTIFICATIONS === 'true') {
    const reportPath = `${process.env.TTA_SMART_HUB_URI}/activity-reports/`;

    const templateType = reports && reports.length > 0 ? 'digest' : 'digest_empty';

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
      template: path.resolve(emailTemplatePath, templateType),
      message: {
        to: [user.email],
      },
      locals: {
        user,
        reports,
        reportPath,
        type,
        freq,
        subjectFreq,
      },
    });
  }
  return null;
};

/**
 * @param {User} user
 * @param {string} token
 * @returns Promise<any>
 */
export const sendEmailVerificationRequestWithToken = (user, token) => {
  const email = new Email({
    message: {
      from: process.env.FROM_EMAIL_ADDRESS,
    },
    send,
    transport: defaultTransport,
    htmlToText: {
      wordwrap: 120,
    },
  });

  auditLogger.info(`Sending email verification request to ${user.email}, value of send: ${send}, from: ${process.env.FROM_EMAIL_ADDRESS}, transport: ${JSON.stringify(defaultTransport)}`);

  const uri = `${process.env.TTA_SMART_HUB_URI}/account/verify-email/${token}`;

  return email.send({
    template: path.resolve(emailTemplatePath, 'email_verification'),
    message: {
      to: [user.email],
    },
    locals: {
      token,
      uri,
    },
  });
};

export default defaultTransport;
