import { compileFile } from 'pug';
import * as path from 'path';
import { logger } from '../../logger';
import { EMAIL_ACTIONS } from '../../constants';
import { createMailerLog } from '../../services/mailerLog';

const emailTemplatePath = path.join(process.cwd(), 'email_templates');

/**
 * Creates an email log entry for on-demand notifications
 *
 * @param {*} job - job containig data
 * @param {boolean} success - success
 * @param {*} result - notification result
 *
 */
export default async function logEmailNotification(job, success, result) {
  let subject; let emailTo; let
    template;
  let newCollaborator; let newApprover; let
    collabArray;
  let programSpecialists;
  let collaboratorEmailAddresses;
  const { data } = job;
  const { report } = data;
  const { author, activityReportCollaborators } = report;

  try {
    switch (job.name) {
      case EMAIL_ACTIONS.COLLABORATOR_ADDED:
        newCollaborator = data.newCollaborator;
        emailTo = newCollaborator ? [newCollaborator.email] : [''];
        template = path.resolve(emailTemplatePath, 'collaborator_added', 'subject.pug');
        break;
      case EMAIL_ACTIONS.SUBMITTED:
        newApprover = data.newApprover;
        emailTo = newApprover ? [newApprover.User.email] : [''];
        template = path.resolve(emailTemplatePath, 'manager_approval_requested', 'subject.pug');
        break;
      case EMAIL_ACTIONS.NEEDS_ACTION:
        collabArray = activityReportCollaborators.map((c) => c.user.email);
        emailTo = [author ? author.email : '', ...collabArray];
        template = path.resolve(emailTemplatePath, 'changes_requested_by_manager', 'subject.pug');
        break;
      case EMAIL_ACTIONS.APPROVED:
        collaboratorEmailAddresses = activityReportCollaborators.map((c) => c.user.email);
        emailTo = [author ? author.email : '', ...collaboratorEmailAddresses];
        template = path.resolve(emailTemplatePath, 'report_approved', 'subject.pug');
        break;
      case EMAIL_ACTIONS.GRANTEE_REPORT_APPROVED:
        programSpecialists = data.programSpecialists;
        emailTo = programSpecialists.map((ps) => ps.email);
        report.recipientNamesDisplay = data.recipients.map((r) => r.name).join(', ');
        template = path.resolve(emailTemplatePath, 'grantee_report_approved', 'subject.pug');
        break;
      default:
        break;
    }
    subject = compileFile(template)(report);
    const mailerLogEntry = await createMailerLog({
      jobId: job.id,
      emailTo,
      action: job.name,
      subject,
      activityReports: [report.id],
      success,
      result,
    });
    return mailerLogEntry;
  } catch (err) {
    logger.error(`Unable to create a log notification record: ${err}`);
    return null;
  }
}

/**
 * Creates an email log entry for digest notifications
 *
 * @param {*} job - job containig data
 * @param {boolean} success - success
 * @param {*} result - notification result
 *
 */
export async function logDigestEmailNotification(job, success, result) {
  let subject;
  const { data } = job;
  const { user, reports, subjectFreq } = data;
  const template = path.resolve(emailTemplatePath, 'digest', 'subject.pug');
  const emailTo = user ? [user.email] : [''];

  try {
    subject = compileFile(template)({ type: job.name, subjectFreq });
    const mailerLogEntry = await createMailerLog({
      jobId: job.id,
      emailTo,
      action: job.name,
      subject,
      activityReports: reports.map((r) => r.id),
      success,
      result,
    });
    return mailerLogEntry;
  } catch (err) {
    logger.error(`Unable to create a log notification record: ${err}`);
    return null;
  }
}
