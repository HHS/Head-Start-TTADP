/* eslint-disable no-console */

import moment from 'moment-timezone';
import type { Transaction } from 'sequelize';
import { QueryTypes } from 'sequelize';
import { VALIDATION_ALERT_SEVERITY, VALIDATION_RUN_STATUS } from '../../constants';
import { prepMigration } from '../../lib/migration';
import db, { sequelize } from '../../models';

const { ValidationRun } = db;

// A single unit of validation work. Reads whatever tables it needs and INSERTs
// its own ValidationAlerts (and/or ValidationRecords) within the run's
// transaction, so each step is runnable by hand in psql for inspection. May
// return a count of upserted rows to roll up into ValidationRuns.stats_upserted;
// returning nothing counts as 0.
export type ValidationStep = (transaction: Transaction) => Promise<number | void>;

export interface ValidationAlertSummary {
  check_name: string;
  message: string;
  severity: string;
}

export interface RunValidationResult {
  runId: number;
  startedAt: Date;
  statsUpserted: number;
  observationCount: number;
  alertCount: number;
  criticalCount: number;
  alerts: ValidationAlertSummary[];
}

// e.g. "2026-07-22 16:44 EDT", for Slack messages
const easternTime = (date: Date): string =>
  moment(date).tz('America/New_York').format('YYYY-MM-DD HH:mm z');

/**
 * Shared runner for validation processes. Records a ValidationRun, runs the given
 * steps in order in one transaction (each self-inserts its alerts / observations),
 * reads back the counts, and prints one greppable "<logLabel>: {...}" line that CI
 * forwards to Slack.
 *
 * Never gates: it returns a verdict (incl. criticalCount) and lets the caller act.
 * See docs/monitoring-data-validation.md.
 */
const runValidation = async ({
  processName,
  steps,
  logLabel,
  cycle,
}: {
  processName: string;
  steps: ValidationStep[];
  logLabel: string;
  // Which data version this run validated, so runs bucket and compare correctly.
  // The runner just records it; callers resolve it (e.g. getMonitoringImportCycle).
  cycle: { import_id: number | null; source_updated_at: Date | null };
}): Promise<RunValidationResult> => {
  // A run that can't be tied to a data version can't be bucketed or compared, so
  // neither identifier being set is an error rather than a silently-stored row.
  if (cycle == null || (cycle.import_id == null && cycle.source_updated_at == null)) {
    throw new Error(
      `runValidation(${processName}): a cycle identifying the data version is required (import_id and/or source_updated_at)`
    );
  }

  console.info(`Starting validation: ${processName}`);

  // Created (and committed) before any validation work so an external watchdog
  // can distinguish "never started" from "started but crashed" (row stuck at
  // 'started').
  const run = await ValidationRun.create({
    process_name: processName,
    status: VALIDATION_RUN_STATUS.STARTED,
    started_at: new Date(),
    import_id: cycle?.import_id ?? null,
    source_updated_at: cycle?.source_updated_at ?? null,
  });
  const runId = run.id;

  try {
    let statsUpserted = 0;

    await sequelize.transaction(async (transaction: Transaction) => {
      // Not strictly required today (the steps only read from audited tables),
      // but kept so that if a future step writes to an audited table its ZAL
      // rows are attributed to this process rather than the anonymous fallback
      // (dml_by = -1).
      await prepMigration(
        sequelize.getQueryInterface(),
        transaction,
        `RunValidation-${processName}-${new Date().toISOString()}`,
        'RunValidation'
      );

      // Make the current run id and the severity constants available to every
      // query in this transaction without interpolating them into each one, so a
      // check's SQL can also be run by hand. ON COMMIT DROP so no stale values can
      // be seen by a later transaction on the same pooled connection.
      await sequelize.query(
        `
        SET LOCAL TIME ZONE 'UTC';
        DROP TABLE IF EXISTS pg_temp.validation_run;
        CREATE TEMP TABLE validation_run
        ON COMMIT DROP
        AS
        SELECT :runId::bigint run_id, :critical::text critical, :alert::text alert
        ;
        `,
        {
          raw: true,
          transaction,
          replacements: {
            runId,
            critical: VALIDATION_ALERT_SEVERITY.CRITICAL,
            alert: VALIDATION_ALERT_SEVERITY.ALERT,
          },
        }
      );

      // steps run in order; later steps may depend on temp tables / rows an
      // earlier step produced, so they cannot be parallelized.
      for (const step of steps) {
        const upserted = await step(transaction);
        if (typeof upserted === 'number') statsUpserted += upserted;
      }
    });

    const [counts] = await sequelize.query<{
      observation_count: number;
      alert_count: number;
      critical_count: number;
    }>(
      `
      SELECT
        (SELECT COUNT(*) FROM "ValidationRecords" WHERE run_id = :runId)::int observation_count,
        (SELECT COUNT(*) FROM "ValidationAlerts" WHERE run_id = :runId)::int alert_count,
        (SELECT COUNT(*) FROM "ValidationAlerts"
          WHERE run_id = :runId AND severity = :critical)::int critical_count
      ;
      `,
      {
        type: QueryTypes.SELECT,
        replacements: { runId, critical: VALIDATION_ALERT_SEVERITY.CRITICAL },
      }
    );

    await run.update({
      status: VALIDATION_RUN_STATUS.SUCCESS,
      completed_at: new Date(),
      stats_upserted: statsUpserted,
      observation_count: counts.observation_count,
      alert_count: counts.alert_count,
    });

    // severity DESC so 'critical' sorts before 'alert' in the summary line
    const alerts = await sequelize.query<ValidationAlertSummary>(
      `
      SELECT check_name, message, severity
      FROM "ValidationAlerts"
      WHERE run_id = :runId
      ORDER BY severity DESC, check_name
      ;
      `,
      { type: QueryTypes.SELECT, replacements: { runId } }
    );

    // Single greppable line consumed by .circleci/scripts/build_import_summary.sh
    console.info(
      `${logLabel}: ${JSON.stringify({
        status: VALIDATION_RUN_STATUS.SUCCESS,
        runId,
        startedAt: run.started_at,
        asOf: easternTime(run.started_at),
        statsUpserted,
        observationCount: counts.observation_count,
        alertCount: counts.alert_count,
        criticalCount: counts.critical_count,
        alerts,
      })}`
    );

    return {
      runId,
      startedAt: run.started_at,
      statsUpserted,
      observationCount: counts.observation_count,
      alertCount: counts.alert_count,
      criticalCount: counts.critical_count,
      alerts,
    };
  } catch (err) {
    const message = `${err instanceof Error ? err.message : err}`;
    await run
      .update({
        status: VALIDATION_RUN_STATUS.FAILURE,
        completed_at: new Date(),
        error: message.slice(0, 5000),
      })
      .catch(() => {
        // best effort; surface the original error instead
      });
    console.info(
      `${logLabel}: ${JSON.stringify({
        status: VALIDATION_RUN_STATUS.FAILURE,
        runId,
        startedAt: run.started_at,
        asOf: easternTime(run.started_at),
        error: message,
      })}`
    );
    throw err;
  }
};

export default runValidation;
