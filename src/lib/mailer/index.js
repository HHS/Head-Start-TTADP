/* eslint-disable @typescript-eslint/return-await */
import { createTransport } from 'nodemailer';
import { uniq } from 'lodash';
import { QueryTypes } from 'sequelize';
import Email from 'email-templates';
import * as path from 'path';
import { sequelize } from '../../models';
import { auditLogger, logger } from '../../logger';
import newQueue, { increaseListeners } from '../queue';
import { EMAIL_ACTIONS, EMAIL_DIGEST_FREQ, USER_SETTINGS } from '../../constants';
import { userSettingOverridesById, usersWithSetting } from '../../services/userSettings';
import {
  activityReportsWhereCollaboratorByDate,
  activityReportsChangesRequestedByDate,
  activityReportsSubmittedByDate,
  activityReportsApprovedByDate,
} from '../../services/activityReports';
import { userById } from '../../services/users';
import logEmailNotification from './logNotifications';

export const notificationQueue = newQueue('notifications');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASSWORD,
  SMTP_SECURE,
  SMTP_IGNORE_TLS,
  NODE_ENV,
  SEND_NON_PRODUCTION_NOTIFICATIONS,
} = process.env;

// nodemailer expects these values as a boolean.
const secure = SMTP_SECURE !== 'false';
const ignoreTLS = SMTP_IGNORE_TLS !== 'false';

const defaultTransport = createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure,
  ignoreTLS,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD,
  },
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
 * Filters and deduplicates an array of email addresses, removing duplicates
 * and excluding email addresses that start with 'no-send_'.
 *
 * @param {string[]} emails - An array of email addresses to filter and deduplicate.
 * @returns {string[]} - A deduplicated and filtered array of email addresses.
 */
export const filterAndDeduplicateEmails = (emails) => {
  const filteredEmails = emails.flat()
    .filter((email) => typeof email === 'string' && !email.startsWith('no-send_'))
    .filter((email, index, array) => array.indexOf(email) === index);

  return filteredEmails;
};

export const onFailedNotification = (job, error) => {
  auditLogger.error(`job ${job.name} failed for report ${job.data.report.displayId} with error ${error}`);
  logEmailNotification(job, false, error);
};

export const onCompletedNotification = (job, result) => {
  if (result != null) {
    logger.info(`Successfully sent ${job.name} notification for ${job.data.report.displayId || job.data.report.id}`);
    logEmailNotification(job, true, result);
  } else {
    logger.info(`Did not send ${job.name} notification for ${job.data.report.displayId || job.data.report.id} preferences are not set or marked as "no-send"`);
  }
};

/**
 * Process function for changesRequested jobs added to notification queue
 * Sends group email to report author and collaborators about a single approver's requested changes
 */
