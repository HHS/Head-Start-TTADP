import models, { sequelize } from '../models';
import { auditLogger } from '../logger';

/* eslint-disable import/prefer-default-export */
/**
 * Creates an email log entry
 *
 * @param {*} jobId - id of the job
 * @param {Array} emailTo - an array of email addresses
 * @param {string} action - action
 * @param {string} subject - email subject
 * @param {Array} activityReports - array of activityReports ids
 * @param {boolean} success - success
 * @param {*} result - result
 *
 */
export async function createMailerLog({
  jobId,
  emailTo,
  action,
  subject,
  activityReports,
  success,
  result,
}) {
  let logRresult = null;
  try {
    const mailerLogEntry = {
      jobId, emailTo, action, subject, activityReports, success, result,
    };

    logRresult = await sequelize.transaction(async (t) => {
      const mailerLog = await models.MailerLogs.create(mailerLogEntry, { transaction: t });
      return mailerLog;
    });
  } catch (err) {
    auditLogger.error(`Error creating a MailerLog entry for job id: ${jobId} error ${err}`);
  }
  return logRresult;
}
