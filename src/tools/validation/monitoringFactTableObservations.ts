import type { Transaction } from 'sequelize';
import { VALIDATION_PROCESS } from '../../constants';
import { sequelize } from '../../models';

/**
 * Rebuilds per-entity observations in ValidationRecords for the *fact* tables
 * (updateMonitoringFactTables.ts's output), as opposed to monitoringObservations.ts's
 * raw IT-AMS tables. These check the fact tables' own computed fields directly,
 * rather than re-deriving the same logic a second time from raw data - a check
 * here inherits any future change to that logic instead of drifting from it.
 * See docs/monitoring-data-validation.md.
 */
const refreshMonitoringFactTableObservations = async (transaction: Transaction): Promise<void> => {
  await sequelize.query(
    `
    -- Retention, scoped to this file's entity types only (Citations,
    -- DeliveredReviews, ActivityReportObjectiveCitations) so it doesn't
    -- collide with monitoringObservations.ts's own DELETE. Reuses the
    -- cur/prev cycle pair monitoringValidationStaging.ts computed.
    DELETE FROM "ValidationRecords" rec
    USING "ValidationRuns" r, monitoring_validation_cycles c
    WHERE rec.run_id = r.id
      AND r.process_name = :processName
      AND rec.run_id NOT IN (c.run_id, COALESCE(c.prev_cycle_run_id, c.run_id))
      AND rec.entity_type IN ('Citations', 'DeliveredReviews', 'ActivityReportObjectiveCitations')
    ;

    -- citation_reopened: a Citation's own "active" column (Closed/Corrected ->
    -- false, Active/Elevated Deficiency -> true) most recently flipped from
    -- false to true - it was considered resolved and no longer is. Read
    -- directly from ZALCitations rather than comparing ValidationRecords
    -- across runs: the Citations upsert only writes a row when a column
    -- actually changed (see the IS DISTINCT FROM guards in
    -- updateMonitoringFactTables.ts), so ZALCitations.new_row_data is already
    -- a clean diff - filtering on key presence isolates real transitions with
    -- no snapshot-vs-snapshot comparison needed. context.reopened_at is that
    -- transition's own timestamp, for the alert step to gate freshness on.
    WITH active_changes AS (
      SELECT
        data_id,
        (new_row_data->>'active')::boolean new_active,
        dml_timestamp,
        LAG((new_row_data->>'active')::boolean) OVER (
          PARTITION BY data_id ORDER BY dml_timestamp
        ) prev_active
      FROM "ZALCitations"
      WHERE new_row_data ? 'active'
    ),
    latest_transition AS (
      SELECT DISTINCT ON (data_id) data_id, prev_active, new_active, dml_timestamp
      FROM active_changes
      WHERE prev_active IS NOT NULL
      ORDER BY data_id, dml_timestamp DESC
    )
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'Citations',
      c.id,
      'citation_reopened',
      CASE WHEN lt.prev_active = false AND lt.new_active = true THEN 'reopened' ELSE 'consistent' END,
      jsonb_build_object('reopened_at', lt.dml_timestamp),
      NOW(),
      NOW()
    FROM "Citations" c
    CROSS JOIN validation_run cur
    LEFT JOIN latest_transition lt
      ON lt.data_id = c.id
    WHERE c."deletedAt" IS NULL
    ;

    -- delivered_review_completion_state: same idea as citation_reopened, but
    -- for DeliveredReviews.complete. It's usually driven by the same
    -- underlying finding reopening (so it'll usually coincide with a
    -- citation_reopened alert), but not always - e.g. an Area of Concern
    -- finding's calculated_status can stay 'Closed' on goal-closure timing
    -- alone even after a new undelivered review links to it, while
    -- last_review_delivered (and so complete) flips regardless. Kept as its
    -- own independent check rather than trying to filter out the overlap,
    -- to catch whatever other paths produce the same gap.
    WITH complete_changes AS (
      SELECT
        data_id,
        (new_row_data->>'complete')::boolean new_complete,
        dml_timestamp,
        LAG((new_row_data->>'complete')::boolean) OVER (
          PARTITION BY data_id ORDER BY dml_timestamp
        ) prev_complete
      FROM "ZALDeliveredReviews"
      WHERE new_row_data ? 'complete'
    ),
    latest_completion_transition AS (
      SELECT DISTINCT ON (data_id) data_id, prev_complete, new_complete, dml_timestamp
      FROM complete_changes
      WHERE prev_complete IS NOT NULL
      ORDER BY data_id, dml_timestamp DESC
    )
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'DeliveredReviews',
      dr.id,
      'delivered_review_completion_state',
      CASE WHEN lt.prev_complete = true AND lt.new_complete = false THEN 'reopened' ELSE 'consistent' END,
      jsonb_build_object('reopened_at', lt.dml_timestamp),
      NOW(),
      NOW()
    FROM "DeliveredReviews" dr
    CROSS JOIN validation_run cur
    LEFT JOIN latest_completion_transition lt
      ON lt.data_id = dr.id
    WHERE dr."deletedAt" IS NULL
    ;

    -- activity_report_citation_source_deleted: a report's citation selections
    -- are a snapshot from Citations at the time an objective was saved. If
    -- that Citation is later soft-deleted (IT-AMS no longer supports it - see
    -- the "Citations deleted record marking" UPDATE in
    -- updateMonitoringFactTables.ts), the consequence depends on the report's
    -- status: an approved report is immutable by design (kept as-is for
    -- FOIA/audit purposes), so this isn't a data bug to fix there - it's a
    -- fact worth knowing, that an official report now cites monitoring data
    -- IT-AMS itself says doesn't exist. A still-editable (draft/submitted/
    -- needs_action) report is different: the stale reference can cause real
    -- broken behavior for the user, and is something OHS staff can actually
    -- act on. The alert step (monitoringFactTableAlerts.ts) splits these two
    -- cases; this observation just records the fact for every non-deleted
    -- report. context.source_deleted_at is Citations.deletedAt, which that
    -- UPDATE only ever sets once (guarded by "deletedAt" IS NULL), so it's
    -- already the "when we learned this" timestamp with no audit-log lookup
    -- needed.
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'ActivityReportObjectiveCitations',
      aroc.id,
      'activity_report_citation_source_deleted',
      CASE WHEN c."deletedAt" IS NOT NULL THEN 'source_deleted' ELSE 'consistent' END,
      jsonb_build_object('source_deleted_at', c."deletedAt"),
      NOW(),
      NOW()
    FROM "ActivityReportObjectiveCitations" aroc
    CROSS JOIN validation_run cur
    JOIN "ActivityReportObjectives" aro
      ON aro.id = aroc."activityReportObjectiveId"
    JOIN "ActivityReports" ar
      ON ar.id = aro."activityReportId"
      AND ar."calculatedStatus" <> 'deleted'
    LEFT JOIN "Citations" c
      ON c.id = aroc."citationId"
    ;
    `,
    {
      raw: true,
      transaction,
      replacements: { processName: VALIDATION_PROCESS.MONITORING_POST_REFRESH },
    }
  );
};

export default refreshMonitoringFactTableObservations;
