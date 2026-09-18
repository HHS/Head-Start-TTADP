import type { Transaction } from 'sequelize';
import { VALIDATION_PROCESS } from '../../constants';
import { sequelize } from '../../models';

/**
 * Rebuilds per-entity observations in ValidationRecords: one row per observation
 * about one entity. Measurements can be both scalar/numeric and categorical.
 * Observations are raw material for the alert checks and future models, and let a
 * human drill into the entities behind an alert.
 *
 * Retention is cycle-aware: keeps the current run and the previous cycle's run, so
 * a same-cycle re-run replaces rather than accumulates. See
 * docs/monitoring-data-validation.md.
 */
const refreshMonitoringObservations = async (transaction: Transaction): Promise<void> => {
  // Keep only the current run and the latest run of the most recent EARLIER cycle
  // (a different import_id / data version), scoped through
  // ValidationRuns.process_name so other processes are untouched. This drops any
  // prior run of the CURRENT cycle (a same-cycle re-run replaces its data) while
  // preserving a different data version to compare against. Reuses the cur/prev
  // cycle pair monitoringValidationStaging.ts already computed.
  await sequelize.query(
    `
    DELETE FROM "ValidationRecords" rec
    USING "ValidationRuns" r, monitoring_validation_cycles c
    WHERE rec.run_id = r.id
      AND r.process_name = :processName
      AND rec.run_id NOT IN (c.run_id, COALESCE(c.prev_cycle_run_id, c.run_id))
    ;
    `,
    {
      raw: true,
      transaction,
      replacements: { processName: VALIDATION_PROCESS.MONITORING_POST_REFRESH },
    }
  );

  await sequelize.query(
    `
    -- category: the category of each finding on a delivered review - the
    -- coalesced value of the finding's own source and the guidance of an
    -- associated standard (the same calculated_category logic
    -- updateMonitoringFactTables uses). NULL means the finding has no
    -- category, a situation we have actually faced with imported data.
    WITH delivered_findings AS (
    SELECT DISTINCT
      mf.id,
      mf."findingId" finding_uuid
    FROM "MonitoringFindings" mf
    JOIN "MonitoringFindingHistories" mfh
      ON mfh."findingId" = mf."findingId"
      AND mfh."sourceDeletedAt" IS NULL
      AND mfh."deletedAt" IS NULL
    JOIN "MonitoringReviews" mr
      ON mr."reviewId" = mfh."reviewId"
      AND mr."sourceDeletedAt" IS NULL
      AND mr."deletedAt" IS NULL
      AND mr."reportDeliveryDate" IS NOT NULL
    WHERE mf."sourceDeletedAt" IS NULL
      AND mf."deletedAt" IS NULL
    )
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringFindings',
      df.id,
      'category',
      COALESCE(
        NULLIF(TRIM(mf.source), ''),
        MAX(NULLIF(TRIM(ms.guidance), ''))
      ),
      NOW(),
      NOW()
    FROM delivered_findings df
    CROSS JOIN validation_run cur
    JOIN "MonitoringFindings" mf
      ON mf.id = df.id
    LEFT JOIN "MonitoringFindingStandards" mfst
      ON mfst."findingId" = df.finding_uuid
      AND mfst."sourceDeletedAt" IS NULL
      AND mfst."deletedAt" IS NULL
    LEFT JOIN "MonitoringStandards" ms
      ON ms."standardId" = mfst."standardId"
      AND ms."sourceDeletedAt" IS NULL
      AND ms."deletedAt" IS NULL
    GROUP BY df.id, mf.source, cur.run_id
    ;

    -- delivery_report_lag_days: days between a review's reportDeliveryDate and
    -- when that delivery date first showed up in the imported ITAMS data (the
    -- sourceUpdatedAt on the earliest audit row where reportDeliveryDate
    -- appeared, also recorded in context.learned_date for the alert step to
    -- filter on). A large lag means we learned about a delivered review well
    -- after the fact. Reviews with no surviving audit rows produce no
    -- observation.
    WITH first_delivery_set AS (
    SELECT DISTINCT ON (zmr.data_id)
      zmr.data_id,
      (zmr.new_row_data->>'sourceUpdatedAt')::timestamptz::date set_date
    FROM "ZALMonitoringReviews" zmr
    WHERE zmr.new_row_data->>'reportDeliveryDate' IS NOT NULL
      AND zmr.new_row_data->>'sourceUpdatedAt' IS NOT NULL
    ORDER BY zmr.data_id, zmr.dml_timestamp
    )
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, scalar, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringReviews',
      mr.id,
      'delivery_report_lag_days',
      fds.set_date - mr."reportDeliveryDate"::date,
      jsonb_build_object('learned_date', fds.set_date),
      NOW(),
      NOW()
    FROM "MonitoringReviews" mr
    CROSS JOIN validation_run cur
    CROSS JOIN monitoring_validation_window w
    JOIN first_delivery_set fds
      ON fds.data_id = mr.id
    WHERE mr."sourceDeletedAt" IS NULL
      AND mr."deletedAt" IS NULL
      AND mr."reportDeliveryDate" IS NOT NULL
      AND mr."reportDeliveryDate" >= w.start_date
    ;

    -- finding_count: number of distinct findings linked to each review
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, scalar, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringReviews',
      mr.id,
      'finding_count',
      COUNT(DISTINCT mfh."findingId"),
      NOW(),
      NOW()
    FROM "MonitoringReviews" mr
    CROSS JOIN validation_run cur
    LEFT JOIN "MonitoringFindingHistories" mfh
      ON mfh."reviewId" = mr."reviewId"
      AND mfh."sourceDeletedAt" IS NULL
      AND mfh."deletedAt" IS NULL
    WHERE mr."sourceDeletedAt" IS NULL
      AND mr."deletedAt" IS NULL
    GROUP BY mr.id, cur.run_id
    ;

    -- closure_state: an Active finding carrying a closedDate isn't
    -- necessarily wrong (confirmed on prod: usually a stale finding-level
    -- statusId that hasn't caught up, the same class of unreliability
    -- TTAHUB-5740 routes around elsewhere) - recorded as a suspect state for
    -- anomaly detection, not alerted on. DISTINCT ON, not DISTINCT:
    -- statuses_table_integrity can find more than one live row for one
    -- statusId, and a bare DISTINCT would fan out the join below when that
    -- happens - this deterministically picks one instead.
    WITH known_statuses AS (
    SELECT DISTINCT ON ("statusId")
      "statusId",
      name
    FROM "MonitoringFindingStatuses"
    WHERE "sourceDeletedAt" IS NULL
      AND "deletedAt" IS NULL
    ORDER BY "statusId", "sourceUpdatedAt" DESC NULLS LAST, id DESC
    )
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringFindings',
      mf.id,
      'closure_state',
      CASE
        WHEN mfs.name = 'Active' AND mf."closedDate" IS NOT NULL THEN 'active_with_closed_date'
        ELSE 'consistent'
      END,
      NOW(),
      NOW()
    FROM "MonitoringFindings" mf
    CROSS JOIN validation_run cur
    LEFT JOIN known_statuses mfs
      ON mfs."statusId" = mf."statusId"
    WHERE mf."sourceDeletedAt" IS NULL
      AND mf."deletedAt" IS NULL
    ;

    -- history_determination_recognized: flags a Finding whose
    -- MonitoringFindingHistories carry any determination value we haven't
    -- reviewed yet. updateMonitoringFactTables.ts only recognizes
    -- Noncompliance/Concern/Deficiency (Concern -> Area of Concern); anything
    -- else - including a value in the known list below - is silently excluded
    -- from Citations entirely, with no trace left in the fact tables. A new
    -- value here needs review: if it's a same-behavior variant of an
    -- already-excluded value (e.g. "DROPPED", a casing variant of "Dropped"),
    -- add it to the known list below with no further action; if it's a variant
    -- of Noncompliance/Concern/Deficiency, update updateMonitoringFactTables.ts
    -- first so it isn't silently dropped. If a finding's histories carry more
    -- than one unrecognized value, only one is captured here - the rest are
    -- still visible in the raw data once this points a human at the finding.
    WITH finding_unrecognized_determination AS (
      SELECT
        mfh."findingId",
        MIN(CASE
          WHEN mfh.determination IS NULL OR TRIM(mfh.determination) = '' THEN NULL
          WHEN mfh.determination IN (
            'Noncompliance', 'Concern', 'Deficiency', 'Withdrawn', 'Abandoned', 'Dropped', 'DROPPED'
          ) THEN NULL
          ELSE mfh.determination
        END) unrecognized_value
      FROM "MonitoringFindingHistories" mfh
      WHERE mfh."sourceDeletedAt" IS NULL
        AND mfh."deletedAt" IS NULL
      GROUP BY 1
    )
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringFindings',
      mf.id,
      'history_determination_recognized',
      COALESCE(fud.unrecognized_value, 'consistent'),
      NOW(),
      NOW()
    FROM "MonitoringFindings" mf
    CROSS JOIN validation_run cur
    LEFT JOIN finding_unrecognized_determination fud
      ON fud."findingId" = mf."findingId"
    WHERE mf."sourceDeletedAt" IS NULL
      AND mf."deletedAt" IS NULL
    ;

    -- review_type_shape: a CLASS review should have no linked findings; a
    -- non-CLASS review should have no MonitoringClassSummaries row.
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringReviews',
      mr.id,
      'review_type_shape',
      CASE
        WHEN mr."reviewType" ILIKE '%CLASS%' AND EXISTS (
          SELECT 1 FROM "MonitoringFindingHistories" mfh
          WHERE mfh."reviewId" = mr."reviewId"
            AND mfh."sourceDeletedAt" IS NULL
            AND mfh."deletedAt" IS NULL
        ) THEN 'class_review_has_findings'
        WHEN mr."reviewType" NOT ILIKE '%CLASS%' AND EXISTS (
          SELECT 1 FROM "MonitoringClassSummaries" mcs
          WHERE mcs."reviewId" = mr."reviewId"
            AND mcs."sourceDeletedAt" IS NULL
            AND mcs."deletedAt" IS NULL
        ) THEN 'non_class_review_has_class_summary'
        ELSE 'consistent'
      END,
      NOW(),
      NOW()
    FROM "MonitoringReviews" mr
    CROSS JOIN validation_run cur
    WHERE mr."sourceDeletedAt" IS NULL
      AND mr."deletedAt" IS NULL
    ;

    -- review_status_vs_delivery: a review with a reportDeliveryDate has been
    -- delivered, so its status should say Complete. (The reverse isn't
    -- checked here: a Complete review with no reportDeliveryDate is a
    -- separate, already-known gap - updateMonitoringFactTables.ts requires
    -- reportDeliveryDate, not status, to treat a review as delivered.)
    -- Scoped to the window like the other reportDeliveryDate-based checks
    -- (delivery_report_lag_days, finding_latest_delivered): reviews with no
    -- reportDeliveryDate, or one older than the window, produce no
    -- observation, so an old already-known mismatch can't alert forever.
    -- DISTINCT ON, not a bare join: see closure_state's known_statuses above
    -- - same fan-out risk if statuses_table_integrity's condition occurs.
    WITH known_review_statuses AS (
      SELECT DISTINCT ON ("statusId") "statusId", name
      FROM "MonitoringReviewStatuses"
      WHERE "deletedAt" IS NULL
      ORDER BY "statusId", "sourceUpdatedAt" DESC NULLS LAST, id DESC
    )
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringReviews',
      mr.id,
      'review_status_vs_delivery',
      CASE
        WHEN COALESCE(rs.name, '') <> 'Complete'
          THEN 'delivered_not_complete'
        ELSE 'consistent'
      END,
      NOW(),
      NOW()
    FROM "MonitoringReviews" mr
    CROSS JOIN validation_run cur
    CROSS JOIN monitoring_validation_window w
    LEFT JOIN known_review_statuses rs
      ON rs."statusId" = mr."statusId"
    WHERE mr."sourceDeletedAt" IS NULL
      AND mr."deletedAt" IS NULL
      AND mr."reportDeliveryDate" IS NOT NULL
      AND mr."reportDeliveryDate" >= w.start_date
    ;

    -- review_grantee_duplicated: flags a Review with more than one live
    -- MonitoringReviewGrantees row for the same (reviewId, grantNumber) -
    -- would double-count in any query that doesn't DISTINCT on this pair
    -- (some already do; some don't).
    WITH review_grantee_pairs AS (
      SELECT "reviewId", "grantNumber", COUNT(*) cnt
      FROM "MonitoringReviewGrantees"
      WHERE "sourceDeletedAt" IS NULL
        AND "deletedAt" IS NULL
      GROUP BY 1, 2
    ),
    review_grantee_duplication AS (
      SELECT "reviewId", BOOL_OR(cnt > 1) any_duplicated
      FROM review_grantee_pairs
      GROUP BY 1
    )
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringReviews',
      mr.id,
      'review_grantee_duplicated',
      CASE WHEN rgd.any_duplicated THEN 'duplicated' ELSE 'consistent' END,
      NOW(),
      NOW()
    FROM "MonitoringReviews" mr
    CROSS JOIN validation_run cur
    LEFT JOIN review_grantee_duplication rgd
      ON rgd."reviewId" = mr."reviewId"
    WHERE mr."sourceDeletedAt" IS NULL
      AND mr."deletedAt" IS NULL
    ;

    -- review_grantee_multi_grant: flags a Review with a grantee link whose
    -- granteeId also appears on a live MonitoringReviewGrantees row with a
    -- different grantNumber - would misattribute a finding to the wrong
    -- grant anywhere granteeId is used to look up "the" grant (e.g.
    -- finding_grant_on_own_review above).
    WITH grantee_grant_counts AS (
      SELECT "granteeId", COUNT(DISTINCT "grantNumber") grant_numbers
      FROM "MonitoringReviewGrantees"
      WHERE "sourceDeletedAt" IS NULL
        AND "deletedAt" IS NULL
      GROUP BY 1
    ),
    review_grantee_multi_grant AS (
      SELECT mrg."reviewId", BOOL_OR(ggc.grant_numbers > 1) any_multi_grant
      FROM "MonitoringReviewGrantees" mrg
      JOIN grantee_grant_counts ggc
        ON ggc."granteeId" = mrg."granteeId"
      WHERE mrg."sourceDeletedAt" IS NULL
        AND mrg."deletedAt" IS NULL
      GROUP BY 1
    )
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringReviews',
      mr.id,
      'review_grantee_multi_grant',
      CASE WHEN rgmg.any_multi_grant THEN 'grantee_multi_grant' ELSE 'consistent' END,
      NOW(),
      NOW()
    FROM "MonitoringReviews" mr
    CROSS JOIN validation_run cur
    LEFT JOIN review_grantee_multi_grant rgmg
      ON rgmg."reviewId" = mr."reviewId"
    WHERE mr."sourceDeletedAt" IS NULL
      AND mr."deletedAt" IS NULL
    ;

    -- finding_grant_on_own_review: flags a Finding whose directly-attached
    -- grant(s) (via MonitoringFindingGrants.granteeId) aren't all among the
    -- grant(s) of the review(s) the finding is actually linked to via
    -- MonitoringFindingHistories. Nothing in the schema guarantees this.
    WITH finding_review_grant_numbers AS (
      SELECT DISTINCT
        mfh."findingId",
        mrg2."grantNumber"
      FROM "MonitoringFindingHistories" mfh
      JOIN "MonitoringReviewGrantees" mrg2
        ON mrg2."reviewId" = mfh."reviewId"
        AND mrg2."sourceDeletedAt" IS NULL
        AND mrg2."deletedAt" IS NULL
      WHERE mfh."sourceDeletedAt" IS NULL
        AND mfh."deletedAt" IS NULL
    ),
    -- Two-stage aggregation, not a single pre-joined "this granteeId's
    -- grantNumber(s)" CTE: a granteeId can map to more than one grantNumber,
    -- and joining that straight into MonitoringFindingGrants would fan out
    -- one grant row into several, corrupting a single-level BOOL_OR (one
    -- non-matching fanned-out row would wrongly flag a finding whose grant
    -- genuinely is on its own review through a different grantNumber). Here
    -- the ambiguity is resolved per (findingId, granteeId) first - "is ANY of
    -- this granteeId's grantNumbers among the finding's own review grants" -
    -- before rolling up to one row per finding.
    finding_grantee_on_review AS (
      SELECT
        mfg."findingId",
        mfg."granteeId",
        BOOL_OR(frgn."grantNumber" IS NOT NULL) any_on_review
      FROM "MonitoringFindingGrants" mfg
      LEFT JOIN "MonitoringReviewGrantees" mrg2
        ON mrg2."granteeId" = mfg."granteeId"
        AND mrg2."sourceDeletedAt" IS NULL
        AND mrg2."deletedAt" IS NULL
      LEFT JOIN finding_review_grant_numbers frgn
        ON frgn."findingId" = mfg."findingId"
        AND frgn."grantNumber" = mrg2."grantNumber"
      WHERE mfg."sourceDeletedAt" IS NULL
        AND mfg."deletedAt" IS NULL
      GROUP BY 1, 2
    ),
    finding_grant_off_review AS (
      SELECT "findingId", BOOL_OR(NOT any_on_review) any_off_review
      FROM finding_grantee_on_review
      GROUP BY 1
    )
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringFindings',
      mf.id,
      'finding_grant_on_own_review',
      CASE WHEN fgor.any_off_review THEN 'grant_not_on_own_review' ELSE 'consistent' END,
      NOW(),
      NOW()
    FROM "MonitoringFindings" mf
    CROSS JOIN validation_run cur
    LEFT JOIN finding_grant_off_review fgor
      ON fgor."findingId" = mf."findingId"
    WHERE mf."sourceDeletedAt" IS NULL
      AND mf."deletedAt" IS NULL
    ;

    -- finding_review_history_duplicated: flags a Finding with more than one
    -- live MonitoringFindingHistories row for the same (findingId, reviewId).
    -- Identical duplicates are just import noise; flagged only when they
    -- disagree on status or determination, since that's genuine ambiguity
    -- about the finding's state on that review.
    WITH finding_review_pairs AS (
      SELECT
        "findingId",
        "reviewId",
        COUNT(*) cnt,
        COUNT(DISTINCT COALESCE("statusId"::text, '')) status_variants,
        COUNT(DISTINCT COALESCE(TRIM(determination), '')) determination_variants
      FROM "MonitoringFindingHistories"
      WHERE "sourceDeletedAt" IS NULL
        AND "deletedAt" IS NULL
      GROUP BY 1, 2
    ),
    finding_history_duplication AS (
      SELECT
        "findingId",
        BOOL_OR(cnt > 1 AND (status_variants > 1 OR determination_variants > 1)) any_disagreeing,
        BOOL_OR(cnt > 1) any_duplicated
      FROM finding_review_pairs
      GROUP BY 1
    )
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringFindings',
      mf.id,
      'finding_review_history_duplicated',
      CASE
        WHEN fhd.any_disagreeing THEN 'duplicated_disagreeing'
        WHEN fhd.any_duplicated THEN 'duplicated_agreeing'
        ELSE 'consistent'
      END,
      NOW(),
      NOW()
    FROM "MonitoringFindings" mf
    CROSS JOIN validation_run cur
    LEFT JOIN finding_history_duplication fhd
      ON fhd."findingId" = mf."findingId"
    WHERE mf."sourceDeletedAt" IS NULL
      AND mf."deletedAt" IS NULL
    ;

    -- finding_standard_missing: a finding with no MonitoringFindingStandard
    -- link resolving to a live MonitoringStandards row silently produces no
    -- Citation (the fact-table transform inner-joins to live standards, so an
    -- orphaned link - one whose standardId itself has no live row - is just
    -- as invisible to it as having no link at all) - nothing else in the fact
    -- tables would show this finding is missing.
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringFindings',
      mf.id,
      'finding_standard_missing',
      CASE WHEN live.cnt IS NULL OR live.cnt = 0 THEN 'no_live_standard' ELSE 'consistent' END,
      NOW(),
      NOW()
    FROM "MonitoringFindings" mf
    CROSS JOIN validation_run cur
    LEFT JOIN (
      SELECT mfst."findingId", COUNT(*) cnt
      FROM "MonitoringFindingStandards" mfst
      JOIN "MonitoringStandards" ms
        ON ms."standardId" = mfst."standardId"
        AND ms."sourceDeletedAt" IS NULL
        AND ms."deletedAt" IS NULL
      WHERE mfst."sourceDeletedAt" IS NULL
        AND mfst."deletedAt" IS NULL
      GROUP BY 1
    ) live
      ON live."findingId" = mf."findingId"
    WHERE mf."sourceDeletedAt" IS NULL
      AND mf."deletedAt" IS NULL
    ;

    -- history_status_resolvable / finding_status_resolvable /
    -- review_status_resolvable: a statusId that doesn't resolve to any live
    -- row in its *Statuses table. Every join in updateMonitoringFactTables.ts
    -- (and these checks) assumes this always resolves; nothing in the schema
    -- guarantees it.
    WITH finding_history_status_unresolved AS (
      SELECT mfh."findingId", BOOL_OR(s."statusId" IS NULL) any_unresolvable
      FROM "MonitoringFindingHistories" mfh
      LEFT JOIN "MonitoringFindingHistoryStatuses" s
        ON s."statusId" = mfh."statusId"
        AND s."deletedAt" IS NULL
      WHERE mfh."sourceDeletedAt" IS NULL
        AND mfh."deletedAt" IS NULL
      GROUP BY 1
    )
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringFindings',
      mf.id,
      'history_status_resolvable',
      CASE WHEN fhsu.any_unresolvable THEN 'unresolvable' ELSE 'consistent' END,
      NOW(),
      NOW()
    FROM "MonitoringFindings" mf
    CROSS JOIN validation_run cur
    LEFT JOIN finding_history_status_unresolved fhsu
      ON fhsu."findingId" = mf."findingId"
    WHERE mf."sourceDeletedAt" IS NULL
      AND mf."deletedAt" IS NULL
    ;

    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringFindings',
      mf.id,
      'finding_status_resolvable',
      CASE WHEN s."statusId" IS NULL THEN 'unresolvable' ELSE 'consistent' END,
      NOW(),
      NOW()
    FROM "MonitoringFindings" mf
    CROSS JOIN validation_run cur
    LEFT JOIN "MonitoringFindingStatuses" s
      ON s."statusId" = mf."statusId"
      AND s."deletedAt" IS NULL
    WHERE mf."sourceDeletedAt" IS NULL
      AND mf."deletedAt" IS NULL
    ;

    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringReviews',
      mr.id,
      'review_status_resolvable',
      CASE WHEN s."statusId" IS NULL THEN 'unresolvable' ELSE 'consistent' END,
      NOW(),
      NOW()
    FROM "MonitoringReviews" mr
    CROSS JOIN validation_run cur
    LEFT JOIN "MonitoringReviewStatuses" s
      ON s."statusId" = mr."statusId"
      AND s."deletedAt" IS NULL
    WHERE mr."sourceDeletedAt" IS NULL
      AND mr."deletedAt" IS NULL
    ;

    -- statuses_table_integrity: more than one live row for the same statusId
    -- in a *Statuses table. Every status-name lookup in this codebase (and in
    -- updateMonitoringFactTables.ts) assumes exactly one live row per
    -- statusId; nothing in the schema enforces it. Exception to anchoring on
    -- Findings/Reviews: this is about the shared reference table itself, not
    -- any one finding or review.
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringFindingHistoryStatuses',
      s.id,
      'statuses_table_integrity',
      CASE WHEN dup.cnt > 1 THEN 'duplicate_live_status' ELSE 'consistent' END,
      NOW(),
      NOW()
    FROM "MonitoringFindingHistoryStatuses" s
    CROSS JOIN validation_run cur
    JOIN (
      SELECT "statusId", COUNT(*) cnt
      FROM "MonitoringFindingHistoryStatuses"
      WHERE "deletedAt" IS NULL
      GROUP BY 1
    ) dup
      ON dup."statusId" = s."statusId"
    WHERE s."deletedAt" IS NULL
    ;

    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringFindingStatuses',
      s.id,
      'statuses_table_integrity',
      CASE WHEN dup.cnt > 1 THEN 'duplicate_live_status' ELSE 'consistent' END,
      NOW(),
      NOW()
    FROM "MonitoringFindingStatuses" s
    CROSS JOIN validation_run cur
    JOIN (
      SELECT "statusId", COUNT(*) cnt
      FROM "MonitoringFindingStatuses"
      WHERE "deletedAt" IS NULL
      GROUP BY 1
    ) dup
      ON dup."statusId" = s."statusId"
    WHERE s."deletedAt" IS NULL
    ;

    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringReviewStatuses',
      s.id,
      'statuses_table_integrity',
      CASE WHEN dup.cnt > 1 THEN 'duplicate_live_status' ELSE 'consistent' END,
      NOW(),
      NOW()
    FROM "MonitoringReviewStatuses" s
    CROSS JOIN validation_run cur
    JOIN (
      SELECT "statusId", COUNT(*) cnt
      FROM "MonitoringReviewStatuses"
      WHERE "deletedAt" IS NULL
      GROUP BY 1
    ) dup
      ON dup."statusId" = s."statusId"
    WHERE s."deletedAt" IS NULL
    ;

    -- review_grantee_orphaned_grant: flags a Review with a
    -- MonitoringReviewGrantees row whose grantNumber has no live
    -- GrantNumberLinks/Grants match - silently excludes the review (and its
    -- citations, for that grant) from the fact tables. Real, ongoing
    -- incidence on prod (~0.4% of review-grantee links).
    WITH review_grantee_orphans AS (
      SELECT mrg."reviewId", BOOL_OR(g.id IS NULL) any_orphaned
      FROM "MonitoringReviewGrantees" mrg
      LEFT JOIN "GrantNumberLinks" gnl
        ON gnl."grantNumber" = mrg."grantNumber"
      LEFT JOIN "Grants" g
        ON g.id = gnl."grantId"
        AND NOT g.deleted
      WHERE mrg."sourceDeletedAt" IS NULL
        AND mrg."deletedAt" IS NULL
      GROUP BY 1
    )
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringReviews',
      mr.id,
      'review_grantee_orphaned_grant',
      CASE WHEN rgo.any_orphaned THEN 'orphaned_grant_number' ELSE 'consistent' END,
      NOW(),
      NOW()
    FROM "MonitoringReviews" mr
    CROSS JOIN validation_run cur
    LEFT JOIN review_grantee_orphans rgo
      ON rgo."reviewId" = mr."reviewId"
    WHERE mr."sourceDeletedAt" IS NULL
      AND mr."deletedAt" IS NULL
    ;

    -- standard_consistency: a finding's live MonitoringFindingStandard rows
    -- should agree on citation text always; guidance may disagree only
    -- harmlessly, when the finding's own source is set (calculated_category
    -- ignores guidance in that case). Citation text is checked first and is
    -- the more serious problem, so a finding with both kinds of disagreement
    -- is only ever flagged as citation_text_disagrees.
    WITH standard_variance AS (
      SELECT
        mfst."findingId",
        -- coalescing nulls to the empty string so they get counted as a variant
        COUNT(DISTINCT COALESCE(TRIM(ms.citation), '')) citation_variants,
        COUNT(DISTINCT COALESCE(TRIM(ms.guidance), '')) guidance_variants
      FROM "MonitoringFindingStandards" mfst
      JOIN "MonitoringStandards" ms
        ON ms."standardId" = mfst."standardId"
        AND ms."sourceDeletedAt" IS NULL
        AND ms."deletedAt" IS NULL
      WHERE mfst."sourceDeletedAt" IS NULL
        AND mfst."deletedAt" IS NULL
      GROUP BY 1
    )
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringFindings',
      mf.id,
      'standard_consistency',
      CASE
        WHEN sv.citation_variants > 1 THEN 'citation_text_disagrees'
        WHEN sv.guidance_variants > 1 AND NULLIF(TRIM(mf.source), '') IS NULL THEN 'category_disagrees_no_source'
        WHEN sv.guidance_variants > 1 THEN 'category_disagrees_has_source'
        ELSE 'consistent'
      END,
      NOW(),
      NOW()
    FROM "MonitoringFindings" mf
    CROSS JOIN validation_run cur
    JOIN standard_variance sv
      ON sv."findingId" = mf."findingId"
    WHERE mf."sourceDeletedAt" IS NULL
      AND mf."deletedAt" IS NULL
    ;

    -- history_vs_finding_status / history_vs_outcome share this derivation: a
    -- finding's history status on its own latest delivered review (delivered
    -- within monitoring_validation_window), and that review's outcome. This is
    -- a simplified, validation-only version of the same "latest delivered
    -- review" concept updateMonitoringFactTables.ts computes for the fact
    -- tables - duplicated here deliberately, since this raw-data check has to
    -- run independently of (and would be blind to bugs in) that transform.
    -- A real temp table, not a CTE, because both checks below are separate
    -- top-level statements and a CTE only scopes to the statement it's
    -- attached to.
    DROP TABLE IF EXISTS pg_temp.finding_latest_delivered;
    CREATE TEMP TABLE finding_latest_delivered
    ON COMMIT DROP
    AS
      SELECT DISTINCT ON (mfh."findingId")
        mfh."findingId",
        mfh.id latest_history_id,
        mr.id latest_review_id,
        mhs.name latest_history_status,
        mr.outcome latest_outcome,
        mr."reportDeliveryDate" latest_delivery_date
      FROM "MonitoringFindingHistories" mfh
      CROSS JOIN monitoring_validation_window w
      JOIN "MonitoringReviews" mr
        ON mr."reviewId" = mfh."reviewId"
        AND mr."sourceDeletedAt" IS NULL
        AND mr."deletedAt" IS NULL
        AND mr."reportDeliveryDate" >= w.start_date
      LEFT JOIN "MonitoringFindingHistoryStatuses" mhs
        ON mhs."statusId" = mfh."statusId"
        AND mhs."deletedAt" IS NULL
      WHERE mfh."sourceDeletedAt" IS NULL
        AND mfh."deletedAt" IS NULL
      ORDER BY mfh."findingId", mr."reportDeliveryDate" DESC, mr."sourceCreatedAt" DESC
    ;

    -- DISTINCT ON, not DISTINCT: see closure_state's known_statuses above -
    -- same fan-out risk if statuses_table_integrity's condition occurs.
    WITH known_finding_statuses AS (
      SELECT DISTINCT ON ("statusId") "statusId", name
      FROM "MonitoringFindingStatuses"
      WHERE "deletedAt" IS NULL
      ORDER BY "statusId", "sourceUpdatedAt" DESC NULLS LAST, id DESC
    )

    -- history_vs_finding_status: the determination/status MonitoringFindingHistories
    -- recorded for the finding's own latest delivered review says Corrected,
    -- but MonitoringFindings.statusId (the finding-level field, not tied to any
    -- one review) doesn't agree. The other direction - finding-level status
    -- implying resolution while the linked history still says New/Not
    -- Reviewed/Not Corrected - is NOT flagged; that happens constantly and is
    -- already understood (IT-AMS doesn't always link a finding to its
    -- follow-up review, so the finding-level field can be advanced by
    -- information this linked history chain has no visibility into). This
    -- direction is different: the history status is the one side we can trace
    -- to a specific, real, delivered review, and it disagrees with the
    -- finding-level field. Confirmed on prod: every current instance also has
    -- MonitoringFindings.closedDate (a separate field, not used elsewhere in
    -- our logic) set to a date matching that same delivered review - a second,
    -- independent piece of IT-AMS's own data pointing the same way, which is
    -- why this is trusted as the finding-level field being wrong rather than
    -- the history being wrong. context.learned_at is the more recent of "when
    -- the history status last changed" and "when the finding status last
    -- changed" (see monitoringValidationStaging.ts) - whichever moved last is
    -- when this disagreement became newly visible to us, which is what the
    -- alert step gates freshness on so a disagreement IT-AMS never fixes
    -- doesn't alert forever.
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringFindings',
      mf.id,
      'history_vs_finding_status',
      CASE
        WHEN fld.latest_history_status = 'Corrected' AND COALESCE(kfs.name, '') <> 'Corrected'
          THEN 'history_corrected_finding_disagrees'
        ELSE 'consistent'
      END,
      jsonb_build_object(
        'learned_at', GREATEST(hsl.learned_at, fsl.learned_at)
      ),
      NOW(),
      NOW()
    FROM "MonitoringFindings" mf
    CROSS JOIN validation_run cur
    LEFT JOIN known_finding_statuses kfs
      ON kfs."statusId" = mf."statusId"
    LEFT JOIN finding_latest_delivered fld
      ON fld."findingId" = mf."findingId"
    LEFT JOIN monitoring_finding_history_status_learned hsl
      ON hsl.finding_history_id = fld.latest_history_id
    LEFT JOIN monitoring_finding_status_learned fsl
      ON fsl.finding_id = mf.id
    WHERE mf."sourceDeletedAt" IS NULL
      AND mf."deletedAt" IS NULL
    ;

    -- history_vs_outcome: the finding's latest delivered review's history
    -- status is still open (New/Not Reviewed/Not Corrected/Elevated
    -- Deficiency) while that same review's own outcome field says Compliant -
    -- two fields IT-AMS records for one review disagreeing with each other.
    -- Excludes Area of Concern findings (findingType containing "Concern",
    -- matching how updateMonitoringFactTables.ts itself detects them - the
    -- raw value can be "Concern" or "Area of Concern"): they're resolved
    -- through monitoring goal closure, not the history status cycle this
    -- check watches, so their history status legitimately stays New
    -- indefinitely regardless of the review's outcome (confirmed on prod:
    -- every current New+Compliant instance is an Area of Concern finding).
    -- context.learned_at mirrors history_vs_finding_status above: the more
    -- recent of "when the review's outcome last changed" and "when the
    -- finding's history status last changed" is when this disagreement
    -- became newly visible to us.
    INSERT INTO "ValidationRecords"
      (run_id, entity_type, entity_id, observation_name, category, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringFindings',
      mf.id,
      'history_vs_outcome',
      CASE
        WHEN fld.latest_outcome = 'Compliant'
          AND fld.latest_history_status IN ('New', 'Not Reviewed', 'Not Corrected', 'Elevated Deficiency')
          AND mf."findingType" NOT ILIKE '%Concern%'
          THEN 'open_status_on_compliant_review'
        ELSE 'consistent'
      END,
      jsonb_build_object(
        'learned_at', GREATEST(ool.learned_at, hsl.learned_at)
      ),
      NOW(),
      NOW()
    FROM "MonitoringFindings" mf
    CROSS JOIN validation_run cur
    LEFT JOIN finding_latest_delivered fld
      ON fld."findingId" = mf."findingId"
    LEFT JOIN monitoring_review_outcome_learned ool
      ON ool.review_id = fld.latest_review_id
    LEFT JOIN monitoring_finding_history_status_learned hsl
      ON hsl.finding_history_id = fld.latest_history_id
    WHERE mf."sourceDeletedAt" IS NULL
      AND mf."deletedAt" IS NULL
    ;
    `,
    { raw: true, transaction }
  );
};

export default refreshMonitoringObservations;