export const notifyChangesRequested = (job, transport = defaultTransport) => {
  const addresses = [];
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
    const approverEmail = approver.user.email;
    const approverName = approver.user.name;
    const approverNote = approver.note;
    logger.debug(`MAILER: Notifying users that ${approverEmail} requested changes on report ${displayId}`);

    const collabArray = collabsWithSettings.map((c) => c.user.email);
    const reportPath = `${process.env.TTA_SMART_HUB_URI}/activity-reports/${id}`;
    if (authorWithSetting) {
      addresses.push(authorWithSetting.email);
    }
    if (collabArray && collabArray.length > 0) {
      addresses.push(collabArray);
    }

    const toEmails = filterAndDeduplicateEmails(addresses);

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
  const addresses = [];
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
      addresses.push(authorWithSetting.email);
    }
    if (collaboratorEmailAddresses && collaboratorEmailAddresses.length > 0) {
      addresses.push(collaboratorEmailAddresses);
    }
    const toEmails = filterAndDeduplicateEmails(addresses);

    if (toEmails.length === 0) {
      return null; // Don't send anything if the "to" array is empty
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

export const notifyRecipientReportApproved = (job, transport = defaultTransport) => {
  const { report, programSpecialists, recipients } = job.data;
  // Set these inside the function to allow easier testing
  const { FROM_EMAIL_ADDRESS, SEND_NOTIFICATIONS } = process.env;

  if (SEND_NOTIFICATIONS === 'true') {
    const { id, displayId } = report;
    const recipientNames = recipients.map((r) => r.name);
    const recipientNamesDisplay = recipientNames.join(', ').trim();

    logger.info(`MAILER: Attempting to notify program specialists that report ${displayId} was approved because they have grants associated with it.`);
    const addresses = programSpecialists.map((c) => c.email);
    const toEmails = filterAndDeduplicateEmails(addresses);

    if (toEmails.length === 0) {
      return null;
    }
    logger.info(`MAILER: Notifying program specialists that report ${displayId} was approved because they have grants associated with it.`);

    const reportPath = `${process.env.TTA_SMART_HUB_URI}/activity-reports/${id}`;
    const email = new Email({
      message: { from: FROM_EMAIL_ADDRESS },
      send,
      transport,
      htmlToText: { wordWrap: 120 },
    });
    return email.send({
      template: path.resolve(emailTemplatePath, 'recipient_report_approved'),
      message: { to: toEmails },
      locals: { reportPath, displayId, recipientNamesDisplay },
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
    const approverEmail = newApprover.user.email;
    logger.debug(`MAILER: Attempting to notify ${approverEmail} that they were requested to approve report ${displayId}`);
    const toEmails = filterAndDeduplicateEmails([approverEmail]);

    if (toEmails.length === 0) {
      return null;
    }
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

  if (SEND_NOTIFICATIONS === 'true') {
    logger.debug(`MAILER: Attempting to notify ${newCollaborator.email} that they were added as a collaborator to report ${report.displayId}`);

    const reportPath = `${process.env.TTA_SMART_HUB_URI}/activity-reports/${id}`;
    const toEmails = filterAndDeduplicateEmails([newCollaborator.email]);

    if (toEmails.length === 0) {
      return null;
    }
    logger.debug(`MAILER: Notifying ${newCollaborator.email} that they were added as a collaborator to report ${report.displayId}`);

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
        to: toEmails,
      },
      locals: {
        reportPath,
        displayId,
      },
    });
  }
  return null; // Don't send anything if SEND_NOTIFICATIONS is not 'true'
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

/**
 * @param {ActivityReport} report
 * @param {User[]} programSpecialists
*  @param {Array<{ id: number, name: string }>} recipients
 */
export const programSpecialistRecipientReportApprovedNotification = (
  report,
  programSpecialists,
  recipients,
) => {
  // Send group notification to program specialists
  try {
    const data = {
      report,
      programSpecialists,
      recipients,
    };
    notificationQueue.add(EMAIL_ACTIONS.RECIPIENT_REPORT_APPROVED, data);
  } catch (err) {
    auditLogger.error(err);
  }
};

export const sendTrainingReportNotification = async (job, transport = defaultTransport) => {
  // Set these inside the function to allow easier testing
  const { FROM_EMAIL_ADDRESS, SEND_NOTIFICATIONS, CI } = process.env;
  const { data } = job;

  const {
    emailTo,
    templatePath,
    debugMessage,
  } = data;

  const toEmails = filterAndDeduplicateEmails([emailTo]);

  if (toEmails.length === 0) {
    logger.info(`Did not send ${job.name} notification for ${job.data.report.displayId || job.data.report.id} preferences are not set or marked as "no-send"`);
    return null;
  }

  logger.debug(debugMessage);

  if (SEND_NOTIFICATIONS === 'true' && !CI) {
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
      template: path.resolve(emailTemplatePath, templatePath),
      message: {
        to: toEmails,
      },
      locals: data,
    });
  }
  return Promise.resolve(null);
};

/**
 * @param {db.models.EventReportPilot.dataValues} event
 */
export const trVisionAndGoalComplete = async (event) => {
  if (process.env.CI) return;
  try {
    const thoseWhoRequireNotifying = uniq([
      event.ownerId,
      ...event.collaboratorIds,
    ]);

    // due to the way sequelize sends the JSON column :(
    const parsedData = JSON.parse(event.data.val); // parse the JSON string
    const { eventId } = parsedData; // extract the pretty url
    const eId = eventId.split('-').pop();
    const reportPath = `${process.env.TTA_SMART_HUB_URI}/training-report/${eId}`;

    await Promise.all(thoseWhoRequireNotifying.map(async (id) => {
      const user = await userById(id);
      const data = {
        displayId: eventId,
        reportPath,
        emailTo: [user.email],
        debugMessage: `MAILER: Notifying ${user.email} that a POC completed work on TR ${event.id} | ${eId}`,
        templatePath: 'tr_poc_vision_goal_complete',
      };

      return notificationQueue.add(EMAIL_ACTIONS.TRAINING_REPORT_POC_VISION_GOAL_COMPLETE, data);
    }));
  } catch (err) {
    auditLogger.error(err);
  }
};

