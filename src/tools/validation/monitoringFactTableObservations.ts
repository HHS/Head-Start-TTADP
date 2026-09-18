import type { Transaction } from 'sequelize';
import { sequelize } from '../../models';

/**
 * Rebuilds per-entity observations in ValidationRecords for the *fact* tables
 * (updateMonitoringFactTables.ts's output), as opposed to monitoringObservations.ts's
 * raw IT-AMS tables. These check the fact tables' own computed fields directly,
 * rather than re-deriving the same logic a second time from raw data - a check
 * here inherits any future change to that logic instead of drifting from it.
 *
 * entity_type is still only ever 'MonitoringFindings' or 'MonitoringReviews',
 * same as monitoringObservations.ts: Citations.mfid and DeliveredReviews.mrid
 * are exactly MonitoringFindings.id/MonitoringReviews.id (not just
 * correlated - see the unique index on Citations.mfid), so a fact-table
 * observation about a citation or delivered review is really about the same
 * one Finding/Review a raw-data observation about it would be, and is
 * recorded as such rather than proliferating a second, parallel entity
 * family for an anomaly-detection model to reconcile. No separate retention
 * DELETE here - monitoringObservations.ts's own retention pass isn't scoped
 * to an entity_type, so it already covers these rows too.
 *
 * See docs/monitoring-data-validation.md.
 */
