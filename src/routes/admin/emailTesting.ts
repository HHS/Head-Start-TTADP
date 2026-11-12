import express, { type Request, type Response } from 'express';
import { isNonProductionEnvironment } from '../../envParser';
import { handleError } from '../../lib/apiErrorHandler';
import { sendEmailDigests } from '../../lib/cron';
import { auditLogger } from '../../logger';
import { currentUserId } from '../../services/currentUser';
import { notifyRecentMonitoringDeliveries } from '../../services/monitoringDeliveryNotifications';
import transactionWrapper from '../transactionWrapper';

const namespace = 'ADMIN:EMAIL_TESTING';

const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;
type Frequency = (typeof FREQUENCIES)[number];

const PRODUCTION_ERROR = 'Email testing is not available in production';

/**
 * Manually runs the email digest cron for a frequency (daily/weekly/monthly), including the
 * monitoring digest. Mirrors the scheduled job, except monthly runs regardless of the date.
 * Disabled in production, where digests should only go out on schedule.
 */
export async function runDigests(req: Request, res: Response) {
  // admin access is already checked in the middleware
  try {
    if (!isNonProductionEnvironment()) {
      res.status(403).json({ error: PRODUCTION_ERROR });
      return;
    }

    const freqKey = String(req.params.frequency).toUpperCase() as Frequency;
    if (!FREQUENCIES.includes(freqKey)) {
      res.status(400).json({ error: `Unknown frequency: ${req.params.frequency}` });
      return;
    }

    const userId = await currentUserId(req, res);
    auditLogger.info(`User ${userId} manually ran ${freqKey} email digests`);
    const queued = await sendEmailDigests(freqKey, {
      includeTrainingReport: freqKey === 'DAILY',
    });
    res.status(200).json({ frequency: freqKey, queued });
  } catch (err) {
    await handleError(req, res, err, { namespace: `${namespace}:DIGESTS` });
  }
}

/**
 * Sends the monitoring delivery notifications (in-app and immediate email) for reports
 * delivered yesterday or today, to the users who would normally get them. Disabled in
 * production, where they are only sent after the monitoring fact table refresh.
 */
export async function runMonitoringDeliveries(req: Request, res: Response) {
  // admin access is already checked in the middleware
  try {
    if (!isNonProductionEnvironment()) {
      res.status(403).json({ error: PRODUCTION_ERROR });
      return;
    }

    const userId = await currentUserId(req, res);
    auditLogger.info(`User ${userId} manually ran monitoring delivery notifications`);
    const summary = await notifyRecentMonitoringDeliveries();
    res.status(200).json(summary);
  } catch (err) {
    await handleError(req, res, err, { namespace: `${namespace}:MONITORING_DELIVERIES` });
  }
}

const router = express.Router();

router.post('/digests/:frequency', transactionWrapper(runDigests));
router.post('/monitoring-deliveries', transactionWrapper(runMonitoringDeliveries));

export default router;
