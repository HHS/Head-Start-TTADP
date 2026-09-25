import type { Transaction } from 'sequelize';
import { VALIDATION_PROCESS } from '../../constants';
import { sequelize } from '../../models';

/**
 * Shared, reusable setup for the monitoring entity-level validation checks that
 * follow this step in the run (monitoringObservations.ts,
 * monitoringFactTableObservations.ts, monitoringAlerts.ts,
 * monitoringFactTableAlerts.ts). Runs first so later steps can build on what it
 * produces, the same way runValidation's own `validation_run` temp table is
 * built once and CROSS JOINed everywhere instead of re-derived per step.
 *
 * Anything here that's expensive or error-prone to re-derive, and that more
 * than one check needs, belongs here rather than being copied into each check
 * - the point is that a small change in how IT-AMS data is shaped gets fixed
 * once, not in every check that happens to depend on it. See
 * docs/monitoring-data-validation.md.
 */
const refreshMonitoringValidationStaging = async (transaction: Transaction): Promise<void> => {
  await sequelize.query(
    `
    -- monitoring_validation_window: the earliest date these checks consider.
    -- TTA Hub started working with Monitoring data around 2025-01-20 (see
    -- monitoring_start_date in updateMonitoringFactTables.ts); 2025-01-01 is
    -- the same cutoff rounded to a cleaner boundary. Data older than this is
    -- out of scope for validation by default - checks join this in and filter
    -- on it rather than each hardcoding the date, so the one place that needs
    -- to change if the cutoff ever moves is here. A check with a real reason
    -- to look back further (e.g. CLASS scores, which are sparse) can ignore
    -- this table and say so in its own comment.
    DROP TABLE IF EXISTS pg_temp.monitoring_validation_window;
    CREATE TEMP TABLE monitoring_validation_window
    ON COMMIT DROP
    AS
    SELECT '2025-01-01'::date start_date
    ;

    -- *_learned_at: when we actually found out about a field's current value,
    -- for fields a freshness check needs to gate on. sourceUpdatedAt can't
    -- serve this - the nightly import bumps it on every row regardless of
    -- whether anything meaningful changed. The ZAL audit tables can:
    -- new_row_data only contains the keys that changed on that row (true on
    -- INSERT too, so the initial-load event counts as "when learned"), so
    -- filtering on key presence isolates genuine changes to that field with
    -- no value-diffing needed. Shared here since more than one check needs
    -- "when did this field last change" for the same field.
    DROP TABLE IF EXISTS pg_temp.monitoring_review_outcome_learned;
    CREATE TEMP TABLE monitoring_review_outcome_learned
    ON COMMIT DROP
    AS
    SELECT data_id review_id, MAX(dml_timestamp) learned_at
    FROM "ZALMonitoringReviews"
    WHERE new_row_data ? 'outcome'
    GROUP BY data_id
    ;

    DROP TABLE IF EXISTS pg_temp.monitoring_finding_status_learned;
    CREATE TEMP TABLE monitoring_finding_status_learned
    ON COMMIT DROP
    AS
    SELECT data_id finding_id, MAX(dml_timestamp) learned_at
    FROM "ZALMonitoringFindings"
    WHERE new_row_data ? 'statusId'
    GROUP BY data_id
    ;

    DROP TABLE IF EXISTS pg_temp.monitoring_finding_history_status_learned;
    CREATE TEMP TABLE monitoring_finding_history_status_learned
    ON COMMIT DROP
    AS
    SELECT data_id finding_history_id, MAX(dml_timestamp) learned_at
    FROM "ZALMonitoringFindingHistories"
    WHERE new_row_data ? 'statusId'
    GROUP BY data_id
    ;

    -- monitoring_validation_cycles: the current run, and the run to compare it
    -- against for state-*transition* checks (did this entity's observation
    -- change since the last time we looked, as opposed to a point-in-time
    -- snapshot check). That's the latest run of the most recent EARLIER cycle
    -- (a different import_id/data version) for this same process - the same
    -- "previous cycle" ValidationRecords retention already keeps around, so a
    -- transition check can self-join ValidationRecords across these two run
    -- ids with no extra retention machinery. prev_cycle_run_id is NULL when
    -- there's no earlier cycle yet (e.g. the very first run).
    DROP TABLE IF EXISTS pg_temp.monitoring_validation_cycles;
    CREATE TEMP TABLE monitoring_validation_cycles
    ON COMMIT DROP
    AS
    WITH cur AS (
      SELECT r.id AS run_id, r.import_id
      FROM "ValidationRuns" r
      JOIN validation_run v ON v.run_id = r.id
    ),
    prev_cycle_run AS (
      SELECT r.id AS run_id
      FROM "ValidationRuns" r
      CROSS JOIN cur
      WHERE r.process_name = :processName
        AND r.id <> cur.run_id
        AND r.import_id IS DISTINCT FROM cur.import_id
        AND r.status = 'success'
      ORDER BY r.id DESC
      LIMIT 1
    )
    SELECT cur.run_id, prev_cycle_run.run_id prev_cycle_run_id
    FROM cur
    LEFT JOIN prev_cycle_run ON true
    ;
    `,
    {
      raw: true,
      transaction,
      replacements: { processName: VALIDATION_PROCESS.MONITORING_POST_REFRESH },
    }
  );
};

export default refreshMonitoringValidationStaging;