/**
 * @param {db.models.EventReportPilot.dataValues} event
 */
export const trPocSessionComplete = async (event) => {
  if (process.env.CI) return;
  try {
    const thoseWhoRequireNotifying = [
      event.ownerId,
      ...event.collaboratorIds,
    ];

    await Promise.all(thoseWhoRequireNotifying.map(async (id) => {
      const user = await userById(id);
      const { eventId } = event.data;
      const eId = eventId.split('-').pop();
      const reportPath = `${process.env.TTA_SMART_HUB_URI}/training-report/${eId}`;

      const data = {
        displayId: eventId,
        reportPath,
        emailTo: [user.email],
        debugMessage: `MAILER: Notifying ${user.email} that a POC completed work on TR ${event.id}`,
        templatePath: 'tr_poc_session_complete',
      };

      return notificationQueue.add(EMAIL_ACTIONS.TRAINING_REPORT_POC_SESSION_COMPLETE, data);
    }));
  } catch (err) {
    auditLogger.error(err);
  }
};

/**
 * @param {db.models.EventReportPilot.dataValues} event
 */
export const trSessionCreated = async (event) => {
  if (process.env.CI) return;
  try {
    if (!event.pocIds && !event.pocIds.length) {
      auditLogger.warn(`MAILER: No POCs found for TR ${event.id}`);
    }

    await Promise.all(event.pocIds.map(async (id) => {
      const user = await userById(id);

      const { eventId } = event.data;
      const eId = eventId.split('-').pop();
      const reportPath = `${process.env.TTA_SMART_HUB_URI}/training-report/${eId}`;

      const data = {
        displayId: eventId,
        reportPath,
        emailTo: [user.email],
        debugMessage: `MAILER: Notifying ${user.email} that a session was created for TR ${event.id}`,
        templatePath: 'tr_session_created',
        report: {
          ...event,
          displayId: eventId,
        },
      };

      return notificationQueue.add(EMAIL_ACTIONS.TRAINING_REPORT_SESSION_CREATED, data);
    }));
  } catch (err) {
    auditLogger.error(err);
  }
};

/**
 * @param {db.models.EventReportPilot.dataValues} event
 */
export const trSessionCompleted = async (event) => {
  if (process.env.CI) return;
  try {
    if (!event.pocIds && !event.pocIds.length) {
      auditLogger.warn(`MAILER: No POCs found for TR ${event.id}`);
    }

    await Promise.all(event.pocIds.map(async (id) => {
      const user = await userById(id);

      const { eventId } = event.data;
      const eId = eventId.split('-').pop();
      const reportPath = `${process.env.TTA_SMART_HUB_URI}/training-report/${eId}`;

      const data = {
        displayId: eventId,
        reportPath,
        emailTo: [user.email],
        debugMessage: `MAILER: Notifying ${user.email} that a session was completed for TR ${event.id}`,
        templatePath: 'tr_session_completed',
      };
      return notificationQueue.add(EMAIL_ACTIONS.TRAINING_REPORT_SESSION_COMPLETED, data);
    }));
  } catch (err) {
    auditLogger.error(err);
  }
};

/**
 *
 * @param {db.models.EventReportPilot.dataValues} report
 * @param {number} newCollaboratorId
 */
export const trCollaboratorAdded = async (
  report,
  newCollaboratorId,
) => {
  if (process.env.CI) return;
  try {
    const collaborator = await userById(newCollaboratorId);
    if (!collaborator) {
      throw new Error(`Unable to notify user with ID ${newCollaboratorId} that they were added as a collaborator to TR ${report.id}, a user with that ID does not exist`);
    }

    // due to the way sequelize sends the JSON column :(
    const parsedData = JSON.parse(report.dataValues.data.val); // parse the JSON string
    const { eventId } = parsedData; // extract the pretty url
    const eId = eventId.split('-').pop();
    const reportPath = `${process.env.TTA_SMART_HUB_URI}/training-report/${eId}`;

    const data = {
      displayId: eventId,
      user: collaborator,
      reportPath,
      emailTo: [collaborator.email],
      templatePath: 'tr_collaborator_added',
      debugMessage: `MAILER: Notifying ${collaborator.email} that they were added as a collaborator to TR ${report.id}`,
    };

    notificationQueue.add(EMAIL_ACTIONS.TRAINING_REPORT_COLLABORATOR_ADDED, data);
  } catch (err) {
    auditLogger.error(err);
  }
};

