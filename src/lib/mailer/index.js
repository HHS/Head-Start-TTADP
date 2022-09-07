import { createTransport } from 'nodemailer';
import Email from 'email-templates';
import * as path from 'path';
import { Op } from 'sequelize';
import { auditLogger, logger } from '../../logger';
import newQueue from '../queue';
import { EMAIL_ACTIONS, EMAIL_DIGEST_FREQ, REPORT_STATUSES } from '../../constants';
import models, { sequelize } from '../../models';

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
const frequencyToInterval = (freq) => {
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
  const { report, approver } = job.data;
  // Set these inside the function to allow easier testing
  const { FROM_EMAIL_ADDRESS, SEND_NOTIFICATIONS } = process.env;
  if (SEND_NOTIFICATIONS === 'true') {
    const {
      id,
      author,
      displayId,
      activityReportCollaborators,
    } = report;
    const approverEmail = approver.User.email;
    const approverName = approver.User.name;
    const approverNote = approver.note;
    logger.debug(`MAILER: Notifying users that ${approverEmail} requested changes on report ${displayId}`);

    // const template = path.resolve(emailTemplatePath, 'changes_requested_by_manager');
    // const mailerLog = await models.MailerLogs.create({
    //   emailTo: [author.email, ...collabArray], action: EMAIL_ACTIONS.NEEDS_ACTION,
    //   title: template, activityReports: [id],
    // });
    // console.log(`mailer log: ${mailerLog}`);
    const collabArray = activityReportCollaborators.map((c) => c.user.email);
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
      activityReportCollaborators,
    } = report;
    logger.info(`MAILER: Notifying users that report ${displayId} was approved.`);
    const collaboratorEmailAddresses = activityReportCollaborators.map((c) => c.user.email);
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

export const reportApprovedNotification = (report) => {
  // Send group notification to author and collaborators
  try {
    const data = {
      report,
    };
    notificationQueue.add(EMAIL_ACTIONS.APPROVED, data);
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
export async function collaboratorDigest(freq) {
  let users; let
    data = null;
  const date = frequencyToInterval(freq);

  // Find Users based on preferences
  // TODO: remove hard coded values once merged with preferences
  const result = await sequelize.transaction(async (t) => {
    users = await models.User.findAll({
      attributes: ['id', 'email', 'name'],
      where: { id: 102 },
    }, { transaction: t });

    const records = await users.map(async (user) => {
      const reports = await models.ActivityReport.findAll({
        attributes: ['id', 'displayId'],
        where: {
          calculatedStatus: REPORT_STATUSES.DRAFT,
          id: {
            [Op.in]: sequelize.literal(
              `(SELECT (new_row_data->'activityReportId')::NUMERIC
            FROM "ZALActivityReportCollaborators" 
            where dml_timestamp > ${date} AND
            (new_row_data->'userId')::NUMERIC = ${user.id})`,
            ),
          },
        },
        include: [
          {
            model: models.ActivityReportCollaborator,
            as: 'activityReportCollaborators',
            where: { userId: user.id },
          },
        ],
      }, { transaction: t });

      data = {
        user,
        reports,
        type: EMAIL_ACTIONS.COLLABORATOR_DIGEST,
        freq,
      };
      notificationDigestQueue.add(EMAIL_ACTIONS.COLLABORATOR_DIGEST, data);
      return data;
    });
    return Promise.all(records);
  });
  return result;
}

/**
 * Finds users that are subscribed to the needs action digest.
 * For each user it retrieves the relevant report ids based on the timeframe.
 *
 * @param {String} freq - frequency of the needs action digests (daily/weekly/monthly)
 *
 */
export async function changesRequestedDigest(freq) {
  let users; let
    data;
  const date = frequencyToInterval(freq);
  // Find Users with preference
  // TODO: remove hard coded values once merged with preferences
  const result = await sequelize.transaction(async (t) => {
    users = await models.User.findAll({
      where: { id: 18 },
    }, { transaction: t });

    const records = await users.map(async (user) => {
      const reports = await models.ActivityReport.findAll({
        attributes: ['id', 'displayId'],
        where: {
          [Op.and]: [
            {
              calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
            },
            {
              [Op.or]: [{ userId: user.id }, { '$activityReportCollaborators.userId$': user.id }],
            },
            {
              id: {
                [Op.in]: sequelize.literal(
                  `(SELECT data_id
              FROM "ZALActivityReports" 
              where dml_timestamp > ${date} AND
              (new_row_data->>'calculatedStatus')::TEXT = '${REPORT_STATUSES.NEEDS_ACTION}')`,
                ),
              },
            },
          ],
        },
        include: [
          {
            model: models.ActivityReportCollaborator,
            as: 'activityReportCollaborators',
            attributes: ['userId'],
            required: false,
          },
        ],
      }, { transaction: t });

      data = {
        user,
        reports,
        type: EMAIL_ACTIONS.NEEDS_ACTION_DIGEST,
        freq,
      };

      notificationDigestQueue.add(EMAIL_ACTIONS.NEEDS_ACTION_DIGEST, data);
      return data;
    });
    return Promise.all(records);
  });
  return result;
}

/**
 * Finds users that are subscribed to the submitted digest.
 * For each user it retrieves the relevant report ids based on the timeframe.
 *
 * @param {String} freq - frequency of the submitted digests (daily/weekly/monthly)
 *
 */
export async function submittedDigest(freq) {
  let users; let
    data = null;
  const date = frequencyToInterval(freq);
  // Find Users with preferences
  // TODO: remove hard coded values once merged with preferences
  const result = await sequelize.transaction(async (t) => {
    users = await models.User.findAll({
      where: { id: 18 },
    }, { transaction: t });

    const records = await users.map(async (user) => {
      const reports = await models.ActivityReport.findAll({
        attributes: ['id', 'displayId'],
        where: {
          calculatedStatus: { [Op.not]: REPORT_STATUSES.APPROVED },
          id: {
            [Op.in]: sequelize.literal(
              `(SELECT data_id
          FROM "ZALActivityReports" 
          where dml_timestamp > ${date} AND
          (new_row_data->>'calculatedStatus')::TEXT = '${REPORT_STATUSES.SUBMITTED}')`,
            ),
          },
        },
        include: [
          {
            model: models.ActivityReportApprover,
            as: 'approvers',
            where: { userId: user.id },
          },
        ],
      }, { transaction: t });

      data = {
        user,
        reports,
        type: EMAIL_ACTIONS.SUBMITTED_DIGEST,
        freq,
      };

      notificationDigestQueue.add(EMAIL_ACTIONS.SUBMITTED_DIGEST, data);
      return data;
    });
    return Promise.all(records);
  });
  return result;
}

/**
 * Finds users that are subscribed to the approved digest.
 * For each user it retrieves the relevant report ids based on the timeframe.
 *
 * @param {String} freq - frequency of the approved digests (daily/weekly/monthly)
 *
 */
export async function approvedDigest(freq) {
  let users; let
    data = null;
  const date = frequencyToInterval(freq);
  // Find Users with preferences
  // TODO: remove hard coded values once merged with preferences
  const result = await sequelize.transaction(async (t) => {
    users = await models.User.findAll({
      where: { id: 18 },
    }, { transaction: t });

    const records = await users.map(async (user) => {
      const reports = await models.ActivityReport.findAll({
        attributes: ['id', 'displayId'],
        where: {
          [Op.and]: [
            {
              calculatedStatus: REPORT_STATUSES.APPROVED,
            },
            {
              [Op.or]: [{ userId: user.id }, { '$activityReportCollaborators.userId$': user.id }],
            },
            {
              id: {
                [Op.in]: sequelize.literal(
                  `(SELECT data_id
              FROM "ZALActivityReports" 
              where dml_timestamp > ${date} AND
              (new_row_data->>'calculatedStatus')::TEXT = '${REPORT_STATUSES.APPROVED}')`,
                ),
              },
            },
          ],
        },
        include: [
          {
            model: models.ActivityReportCollaborator,
            as: 'activityReportCollaborators',
            attributes: ['userId'],
            required: false,
          },
        ],
      }, { transaction: t });

      data = {
        user,
        reports,
        type: EMAIL_ACTIONS.APPROVED_DIGEST,
        freq,
      };

      notificationDigestQueue.add(EMAIL_ACTIONS.APPROVED_DIGEST, data);
      return data;
    });
    return Promise.all(records);
  });
  return result;
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
    user, reports, type, freq,
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
      },
    });
  }
  return Promise.resolve(null);
};

export default defaultTransport;
