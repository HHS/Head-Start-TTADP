import express, { type Request, type Response } from 'express';
import { handleError } from '../../lib/apiErrorHandler';
import { auditLogger } from '../../logger';
import { currentUserId } from '../../services/currentUser';
import {
  type DigestFrequency,
  sendTestMonitoringNotifications,
  TestNotificationRequestError,
} from '../../tools/sendTestMonitoringNotifications';
import transactionWrapper from '../transactionWrapper';

const namespace = 'ADMIN:MONITORING_NOTIFICATIONS:TEST';
const logContext = { namespace };

const TYPES = ['immediate', 'digest', 'both'] as const;
const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;

const isPositiveInteger = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) > 0;

/**
 * Sends the monitoring report emails (TTAHUB-6004 immediate, TTAHUB-6062 digest) right away so
 * UX and QA can check them. Emails the requesting admin unless `userIds` is given. Refuses to
 * run outside dev, staging and local development.
 */
export async function sendTestMonitoringEmails(req: Request, res: Response) {
  // admin access is already checked in the middleware
  try {
    const { userIds, type = 'both', frequency = 'DAILY', deliveredReviewId } = req.body ?? {};

    if (userIds !== undefined && !(Array.isArray(userIds) && userIds.every(isPositiveInteger))) {
      res.status(400).json({ error: 'userIds must be a list of user IDs' });
      return;
    }
    if (!TYPES.includes(type)) {
      res.status(400).json({ error: `Unknown email type: ${type}` });
      return;
    }
    if (!FREQUENCIES.includes(frequency)) {
      res.status(400).json({ error: `Unknown frequency: ${frequency}` });
      return;
    }
    if (deliveredReviewId !== undefined && !isPositiveInteger(deliveredReviewId)) {
      res.status(400).json({ error: 'deliveredReviewId must be a delivered review ID' });
      return;
    }

    const userId = await currentUserId(req, res);
    const recipients: number[] = userIds?.length ? userIds : [userId];
    auditLogger.info(
      `User ${userId} sent test ${type} monitoring emails to users ${recipients.join(', ')}`
    );

    const results = await sendTestMonitoringNotifications({
      userIds: recipients,
      type,
      freq: frequency as DigestFrequency,
      deliveredReviewId,
    });
    res.status(200).json({ results });
  } catch (err) {
    if (err instanceof TestNotificationRequestError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    await handleError(req, res, err, logContext);
  }
}

const router = express.Router();

router.post('/test', transactionWrapper(sendTestMonitoringEmails));

export default router;
