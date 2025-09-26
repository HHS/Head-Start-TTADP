/* istanbul ignore file: tested but not showing up in coverage */
/* eslint-disable @typescript-eslint/return-await */
import { createTransport } from 'nodemailer';
import moment from 'moment';
import { uniq, lowerCase } from 'lodash';
import { QueryTypes } from 'sequelize';
import Email from 'email-templates';
import * as path from 'path';
import {
  sequelize,
} from '../../models';
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
import logEmailNotification, { logDigestEmailNotification } from './logNotifications';
import transactionQueueWrapper from '../../workers/transactionWrapper';
import referenceData from '../../workers/referenceData';
import safeParse from '../../models/helpers/safeParse';

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
  if (job.data.reports && Array.isArray(job.data.reports)) {
    job.data.reports.forEach((report) => {
      auditLogger.error(`job ${job.name} failed for report ${report.displayId} with error ${error}`);
    });
    logDigestEmailNotification(job, false, error);
  } else {
    auditLogger.error(`job ${job.name} failed for report ${(job.data.report?.displayId) || 'unknown'} with error ${error}`);
    logEmailNotification(job, false, error);
  }
};

export const onCompletedNotification = (job, result) => {
  if (job.data.reports && Array.isArray(job.data.reports)) {
    job.data.reports.forEach((report) => {
      if (result != null) {
        logger.info(`Successfully sent ${job.name} notification for ${report.displayId}`);
        logDigestEmailNotification(job, true, result);
      } else {
        logger.info(`Did not send ${job.name} notification for ${report.displayId} preferences are not set or marked as "no-send"`);
      }
    });
  } else if (result != null) {
    logger.info(`Successfully sent ${job.name} notification for ${job.data.report.displayId || job.data}`);
    logEmailNotification(job, true, result);
  } else {
    logger.info(`Did not send ${job.name} notification for ${job.data.report.displayId || job.data} preferences are not set or marked as "no-send"`);
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
        ...referenceData(),
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
        ...referenceData(),
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
      ...referenceData(),
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
      ...referenceData(),
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

  if (!toEmails || toEmails.length === 0) {
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
 * @param {db.models.TrainingReport.dataValues} event
 * @param {number} sessionId
 */
export const trSessionCreated = async (event, sessionId) => {
  if (process.env.CI) return;
  try {
    if (!event.pocIds || !event.pocIds.length) {
      auditLogger.warn(`MAILER: No POCs found for TR ${event.id}`);
    }

    const { eventId } = event.data;
    const eId = eventId.split('-').pop();
    const reportPath = `${process.env.TTA_SMART_HUB_URI}/training-report/${eId}/session/${sessionId}`;

    await Promise.all(event.pocIds.map(async (id) => {
      const user = await userById(id, true);
      const emailTo = filterAndDeduplicateEmails([user.email]);

      if (emailTo.length === 0) {
        logger.info(`Did not send tr session created notification for ${eId} preferences are not set or marked as "no-send"`);
        return null;
      }

      const data = {
        displayId: eventId,
        reportPath,
        emailTo,
        debugMessage: `MAILER: Notifying ${user.email} that a session was created for TR ${event.id}`,
        templatePath: 'tr_session_created',
        report: {
          ...event,
          displayId: eventId,
        },
        ...referenceData(),
      };

      return notificationQueue.add(EMAIL_ACTIONS.TRAINING_REPORT_SESSION_CREATED, data);
    }));
  } catch (err) {
    auditLogger.error(err);
  }
};

/**
 *
 * @param {db.models.TrainingReport.dataValues} report
 * @param {number} newCollaboratorId
 */
export const trCollaboratorAdded = async (
  report,
  newCollaboratorId,
) => {
  if (process.env.CI) return;
  try {
    const collaborator = await userById(newCollaboratorId, true);
    if (!collaborator) {
      throw new Error(`Unable to notify user with ID ${newCollaboratorId} that they were added as a collaborator to TR ${report.id}, a user with that ID does not exist`);
    }

    // due to the way sequelize sends the JSON column :(
    const parsedData = safeParse(report); // parse the JSON string
    const { eventId } = parsedData; // extract the pretty url
    const eId = eventId.split('-').pop();
    const reportPath = `${process.env.TTA_SMART_HUB_URI}/training-report/${eId}`;

    const emailTo = filterAndDeduplicateEmails([collaborator.email]);

    if (!emailTo || emailTo.length === 0) {
      logger.info(`Did not send tr collaborator added notification for ${eId} preferences are not set or marked as "no-send"`);
      return;
    }

    const data = {
      displayId: eventId,
      user: collaborator,
      reportPath,
      emailTo,
      report: {
        displayId: eventId,
      },
      templatePath: 'tr_collaborator_added',
      debugMessage: `MAILER: Notifying ${collaborator.email} that they were added as a collaborator to TR ${report.id}`,
      ...referenceData(),
    };

    notificationQueue.add(EMAIL_ACTIONS.TRAINING_REPORT_COLLABORATOR_ADDED, data);
  } catch (err) {
    auditLogger.error(err);
  }
};

/**
 *
 * @param {db.models.TrainingReport.dataValues} report
 * @param {number} newCollaboratorId
 */
export const trOwnerAdded = async (
  report,
  ownerId,
) => {
  if (process.env.CI) return;
  try {
    const owner = await userById(ownerId, true);

    // due to the way sequelize sends the JSON column :(
    const parsedData = safeParse(report); // parse the JSON string
    const { eventId } = parsedData; // extract the pretty url
    const eId = eventId.split('-').pop();
    const reportPath = `${process.env.TTA_SMART_HUB_URI}/training-report/${eId}`;
    const data = {
      displayId: eventId,
      reportPath,
      report: {
        displayId: eventId,
      },
      emailTo: [owner.email],
      debugMessage: `MAILER: Notifying ${owner.email} that they were added as an owner to TR ${report.id}`,
      templatePath: 'tr_event_imported',
      ...referenceData(),
    };

    notificationQueue.add(EMAIL_ACTIONS.TRAINING_REPORT_EVENT_IMPORTED, data);
  } catch (err) {
    auditLogger.error(err);
  }
};

/**
 *
 * @param {db.models.TrainingReport.dataValues} report
 * @param {number} newCollaboratorId
 */
export const trEventComplete = async (
  event,
) => {
  if (process.env.CI) return;
  try {
    const userIds = uniq([
      ...event.collaboratorIds,
      ...event.pocIds,
    ]).filter((id) => id && id !== event.ownerId);

    const parsedData = safeParse(event); // parse the JSON string
    const { eventId } = parsedData; // extract the pretty url
    const eId = eventId.split('-').pop();
    const reportPath = `${process.env.TTA_SMART_HUB_URI}/training-report/view/${eId}`;

    const emails = await Promise.all(userIds.map(async (id) => {
      const user = await userById(id, true);
      if (!user) return null;
      return user.email;
    }));

    const emailTo = filterAndDeduplicateEmails(emails.filter((email) => email));

    if (!emailTo || emailTo.length === 0) {
      logger.info(`Did not send tr event complete notification for ${eId} preferences are not set or marked as "no-send"`);
      return;
    }

    const data = {
      displayId: eventId,
      emailTo,
      reportPath,
      report: {
        displayId: eventId,
      },
      debugMessage: `MAILER: Notifying ${emailTo.join(', ')} that TR ${event.id} is complete`,
      templatePath: 'tr_event_complete',
      ...referenceData(),
    };

    notificationQueue.add(EMAIL_ACTIONS.TRAINING_REPORT_EVENT_COMPLETED, data);
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
      ...referenceData(),
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
        ...referenceData(),
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
        ...referenceData(),
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
        ...referenceData(),
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
        ...referenceData(),
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
      specialists.map(async (s) => userById(s.id, true)),
    );

    const records = users.map((user) => {
      const data = {
        user,
        reports,
        type: EMAIL_ACTIONS.RECIPIENT_REPORT_APPROVED_DIGEST,
        freq,
        subjectFreq,
        ...referenceData(),
      };

      notificationQueue.add(EMAIL_ACTIONS.RECIPIENT_REPORT_APPROVED_DIGEST, data);
      return data;
    });

    return Promise.all(records);
  } catch (err) {
    logger.info(`MAILER: ApprovedDigest with key ${USER_SETTINGS.EMAIL.KEYS.APPROVAL} freq ${freq} error ${err}`);
    throw err;
  }
}

const TR_NOTIFICATION_CONFIG_DICT = {
  noSessionsCreated: {
    toDiff: 'endDate',
    debug: (email, eventId) => `MAILER: Notifying ${email} that no sessions have been created for TR ${eventId}`,
    emails: [
      {
        templatePath: 'tr_owner_reminder_no_sessions',
        users: 'ownerId',
        reportPath: ({ eventStatus }) => `${process.env.TTA_SMART_HUB_URI}/training-reports/${lowerCase(eventStatus).replace(' ', '-')}`,
      },
      {
        templatePath: 'tr_collaborator_reminder_no_sessions',
        users: 'collaboratorIds',
        reportPath: ({ eventStatus }) => `${process.env.TTA_SMART_HUB_URI}/training-reports/${lowerCase(eventStatus).replace(' ', '-')}`,
      },
    ],
  },
  missingEventInfo: {
    toDiff: 'startDate',
    debug: (email, eventId) => `MAILER: Notifying ${email} that they need to complete event info for TR ${eventId}`,
    emails: [
      {
        templatePath: 'tr_owner_reminder_event',
        users: 'ownerId',
        reportPath: ({ eventId }) => `${process.env.TTA_SMART_HUB_URI}/training-report/${eventId.split('-').pop()}`,
      },
      {
        templatePath: 'tr_collaborator_reminder_event',
        users: 'collaboratorIds',
        reportPath: ({ eventId }) => `${process.env.TTA_SMART_HUB_URI}/training-report/${eventId.split('-').pop()}`,
      },
    ],
  },
  missingSessionInfo: {
    toDiff: 'startDate',
    debug: (email, eventId) => `MAILER: Notifying ${email} that they need to complete session info for TR ${eventId}`,
    emails: [
      {
        templatePath: 'tr_owner_reminder_session',
        users: 'ownerId',
        reportPath: ({ eventId, sessionId }) => `${process.env.TTA_SMART_HUB_URI}/training-report/${eventId.split('-').pop()}/session/${sessionId}`,
      },
      {
        templatePath: 'tr_collaborator_reminder_session',
        users: 'collaboratorIds',
        reportPath: ({ eventId, sessionId }) => `${process.env.TTA_SMART_HUB_URI}/training-report/${eventId.split('-').pop()}/session/${sessionId}`,
      },
      {
        templatePath: 'tr_poc_reminder_session',
        users: 'pocIds',
        reportPath: ({ eventId, sessionId }) => `${process.env.TTA_SMART_HUB_URI}/training-report/${eventId.split('-').pop()}/session/${sessionId}`,
      },
    ],
  },
  eventNotCompleted: {
    toDiff: 'endDate',
    debug: (email, eventId) => `MAILER: Notifying ${email} that they need to complete event ${eventId}`,
    emails: [
      {
        templatePath: 'tr_owner_reminder_event_not_completed',
        reportPath: ({ eventId }) => `${process.env.TTA_SMART_HUB_URI}/training-report/view/${eventId.split('-').pop()}`,
        users: 'ownerId',
      },
    ],
  },
};

export async function trainingReportTaskDueNotifications(freq) {
  const date = frequencyToInterval(freq);
  logger.info(`MAILER: Starting Training Report Task Due Notifications with freq ${freq}`);
  try {
    if (!date) {
      throw new Error('date is null');
    }

    // get all outstanding training reports
    // eslint-disable-next-line global-require
    const { getTrainingReportAlerts } = require('../../services/event');
    // imported here to avoid circular dependency import

    const alerts = await getTrainingReportAlerts();

    const today = moment().startOf('day');
    const emailData = alerts.reduce((accumulatedEmailData, alert) => {
      const alertTypeConfig = TR_NOTIFICATION_CONFIG_DICT[alert.alertType];
      // Some kind of garbage type got in the alerts,
      // we don't know how to handle it
      if (!alertTypeConfig) {
        return accumulatedEmailData;
      }

      const { toDiff } = alertTypeConfig;
      // If the alert[toDiff] is falsy, we do not have a date to diff against
      // and can't send an email
      if (!alert[toDiff]) {
        return accumulatedEmailData;
      }

      const dateToDiff = moment(alert[toDiff], 'MM/DD/YYYY').startOf('day');

      const diff = today.diff(dateToDiff, 'days');
      // Depending on the diff, the subject starts a certain way
      // either "Reminder" or "Past due"
      let prefix = '';
      if (diff >= 20) {
        if (diff === 20) {
          prefix = 'Reminder:';
        }

        // if diff is 40 or ten days after 40...
        if (diff === 40 || (diff > 40 && (diff % 10 === 0))) {
          prefix = 'Past due:';
        }
      }

      // if we don't have a prefix, we don't send an email
      if (!prefix) {
        return accumulatedEmailData;
      }

      const emailsForAlert = alertTypeConfig.emails;
      // we run this for a for loop first so we can format the data
      // for easy promise-consumption
      emailsForAlert.forEach((emailConfig) => {
        const { users, templatePath, reportPath } = emailConfig;

        // flatten the array and remove any nulls
        const userIds = [alert[users]].flat().map((v) => Number(v)).filter((id) => id);

        userIds.forEach((id) => {
          const data = {
            displayId: alert.eventId,
            prefix,
            // send the alert and the users (remember, users is ownerId | collaboratorIds | pocIds)
            // to obtain the specific destination
            reportPath: reportPath(alert, users),
            debugMessage: alertTypeConfig.debug,
            templatePath,
            userId: id,
          };

          accumulatedEmailData.push(data);
        });
      });

      return accumulatedEmailData;
    }, []); // close reducer

    // we are going to store our users here
    // so that we don't requery the same user multiple times
    // for different reports (small user pool for TRs, lots of duplication)
    const userMap = new Map();

    return Promise.all(emailData.map(async (mail) => {
      // check our map to see if we have the user already
      // if not, query the user and store it
      const { userId } = mail;
      let user = userMap.get(userId);
      if (!user) {
        user = await userById(userId, true);

        if (!user) {
          return null;
        }

        userMap.set(userId, user);
      }

      const emailTo = filterAndDeduplicateEmails([user.email]);

      if (!emailTo || emailTo.length === 0) {
        return null;
      }

      const data = {
        displayId: mail.displayId,
        report: {
          displayId: mail.displayId,
        },
        prefix: mail.prefix,
        reportPath: mail.reportPath,
        emailTo,
        debugMessage: mail.debugMessage(user.email, mail.displayId),
        templatePath: mail.templatePath,
      };

      logger.info(`Sending ${mail.templatePath} to ${emailTo.join(', ')} for TR ${mail.displayId}`);

      notificationQueue.add(EMAIL_ACTIONS.TRAINING_REPORT_TASK_DUE, data);

      return data;
    }));
  } catch (err) {
    logger.info(`MAILER: trainingReportTaskDueNotifications with freq ${freq} error ${err}`);
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

  notificationQueue.process(
    EMAIL_ACTIONS.NEEDS_ACTION,
    transactionQueueWrapper(
      notifyChangesRequested,
      EMAIL_ACTIONS.NEEDS_ACTION,
    ),
  );

  notificationQueue.process(
    EMAIL_ACTIONS.SUBMITTED,
    transactionQueueWrapper(
      notifyApproverAssigned,
      EMAIL_ACTIONS.SUBMITTED,
    ),
  );

  notificationQueue.process(
    EMAIL_ACTIONS.APPROVED,
    transactionQueueWrapper(
      notifyReportApproved,
      EMAIL_ACTIONS.APPROVED,
    ),
  );

  notificationQueue.process(
    EMAIL_ACTIONS.COLLABORATOR_ADDED,
    transactionQueueWrapper(
      notifyCollaboratorAssigned,
      EMAIL_ACTIONS.COLLABORATOR_ADDED,
    ),
  );

  notificationQueue.process(
    EMAIL_ACTIONS.RECIPIENT_REPORT_APPROVED,
    transactionQueueWrapper(
      notifyRecipientReportApproved,
      EMAIL_ACTIONS.RECIPIENT_REPORT_APPROVED,
    ),
  );

  notificationQueue.process(
    EMAIL_ACTIONS.NEEDS_ACTION_DIGEST,
    transactionQueueWrapper(
      notifyDigest,
      EMAIL_ACTIONS.NEEDS_ACTION_DIGEST,
    ),
  );
  notificationQueue.process(
    EMAIL_ACTIONS.SUBMITTED_DIGEST,
    transactionQueueWrapper(
      notifyDigest,
      EMAIL_ACTIONS.SUBMITTED_DIGEST,
    ),
  );
  notificationQueue.process(
    EMAIL_ACTIONS.APPROVED_DIGEST,
    transactionQueueWrapper(
      notifyDigest,
      EMAIL_ACTIONS.APPROVED_DIGEST,
    ),
  );
  notificationQueue.process(
    EMAIL_ACTIONS.COLLABORATOR_DIGEST,
    transactionQueueWrapper(
      notifyDigest,
      EMAIL_ACTIONS.COLLABORATOR_DIGEST,
    ),
  );
  notificationQueue.process(
    EMAIL_ACTIONS.RECIPIENT_REPORT_APPROVED_DIGEST,
    transactionQueueWrapper(
      notifyDigest,
      EMAIL_ACTIONS.RECIPIENT_REPORT_APPROVED_DIGEST,
    ),
  );

  notificationQueue.process(
    EMAIL_ACTIONS.TRAINING_REPORT_COLLABORATOR_ADDED,
    transactionQueueWrapper(
      sendTrainingReportNotification,
      EMAIL_ACTIONS.TRAINING_REPORT_COLLABORATOR_ADDED,
    ),
  );

  notificationQueue.process(
    EMAIL_ACTIONS.TRAINING_REPORT_SESSION_CREATED,
    transactionQueueWrapper(
      sendTrainingReportNotification,
      EMAIL_ACTIONS.TRAINING_REPORT_SESSION_CREATED,
    ),
  );

  notificationQueue.process(
    EMAIL_ACTIONS.TRAINING_REPORT_EVENT_COMPLETED,
    transactionQueueWrapper(
      sendTrainingReportNotification,
      EMAIL_ACTIONS.TRAINING_REPORT_EVENT_COMPLETED,
    ),
  );

  notificationQueue.process(
    EMAIL_ACTIONS.TRAINING_REPORT_EVENT_IMPORTED,
    transactionQueueWrapper(
      sendTrainingReportNotification,
      EMAIL_ACTIONS.TRAINING_REPORT_EVENT_IMPORTED,
    ),
  );

  notificationQueue.process(
    EMAIL_ACTIONS.TRAINING_REPORT_TASK_DUE,
    transactionQueueWrapper(
      sendTrainingReportNotification,
      EMAIL_ACTIONS.TRAINING_REPORT_TASK_DUE,
    ),
  );
};

/**
 * @param {User} user
 * @param {string} token
 * @returns Promise<any>
 */
export const sendEmailVerificationRequestWithToken = (
  user,
  token,
  transport = defaultTransport,
) => {
  const toEmails = filterAndDeduplicateEmails([user.email]);

  if (toEmails.length === 0) {
    return null;
  }

  const email = new Email({
    message: {
      from: process.env.FROM_EMAIL_ADDRESS,
    },
    send,
    transport,
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
