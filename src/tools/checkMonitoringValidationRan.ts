import moment from 'moment-timezone';
import { Op } from 'sequelize';
import { VALIDATION_PROCESS, VALIDATION_RUN_STATUS } from '../constants';
import db from '../models';

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
 * Watchdog for the daily monitoring data validation: checks ValidationRuns for
 * a monitoring run started within the last 24 hours. Runs on a separate
 * schedule from the validation itself so it can catch the case where the
 * validation never started at all.
 *
 * Outcomes:
 * - a run exists and succeeded -> ok
 * - the latest run failed -> not ok ("run failed")
 * - the latest run is still 'started' -> not ok ("run incomplete") - either
 *   crashed without updating its row or genuinely still in progress
 * - no run in the window -> not ok ("no validation run in last 24 hours")
 */
const checkMonitoringValidationRan = async (): Promise<WatchdogResult> => {
  const run = await ValidationRun.findOne({
    where: {
      process_name: VALIDATION_PROCESS.MONITORING_POST_REFRESH,
      started_at: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    order: [['started_at', 'DESC']],
  });

  if (!run) {
    return { ok: false, reason: 'no validation run in last 24 hours' };
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