/**
 *
 * @param {db.models.EventReportPilot.dataValues} report
 * @param {number} newCollaboratorId
 */
export const trPocAdded = async (
  report,
  newPocId,
) => {
  if (process.env.CI) return;
  try {
    const poc = await userById(newPocId);

    // due to the way sequelize sends the JSON column :(
    const parsedData = JSON.parse(report.dataValues.data.val); // parse the JSON string
    const { eventId } = parsedData; // extract the pretty url
    const eId = eventId.split('-').pop();
    const reportPath = `${process.env.TTA_SMART_HUB_URI}/training-report/${eId}`;
    const data = {
      displayId: eventId,
      reportPath,
      emailTo: [poc.email],
      debugMessage: `MAILER: Notifying ${poc.email} that they were added as a collaborator to TR ${report.id}`,
      templatePath: 'tr_poc_added',
    };

    notificationQueue.add(EMAIL_ACTIONS.TRAINING_REPORT_POC_ADDED, data);
  } catch (err) {
    auditLogger.error(err);
  }
};

/**
 *
 * @param {db.models.EventReportPilot.dataValues} report
 * @param {number} newCollaboratorId
 */
export const trPocEventComplete = async (
  event,
) => {
  if (process.env.CI) return;
  try {
    if (!event.pocIds && !event.pocIds.length) {
      auditLogger.warn(`MAILER: No POCs found for TR ${event.id}`);
    }

    await Promise.all(event.pocIds.map(async (id) => {
      const user = await userById(id);
      const parsedData = JSON.parse(event.data.val); // parse the JSON string
      const { eventId } = parsedData; // extract the pretty url
      const eId = eventId.split('-').pop();
      const reportPath = `${process.env.TTA_SMART_HUB_URI}/training-report/${eId}`;

      const data = {
        displayId: eventId,
        emailTo: [user.email],
        reportPath,
        debugMessage: `MAILER: Notifying ${user.email} that TR ${event.id} is complete`,
        templatePath: 'tr_event_complete',
      };

      return notificationQueue.add(EMAIL_ACTIONS.TRAINING_REPORT_EVENT_COMPLETED, data);
    }));
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
      notificationQueue.add(EMAIL_ACTIONS.COLLABORATOR_DIGEST, data);
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

      notificationQueue.add(EMAIL_ACTIONS.NEEDS_ACTION_DIGEST, data);
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

      notificationQueue.add(EMAIL_ACTIONS.SUBMITTED_DIGEST, data);
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

      notificationQueue.add(EMAIL_ACTIONS.APPROVED_DIGEST, data);
      return data;
    });
    return Promise.all(records);
  } catch (err) {
    logger.info(`MAILER: ApprovedDigest with key ${USER_SETTINGS.EMAIL.KEYS.APPROVAL} freq ${freq} error ${err}`);
    throw err;
  }
}

