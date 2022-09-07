import models, { sequelize } from '../models';
import { auditLogger } from '../logger';

export default async function createMailerLog({
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
