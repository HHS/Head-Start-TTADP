import { REPORT_STATUSES } from '@ttahub/common';
import type { Transaction } from 'sequelize';
import { VALIDATION_ALERT_SEVERITY, VALIDATION_PROCESS } from '../../constants';
import { sequelize } from '../../models';

// Activity reports still in flight - findings cited on these are live user work,
// so mass-deleting them at the source is the highest-stakes failure the gate
// guards against.
const OPEN_REPORT_STATUSES = [
  REPORT_STATUSES.DRAFT,
  REPORT_STATUSES.SUBMITTED,
  REPORT_STATUSES.NEEDS_ACTION,
];

/**
 * Pre-refresh critical gate checks over the raw Monitoring* tables and the
 * wider Hub. Run by validateMonitoringGate before update_fact_tables; each
 * check self-inserts a ValidationAlert (severity 'alert' or 'critical'). The
 * runner counts critical alerts and the CLI exits nonzero on any, which stops
 * the import phase loop before the fact-table refresh.
 *
 * Both checks are motivated by a real incident where ~90% of findings were
 * suddenly and erroneously source-deleted. Both carry a minimum-denominator
 * guard so a small/empty dataset cannot false-block, and both compare with
 * multiplication (not division) so that guard can never hit a divide-by-zero.
 * Thresholds are illustrative and meant to be tuned against real data.
 *
 * Both checks read the source signal (sourceDeletedAt) directly rather than the
 * local deletedAt, so they are correct regardless of whether the monitoring
 * maintenance job (which propagates sourceDeletedAt into deletedAt) has run yet.
 *
 * The current run id is read from the validation_run temp table created by the
 * runner (src/tools/validation/runValidation.ts).
 */
const monitoringGateChecks = async (transaction: Transaction): Promise<void> => {
  // Keep only the latest gate run's alerts (scoped through
  // ValidationRuns.process_name so other validation processes are untouched).
  await sequelize.query(
    `
    DELETE FROM "ValidationAlerts" va
    USING "ValidationRuns" r
    WHERE va.run_id = r.id
      AND r.process_name = :processName
    ;
    `,
    {
      raw: true,
      transaction,
      replacements: { processName: VALIDATION_PROCESS.MONITORING_GATE },
    }
  );

  await sequelize.query(
    `
    -- findings_mass_source_deletion: over distinct findings from the rolling
    -- last year (a window wide enough to average across seasonal / fiscal-year
    -- swings), the fraction that are fully gone from the source - no live row
    -- remains. alert > 25%, critical > 50%; one alert row only at/above the alert
    -- threshold.
    --
    -- A findingId can span several rows (~2 per findingId on prod): jitter in the
    -- source data sometimes makes the import treat an updated finding as a new
    -- record, source-deleting the old row and inserting a fresh one under the same
    -- findingId. Counting source-deleted ROWS therefore measures that import
    -- churn, not lost findings - on healthy prod data it reads ~30-50% and spikes
    -- in months with heavy re-import churn. So aggregate to findingId and count
    -- only findings with NO live row left, the actual "the source dropped this
    -- finding" signal (~1% on healthy data). This is the same finding-level
    -- liveness test check B applies to open-AR citations. Reading sourceDeletedAt
    -- directly (not deletedAt) keeps it correct whether or not the maintenance job
    -- has propagated the delete.
    WITH finding_rows AS (
    SELECT
      mf."findingId",
      bool_or(mf."sourceDeletedAt" IS NULL AND mf."deletedAt" IS NULL) has_live_row,
      MAX(COALESCE(mf."reportedDate", mf."sourceCreatedAt")) recency
    FROM "MonitoringFindings" mf
    GROUP BY mf."findingId"
    ),
    recent_findings AS (
    SELECT (NOT has_live_row) gone
    FROM finding_rows
    WHERE recency >= (NOW() - INTERVAL '1 year')
    ),
    stats AS (
    SELECT
      COUNT(*)::numeric total,
      COUNT(*) FILTER (WHERE gone)::numeric gone
    FROM recent_findings
    )
    INSERT INTO "ValidationAlerts"
      (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'findings_mass_source_deletion',
      ROUND(100.0 * s.gone / s.total, 1)
        || '% of monitoring findings from the last year have no live row ('
        || s.gone::bigint || ' of ' || s.total::bigint || ')',
      CASE WHEN s.gone > 0.50 * s.total THEN :critical ELSE :alert END,
      jsonb_build_object(
        'window', '1 year',
        'total', s.total::bigint,
        'findings_gone', s.gone::bigint,
        'fraction', ROUND(s.gone / s.total, 4),
        'alert_threshold', 0.25,
        'critical_threshold', 0.50,
        'min_denominator', 100
      ),
      NOW(),
      NOW()
    FROM stats s
    CROSS JOIN validation_run cur
    WHERE s.total >= 100
      AND s.gone > 0.25 * s.total
    ;

    -- open_ar_findings_gone: findings cited on open activity reports
    -- (ActivityReportObjectiveCitations.findingId -> MonitoringFindings.findingId)
    -- that are no longer live in the import - absent entirely, or source/soft
    -- deleted. Open reports are inherently timely, so no recency window.
    -- alert > 10%, critical > 20%.
    WITH open_ar_findings AS (
    SELECT DISTINCT aroc."findingId"
    FROM "ActivityReportObjectiveCitations" aroc
    JOIN "ActivityReportObjectives" aro
      ON aro.id = aroc."activityReportObjectiveId"
    JOIN "ActivityReports" ar
      ON ar.id = aro."activityReportId"
    WHERE ar."calculatedStatus" IN (:openStatuses)
      AND aroc."findingId" IS NOT NULL
    ),
    finding_liveness AS (
    SELECT
      oaf."findingId",
      EXISTS (
        SELECT 1
        FROM "MonitoringFindings" mf
        WHERE mf."findingId" = oaf."findingId"
          AND mf."sourceDeletedAt" IS NULL
          AND mf."deletedAt" IS NULL
      ) live
    FROM open_ar_findings oaf
    ),
    stats AS (
    SELECT
      COUNT(*)::numeric total,
      COUNT(*) FILTER (WHERE NOT live)::numeric gone
    FROM finding_liveness
    )
    INSERT INTO "ValidationAlerts"
      (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'open_ar_findings_gone',
      ROUND(100.0 * s.gone / s.total, 1)
        || '% of findings cited on open activity reports are missing from the import ('
        || s.gone::bigint || ' of ' || s.total::bigint || ')',
      CASE WHEN s.gone > 0.20 * s.total THEN :critical ELSE :alert END,
      jsonb_build_object(
        'total', s.total::bigint,
        'gone', s.gone::bigint,
        'fraction', ROUND(s.gone / s.total, 4),
        'alert_threshold', 0.10,
        'critical_threshold', 0.20,
        'min_denominator', 20,
        'sample_finding_ids',
          (SELECT (ARRAY_AGG("findingId"))[1:20] FROM finding_liveness WHERE NOT live)
      ),
      NOW(),
      NOW()
    FROM stats s
    CROSS JOIN validation_run cur
    WHERE s.total >= 20
      AND s.gone > 0.10 * s.total
    ;
    `,
    {
      raw: true,
      transaction,
      replacements: {
        critical: VALIDATION_ALERT_SEVERITY.CRITICAL,
        alert: VALIDATION_ALERT_SEVERITY.ALERT,
        openStatuses: OPEN_REPORT_STATUSES,
      },
    }
  );
};

export default monitoringGateChecks;
