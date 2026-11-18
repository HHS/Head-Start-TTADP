import { CronJob } from 'cron';
import { MAINTENANCE_CATEGORY } from '../../constants';
import { isTrue } from '../../envParser';
import { auditLogger } from '../../logger';
import { requeuePendingFileDeletions } from '../../services/files';
import { addCronJob, registerCronEnrollmentFunction } from './common';

// Key for this job in the in-memory cron registry. It isn't written to MaintenanceLogs, so it
// doesn't need to be a MAINTENANCE_TYPE value.
export const REQUEUE_FILE_DELETIONS = 'REQUEUE FILE DELETIONS';

export const runRequeuePendingFileDeletions = async () => {
  try {
    const { requeued, exhausted } = await requeuePendingFileDeletions();
    auditLogger.info(
      `Maintenance: requeued ${requeued} pending S3 file deletions (${exhausted} out of attempts)`
    );
  } catch (err) {
    auditLogger.error(`Maintenance: failed to requeue pending S3 file deletions: ${err.message}`);
  }
};

/**
 * Hourly sweep that re-enqueues S3 deletes whose FileDeletions outbox row is still pending.
 * Same enrollment rules as the other maintenance cron jobs: worker instance 0, context 1, in
 * production, unless FORCE_CRON is set.
 */
registerCronEnrollmentFunction(async (instanceId, contextId, env) => {
  if (!isTrue('FORCE_CRON') && (instanceId !== '0' || env !== 'production' || contextId !== 1)) {
    auditLogger.log(
      'info',
      `Skipping file deletion cron enrollment (instance ${instanceId}, context ${contextId}, env ${env})`
    );
    return;
  }

  addCronJob(
    MAINTENANCE_CATEGORY.MAINTENANCE,
    REQUEUE_FILE_DELETIONS,
    (_category, _type, timezone, schedule) =>
      new CronJob(schedule, runRequeuePendingFileDeletions, null, true, timezone),
    // 15 minutes past every hour
    '15 * * * *'
  );
});
