/* eslint-disable import/prefer-default-export */
import express, { Response, Request } from 'express';
import { createTransport } from 'nodemailer';
import transactionWrapper from '../transactionWrapper';
import handleErrors from '../../lib/apiErrorHandler';
import { auditLogger as logger } from '../../logger';

const namespace = 'ADMIN:EMAIL';
const logContext = { namespace };

const router = express.Router();

const {
  SMTP_HOST_TEST,
  SMTP_PORT_TEST,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASSWORD,
  FROM_EMAIL_ADDRESS,
} = process.env;

// nodemailer expects this value as a boolean.
const secure = SMTP_SECURE !== 'false';

const defaultTransport = createTransport({
  host: SMTP_HOST_TEST,
  // port: SMTP_PORT_TEST,
  port: 1025,
  secure,
  ignoreTLS: false,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD,
  },
});

export async function sendHandler(req: Request, res: Response) {
  const { to, subject, message } = req.body;
  try {
    const result = await defaultTransport.sendMail({
      from: FROM_EMAIL_ADDRESS, // sender address
      to,
      subject,
      text: message,
      html: message,
    });

    logger.info(`Sent message to: ${to} with a subject: ${subject} and email text: ${message}`);
    return res.status(200).json(result);
  } catch (error) {
    logger.info(`Failed to send message to: ${to} with a subject: ${subject} and email text: ${message}`);
    return handleErrors(req, res, error, logContext);
  }
}

router.post('/', transactionWrapper(sendHandler));

export default router;
