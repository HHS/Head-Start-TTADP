import type { Transaction } from 'sequelize';
import { sequelize } from '../../models';

/**
 * Rebuilds per-entity observations in ValidationRecords for the *fact* tables
 * (updateMonitoringFactTables.ts's output), as opposed to monitoringObservations.ts's
 * raw IT-AMS tables. These check the fact tables' own computed fields directly,
 * rather than re-deriving the same logic a second time from raw data.
 *
 * entity_type is still only ever 'MonitoringFindings' or 'MonitoringReviews':
 * Citations.mfid and DeliveredReviews.mrid are exactly MonitoringFindings.id/
 * MonitoringReviews.id (enforced by a unique index on Citations.mfid), so a
 * fact-table observation about a citation or delivered review is recorded
 * against the same Finding/Review a raw-data observation would use, not a
 * separate entity family. No separate retention DELETE here -
 * monitoringObservations.ts's own retention pass isn't scoped to an
 * entity_type, so it already covers these rows too.
 *
 * See docs/monitoring-validation-checks.md for what each observation means.
 */
const refreshMonitoringFactTableObservations = async (transaction: Transaction): Promise<void> => {
  await sequelize.query(
    `
    -- citation_reopened. Read directly from ZALCitations rather than
    -- comparing ValidationRecords across runs: the Citations upsert only
    -- writes a row when a column actually changed, so new_row_data is
    -- already a clean diff - filtering on key presence isolates real
    -- transitions with no snapshot-vs-snapshot comparison needed.
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

    -- delivered_review_completion_state
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

    -- activity_report_citation_source_deleted. Rolled up per finding with
    -- BOOL_OR, the same way a raw-data check rolls up a junction-table
    -- condition, since a finding can be cited on more than one report.
    -- context.source_deleted_at is Citations.deletedAt directly (that column
    -- is set at most once, guarded by "deletedAt" IS NULL elsewhere), so it's
    -- already the "when we learned this" timestamp with no audit-log lookup.
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

    -- citation_review_count / citation_grant_count
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

    -- citation_days_review_1_to_2 / citation_days_review_2_to_3.
    -- latest_review_end is a far-future placeholder while a period is still
    -- current - capped at today so the duration means "how long has this
    -- actually been true" rather than "until the placeholder date". Skips
    -- rows with no latest_review_start (see delivered_review_citation_no_window
    -- below).
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

    -- delivered_review_citation_no_window. Rolled up per finding the same way
    -- as activity_report_citation_source_deleted above. context.learned_at
    -- uses updatedAt, which the upsert in updateMonitoringFactTables.ts bumps
    -- on any real column change to the row.
    WITH finding_no_window AS (
      SELECT
        c.mfid,
        BOOL_OR(drc.latest_review_start IS NULL) any_no_window,
        MAX(drc."updatedAt") FILTER (WHERE drc.latest_review_start IS NULL) learned_at
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

    -- raw_finding_type: a straight passthrough (unlike calculated_finding_type,
    -- which blends determination with raw_finding_type via business logic
    -- that could change independently of the underlying data).
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT cur.run_id, 'MonitoringFindings', c.mfid, 'raw_finding_type', c.raw_finding_type, NOW(), NOW()
    FROM "Citations" c
    CROSS JOIN validation_run cur
    WHERE c."deletedAt" IS NULL
    ;

    -- finding_deadline / reported_date / closed_date
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT cur.run_id, 'MonitoringFindings', c.mfid, 'finding_deadline', c.finding_deadline::text, NOW(), NOW()
    FROM "Citations" c
    CROSS JOIN validation_run cur
    WHERE c."deletedAt" IS NULL
    ;

    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT cur.run_id, 'MonitoringFindings', c.mfid, 'reported_date', c.reported_date::text, NOW(), NOW()
    FROM "Citations" c
    CROSS JOIN validation_run cur
    WHERE c."deletedAt" IS NULL
    ;

    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT cur.run_id, 'MonitoringFindings', c.mfid, 'closed_date', c.closed_date::text, NOW(), NOW()
    FROM "Citations" c
    CROSS JOIN validation_run cur
    WHERE c."deletedAt" IS NULL
    ;

    -- reported_to_closed_days: no single source column to match (derived),
    -- so named for what it measures instead.
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, scalar, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringFindings',
      c.mfid,
      'reported_to_closed_days',
      (COALESCE(c.closed_date, c.latest_goal_closure::date) - c.reported_date),
      NOW(),
      NOW()
    FROM "Citations" c
    CROSS JOIN validation_run cur
    WHERE c."deletedAt" IS NULL
      AND COALESCE(c.closed_date, c.latest_goal_closure::date) IS NOT NULL
      AND c.reported_date IS NOT NULL
    ;

    -- initial_determination / latest_determination: straight passthroughs of
    -- MonitoringFindingHistories.determination (via Citations), not a
    -- calculated field - see raw_finding_type above for why that matters.
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT cur.run_id, 'MonitoringFindings', c.mfid, 'initial_determination', c.initial_determination, NOW(), NOW()
    FROM "Citations" c
    CROSS JOIN validation_run cur
    WHERE c."deletedAt" IS NULL
    ;

    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT cur.run_id, 'MonitoringFindings', c.mfid, 'latest_determination', c.latest_determination, NOW(), NOW()
    FROM "Citations" c
    CROSS JOIN validation_run cur
    WHERE c."deletedAt" IS NULL
    ;

    -- previous_determination: the determination from the period before the
    -- latest one - NULL when a citation has only one period (true for most;
    -- only citations with 2+ DeliveredReviewCitations rows have one).
    WITH ranked_periods_desc AS (
      SELECT
        c.mfid,
        drc.determination,
        ROW_NUMBER() OVER (PARTITION BY c.mfid ORDER BY drc.latest_review_start DESC) rn
      FROM "DeliveredReviewCitations" drc
      JOIN "Citations" c
        ON c.id = drc."citationId"
        AND c."deletedAt" IS NULL
      WHERE drc.latest_review_start IS NOT NULL
    )
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT cur.run_id, 'MonitoringFindings', p.mfid, 'previous_determination', p.determination, NOW(), NOW()
    FROM ranked_periods_desc p
    CROSS JOIN validation_run cur
    WHERE p.rn = 2
    ;

    -- initial_narrative_length / latest_narrative_length: narrative is free
    -- text with no natural category boundaries - reduced to length rather
    -- than used as a raw category.
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, scalar, "createdAt", "updatedAt")
    SELECT cur.run_id, 'MonitoringFindings', c.mfid, 'initial_narrative_length', COALESCE(LENGTH(c.initial_narrative), 0), NOW(), NOW()
    FROM "Citations" c
    CROSS JOIN validation_run cur
    WHERE c."deletedAt" IS NULL
    ;

    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, scalar, "createdAt", "updatedAt")
    SELECT cur.run_id, 'MonitoringFindings', c.mfid, 'latest_narrative_length', COALESCE(LENGTH(c.latest_narrative), 0), NOW(), NOW()
    FROM "Citations" c
    CROSS JOIN validation_run cur
    WHERE c."deletedAt" IS NULL
    ;

    -- initial_review_outcome / latest_review_outcome: the outcome of the
    -- finding's initial/latest review, via Citations.initial_review_uuid/
    -- latest_review_uuid.
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT cur.run_id, 'MonitoringFindings', c.mfid, 'initial_review_outcome', dr.outcome, NOW(), NOW()
    FROM "Citations" c
    CROSS JOIN validation_run cur
    LEFT JOIN "DeliveredReviews" dr
      ON dr.review_uuid = c.initial_review_uuid
    WHERE c."deletedAt" IS NULL
    ;

    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT cur.run_id, 'MonitoringFindings', c.mfid, 'latest_review_outcome', dr.outcome, NOW(), NOW()
    FROM "Citations" c
    CROSS JOIN validation_run cur
    LEFT JOIN "DeliveredReviews" dr
      ON dr.review_uuid = c.latest_review_uuid
    WHERE c."deletedAt" IS NULL
    ;

    -- review_type / outcome / report_delivery_date: current-state pulls
    -- straight off the fact table, so they naturally inherit its
    -- delivered-only eligibility filtering.
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT cur.run_id, 'MonitoringReviews', dr.mrid, 'review_type', dr.review_type, NOW(), NOW()
    FROM "DeliveredReviews" dr
    CROSS JOIN validation_run cur
    WHERE dr."deletedAt" IS NULL
    ;

    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT cur.run_id, 'MonitoringReviews', dr.mrid, 'outcome', dr.outcome, NOW(), NOW()
    FROM "DeliveredReviews" dr
    CROSS JOIN validation_run cur
    WHERE dr."deletedAt" IS NULL
    ;

    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT cur.run_id, 'MonitoringReviews', dr.mrid, 'report_delivery_date', dr.report_delivery_date::text, NOW(), NOW()
    FROM "DeliveredReviews" dr
    CROSS JOIN validation_run cur
    WHERE dr."deletedAt" IS NULL
    ;

    -- time_to_complete_days: NULL unless the review chain has actually
    -- reached complete_date, which the fact table only ever sets when
    -- complete = true.
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, scalar, "createdAt", "updatedAt")
    SELECT cur.run_id, 'MonitoringReviews', dr.mrid, 'time_to_complete_days', (dr.complete_date - dr.report_delivery_date), NOW(), NOW()
    FROM "DeliveredReviews" dr
    CROSS JOIN validation_run cur
    WHERE dr."deletedAt" IS NULL
      AND dr.complete_date IS NOT NULL
    ;

    -- total_open_days: companion to time_to_complete_days - always
    -- populated, using today's date in place of complete_date while a
    -- review chain is still open, so an anomaly-detection model can see
    -- chains that have been open an unusually long time, not just ones
    -- that already closed.
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, scalar, "createdAt", "updatedAt")
    SELECT cur.run_id, 'MonitoringReviews', dr.mrid, 'total_open_days', (COALESCE(dr.complete_date, CURRENT_DATE) - dr.report_delivery_date), NOW(), NOW()
    FROM "DeliveredReviews" dr
    CROSS JOIN validation_run cur
    WHERE dr."deletedAt" IS NULL
    ;

    -- review_finding_type_counts: shared by the three citation_count_*
    -- observations below. Uses calculated_finding_type here, unlike the
    -- per-finding measures above - this is just a classification key for
    -- counting associated entities, not a measure of a finding's own data,
    -- so the cleaned-up grouping is the right choice.
    DROP TABLE IF EXISTS pg_temp.review_finding_type_counts;
    CREATE TEMP TABLE review_finding_type_counts
    ON COMMIT DROP
    AS
    SELECT
      dr.mrid,
      COUNT(DISTINCT c.id) FILTER (WHERE c.calculated_finding_type = 'Area of Concern') area_of_concern_count,
      COUNT(DISTINCT c.id) FILTER (WHERE c.calculated_finding_type = 'Noncompliance') noncompliance_count,
      COUNT(DISTINCT c.id) FILTER (WHERE c.calculated_finding_type = 'Deficiency') deficiency_count
    FROM "DeliveredReviews" dr
    LEFT JOIN "DeliveredReviewCitations" drc
      ON drc."deliveredReviewId" = dr.id
    LEFT JOIN "Citations" c
      ON c.id = drc."citationId"
      AND c."deletedAt" IS NULL
    WHERE dr."deletedAt" IS NULL
    GROUP BY dr.mrid
    ;

    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, scalar, "createdAt", "updatedAt")
    SELECT cur.run_id, 'MonitoringReviews', t.mrid, 'citation_count_area_of_concern', t.area_of_concern_count, NOW(), NOW()
    FROM review_finding_type_counts t
    CROSS JOIN validation_run cur
    ;

    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, scalar, "createdAt", "updatedAt")
    SELECT cur.run_id, 'MonitoringReviews', t.mrid, 'citation_count_noncompliance', t.noncompliance_count, NOW(), NOW()
    FROM review_finding_type_counts t
    CROSS JOIN validation_run cur
    ;

    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, scalar, "createdAt", "updatedAt")
    SELECT cur.run_id, 'MonitoringReviews', t.mrid, 'citation_count_deficiency', t.deficiency_count, NOW(), NOW()
    FROM review_finding_type_counts t
    CROSS JOIN validation_run cur
    ;

    -- finding_deadline_max_lag_days: how far past (or before) this review's
    -- own delivery date the most distant associated finding_deadline sits.
    -- Positive means the deadline is after delivery; can be negative for a
    -- pre-existing citation also linked to this later review.
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, scalar, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringReviews',
      dr.mrid,
      'finding_deadline_max_lag_days',
      MAX(c.finding_deadline - dr.report_delivery_date),
      NOW(),
      NOW()
    FROM "DeliveredReviews" dr
    CROSS JOIN validation_run cur
    JOIN "DeliveredReviewCitations" drc
      ON drc."deliveredReviewId" = dr.id
    JOIN "Citations" c
      ON c.id = drc."citationId"
      AND c."deletedAt" IS NULL
      AND c.finding_deadline IS NOT NULL
    WHERE dr."deletedAt" IS NULL
    GROUP BY dr.mrid, cur.run_id
    ;

    -- review_grantee_counts: shared by grantee_count/grant_count/recipient_count
    -- below. granteeId is IT-AMS's own grantee-at-review-time identifier;
    -- Grants.id/recipientId are reached the same way review_grantee_orphaned_grant
    -- does in monitoringObservations.ts, by number (not through
    -- MonitoringGranteeLinks, which can get stuck permanently unresolved).
    DROP TABLE IF EXISTS pg_temp.review_grantee_counts;
    CREATE TEMP TABLE review_grantee_counts
    ON COMMIT DROP
    AS
    SELECT
      dr.mrid,
      COUNT(DISTINCT mrg."granteeId") grantee_count,
      COUNT(DISTINCT g.id) grant_count,
      COUNT(DISTINCT g."recipientId") recipient_count
    FROM "DeliveredReviews" dr
    JOIN "MonitoringReviews" mr
      ON mr."reviewId" = dr.review_uuid
      AND mr."sourceDeletedAt" IS NULL
      AND mr."deletedAt" IS NULL
    LEFT JOIN "MonitoringReviewGrantees" mrg
      ON mrg."reviewId" = mr."reviewId"
      AND mrg."sourceDeletedAt" IS NULL
      AND mrg."deletedAt" IS NULL
    LEFT JOIN "Grants" g
      ON g.number = mrg."grantNumber"
      AND COALESCE(g.deleted, false) = FALSE
    WHERE dr."deletedAt" IS NULL
    GROUP BY dr.mrid
    ;

    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, scalar, "createdAt", "updatedAt")
    SELECT cur.run_id, 'MonitoringReviews', t.mrid, 'grantee_count', t.grantee_count, NOW(), NOW()
    FROM review_grantee_counts t
    CROSS JOIN validation_run cur
    ;

    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, scalar, "createdAt", "updatedAt")
    SELECT cur.run_id, 'MonitoringReviews', t.mrid, 'grant_count', t.grant_count, NOW(), NOW()
    FROM review_grantee_counts t
    CROSS JOIN validation_run cur
    ;

    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, scalar, "createdAt", "updatedAt")
    SELECT cur.run_id, 'MonitoringReviews', t.mrid, 'recipient_count', t.recipient_count, NOW(), NOW()
    FROM review_grantee_counts t
    CROSS JOIN validation_run cur
    ;

    -- review_linked_reviews: for each delivered review, the OTHER reviews
    -- (any MonitoringReviews row, delivered or not) that share at least one
    -- finding with it - one hop only, via the raw MonitoringFindingHistories
    -- link (not DeliveredReviewCitations, which would hide undelivered
    -- siblings entirely). A review's own finding set is fixed to exactly
    -- what THIS review cites; we don't chase whatever additional findings a
    -- sibling review might itself add. Cancelled reviews are excluded
    -- entirely - they'll never deliver, so counting one as "still pending"
    -- would misrepresent a dead-end chain as an active one. 'Inactive' is
    -- not currently treated as terminal.
    DROP TABLE IF EXISTS pg_temp.review_linked_reviews;
    CREATE TEMP TABLE review_linked_reviews
    ON COMMIT DROP
    AS
    WITH own_findings AS (
      SELECT DISTINCT dr.id delivered_review_id, dr.review_uuid, c.finding_uuid
      FROM "DeliveredReviews" dr
      JOIN "DeliveredReviewCitations" drc
        ON drc."deliveredReviewId" = dr.id
      JOIN "Citations" c
        ON c.id = drc."citationId"
        AND c."deletedAt" IS NULL
      WHERE dr."deletedAt" IS NULL
    ),
    other_review_statuses AS (
      SELECT DISTINCT ON ("statusId") "statusId", name
      FROM "MonitoringReviewStatuses"
      WHERE "sourceDeletedAt" IS NULL
      ORDER BY "statusId", "sourceUpdatedAt" DESC NULLS LAST, id DESC
    )
    SELECT DISTINCT
      own.delivered_review_id,
      mfh."reviewId" other_review_uuid,
      mr."reportDeliveryDate" other_report_delivery_date
    FROM own_findings own
    JOIN "MonitoringFindingHistories" mfh
      ON mfh."findingId" = own.finding_uuid
      AND mfh."sourceDeletedAt" IS NULL
      AND mfh."deletedAt" IS NULL
      AND mfh."reviewId" <> own.review_uuid
    JOIN "MonitoringReviews" mr
      ON mr."reviewId" = mfh."reviewId"
      AND mr."sourceDeletedAt" IS NULL
      AND mr."deletedAt" IS NULL
    LEFT JOIN other_review_statuses ors
      ON ors."statusId" = mr."statusId"
    WHERE COALESCE(ors.name, '') <> 'Cancelled'
    ;

    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, scalar, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringReviews',
      dr.mrid,
      'linked_review_count',
      COUNT(DISTINCT rlr.other_review_uuid),
      NOW(),
      NOW()
    FROM "DeliveredReviews" dr
    CROSS JOIN validation_run cur
    LEFT JOIN review_linked_reviews rlr
      ON rlr.delivered_review_id = dr.id
    WHERE dr."deletedAt" IS NULL
    GROUP BY dr.mrid, cur.run_id
    ;

    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringReviews',
      dr.mrid,
      'linked_review_latest_delivery_date',
      MAX(rlr.other_report_delivery_date)::text,
      NOW(),
      NOW()
    FROM "DeliveredReviews" dr
    CROSS JOIN validation_run cur
    LEFT JOIN review_linked_reviews rlr
      ON rlr.delivered_review_id = dr.id
    WHERE dr."deletedAt" IS NULL
    GROUP BY dr.mrid, cur.run_id
    ;

    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, scalar, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringReviews',
      dr.mrid,
      'linked_review_undelivered_count',
      COUNT(DISTINCT rlr.other_review_uuid) FILTER (WHERE rlr.other_report_delivery_date IS NULL),
      NOW(),
      NOW()
    FROM "DeliveredReviews" dr
    CROSS JOIN validation_run cur
    LEFT JOIN review_linked_reviews rlr
      ON rlr.delivered_review_id = dr.id
    WHERE dr."deletedAt" IS NULL
    GROUP BY dr.mrid, cur.run_id
    ;
    `,
    { raw: true, transaction }
  );
};

export default refreshMonitoringFactTableObservations;
