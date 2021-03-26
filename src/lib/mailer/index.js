import { createTransport } from 'nodemailer';
import Email from 'email-templates';
import * as path from 'path';

const {
  SMTPHOST, SMTPPORT, SMTPUSER, SMTPPASS, SMTPSECURE, FROMEMAILADDRESS,
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

export const changesRequestedByManager = (report, transport = defaultTransport) => {
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
    transport,
  });
  return email.send({
    template: path.resolve(process.cwd(), '..', 'email_templates', 'changes_requested_by_manager'),
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
};

export default defaultTransport;
