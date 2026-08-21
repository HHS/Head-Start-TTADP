import moment from 'moment-timezone';
import { VALIDATION_PROCESS, VALIDATION_RUN_STATUS } from '../constants';
import db from '../models';
import getMonitoringImportCycle from './validation/monitoringImportCycle';

const { ValidationRun } = db;

export interface WatchdogResult {
  ok: boolean;
  reason?: string;
  runId?: number;
  status?: string;
  startedAt?: Date;
  // startedAt as human-readable Eastern time, for the Slack message
  asOf?: string;
  completedAt?: Date | null;
  alertCount?: number | null;
}

// e.g. "2026-07-22 16:44 EDT", for Slack messages
const easternTime = (date: Date): string =>
  moment(date).tz('America/New_York').format('YYYY-MM-DD HH:mm z');

/**
 * Watchdog for the daily monitoring data validation: confirms a successful
 * ValidationRun exists for the current import cycle (the latest processed ITAMS
 * monitoring import). Runs on a separate schedule from the validation itself so
 * it can catch the case where the validation never started at all. A day with no
 * new processed import stays ok - there is nothing new to validate.
 *
 * Outcomes:
 * - no processed import yet -> ok (nothing to validate; import watchdog's job)
 * - a run for the cycle succeeded -> ok
 * - the latest run for the cycle failed -> not ok ("run failed")
 * - the latest run for the cycle is still 'started' -> not ok ("run incomplete")
 * - no run for the cycle -> not ok ("no validation run for the current import cycle")
 */
const checkMonitoringValidationRan = async (): Promise<WatchdogResult> => {
  const cycle = await getMonitoringImportCycle();

  if (cycle.import_id == null) {
    return { ok: true, reason: 'no processed monitoring import to validate' };
  }

  const run = await ValidationRun.findOne({
    where: {
      process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
      import_id: cycle.import_id,
    },
    order: [['started_at', 'DESC']],
  });

  if (!run) {
    return { ok: false, reason: 'no validation run for the current import cycle' };
  }

  const base = {
    runId: run.id,
    status: run.status,
    startedAt: run.started_at,
    asOf: easternTime(run.started_at),
    completedAt: run.completed_at,
    alertCount: run.alert_count,
  };

  if (run.status === VALIDATION_RUN_STATUS.SUCCESS) {
    return { ok: true, ...base };
  }
  if (run.status === VALIDATION_RUN_STATUS.FAILURE) {
    return { ok: false, reason: 'run failed', ...base };
  }
  return { ok: false, reason: 'run incomplete', ...base };
};

export default checkMonitoringValidationRan;