export async function recipientApprovedDigest(freq, subjectFreq) {
  const date = frequencyToInterval(freq);
  logger.info(`MAILER: Starting RecipientApprovedDigest with freq ${freq}`);
  try {
    if (!date) {
      throw new Error('date is null');
    }

    // Get all reports approved by date.
    const reports = await activityReportsApprovedByDate(null, date);
    const reportIds = reports.map((r) => r.id);

    // Get all specialists that are subscribed to RECIPIENT_APPROVAL notifications given this freq.
    // FIXME: TTAHUB-1253
    let specialists = await sequelize.query(`
      SELECT DISTINCT u.id
      FROM "ActivityReports" a
      JOIN "ActivityRecipients" ar
      ON a.id = ar."activityReportId"
      JOIN "Grants" gr
      ON ar."grantId" = gr.id
      JOIN "Users" u
      ON LOWER(gr."programSpecialistEmail") = LOWER(u.email)
      WHERE a.id in (${reportIds.join(',') || null})
    `, { type: QueryTypes.SELECT });

    // Filter to only those who have opted into this notification setting and freq.
    specialists = await Promise.all(specialists.map(async (ps) => {
      const setting = await userSettingOverridesById(
        ps.id,
        USER_SETTINGS.EMAIL.KEYS.RECIPIENT_APPROVAL,
      );

      if (setting && setting.value === freq) return ps;
      return null;
    }));

    specialists = specialists.filter((s) => s !== null);

    const users = await Promise.all(
      specialists.map(async (s) => userById(s.id)),
    );

    const records = users.map((user) => {
      const data = {
        user,
        reports,
        type: EMAIL_ACTIONS.RECIPIENT_APPROVED_DIGEST,
        freq,
        subjectFreq,
      };

      notificationQueue.add(EMAIL_ACTIONS.RECIPIENT_APPROVED_DIGEST, data);
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

  if (SEND_NOTIFICATIONS === 'true') {
    logger.debug(`MAILER: Attempting to create ${user.email}'s ${type} digest for ${freq}`);
    const toEmails = filterAndDeduplicateEmails([user.email]);

    if (toEmails.length === 0) {
      return null;
    }
    logger.debug(`MAILER: Creating ${user.email}'s ${type} digest for ${freq}`);
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
        to: toEmails,
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

export const processNotificationQueue = () => {
  // Notifications
  notificationQueue.on('failed', onFailedNotification);
  notificationQueue.on('completed', onCompletedNotification);
  increaseListeners(notificationQueue, 10);

  notificationQueue.process(EMAIL_ACTIONS.NEEDS_ACTION, notifyChangesRequested);
  notificationQueue.process(EMAIL_ACTIONS.SUBMITTED, notifyApproverAssigned);
  notificationQueue.process(EMAIL_ACTIONS.APPROVED, notifyReportApproved);
  notificationQueue.process(EMAIL_ACTIONS.COLLABORATOR_ADDED, notifyCollaboratorAssigned);
  notificationQueue.process(EMAIL_ACTIONS.RECIPIENT_REPORT_APPROVED, notifyRecipientReportApproved);

  notificationQueue.process(EMAIL_ACTIONS.NEEDS_ACTION_DIGEST, notifyDigest);
  notificationQueue.process(EMAIL_ACTIONS.SUBMITTED_DIGEST, notifyDigest);
  notificationQueue.process(EMAIL_ACTIONS.APPROVED_DIGEST, notifyDigest);
  notificationQueue.process(EMAIL_ACTIONS.COLLABORATOR_DIGEST, notifyDigest);
  notificationQueue.process(EMAIL_ACTIONS.RECIPIENT_REPORT_APPROVED_DIGEST, notifyDigest);

  notificationQueue.process(
    EMAIL_ACTIONS.TRAINING_REPORT_COLLABORATOR_ADDED,
    sendTrainingReportNotification,
  );

  notificationQueue.process(
    EMAIL_ACTIONS.TRAINING_REPORT_SESSION_CREATED,
    sendTrainingReportNotification,
  );

  notificationQueue.process(
    EMAIL_ACTIONS.TRAINING_REPORT_SESSION_COMPLETED,
    sendTrainingReportNotification,
  );

  notificationQueue.process(
    EMAIL_ACTIONS.TRAINING_REPORT_EVENT_COMPLETED,
    sendTrainingReportNotification,
  );

  notificationQueue.process(
    EMAIL_ACTIONS.TRAINING_REPORT_POC_ADDED,
    sendTrainingReportNotification,
  );

  notificationQueue.process(
    EMAIL_ACTIONS.TRAINING_REPORT_POC_VISION_GOAL_COMPLETE,
    sendTrainingReportNotification,
  );

  notificationQueue.process(
    EMAIL_ACTIONS.TRAINING_REPORT_POC_SESSION_COMPLETE,
    sendTrainingReportNotification,
  );
};

/**
 * @param {User} user
 * @param {string} token
 * @returns Promise<any>
 */
export const sendEmailVerificationRequestWithToken = (user, token) => {
  const toEmails = filterAndDeduplicateEmails([user.email]);

  if (toEmails.length === 0) {
    return null;
  }

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

  const uri = `${process.env.TTA_SMART_HUB_URI}/account/verify-email/${token}`;

  return email.send({
    template: path.resolve(emailTemplatePath, 'email_verification'),
    message: {
      to: toEmails,
    },
    locals: {
      token,
      uri,
    },
  });
};

export default defaultTransport;
