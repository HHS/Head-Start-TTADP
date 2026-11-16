import express, { type Request, type Response } from 'express';
import { isNonProductionEnvironment } from '../../envParser';
import { handleError } from '../../lib/apiErrorHandler';
import { sendEmailDigests } from '../../lib/cron';
import { auditLogger } from '../../logger';
import { currentUserId } from '../../services/currentUser';

const namespace = 'ADMIN:DIGESTS:RUN';
const logContext = { namespace };

const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY'] as const;
type Frequency = (typeof FREQUENCIES)[number];

/**
 * Manually runs the email digest cron for a frequency (daily/weekly/monthly).
 * Mirrors the scheduled job, except monthly runs regardless of the date.
 * Disabled in production, where digests should only go out on schedule.
 */
export async function runDigests(req: Request, res: Response) {
  // admin access is already checked in the middleware
  try {
    if (!isNonProductionEnvironment()) {
      res.status(403).json({ error: 'Manually running digests is not available in production' });
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
    await handleError(req, res, err, logContext);
  }
}

const router = express.Router();

// No request transaction: queued Redis jobs can't roll back with it, and handleError needs a
// usable connection to record a failure that happens partway through the run.
router.post('/:frequency', runDigests);

export default router;