const refreshMonitoringFactTableObservations = async (transaction: Transaction): Promise<void> => {
  await sequelize.query(
    `
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
      'MonitoringFindings',
      c.mfid,
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
      'MonitoringReviews',
      dr.mrid,
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
    -- cases; this observation just records the fact for every finding cited
    -- on any non-deleted report. A finding can be cited on more than one
    -- report, so this rolls up with BOOL_OR the same way a raw-data check
    -- rolls up a junction-table condition onto its Finding/Review.
    -- context.source_deleted_at is Citations.deletedAt, which that UPDATE
    -- only ever sets once (guarded by "deletedAt" IS NULL), so it's already
    -- the "when we learned this" timestamp with no audit-log lookup needed.
    WITH finding_report_citations AS (
      SELECT
        c.mfid,
        BOOL_OR(c."deletedAt" IS NOT NULL) any_source_deleted,
        MAX(c."deletedAt") source_deleted_at
      FROM "ActivityReportObjectiveCitations" aroc
      JOIN "ActivityReportObjectives" aro
        ON aro.id = aroc."activityReportObjectiveId"
      JOIN "ActivityReports" ar
        ON ar.id = aro."activityReportId"
        AND ar."calculatedStatus" <> 'deleted'
      JOIN "Citations" c
        ON c.id = aroc."citationId"
      GROUP BY c.mfid
    )
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringFindings',
      frc.mfid,
      'activity_report_citation_source_deleted',
      CASE WHEN frc.any_source_deleted THEN 'source_deleted' ELSE 'consistent' END,
      jsonb_build_object('source_deleted_at', frc.source_deleted_at),
      NOW(),
      NOW()
    FROM finding_report_citations frc
    CROSS JOIN validation_run cur
    ;

    -- citation_review_count / citation_grant_count: not alerted on - raw
    -- material for anomaly detection, not a violation of anything. How many
    -- distinct reviews/grants a Citation has ever been linked to via
    -- DeliveredReviewCitations/GrantCitations.
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, scalar, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringFindings',
      c.mfid,
      'citation_review_count',
      COUNT(DISTINCT drc."deliveredReviewId"),
      NOW(),
      NOW()
    FROM "Citations" c
    CROSS JOIN validation_run cur
    LEFT JOIN "DeliveredReviewCitations" drc
      ON drc."citationId" = c.id
    WHERE c."deletedAt" IS NULL
    GROUP BY c.mfid, cur.run_id
    ;

    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, scalar, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringFindings',
      c.mfid,
      'citation_grant_count',
      COUNT(DISTINCT gc."grantId"),
      NOW(),
      NOW()
    FROM "Citations" c
    CROSS JOIN validation_run cur
    LEFT JOIN "GrantCitations" gc
      ON gc."citationId" = c.id
    WHERE c."deletedAt" IS NULL
    GROUP BY c.mfid, cur.run_id
    ;

    -- citation_days_review_1_to_2 / citation_days_review_2_to_3: how long a
    -- citation's first (then second) review stayed the operative one - raw
    -- material for anomaly detection, not alerted on. Not an open-ended
    -- timeline: a citation has at most 3 reviews today, so these are just
    -- two more named per-finding observations, not a separate per-period
    -- entity. category is the history status that applied during that
    -- period. latest_review_end is set to a far-future placeholder while a
    -- period is still the current one (an open deficiency has no real end
    -- yet) - capped at today so the duration means "how long has this
    -- actually been true" rather than "until the placeholder date". Skips
    -- DeliveredReviewCitations rows with no latest_review_start (a review
    -- delivered the same day as another and so never authoritative for any
    -- period - see delivered_review_citation_no_window below).
    WITH ranked_periods AS (
      SELECT
        c.mfid,
        drc.raw_history_status,
        LEAST(drc.latest_review_end, CURRENT_DATE) - drc.latest_review_start days_in_period,
        ROW_NUMBER() OVER (PARTITION BY c.mfid ORDER BY drc.latest_review_start) rn
      FROM "DeliveredReviewCitations" drc
      JOIN "Citations" c
        ON c.id = drc."citationId"
        AND c."deletedAt" IS NULL
      WHERE drc.latest_review_start IS NOT NULL
    )
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, scalar, "createdAt", "updatedAt")
    SELECT cur.run_id, 'MonitoringFindings', p.mfid, 'citation_days_review_1_to_2', p.raw_history_status, p.days_in_period, NOW(), NOW()
    FROM ranked_periods p
    CROSS JOIN validation_run cur
    WHERE p.rn = 1
    ;

    WITH ranked_periods AS (
      SELECT
        c.mfid,
        drc.raw_history_status,
        LEAST(drc.latest_review_end, CURRENT_DATE) - drc.latest_review_start days_in_period,
        ROW_NUMBER() OVER (PARTITION BY c.mfid ORDER BY drc.latest_review_start) rn
      FROM "DeliveredReviewCitations" drc
      JOIN "Citations" c
        ON c.id = drc."citationId"
        AND c."deletedAt" IS NULL
      WHERE drc.latest_review_start IS NOT NULL
    )
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, scalar, "createdAt", "updatedAt")
    SELECT cur.run_id, 'MonitoringFindings', p.mfid, 'citation_days_review_2_to_3', p.raw_history_status, p.days_in_period, NOW(), NOW()
    FROM ranked_periods p
    CROSS JOIN validation_run cur
    WHERE p.rn = 2
    ;

    -- delivered_review_citation_no_window: a DeliveredReviewCitations row
    -- whose review was delivered the same day as another review on the same
    -- citation, and so lost the tie-break and was never the authoritative
    -- review for any period (see the "If we somehow get two reviews for a
    -- citation witht the same reportDeliveryDate" comment in
    -- updateMonitoringFactTables.ts). Rolled up per finding the same way as
    -- activity_report_citation_source_deleted above. context.learned_at uses
    -- the row's own createdAt: this table is fully rebuilt from raw data each
    -- refresh with an IS DISTINCT FROM upsert guard, so createdAt only moves
    -- when the row is genuinely (re)created, not on every no-op refresh.
    WITH finding_no_window AS (
      SELECT
        c.mfid,
        BOOL_OR(drc.latest_review_start IS NULL) any_no_window,
        MIN(drc."createdAt") FILTER (WHERE drc.latest_review_start IS NULL) learned_at
      FROM "DeliveredReviewCitations" drc
      JOIN "Citations" c
        ON c.id = drc."citationId"
        AND c."deletedAt" IS NULL
      GROUP BY c.mfid
    )
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringFindings',
      fnw.mfid,
      'delivered_review_citation_no_window',
      CASE WHEN fnw.any_no_window THEN 'no_authoritative_window' ELSE 'consistent' END,
      jsonb_build_object('learned_at', fnw.learned_at),
      NOW(),
      NOW()
    FROM finding_no_window fnw
    CROSS JOIN validation_run cur
    ;
    `,
    { raw: true, transaction }
  );
};

export default refreshMonitoringFactTableObservations;
