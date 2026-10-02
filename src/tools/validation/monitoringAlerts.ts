import type { Transaction } from 'sequelize';
import { VALIDATION_PROCESS } from '../../constants';
import { sequelize } from '../../models';

/**
 * Rebuilds ValidationAlerts for the post-refresh process: threshold checks over
 * ValidationTimeSeries and validity checks over ValidationRecords, both produced
 * earlier in the run. This process's previous alerts are deleted first. See
 * docs/monitoring-validation-checks.md.
 */
const refreshMonitoringAlerts = async (transaction: Transaction): Promise<void> => {
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
      replacements: { processName: VALIDATION_PROCESS.MONITORING_POST_REFRESH },
    }
  );

  await sequelize.query(
    `
    -- Threshold checks look at complete periods only; the current week/month
    -- is partial and would always false-alarm.

    -- Weekly review-creation totals per region over the last four complete weeks
    DROP TABLE IF EXISTS weekly_reviews;
    CREATE TEMP TABLE weekly_reviews
    AS
    SELECT
      region_id,
      period_start,
      SUM(value) total
    FROM "ValidationTimeSeries"
    WHERE feature_set = 'monitoring_reviews'
      AND period_type = 'week'
      AND stat_name = 'reviews_created'
      AND period_start >= (date_trunc('week', NOW()) - INTERVAL '4 weeks')::date
      AND period_start < date_trunc('week', NOW())::date
    GROUP BY 1, 2
    ;

    -- National findings-delivered totals per month over the last complete
    -- month plus the twelve months preceding it, from the region_id = 0 rows
    -- (not a sum across regions - see docs/monitoring-data-validation.md).
    DROP TABLE IF EXISTS monthly_findings;
    CREATE TEMP TABLE monthly_findings
    AS
    SELECT
      period_start,
      SUM(value) total
    FROM "ValidationTimeSeries"
    WHERE feature_set = 'monitoring_findings'
      AND period_type = 'month'
      AND stat_name = 'findings_delivered'
      AND region_id = 0
      AND period_start >= (date_trunc('month', NOW()) - INTERVAL '13 months')::date
      AND period_start < date_trunc('month', NOW())::date
    GROUP BY 1
    ;

    -- previously_flagged: (entity_type, entity_id, observation_name, category)
    -- combinations already true as of the previous cycle's run - the "since
    -- previous cycle" alert window (see docs/monitoring-data-validation.md,
    -- Conventions). A real temp table, not a CTE, since it's reused across
    -- every INSERT below, each its own top-level statement.
    DROP TABLE IF EXISTS pg_temp.previously_flagged;
    CREATE TEMP TABLE previously_flagged
    ON COMMIT DROP
    AS
    SELECT prev.entity_type, prev.entity_id, prev.observation_name, prev.category
    FROM "ValidationRecords" prev
    CROSS JOIN monitoring_validation_cycles cyc
    WHERE prev.run_id = cyc.prev_cycle_run_id
    ;

    -- reviews_created_region_zero
    WITH region_totals AS (
    SELECT
      g."regionId" region_id,
      COALESCE(SUM(wr.total), 0) total
    FROM (SELECT DISTINCT "regionId" FROM "Grants" WHERE NOT deleted) g
    LEFT JOIN weekly_reviews wr
      ON wr.region_id = g."regionId"
    GROUP BY 1
    ),
    cross_region AS (
    SELECT AVG(total) avg_total
    FROM region_totals
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'reviews_created_region_zero',
      'Region ' || rt.region_id
        || ' created no monitoring reviews in the last four complete weeks',
      jsonb_build_object(
        'feature_set', 'monitoring_reviews',
        'stat_name', 'reviews_created',
        'region_id', rt.region_id,
        'window_weeks', 4,
        'value', 0,
        'cross_region_avg', ROUND(cr.avg_total, 2)
      ),
      NOW(),
      NOW()
    FROM region_totals rt
    CROSS JOIN cross_region cr
    CROSS JOIN validation_run cur
    WHERE cr.avg_total > 5
      AND rt.total = 0
    ;

    -- findings_delivered_month_spike
    WITH last_month AS (
    SELECT COALESCE(SUM(total), 0) total
    FROM monthly_findings
    WHERE period_start = (date_trunc('month', NOW()) - INTERVAL '1 month')::date
    ),
    previous_year AS (
    SELECT COALESCE(SUM(total), 0) total
    FROM monthly_findings
    WHERE period_start < (date_trunc('month', NOW()) - INTERVAL '1 month')::date
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'findings_delivered_month_spike',
      'Findings delivered in the last complete month exceeded 50% of the entire previous year',
      jsonb_build_object(
        'feature_set', 'monitoring_findings',
        'stat_name', 'findings_delivered',
        'period_start', (date_trunc('month', NOW()) - INTERVAL '1 month')::date,
        'value', lm.total,
        'previous_year_total', py.total
      ),
      NOW(),
      NOW()
    FROM last_month lm
    CROSS JOIN previous_year py
    CROSS JOIN validation_run cur
    WHERE py.total > 0
      AND lm.total > 0.5 * py.total
    ;

    -- finding_category_missing. IS NOT DISTINCT FROM, not =, in the
    -- previously_flagged join: this check's category can be NULL.
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'finding_category_missing',
      COUNT(*) || ' finding(s) on delivered reviews have no category',
      cur.team_notification,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'category',
        'count', COUNT(*),
        'sample_entity_ids', (ARRAY_AGG(vr.entity_id ORDER BY vr.entity_id))[1:20]
      ),
      NOW(),
      NOW()
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    LEFT JOIN previously_flagged pf
      ON pf.entity_type = vr.entity_type
      AND pf.entity_id = vr.entity_id
      AND pf.observation_name = vr.observation_name
      AND pf.category IS NOT DISTINCT FROM vr.category
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'category'
      AND vr.category IS NULL
      AND pf.entity_id IS NULL
    GROUP BY cur.run_id, cur.team_notification
    HAVING COUNT(*) > 0
    ;

    -- review_delivery_report_lag
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'review_delivery_report_lag',
      COUNT(*) || ' review(s) reported their delivery date more than 7 days late',
      jsonb_build_object(
        'entity_type', 'MonitoringReviews',
        'observation_name', 'delivery_report_lag_days',
        'threshold_days', 7,
        'count', COUNT(*),
        'max_lag_days', MAX(vr.scalar),
        'sample_entity_ids', (ARRAY_AGG(vr.entity_id ORDER BY vr.scalar DESC))[1:20]
      ),
      NOW(),
      NOW()
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'delivery_report_lag_days'
      AND vr.scalar > 7
      AND (vr.context->>'learned_date')::date >= (CURRENT_DATE - INTERVAL '3 days')
    GROUP BY cur.run_id
    HAVING COUNT(*) > 0
    ;

    -- history_determination_unrecognized
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'history_determination_unrecognized',
      COUNT(*) || ' finding(s) carry an unrecognized determination value in their history',
      cur.team_notification,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'history_determination_recognized',
        'count', COUNT(*),
        'distinct_values', (ARRAY_AGG(DISTINCT vr.category))[1:20],
        'sample_entity_ids', (ARRAY_AGG(vr.entity_id ORDER BY vr.entity_id))[1:20]
      ),
      NOW(),
      NOW()
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    LEFT JOIN previously_flagged pf
      ON pf.entity_type = vr.entity_type
      AND pf.entity_id = vr.entity_id
      AND pf.observation_name = vr.observation_name
      AND pf.category IS NOT DISTINCT FROM vr.category
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'history_determination_recognized'
      AND vr.category <> 'consistent'
      AND pf.entity_id IS NULL
    GROUP BY cur.run_id, cur.team_notification
    HAVING COUNT(*) > 0
    ;

    -- review_type_shape_violation
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'review_type_shape_violation',
      COUNT(*) || ' review(s) mix CLASS and finding-based review shapes unexpectedly',
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringReviews',
        'observation_name', 'review_type_shape',
        'count', COUNT(*),
        'sample_entity_ids', (ARRAY_AGG(vr.entity_id ORDER BY vr.entity_id))[1:20]
      ),
      NOW(),
      NOW()
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    LEFT JOIN previously_flagged pf
      ON pf.entity_type = vr.entity_type
      AND pf.entity_id = vr.entity_id
      AND pf.observation_name = vr.observation_name
      AND pf.category IS NOT DISTINCT FROM vr.category
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'review_type_shape'
      AND vr.category <> 'consistent'
      AND pf.entity_id IS NULL
    GROUP BY cur.run_id, cur.alert
    HAVING COUNT(*) > 0
    ;

    -- review_status_vs_delivery_mismatch
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'review_status_vs_delivery_mismatch',
      COUNT(*) || ' review(s) have a reportDeliveryDate but a status other than Complete',
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringReviews',
        'observation_name', 'review_status_vs_delivery',
        'count', COUNT(*),
        'sample_entity_ids', (ARRAY_AGG(vr.entity_id ORDER BY vr.entity_id))[1:20]
      ),
      NOW(),
      NOW()
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    LEFT JOIN previously_flagged pf
      ON pf.entity_type = vr.entity_type
      AND pf.entity_id = vr.entity_id
      AND pf.observation_name = vr.observation_name
      AND pf.category IS NOT DISTINCT FROM vr.category
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'review_status_vs_delivery'
      AND vr.category = 'delivered_not_complete'
      AND pf.entity_id IS NULL
    GROUP BY cur.run_id, cur.alert
    HAVING COUNT(*) > 0
    ;

    -- review_grantee_duplicated
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'review_grantee_duplicated',
      COUNT(*) || ' review(s) have a duplicated (review, grant) grantee link',
      cur.team_notification,
      jsonb_build_object(
        'entity_type', 'MonitoringReviews',
        'observation_name', 'review_grantee_duplicated',
        'count', COUNT(*),
        'sample_entity_ids', (ARRAY_AGG(vr.entity_id ORDER BY vr.entity_id))[1:20]
      ),
      NOW(),
      NOW()
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    LEFT JOIN previously_flagged pf
      ON pf.entity_type = vr.entity_type
      AND pf.entity_id = vr.entity_id
      AND pf.observation_name = vr.observation_name
      AND pf.category IS NOT DISTINCT FROM vr.category
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'review_grantee_duplicated'
      AND vr.category = 'duplicated'
      AND pf.entity_id IS NULL
    GROUP BY cur.run_id, cur.team_notification
    HAVING COUNT(*) > 0
    ;

    -- review_grantee_multi_grant
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'review_grantee_multi_grant',
      COUNT(*) || ' review(s) have a grantee link whose granteeId resolves to more than one grant',
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringReviews',
        'observation_name', 'review_grantee_multi_grant',
        'count', COUNT(*),
        'sample_entity_ids', (ARRAY_AGG(vr.entity_id ORDER BY vr.entity_id))[1:20]
      ),
      NOW(),
      NOW()
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    LEFT JOIN previously_flagged pf
      ON pf.entity_type = vr.entity_type
      AND pf.entity_id = vr.entity_id
      AND pf.observation_name = vr.observation_name
      AND pf.category IS NOT DISTINCT FROM vr.category
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'review_grantee_multi_grant'
      AND vr.category = 'grantee_multi_grant'
      AND pf.entity_id IS NULL
    GROUP BY cur.run_id, cur.alert
    HAVING COUNT(*) > 0
    ;

    -- finding_grant_not_on_own_review
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'finding_grant_not_on_own_review',
      COUNT(*) || ' finding(s) are attached to a grant not on any of their own reviews',
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'finding_grant_on_own_review',
        'count', COUNT(*),
        'sample_entity_ids', (ARRAY_AGG(vr.entity_id ORDER BY vr.entity_id))[1:20]
      ),
      NOW(),
      NOW()
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    LEFT JOIN previously_flagged pf
      ON pf.entity_type = vr.entity_type
      AND pf.entity_id = vr.entity_id
      AND pf.observation_name = vr.observation_name
      AND pf.category IS NOT DISTINCT FROM vr.category
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'finding_grant_on_own_review'
      AND vr.category = 'grant_not_on_own_review'
      AND pf.entity_id IS NULL
    GROUP BY cur.run_id, cur.alert
    HAVING COUNT(*) > 0
    ;

    -- finding_review_history_duplicated
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'finding_review_history_duplicated',
      COUNT(*) || ' finding(s) have disagreeing duplicate history rows for the same review',
      cur.team_notification,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'finding_review_history_duplicated',
        'count', COUNT(*),
        'sample_entity_ids', (ARRAY_AGG(vr.entity_id ORDER BY vr.entity_id))[1:20]
      ),
      NOW(),
      NOW()
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    LEFT JOIN previously_flagged pf
      ON pf.entity_type = vr.entity_type
      AND pf.entity_id = vr.entity_id
      AND pf.observation_name = vr.observation_name
      AND pf.category IS NOT DISTINCT FROM vr.category
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'finding_review_history_duplicated'
      AND vr.category = 'duplicated_disagreeing'
      AND pf.entity_id IS NULL
    GROUP BY cur.run_id, cur.team_notification
    HAVING COUNT(*) > 0
    ;

    -- finding_standard_missing
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'finding_standard_missing',
      COUNT(*) || ' finding(s) have no live standard at all',
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'finding_standard_missing',
        'count', COUNT(*),
        'sample_entity_ids', (ARRAY_AGG(vr.entity_id ORDER BY vr.entity_id))[1:20]
      ),
      NOW(),
      NOW()
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    LEFT JOIN previously_flagged pf
      ON pf.entity_type = vr.entity_type
      AND pf.entity_id = vr.entity_id
      AND pf.observation_name = vr.observation_name
      AND pf.category IS NOT DISTINCT FROM vr.category
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'finding_standard_missing'
      AND vr.category = 'no_live_standard'
      AND pf.entity_id IS NULL
    GROUP BY cur.run_id, cur.alert
    HAVING COUNT(*) > 0
    ;

    -- history_status_unresolvable / finding_status_unresolvable /
    -- review_status_unresolvable
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'history_status_unresolvable',
      COUNT(*) || ' finding(s) have a history statusId that does not resolve',
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'history_status_resolvable',
        'count', COUNT(*),
        'sample_entity_ids', (ARRAY_AGG(vr.entity_id ORDER BY vr.entity_id))[1:20]
      ),
      NOW(),
      NOW()
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    LEFT JOIN previously_flagged pf
      ON pf.entity_type = vr.entity_type
      AND pf.entity_id = vr.entity_id
      AND pf.observation_name = vr.observation_name
      AND pf.category IS NOT DISTINCT FROM vr.category
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'history_status_resolvable'
      AND vr.category = 'unresolvable'
      AND pf.entity_id IS NULL
    GROUP BY cur.run_id, cur.alert
    HAVING COUNT(*) > 0
    ;

    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'finding_status_unresolvable',
      COUNT(*) || ' finding(s) have a statusId that does not resolve',
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'finding_status_resolvable',
        'count', COUNT(*),
        'sample_entity_ids', (ARRAY_AGG(vr.entity_id ORDER BY vr.entity_id))[1:20]
      ),
      NOW(),
      NOW()
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    LEFT JOIN previously_flagged pf
      ON pf.entity_type = vr.entity_type
      AND pf.entity_id = vr.entity_id
      AND pf.observation_name = vr.observation_name
      AND pf.category IS NOT DISTINCT FROM vr.category
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'finding_status_resolvable'
      AND vr.category = 'unresolvable'
      AND pf.entity_id IS NULL
    GROUP BY cur.run_id, cur.alert
    HAVING COUNT(*) > 0
    ;

    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'review_status_unresolvable',
      COUNT(*) || ' review(s) have a statusId that does not resolve',
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringReviews',
        'observation_name', 'review_status_resolvable',
        'count', COUNT(*),
        'sample_entity_ids', (ARRAY_AGG(vr.entity_id ORDER BY vr.entity_id))[1:20]
      ),
      NOW(),
      NOW()
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    LEFT JOIN previously_flagged pf
      ON pf.entity_type = vr.entity_type
      AND pf.entity_id = vr.entity_id
      AND pf.observation_name = vr.observation_name
      AND pf.category IS NOT DISTINCT FROM vr.category
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'review_status_resolvable'
      AND vr.category = 'unresolvable'
      AND pf.entity_id IS NULL
    GROUP BY cur.run_id, cur.alert
    HAVING COUNT(*) > 0
    ;

    -- statuses_table_integrity_violated
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'statuses_table_integrity_violated',
      COUNT(*) || ' status table row(s) share a statusId with another live row',
      cur.alert,
      jsonb_build_object(
        'observation_name', 'statuses_table_integrity',
        'count', COUNT(*),
        'sample_entity_ids', (ARRAY_AGG(jsonb_build_object('entity_type', vr.entity_type, 'entity_id', vr.entity_id)))[1:20]
      ),
      NOW(),
      NOW()
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    LEFT JOIN previously_flagged pf
      ON pf.entity_type = vr.entity_type
      AND pf.entity_id = vr.entity_id
      AND pf.observation_name = vr.observation_name
      AND pf.category IS NOT DISTINCT FROM vr.category
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'statuses_table_integrity'
      AND vr.category = 'duplicate_live_status'
      AND pf.entity_id IS NULL
    GROUP BY cur.run_id, cur.alert
    HAVING COUNT(*) > 0
    ;

    -- review_grantee_orphaned_grant
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'review_grantee_orphaned_grant',
      COUNT(*) || ' review(s) have a grantee link with no matching live grant',
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringReviews',
        'observation_name', 'review_grantee_orphaned_grant',
        'count', COUNT(*),
        'sample_entity_ids', (ARRAY_AGG(vr.entity_id ORDER BY vr.entity_id))[1:20]
      ),
      NOW(),
      NOW()
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    LEFT JOIN previously_flagged pf
      ON pf.entity_type = vr.entity_type
      AND pf.entity_id = vr.entity_id
      AND pf.observation_name = vr.observation_name
      AND pf.category IS NOT DISTINCT FROM vr.category
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'review_grantee_orphaned_grant'
      AND vr.category = 'orphaned_grant_number'
      AND pf.entity_id IS NULL
    GROUP BY cur.run_id, cur.alert
    HAVING COUNT(*) > 0
    ;

    -- finding_standard_citation_text_disagrees
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'finding_standard_citation_text_disagrees',
      COUNT(*) || ' finding(s) have disagreeing citation text across their standards',
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'standard_consistency',
        'category', 'citation_text_disagrees',
        'count', COUNT(*),
        'sample_entity_ids', (ARRAY_AGG(vr.entity_id ORDER BY vr.entity_id))[1:20]
      ),
      NOW(),
      NOW()
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    LEFT JOIN previously_flagged pf
      ON pf.entity_type = vr.entity_type
      AND pf.entity_id = vr.entity_id
      AND pf.observation_name = vr.observation_name
      AND pf.category IS NOT DISTINCT FROM vr.category
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'standard_consistency'
      AND vr.category = 'citation_text_disagrees'
      AND pf.entity_id IS NULL
    GROUP BY cur.run_id, cur.alert
    HAVING COUNT(*) > 0
    ;

    -- finding_standard_category_disagrees
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'finding_standard_category_disagrees',
      COUNT(*) || ' finding(s) with no source have disagreeing category guidance across their standards',
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'standard_consistency',
        'category', 'category_disagrees_no_source',
        'count', COUNT(*),
        'sample_entity_ids', (ARRAY_AGG(vr.entity_id ORDER BY vr.entity_id))[1:20]
      ),
      NOW(),
      NOW()
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    LEFT JOIN previously_flagged pf
      ON pf.entity_type = vr.entity_type
      AND pf.entity_id = vr.entity_id
      AND pf.observation_name = vr.observation_name
      AND pf.category IS NOT DISTINCT FROM vr.category
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'standard_consistency'
      AND vr.category = 'category_disagrees_no_source'
      AND pf.entity_id IS NULL
    GROUP BY cur.run_id, cur.alert
    HAVING COUNT(*) > 0
    ;

    -- history_vs_finding_status_disagrees
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'history_vs_finding_status_disagrees',
      COUNT(*) || ' finding(s) have a Corrected history status but a finding-level status that disagrees',
      cur.team_notification,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'history_vs_finding_status',
        'count', COUNT(*),
        'sample_entity_ids', (ARRAY_AGG(vr.entity_id ORDER BY vr.entity_id))[1:20]
      ),
      NOW(),
      NOW()
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'history_vs_finding_status'
      AND vr.category = 'history_corrected_finding_disagrees'
      AND (vr.context->>'learned_at')::timestamptz >= (NOW() - INTERVAL '7 days')
    GROUP BY cur.run_id, cur.team_notification
    HAVING COUNT(*) > 0
    ;

    -- history_vs_outcome_disagrees
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'history_vs_outcome_disagrees',
      COUNT(*) || ' finding(s) have an open history status on a Compliant-outcome review',
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'history_vs_outcome',
        'count', COUNT(*),
        'sample_entity_ids', (ARRAY_AGG(vr.entity_id ORDER BY vr.entity_id))[1:20]
      ),
      NOW(),
      NOW()
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'history_vs_outcome'
      AND vr.category = 'open_status_on_compliant_review'
      AND (vr.context->>'learned_at')::timestamptz >= (NOW() - INTERVAL '7 days')
    GROUP BY cur.run_id, cur.alert
    HAVING COUNT(*) > 0
    ;
    `,
    { raw: true, transaction }
  );
};

export default refreshMonitoringAlerts;
