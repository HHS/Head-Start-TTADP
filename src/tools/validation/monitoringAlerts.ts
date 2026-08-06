import type { Transaction } from 'sequelize';
import { VALIDATION_PROCESS } from '../../constants';
import { sequelize } from '../../models';

/**
 * Rebuilds ValidationAlerts for the monitoring process: threshold checks over
 * ValidationTimeSeries and validity checks over the ValidationRecords
 * observations, both produced earlier in the same run. Alert "context" is
 * intentionally generic JSONB so each check can attach whatever contextual
 * information applies (previous values, entity id samples, etc.).
 *
 * The current run id is read from the validation_run temp table created by the
 * orchestrator (src/tools/validateMonitoringData.ts). The previous monitoring
 * run's alerts are deleted first (scoped through ValidationRuns.process_name
 * so other validation processes are untouched).
 *
 * Skeleton: two threshold checks and three observation-derived checks.
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
    -- month plus the twelve months preceding it
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
      AND period_start >= (date_trunc('month', NOW()) - INTERVAL '13 months')::date
      AND period_start < date_trunc('month', NOW())::date
    GROUP BY 1
    ;

    -- reviews_created_region_zero: regions with no reviews created over the
    -- last four complete weeks. Some times of year are naturally slow and a
    -- zero week for one region is not unusual, so this only alerts when the
    -- average four-week total across all regions is above 5 - meaning there is
    -- enough national activity that a silent region stands out. The region
    -- universe comes from Grants so regions with no time series rows at all
    -- still count as zero.
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

    -- findings_delivered_month_spike: the last complete month delivered more
    -- than 50% as many findings as the entire twelve months before it.
    -- Monitoring activity is spiky, but a single month approaching half a
    -- year's volume should not be normal.
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

    -- finding_category_missing: findings on delivered reviews with no category
    -- (neither source nor standard guidance). One aggregate alert; individual
    -- entities are inspectable in ValidationRecords (observation_name =
    -- 'category', category IS NULL).
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'finding_category_missing',
      COUNT(*) || ' finding(s) on delivered reviews have no category',
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
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'category'
      AND vr.category IS NULL
    GROUP BY cur.run_id
    HAVING COUNT(*) > 0
    ;

    -- review_delivery_report_lag: reviews where the delivery date showed up in
    -- the imported data more than 7 calendar days after the delivery date
    -- itself. One aggregate alert; entities inspectable in ValidationRecords
    -- (observation_name = 'delivery_report_lag_days').
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
    GROUP BY cur.run_id
    HAVING COUNT(*) > 0
    ;

    -- finding_active_with_closed_date: findings marked Active that carry a
    -- closedDate. One aggregate alert; entities inspectable in
    -- ValidationRecords (observation_name = 'closure_state').
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'finding_active_with_closed_date',
      COUNT(*) || ' active monitoring finding(s) have a closedDate',
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'closure_state',
        'category', 'active_with_closed_date',
        'count', COUNT(*),
        'sample_entity_ids', (ARRAY_AGG(vr.entity_id ORDER BY vr.entity_id))[1:20]
      ),
      NOW(),
      NOW()
    FROM "ValidationRecords" vr
    CROSS JOIN validation_run cur
    WHERE vr.run_id = cur.run_id
      AND vr.observation_name = 'closure_state'
      AND vr.category = 'active_with_closed_date'
    GROUP BY cur.run_id
    HAVING COUNT(*) > 0
    ;
    `,
    { raw: true, transaction }
  );
};

export default refreshMonitoringAlerts;
