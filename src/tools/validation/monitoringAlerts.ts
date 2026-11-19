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
    -- is partial and would always false-alarm. current_week_start/
    -- current_month_start/last_complete_week/last_complete_month come from
    -- validation_params (built by updateMonitoringTimeSeries, earlier this
    -- run) rather than being recomputed here.

    -- Weekly review-creation totals per region over the last four complete weeks
    DROP TABLE IF EXISTS weekly_reviews;
    CREATE TEMP TABLE weekly_reviews
    AS
    SELECT
      region_id,
      period_start,
      SUM(value) total
    FROM "ValidationTimeSeries"
    CROSS JOIN validation_params vp
    WHERE feature_set = 'monitoring_reviews'
      AND period_type = 'week'
      AND stat_name = 'reviews_created'
      AND period_start >= (vp.current_week_start - INTERVAL '4 weeks')::date
      AND period_start < vp.current_week_start
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
    CROSS JOIN validation_params vp
    WHERE feature_set = 'monitoring_findings'
      AND period_type = 'month'
      AND stat_name = 'findings_delivered'
      AND region_id = 0
      AND period_start >= (vp.current_month_start - INTERVAL '13 months')::date
      AND period_start < vp.current_month_start
    GROUP BY 1
    ;

    -- National Deficiency-type findings-delivered totals per month, same
    -- window as monthly_findings above.
    DROP TABLE IF EXISTS monthly_findings_deficiency;
    CREATE TEMP TABLE monthly_findings_deficiency
    AS
    SELECT
      period_start,
      SUM(value) total
    FROM "ValidationTimeSeries"
    CROSS JOIN validation_params vp
    WHERE feature_set = 'monitoring_findings'
      AND period_type = 'month'
      AND stat_name = 'findings_delivered_deficiency'
      AND region_id = 0
      AND period_start >= (vp.current_month_start - INTERVAL '13 months')::date
      AND period_start < vp.current_month_start
    GROUP BY 1
    ;

    -- National finding-closure totals per month, same window.
    DROP TABLE IF EXISTS monthly_closures;
    CREATE TEMP TABLE monthly_closures
    AS
    SELECT
      period_start,
      SUM(value) total
    FROM "ValidationTimeSeries"
    CROSS JOIN validation_params vp
    WHERE feature_set = 'monitoring_finding_closure'
      AND period_type = 'month'
      AND stat_name = 'closure_count'
      AND region_id = 0
      AND period_start >= (vp.current_month_start - INTERVAL '13 months')::date
      AND period_start < vp.current_month_start
    GROUP BY 1
    ;

    -- finding_live_id: findingId -> its current live MonitoringFindings.id.
    -- DISTINCT ON guards against duplicate-live-row fan-out.
    DROP TABLE IF EXISTS pg_temp.finding_live_id;
    CREATE TEMP TABLE finding_live_id
    ON COMMIT DROP
    AS
    SELECT DISTINCT ON (mf."findingId")
      mf."findingId",
      mf.id
    FROM "MonitoringFindings" mf
    WHERE mf."sourceDeletedAt" IS NULL
      AND mf."deletedAt" IS NULL
    ORDER BY mf."findingId", mf.id DESC
    ;

    -- finding_identity: shared citation-text / initial-review-name lookup for
    -- finding-based alert messages below. Citations.mfid is unique, so this
    -- is a plain lookup, not a dedupe.
    DROP TABLE IF EXISTS pg_temp.finding_identity;
    CREATE TEMP TABLE finding_identity
    ON COMMIT DROP
    AS
    SELECT
      c.mfid id,
      c.citation,
      dr.review_name
    FROM "Citations" c
    LEFT JOIN "DeliveredReviews" dr
      ON dr.review_uuid = c.initial_review_uuid
    ;

    -- previously_flagged: (entity_type, entity_id, observation_name, category)
    -- combinations already true as of the previous cycle's run - the "since
    -- previous cycle" alert window (see docs/monitoring-data-validation.md,
    -- Conventions). A real temp table, not a CTE, since it's reused across
    -- every INSERT below, each its own top-level statement. For
    -- MonitoringFindings rows, entity_id is translated forward to today's
    -- live id for the same findingId - import jitter can source-delete and
    -- reinsert a finding under a new id with nothing about the finding
    -- itself changed, which would otherwise make it look newly flagged.
    --
    -- Also anti-joined by threshold checks with no real backing entity
    -- (entity_type 'ValidationThresholdCheck') - see threshold_flagged below.
    DROP TABLE IF EXISTS pg_temp.previously_flagged;
    CREATE TEMP TABLE previously_flagged
    ON COMMIT DROP
    AS
    SELECT
      prev.entity_type,
      COALESCE(fli.id, prev.entity_id) entity_id,
      prev.observation_name,
      prev.category
    FROM "ValidationRecords" prev
    CROSS JOIN monitoring_validation_cycles cyc
    LEFT JOIN "MonitoringFindings" old_mf
      ON prev.entity_type = 'MonitoringFindings'
      AND old_mf.id = prev.entity_id
    LEFT JOIN finding_live_id fli
      ON fli."findingId" = old_mf."findingId"
    WHERE prev.run_id = cyc.prev_cycle_run_id
    ;

    -- threshold_flagged: (check_name, entity_id, category, detail) rows for
    -- every threshold check below with no real backing entity - entity_id is
    -- a region_id, or 0 for a single national condition; detail carries
    -- whatever a check's own message/context needs so it isn't recomputed
    -- twice. Shared across checks so the ValidationRecords marker insert at
    -- the end of this file is written once, not once per check.
    DROP TABLE IF EXISTS pg_temp.threshold_flagged;
    CREATE TEMP TABLE threshold_flagged (
      check_name TEXT,
      entity_id INTEGER,
      category TEXT,
      detail JSONB
    ) ON COMMIT DROP;

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
    INSERT INTO threshold_flagged (check_name, entity_id, category, detail)
    SELECT
      'reviews_created_region_zero',
      rt.region_id,
      'zero_reviews',
      jsonb_build_object('cross_region_avg', ROUND(cr.avg_total, 2))
    FROM region_totals rt
    CROSS JOIN cross_region cr
    WHERE cr.avg_total > 5
      AND rt.total = 0
    ;

    INSERT INTO "ValidationAlerts" (run_id, check_name, message, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'reviews_created_region_zero',
      'Region ' || tf.entity_id
        || ' created no monitoring reviews in the last four complete weeks',
      jsonb_build_object(
        'feature_set', 'monitoring_reviews',
        'stat_name', 'reviews_created',
        'region_id', tf.entity_id,
        'window_weeks', 4,
        'value', 0,
        'cross_region_avg', tf.detail->'cross_region_avg'
      ),
      NOW(),
      NOW()
    FROM threshold_flagged tf
    CROSS JOIN validation_run cur
    LEFT JOIN previously_flagged pf
      ON pf.entity_type = 'ValidationThresholdCheck'
      AND pf.entity_id = tf.entity_id
      AND pf.observation_name = tf.check_name
      AND pf.category IS NOT DISTINCT FROM tf.category
    WHERE tf.check_name = 'reviews_created_region_zero'
      AND pf.entity_id IS NULL
    ;

    -- findings_delivered_month_spike
    WITH last_month AS (
    SELECT COALESCE(SUM(total), 0) total
    FROM monthly_findings mf
    CROSS JOIN validation_params vp
    WHERE mf.period_start = vp.last_complete_month
    ),
    previous_year AS (
    SELECT COALESCE(SUM(total), 0) total
    FROM monthly_findings mf
    CROSS JOIN validation_params vp
    WHERE mf.period_start < vp.last_complete_month
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'findings_delivered_month_spike',
      'Findings delivered in the last complete month exceeded 50% of the entire previous year',
      jsonb_build_object(
        'feature_set', 'monitoring_findings',
        'stat_name', 'findings_delivered',
        'period_start', vp.last_complete_month,
        'value', lm.total,
        'previous_year_total', py.total
      ),
      NOW(),
      NOW()
    FROM last_month lm
    CROSS JOIN previous_year py
    CROSS JOIN validation_run cur
    CROSS JOIN validation_params vp
    WHERE py.total > 0
      AND lm.total > 0.5 * py.total
    ;

    -- findings_delivered_deficiency_month_spike
    WITH last_month AS (
    SELECT COALESCE(SUM(total), 0) total
    FROM monthly_findings_deficiency mf
    CROSS JOIN validation_params vp
    WHERE mf.period_start = vp.last_complete_month
    ),
    previous_year AS (
    SELECT COALESCE(SUM(total), 0) total
    FROM monthly_findings_deficiency mf
    CROSS JOIN validation_params vp
    WHERE mf.period_start < vp.last_complete_month
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'findings_delivered_deficiency_month_spike',
      'Deficiency findings delivered in the last complete month exceeded 50% of the entire previous year',
      jsonb_build_object(
        'feature_set', 'monitoring_findings',
        'stat_name', 'findings_delivered_deficiency',
        'period_start', vp.last_complete_month,
        'value', lm.total,
        'previous_year_total', py.total
      ),
      NOW(),
      NOW()
    FROM last_month lm
    CROSS JOIN previous_year py
    CROSS JOIN validation_run cur
    CROSS JOIN validation_params vp
    WHERE py.total > 0
      AND lm.total > 0.5 * py.total
    ;

    -- finding_closure_month_spike
    WITH last_month AS (
    SELECT COALESCE(SUM(total), 0) total
    FROM monthly_closures mc
    CROSS JOIN validation_params vp
    WHERE mc.period_start = vp.last_complete_month
    ),
    previous_year AS (
    SELECT COALESCE(SUM(total), 0) total
    FROM monthly_closures mc
    CROSS JOIN validation_params vp
    WHERE mc.period_start < vp.last_complete_month
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'finding_closure_month_spike',
      'Findings closed in the last complete month exceeded 50% of the entire previous year',
      jsonb_build_object(
        'feature_set', 'monitoring_finding_closure',
        'stat_name', 'closure_count',
        'period_start', vp.last_complete_month,
        'value', lm.total,
        'previous_year_total', py.total
      ),
      NOW(),
      NOW()
    FROM last_month lm
    CROSS JOIN previous_year py
    CROSS JOIN validation_run cur
    CROSS JOIN validation_params vp
    WHERE py.total > 0
      AND lm.total > 0.5 * py.total
    ;

    -- finding_closure_stalled. Backlog checked live against Citations.active,
    -- not a stored measure - it's a gate on this one check, not a value
    -- worth trending. entity_id is 0: a single national condition, not
    -- split per entity.
    WITH recent_closures AS (
    SELECT COALESCE(SUM(total), 0) total
    FROM monthly_closures mc
    CROSS JOIN validation_params vp
    WHERE mc.period_start >= (vp.current_month_start - INTERVAL '2 months')::date
    ),
    open_backlog AS (
    SELECT COUNT(*) total
    FROM "Citations"
    WHERE active
      AND "deletedAt" IS NULL
    )
    INSERT INTO threshold_flagged (check_name, entity_id, category, detail)
    SELECT
      'finding_closure_stalled',
      0,
      'stalled',
      jsonb_build_object('open_backlog', ob.total)
    FROM recent_closures rc
    CROSS JOIN open_backlog ob
    WHERE rc.total = 0
      AND ob.total > 20
    ;

    INSERT INTO "ValidationAlerts" (run_id, check_name, message, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'finding_closure_stalled',
      'No findings were closed nationally in the last 2 complete months',
      jsonb_build_object(
        'feature_set', 'monitoring_finding_closure',
        'stat_name', 'closure_count',
        'window_months', 2,
        'value', 0,
        'open_backlog', tf.detail->'open_backlog'
      ),
      NOW(),
      NOW()
    FROM threshold_flagged tf
    CROSS JOIN validation_run cur
    LEFT JOIN previously_flagged pf
      ON pf.entity_type = 'ValidationThresholdCheck'
      AND pf.entity_id = tf.entity_id
      AND pf.observation_name = tf.check_name
      AND pf.category IS NOT DISTINCT FROM tf.category
    WHERE tf.check_name = 'finding_closure_stalled'
      AND pf.entity_id IS NULL
    ;

    -- import_lag_zscore_elevated / source_lag_zscore_elevated /
    -- completion_gap_zscore_elevated
    WITH latest AS (
    SELECT
      MAX(value) FILTER (WHERE stat_name = 'import_lag_elevated_z') z,
      MAX(value) FILTER (WHERE stat_name = 'import_lag_elevated_count') elevated_count,
      MAX(value) FILTER (WHERE stat_name = 'import_lag_sample_count') sample_count
    FROM "ValidationTimeSeries"
    CROSS JOIN validation_params vp
    WHERE feature_set = 'monitoring_report_delivery'
      AND period_type = 'week'
      AND region_id = 0
      AND period_start = vp.last_complete_week
      AND stat_name IN ('import_lag_elevated_z', 'import_lag_elevated_count', 'import_lag_sample_count')
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'import_lag_zscore_elevated',
      l.elevated_count || ' of ' || l.sample_count
        || ' reviews delivered in the last complete week had a gap between reportDeliveryDate '
        || 'and arrival in TTA Hub of over 7 days',
      jsonb_build_object(
        'feature_set', 'monitoring_report_delivery',
        'stat_name', 'import_lag_elevated_z',
        'period_start', vp.last_complete_week,
        'z_score', l.z,
        'elevated_count', l.elevated_count,
        'sample_count', l.sample_count
      ),
      NOW(),
      NOW()
    FROM latest l
    CROSS JOIN validation_run cur
    CROSS JOIN validation_params vp
    WHERE l.z > 2
    ;

    WITH latest AS (
    SELECT
      MAX(value) FILTER (WHERE stat_name = 'source_lag_elevated_z') z,
      MAX(value) FILTER (WHERE stat_name = 'source_lag_elevated_count') elevated_count,
      MAX(value) FILTER (WHERE stat_name = 'source_lag_sample_count') sample_count
    FROM "ValidationTimeSeries"
    CROSS JOIN validation_params vp
    WHERE feature_set = 'monitoring_report_delivery'
      AND period_type = 'week'
      AND region_id = 0
      AND period_start = vp.last_complete_week
      AND stat_name IN ('source_lag_elevated_z', 'source_lag_elevated_count', 'source_lag_sample_count')
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'source_lag_zscore_elevated',
      l.elevated_count || ' of ' || l.sample_count
        || ' reviews delivered in the last complete week had a gap between reportDeliveryDate '
        || 'and the upstream datestamp marking when it was applied to the review of over 5 days',
      jsonb_build_object(
        'feature_set', 'monitoring_report_delivery',
        'stat_name', 'source_lag_elevated_z',
        'period_start', vp.last_complete_week,
        'z_score', l.z,
        'elevated_count', l.elevated_count,
        'sample_count', l.sample_count
      ),
      NOW(),
      NOW()
    FROM latest l
    CROSS JOIN validation_run cur
    CROSS JOIN validation_params vp
    WHERE l.z > 2
    ;

    WITH latest AS (
    SELECT
      MAX(value) FILTER (WHERE stat_name = 'completion_gap_elevated_z') z,
      MAX(value) FILTER (WHERE stat_name = 'completion_gap_elevated_count') elevated_count,
      MAX(value) FILTER (WHERE stat_name = 'completion_gap_sample_count') sample_count
    FROM "ValidationTimeSeries"
    CROSS JOIN validation_params vp
    WHERE feature_set = 'monitoring_report_delivery'
      AND period_type = 'week'
      AND region_id = 0
      AND period_start = vp.last_complete_week
      AND stat_name IN ('completion_gap_elevated_z', 'completion_gap_elevated_count', 'completion_gap_sample_count')
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'completion_gap_zscore_elevated',
      l.elevated_count || ' of ' || l.sample_count
        || ' reviews delivered in the last complete week had a gap between being marked Complete '
        || 'and the upstream datestamp marking when reportDeliveryDate was applied to the review '
        || 'of over 2 days',
      jsonb_build_object(
        'feature_set', 'monitoring_report_delivery',
        'stat_name', 'completion_gap_elevated_z',
        'period_start', vp.last_complete_week,
        'z_score', l.z,
        'elevated_count', l.elevated_count,
        'sample_count', l.sample_count
      ),
      NOW(),
      NOW()
    FROM latest l
    CROSS JOIN validation_run cur
    CROSS JOIN validation_params vp
    WHERE l.z > 2
    ;

    -- review_lag_region_week_all_elevated. Reuses report_delivery_first_set/
    -- review_complete_first_set, built earlier this run by
    -- updateMonitoringTimeSeries.
    WITH region_week AS (
    SELECT
      gr."regionId" region_id,
      COUNT(DISTINCT mr.id) n,
      COUNT(DISTINCT mr.id) FILTER (
        WHERE (fds.set_date - mr."reportDeliveryDate"::date > 7)
          OR (fds.source_set_date - mr."reportDeliveryDate"::date > 5)
          OR (rcfs.data_id IS NOT NULL AND ABS(fds.source_set_date - rcfs.complete_date) > 2)
      ) n_elevated
    FROM "MonitoringReviews" mr
    CROSS JOIN validation_params vp
    JOIN report_delivery_first_set fds
      ON fds.data_id = mr.id
    JOIN "MonitoringReviewGrantees" mrg
      ON mrg."reviewId" = mr."reviewId"
      AND mrg."sourceDeletedAt" IS NULL
      AND mrg."deletedAt" IS NULL
    JOIN "Grants" gr
      ON gr.number = mrg."grantNumber"
      AND NOT gr.deleted
    LEFT JOIN review_complete_first_set rcfs
      ON rcfs.data_id = mr.id
    WHERE mr."sourceDeletedAt" IS NULL
      AND mr."deletedAt" IS NULL
      AND mr."reportDeliveryDate" IS NOT NULL
      AND date_trunc('week', mr."reportDeliveryDate")::date = vp.last_complete_week
    GROUP BY 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'review_lag_region_week_all_elevated',
      'Region ' || rw.region_id || ': all ' || rw.n
        || ' review(s) delivered in the last complete week had an elevated gap on at least one of: '
        || 'reportDeliveryDate to arrival in TTA Hub, reportDeliveryDate to the upstream datestamp '
        || 'marking when it was applied, or being marked Complete to that same upstream datestamp',
      jsonb_build_object(
        'region_id', rw.region_id,
        'period_start', vp.last_complete_week,
        'review_count', rw.n
      ),
      NOW(),
      NOW()
    FROM region_week rw
    CROSS JOIN validation_run cur
    CROSS JOIN validation_params vp
    WHERE rw.n >= 2
      AND rw.n = rw.n_elevated
    ;

    -- citation_new_values_unlikely. The trailing rate is smoothed
    -- ((k + 1) / (n + 2)) on purpose: a year with no new values must still
    -- give a nonzero rate, or ln(p) fails.
    WITH weeks AS (
    SELECT
      period_start,
      MAX(value) FILTER (WHERE stat_name = 'citations_delivered') n,
      MAX(value) FILTER (WHERE stat_name = 'citations_with_new_value') k
    FROM "ValidationTimeSeries"
    CROSS JOIN validation_params vp
    WHERE feature_set = 'monitoring_citations'
      AND period_type = 'week'
      AND region_id = 0
      AND stat_name IN ('citations_delivered', 'citations_with_new_value')
      AND period_start >= (vp.last_complete_week - INTERVAL '52 weeks')::date
      AND period_start <= vp.last_complete_week
    GROUP BY 1
    ),
    latest AS (
    SELECT w.n::int n, w.k::int k
    FROM weeks w
    CROSS JOIN validation_params vp
    WHERE w.period_start = vp.last_complete_week
      AND w.k >= 3
    ),
    rate AS (
    SELECT (SUM(w.k) + 1)::float8 / (SUM(w.n) + 2) p
    FROM weeks w
    CROSS JOIN validation_params vp
    WHERE w.period_start < vp.last_complete_week
      AND w.k IS NOT NULL
    ),
    ln_factorial AS (
    SELECT i, SUM(ln(GREATEST(i, 1)::float8)) OVER (ORDER BY i) lf
    FROM latest l
    CROSS JOIN generate_series(0, l.n) i
    ),
    -- Terms below e^-700 are dropped rather than passed to exp(), which
    -- raises an underflow error instead of returning 0; they can't move the
    -- sum near the 0.001 threshold.
    tail AS (
    SELECT SUM(CASE WHEN t.ln_term < -700 THEN 0 ELSE exp(t.ln_term) END) p_tail
    FROM latest l
    CROSS JOIN rate r
    JOIN ln_factorial fj
      ON fj.i >= l.k
    JOIN ln_factorial fn
      ON fn.i = l.n
    JOIN ln_factorial fnj
      ON fnj.i = l.n - fj.i
    CROSS JOIN LATERAL (
      SELECT fn.lf - fj.lf - fnj.lf + fj.i * ln(r.p) + (l.n - fj.i) * ln(1 - r.p) ln_term
    ) t
    ),
    new_values AS (
    SELECT c.citation
    FROM "Citations" c
    WHERE c."deletedAt" IS NULL
      AND c.initial_report_delivery_date IS NOT NULL
    GROUP BY c.citation
    HAVING date_trunc('week', MIN(c.initial_report_delivery_date))::date
      = (SELECT last_complete_week FROM validation_params)
    ),
    examples AS (
    SELECT string_agg(citation, ', ' ORDER BY citation) list
    FROM (SELECT citation FROM new_values ORDER BY citation LIMIT 2) e
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'citation_new_values_unlikely',
      l.k || ' of ' || l.n
        || ' citations delivered in the last complete week cite a value not seen before (e.g. '
        || COALESCE(ex.list, 'unknown') || ')',
      jsonb_build_object(
        'feature_set', 'monitoring_citations',
        'stat_name', 'citations_with_new_value',
        'period_start', vp.last_complete_week,
        'value', l.k,
        'citations_delivered', l.n,
        'trailing_rate', ROUND(r.p::numeric, 4),
        'probability', t.p_tail,
        'distinct_new_values', (SELECT COUNT(*) FROM new_values)
      ),
      NOW(),
      NOW()
    FROM latest l
    CROSS JOIN rate r
    CROSS JOIN tail t
    CROSS JOIN examples ex
    CROSS JOIN validation_run cur
    CROSS JOIN validation_params vp
    WHERE t.p_tail < 0.001
    ;

    -- citation_status_changes_zscore_elevated. Reuses citation_status_changes,
    -- built earlier this run by updateMonitoringTimeSeries.
    WITH latest AS (
    SELECT
      MAX(value) FILTER (WHERE stat_name = 'status_changes_z') z,
      MAX(value) FILTER (WHERE stat_name = 'status_changes') changed
    FROM "ValidationTimeSeries"
    CROSS JOIN validation_params vp
    WHERE feature_set = 'monitoring_citations'
      AND period_type = 'week'
      AND region_id = 0
      AND period_start = vp.last_complete_week
      AND stat_name IN ('status_changes_z', 'status_changes')
    ),
    examples AS (
    SELECT string_agg(
      COALESCE(e.citation, 'unknown') || ' from ' || COALESCE(e.prev_status, 'no status')
        || ' to ' || COALESCE(e.calculated_status, 'no status'),
      ', ' ORDER BY e.citation, e.citation_id
    ) list
    FROM (
      SELECT DISTINCT ON (sc.citation_id)
        sc.citation_id,
        c.citation,
        sc.prev_status,
        sc.calculated_status
      FROM citation_status_changes sc
      CROSS JOIN validation_params vp
      LEFT JOIN "Citations" c
        ON c.id = sc.citation_id
      WHERE sc.period_start = vp.last_complete_week
      ORDER BY sc.citation_id, sc.changed_at DESC
      LIMIT 2
    ) e
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'citation_status_changes_zscore_elevated',
      COALESCE(l.changed, 0)::int || ' citations changed status in the last complete week (e.g. '
        || COALESCE(ex.list, 'unknown') || ')',
      CASE WHEN l.z > 3 THEN cur.alert ELSE cur.team_notification END,
      jsonb_build_object(
        'feature_set', 'monitoring_citations',
        'stat_name', 'status_changes_z',
        'period_start', vp.last_complete_week,
        'z_score', l.z,
        'value', l.changed
      ),
      NOW(),
      NOW()
    FROM latest l
    CROSS JOIN examples ex
    CROSS JOIN validation_run cur
    CROSS JOIN validation_params vp
    WHERE l.z > 2
    ;

    -- finding_category_missing. IS NOT DISTINCT FROM, not =, in the
    -- previously_flagged join: this check's category can be NULL.
    WITH flagged AS (
      SELECT vr.entity_id
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
    ),
    sample AS (
      SELECT
        (SELECT COUNT(*) FROM flagged) cnt,
        f.entity_id mfid,
        fi.citation,
        fi.review_name
      FROM flagged f
      LEFT JOIN finding_identity fi
        ON fi.id = f.entity_id
      ORDER BY f.entity_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'finding_category_missing',
      'Citation ' || COALESCE(s.citation, 'unknown') || '(' || s.mfid || ') on '
        || COALESCE(s.review_name, 'an unnamed review') || ' has no category.'
        || CASE WHEN s.cnt > 1
          THEN ' There are ' || s.cnt || ' examples of this alert condition.'
          ELSE ''
        END,
      cur.team_notification,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'category',
        'count', s.cnt,
        'sample_entity_ids', (SELECT (ARRAY_AGG(entity_id ORDER BY entity_id))[1:20] FROM flagged)
      ),
      NOW(),
      NOW()
    FROM sample s
    CROSS JOIN validation_run cur
    WHERE s.cnt > 0
    ;

    -- review_delivery_report_lag
    WITH flagged AS (
      SELECT vr.entity_id, vr.scalar, vr.context->>'learned_date' learned_date
      FROM "ValidationRecords" vr
      CROSS JOIN validation_run cur
      WHERE vr.run_id = cur.run_id
        AND vr.observation_name = 'delivery_report_lag_days'
        AND vr.scalar > 7
        AND (vr.context->>'learned_date')::date >= (CURRENT_DATE - INTERVAL '3 days')
    ),
    sample AS (
      SELECT
        (SELECT COUNT(*) FROM flagged) cnt,
        f.scalar max_lag_days,
        f.learned_date,
        dr.review_name,
        dr.report_delivery_date
      FROM flagged f
      LEFT JOIN "DeliveredReviews" dr
        ON dr.mrid = f.entity_id
      ORDER BY f.scalar DESC, f.entity_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'review_delivery_report_lag',
      'Review ' || COALESCE(s.review_name, 'an unnamed review') || ' reported a delivery date of '
        || COALESCE(s.report_delivery_date::text, 'an invalid date')
        || ' but that date did not reach TTA Hub until ' || s.learned_date
        || ', ' || s.max_lag_days || ' days later.'
        || CASE WHEN s.cnt > 1
          THEN ' There are ' || s.cnt || ' examples of this alert condition.'
          ELSE ''
        END,
      jsonb_build_object(
        'entity_type', 'MonitoringReviews',
        'observation_name', 'delivery_report_lag_days',
        'threshold_days', 7,
        'count', s.cnt,
        'max_lag_days', s.max_lag_days,
        'sample_entity_ids', (SELECT (ARRAY_AGG(entity_id ORDER BY scalar DESC))[1:20] FROM flagged)
      ),
      NOW(),
      NOW()
    FROM sample s
    CROSS JOIN validation_run cur
    WHERE s.cnt > 0
    ;

    -- history_determination_unrecognized. review_uuid comes straight from the
    -- observation's own context (set in monitoringObservations.ts) - the
    -- review the unrecognized determination actually came from.
    WITH flagged AS (
      SELECT vr.entity_id, vr.category determination, vr.context->>'review_uuid' review_uuid
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
    ),
    sample AS (
      SELECT
        (SELECT COUNT(*) FROM flagged) cnt,
        f.entity_id mfid,
        f.determination,
        c.citation,
        dr.review_name
      FROM flagged f
      LEFT JOIN "Citations" c
        ON c.mfid = f.entity_id
      LEFT JOIN "DeliveredReviews" dr
        ON dr.review_uuid = f.review_uuid
      ORDER BY f.entity_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'history_determination_unrecognized',
      'Citation ' || COALESCE(s.citation, 'unknown') || '(' || s.mfid || ') on '
        || COALESCE(s.review_name, 'an unnamed review') || ' has an unrecognized determination value ('
        || COALESCE(s.determination, 'unknown') || ') in its linking history record.'
        || CASE WHEN s.cnt > 1
          THEN ' There are ' || s.cnt || ' examples of this alert condition.'
          ELSE ''
        END,
      cur.team_notification,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'history_determination_recognized',
        'count', s.cnt,
        'distinct_values', (SELECT (ARRAY_AGG(DISTINCT determination))[1:20] FROM flagged),
        'sample_entity_ids', (SELECT (ARRAY_AGG(entity_id ORDER BY entity_id))[1:20] FROM flagged)
      ),
      NOW(),
      NOW()
    FROM sample s
    CROSS JOIN validation_run cur
    WHERE s.cnt > 0
    ;

    -- review_type_shape_violation
    WITH flagged AS (
      SELECT vr.entity_id
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
    ),
    sample AS (
      SELECT
        (SELECT COUNT(*) FROM flagged) cnt,
        dr.review_name
      FROM flagged f
      LEFT JOIN "DeliveredReviews" dr
        ON dr.mrid = f.entity_id
      ORDER BY f.entity_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'review_type_shape_violation',
      'Review ' || COALESCE(s.review_name, 'an unnamed review')
        || ' mixes CLASS and finding-based review shapes unexpectedly.'
        || CASE WHEN s.cnt > 1
          THEN ' There are ' || s.cnt || ' examples of this alert condition.'
          ELSE ''
        END,
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringReviews',
        'observation_name', 'review_type_shape',
        'count', s.cnt,
        'sample_entity_ids', (SELECT (ARRAY_AGG(entity_id ORDER BY entity_id))[1:20] FROM flagged)
      ),
      NOW(),
      NOW()
    FROM sample s
    CROSS JOIN validation_run cur
    WHERE s.cnt > 0
    ;

    -- review_status_vs_delivery_mismatch
    WITH flagged AS (
      SELECT vr.entity_id
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
    ),
    sample AS (
      SELECT
        (SELECT COUNT(*) FROM flagged) cnt,
        dr.review_name
      FROM flagged f
      LEFT JOIN "DeliveredReviews" dr
        ON dr.mrid = f.entity_id
      ORDER BY f.entity_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'review_status_vs_delivery_mismatch',
      'Review ' || COALESCE(s.review_name, 'an unnamed review')
        || ' has a reportDeliveryDate but a status other than Complete.'
        || CASE WHEN s.cnt > 1
          THEN ' There are ' || s.cnt || ' examples of this alert condition.'
          ELSE ''
        END,
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringReviews',
        'observation_name', 'review_status_vs_delivery',
        'count', s.cnt,
        'sample_entity_ids', (SELECT (ARRAY_AGG(entity_id ORDER BY entity_id))[1:20] FROM flagged)
      ),
      NOW(),
      NOW()
    FROM sample s
    CROSS JOIN validation_run cur
    WHERE s.cnt > 0
    ;

    -- review_grantee_duplicated
    WITH flagged AS (
      SELECT vr.entity_id
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
    ),
    sample AS (
      SELECT
        (SELECT COUNT(*) FROM flagged) cnt,
        dr.review_name
      FROM flagged f
      LEFT JOIN "DeliveredReviews" dr
        ON dr.mrid = f.entity_id
      ORDER BY f.entity_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'review_grantee_duplicated',
      'Review ' || COALESCE(s.review_name, 'an unnamed review')
        || ' has a duplicated (review, grant) grantee link.'
        || CASE WHEN s.cnt > 1
          THEN ' There are ' || s.cnt || ' examples of this alert condition.'
          ELSE ''
        END,
      cur.team_notification,
      jsonb_build_object(
        'entity_type', 'MonitoringReviews',
        'observation_name', 'review_grantee_duplicated',
        'count', s.cnt,
        'sample_entity_ids', (SELECT (ARRAY_AGG(entity_id ORDER BY entity_id))[1:20] FROM flagged)
      ),
      NOW(),
      NOW()
    FROM sample s
    CROSS JOIN validation_run cur
    WHERE s.cnt > 0
    ;

    -- review_grantee_multi_grant
    WITH flagged AS (
      SELECT vr.entity_id
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
    ),
    sample AS (
      SELECT
        (SELECT COUNT(*) FROM flagged) cnt,
        dr.review_name
      FROM flagged f
      LEFT JOIN "DeliveredReviews" dr
        ON dr.mrid = f.entity_id
      ORDER BY f.entity_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'review_grantee_multi_grant',
      'Review ' || COALESCE(s.review_name, 'an unnamed review')
        || ' has a grantee link whose granteeId resolves to more than one grant.'
        || CASE WHEN s.cnt > 1
          THEN ' There are ' || s.cnt || ' examples of this alert condition.'
          ELSE ''
        END,
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringReviews',
        'observation_name', 'review_grantee_multi_grant',
        'count', s.cnt,
        'sample_entity_ids', (SELECT (ARRAY_AGG(entity_id ORDER BY entity_id))[1:20] FROM flagged)
      ),
      NOW(),
      NOW()
    FROM sample s
    CROSS JOIN validation_run cur
    WHERE s.cnt > 0
    ;

    -- finding_grant_not_on_own_review
    WITH flagged AS (
      SELECT vr.entity_id
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
    ),
    sample AS (
      SELECT
        (SELECT COUNT(*) FROM flagged) cnt,
        f.entity_id mfid,
        fi.citation,
        fi.review_name
      FROM flagged f
      LEFT JOIN finding_identity fi
        ON fi.id = f.entity_id
      ORDER BY f.entity_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'finding_grant_not_on_own_review',
      'Citation ' || COALESCE(s.citation, 'unknown') || '(' || s.mfid || ') on '
        || COALESCE(s.review_name, 'an unnamed review') || ' is attached to a grant not on any of its own reviews.'
        || CASE WHEN s.cnt > 1
          THEN ' There are ' || s.cnt || ' examples of this alert condition.'
          ELSE ''
        END,
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'finding_grant_on_own_review',
        'count', s.cnt,
        'sample_entity_ids', (SELECT (ARRAY_AGG(entity_id ORDER BY entity_id))[1:20] FROM flagged)
      ),
      NOW(),
      NOW()
    FROM sample s
    CROSS JOIN validation_run cur
    WHERE s.cnt > 0
    ;

    -- finding_review_history_duplicated. review_uuid and the disagreement
    -- flags come straight from the observation's own context.
    WITH flagged AS (
      SELECT
        vr.entity_id,
        vr.context->>'review_uuid' review_uuid,
        (vr.context->>'status_disagrees')::boolean status_disagrees,
        (vr.context->>'determination_disagrees')::boolean determination_disagrees
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
    ),
    sample AS (
      SELECT
        (SELECT COUNT(*) FROM flagged) cnt,
        f.entity_id mfid,
        f.status_disagrees,
        f.determination_disagrees,
        c.citation,
        dr.review_name
      FROM flagged f
      LEFT JOIN "Citations" c
        ON c.mfid = f.entity_id
      LEFT JOIN "DeliveredReviews" dr
        ON dr.review_uuid = f.review_uuid
      ORDER BY f.entity_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'finding_review_history_duplicated',
      'Citation ' || COALESCE(s.citation, 'unknown') || '(' || s.mfid || ') on '
        || COALESCE(s.review_name, 'an unnamed review')
        || ' has duplicate history rows for that review that disagree on '
        || CASE
          WHEN s.status_disagrees AND s.determination_disagrees THEN 'status and determination'
          WHEN s.status_disagrees THEN 'status'
          WHEN s.determination_disagrees THEN 'determination'
          ELSE 'an unknown field'
        END || '.'
        || CASE WHEN s.cnt > 1
          THEN ' There are ' || s.cnt || ' examples of this alert condition.'
          ELSE ''
        END,
      cur.team_notification,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'finding_review_history_duplicated',
        'count', s.cnt,
        'sample_entity_ids', (SELECT (ARRAY_AGG(entity_id ORDER BY entity_id))[1:20] FROM flagged)
      ),
      NOW(),
      NOW()
    FROM sample s
    CROSS JOIN validation_run cur
    WHERE s.cnt > 0
    ;

    -- finding_standard_missing. No citation text here - a finding with no
    -- live standard has none to show.
    WITH flagged AS (
      SELECT vr.entity_id
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
    ),
    sample AS (
      SELECT
        (SELECT COUNT(*) FROM flagged) cnt,
        f.entity_id mfid,
        fi.review_name
      FROM flagged f
      LEFT JOIN finding_identity fi
        ON fi.id = f.entity_id
      ORDER BY f.entity_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'finding_standard_missing',
      'Finding ' || s.mfid || ' on ' || COALESCE(s.review_name, 'an unnamed review')
        || ' has no associated citation text.'
        || CASE WHEN s.cnt > 1
          THEN ' There are ' || s.cnt || ' examples of this alert condition.'
          ELSE ''
        END,
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'finding_standard_missing',
        'count', s.cnt,
        'sample_entity_ids', (SELECT (ARRAY_AGG(entity_id ORDER BY entity_id))[1:20] FROM flagged)
      ),
      NOW(),
      NOW()
    FROM sample s
    CROSS JOIN validation_run cur
    WHERE s.cnt > 0
    ;

    -- history_status_unresolvable / finding_status_unresolvable /
    -- review_status_unresolvable
    WITH flagged AS (
      SELECT vr.entity_id
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
    ),
    sample AS (
      SELECT
        (SELECT COUNT(*) FROM flagged) cnt,
        f.entity_id mfid,
        fi.citation,
        fi.review_name
      FROM flagged f
      LEFT JOIN finding_identity fi
        ON fi.id = f.entity_id
      ORDER BY f.entity_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'history_status_unresolvable',
      'Citation ' || COALESCE(s.citation, 'unknown') || '(' || s.mfid || ') on '
        || COALESCE(s.review_name, 'an unnamed review') || ' has a history statusId that does not resolve.'
        || CASE WHEN s.cnt > 1
          THEN ' There are ' || s.cnt || ' examples of this alert condition.'
          ELSE ''
        END,
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'history_status_resolvable',
        'count', s.cnt,
        'sample_entity_ids', (SELECT (ARRAY_AGG(entity_id ORDER BY entity_id))[1:20] FROM flagged)
      ),
      NOW(),
      NOW()
    FROM sample s
    CROSS JOIN validation_run cur
    WHERE s.cnt > 0
    ;

    WITH flagged AS (
      SELECT vr.entity_id
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
    ),
    sample AS (
      SELECT
        (SELECT COUNT(*) FROM flagged) cnt,
        f.entity_id mfid,
        fi.citation,
        fi.review_name
      FROM flagged f
      LEFT JOIN finding_identity fi
        ON fi.id = f.entity_id
      ORDER BY f.entity_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'finding_status_unresolvable',
      'Citation ' || COALESCE(s.citation, 'unknown') || '(' || s.mfid || ') on '
        || COALESCE(s.review_name, 'an unnamed review') || ' has a statusId that does not resolve.'
        || CASE WHEN s.cnt > 1
          THEN ' There are ' || s.cnt || ' examples of this alert condition.'
          ELSE ''
        END,
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'finding_status_resolvable',
        'count', s.cnt,
        'sample_entity_ids', (SELECT (ARRAY_AGG(entity_id ORDER BY entity_id))[1:20] FROM flagged)
      ),
      NOW(),
      NOW()
    FROM sample s
    CROSS JOIN validation_run cur
    WHERE s.cnt > 0
    ;

    WITH flagged AS (
      SELECT vr.entity_id
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
    ),
    sample AS (
      SELECT
        (SELECT COUNT(*) FROM flagged) cnt,
        dr.review_name
      FROM flagged f
      LEFT JOIN "DeliveredReviews" dr
        ON dr.mrid = f.entity_id
      ORDER BY f.entity_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'review_status_unresolvable',
      'Review ' || COALESCE(s.review_name, 'an unnamed review')
        || ' has a statusId that does not resolve.'
        || CASE WHEN s.cnt > 1
          THEN ' There are ' || s.cnt || ' examples of this alert condition.'
          ELSE ''
        END,
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringReviews',
        'observation_name', 'review_status_resolvable',
        'count', s.cnt,
        'sample_entity_ids', (SELECT (ARRAY_AGG(entity_id ORDER BY entity_id))[1:20] FROM flagged)
      ),
      NOW(),
      NOW()
    FROM sample s
    CROSS JOIN validation_run cur
    WHERE s.cnt > 0
    ;

    -- statuses_table_integrity_violated. Entity here is a *Statuses table row
    -- itself, not a Finding/Review (see docs/monitoring-validation-checks.md),
    -- so there's no name to show - entity_type + the row's own id locates it.
    WITH flagged AS (
      SELECT vr.entity_type, vr.entity_id
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
    ),
    sample AS (
      SELECT
        (SELECT COUNT(*) FROM flagged) cnt,
        entity_type,
        entity_id
      FROM flagged
      ORDER BY entity_type, entity_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'statuses_table_integrity_violated',
      s.entity_type || ' row ' || s.entity_id || ' shares a statusId with another live row.'
        || CASE WHEN s.cnt > 1
          THEN ' There are ' || s.cnt || ' examples of this alert condition.'
          ELSE ''
        END,
      cur.alert,
      jsonb_build_object(
        'observation_name', 'statuses_table_integrity',
        'count', s.cnt,
        'sample_entity_ids', (SELECT (ARRAY_AGG(jsonb_build_object('entity_type', entity_type, 'entity_id', entity_id)))[1:20] FROM flagged)
      ),
      NOW(),
      NOW()
    FROM sample s
    CROSS JOIN validation_run cur
    WHERE s.cnt > 0
    ;

    -- review_grantee_orphaned_grant
    WITH flagged AS (
      SELECT vr.entity_id
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
    ),
    sample AS (
      SELECT
        (SELECT COUNT(*) FROM flagged) cnt,
        dr.review_name
      FROM flagged f
      LEFT JOIN "DeliveredReviews" dr
        ON dr.mrid = f.entity_id
      ORDER BY f.entity_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'review_grantee_orphaned_grant',
      'Review ' || COALESCE(s.review_name, 'an unnamed review')
        || ' has a grantee link with no matching undeleted grant.'
        || CASE WHEN s.cnt > 1
          THEN ' There are ' || s.cnt || ' examples of this alert condition.'
          ELSE ''
        END,
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringReviews',
        'observation_name', 'review_grantee_orphaned_grant',
        'count', s.cnt,
        'sample_entity_ids', (SELECT (ARRAY_AGG(entity_id ORDER BY entity_id))[1:20] FROM flagged)
      ),
      NOW(),
      NOW()
    FROM sample s
    CROSS JOIN validation_run cur
    WHERE s.cnt > 0
    ;

    -- finding_standard_citation_text_disagrees
    WITH flagged AS (
      SELECT vr.entity_id
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
    ),
    sample AS (
      SELECT
        (SELECT COUNT(*) FROM flagged) cnt,
        f.entity_id mfid,
        fi.citation,
        fi.review_name
      FROM flagged f
      LEFT JOIN finding_identity fi
        ON fi.id = f.entity_id
      ORDER BY f.entity_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'finding_standard_citation_text_disagrees',
      'Citation ' || COALESCE(s.citation, 'unknown') || '(' || s.mfid || ') on '
        || COALESCE(s.review_name, 'an unnamed review') || ' has disagreeing citation text across its standards.'
        || CASE WHEN s.cnt > 1
          THEN ' There are ' || s.cnt || ' examples of this alert condition.'
          ELSE ''
        END,
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'standard_consistency',
        'category', 'citation_text_disagrees',
        'count', s.cnt,
        'sample_entity_ids', (SELECT (ARRAY_AGG(entity_id ORDER BY entity_id))[1:20] FROM flagged)
      ),
      NOW(),
      NOW()
    FROM sample s
    CROSS JOIN validation_run cur
    WHERE s.cnt > 0
    ;

    -- finding_standard_category_disagrees
    WITH flagged AS (
      SELECT vr.entity_id
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
    ),
    sample AS (
      SELECT
        (SELECT COUNT(*) FROM flagged) cnt,
        f.entity_id mfid,
        fi.citation,
        fi.review_name
      FROM flagged f
      LEFT JOIN finding_identity fi
        ON fi.id = f.entity_id
      ORDER BY f.entity_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'finding_standard_category_disagrees',
      'Citation ' || COALESCE(s.citation, 'unknown') || '(' || s.mfid || ') on '
        || COALESCE(s.review_name, 'an unnamed review')
        || ' has no source and has disagreeing category guidance across its standards.'
        || CASE WHEN s.cnt > 1
          THEN ' There are ' || s.cnt || ' examples of this alert condition.'
          ELSE ''
        END,
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'standard_consistency',
        'category', 'category_disagrees_no_source',
        'count', s.cnt,
        'sample_entity_ids', (SELECT (ARRAY_AGG(entity_id ORDER BY entity_id))[1:20] FROM flagged)
      ),
      NOW(),
      NOW()
    FROM sample s
    CROSS JOIN validation_run cur
    WHERE s.cnt > 0
    ;

    -- history_vs_finding_status_disagrees. review_id/finding_status come
    -- straight from the observation's own context.
    WITH flagged AS (
      SELECT
        vr.entity_id,
        (vr.context->>'review_id')::int review_id,
        vr.context->>'finding_status' finding_status
      FROM "ValidationRecords" vr
      CROSS JOIN validation_run cur
      WHERE vr.run_id = cur.run_id
        AND vr.observation_name = 'history_vs_finding_status'
        AND vr.category = 'history_corrected_finding_disagrees'
        AND (vr.context->>'learned_at')::timestamptz >= (NOW() - INTERVAL '7 days')
    ),
    sample AS (
      SELECT
        (SELECT COUNT(*) FROM flagged) cnt,
        f.entity_id mfid,
        f.finding_status,
        c.citation,
        dr.review_name
      FROM flagged f
      LEFT JOIN "Citations" c
        ON c.mfid = f.entity_id
      LEFT JOIN "DeliveredReviews" dr
        ON dr.mrid = f.review_id
      ORDER BY f.entity_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'history_vs_finding_status_disagrees',
      'Citation ' || COALESCE(s.citation, 'unknown') || '(' || s.mfid || ') on '
        || COALESCE(s.review_name, 'an unnamed review')
        || ' has a Corrected history status but a finding-level status of '
        || COALESCE(s.finding_status, 'unknown') || '.'
        || CASE WHEN s.cnt > 1
          THEN ' There are ' || s.cnt || ' examples of this alert condition.'
          ELSE ''
        END,
      cur.team_notification,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'history_vs_finding_status',
        'count', s.cnt,
        'sample_entity_ids', (SELECT (ARRAY_AGG(entity_id ORDER BY entity_id))[1:20] FROM flagged)
      ),
      NOW(),
      NOW()
    FROM sample s
    CROSS JOIN validation_run cur
    WHERE s.cnt > 0
    ;

    -- history_vs_outcome_disagrees. review_id/history_status come straight
    -- from the observation's own context.
    WITH flagged AS (
      SELECT
        vr.entity_id,
        (vr.context->>'review_id')::int review_id,
        vr.context->>'history_status' history_status
      FROM "ValidationRecords" vr
      CROSS JOIN validation_run cur
      WHERE vr.run_id = cur.run_id
        AND vr.observation_name = 'history_vs_outcome'
        AND vr.category = 'open_status_on_compliant_review'
        AND (vr.context->>'learned_at')::timestamptz >= (NOW() - INTERVAL '7 days')
    ),
    sample AS (
      SELECT
        (SELECT COUNT(*) FROM flagged) cnt,
        f.entity_id mfid,
        f.history_status,
        c.citation,
        dr.review_name
      FROM flagged f
      LEFT JOIN "Citations" c
        ON c.mfid = f.entity_id
      LEFT JOIN "DeliveredReviews" dr
        ON dr.mrid = f.review_id
      ORDER BY f.entity_id
      LIMIT 1
    )
    INSERT INTO "ValidationAlerts" (run_id, check_name, message, severity, context, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'history_vs_outcome_disagrees',
      'Citation ' || COALESCE(s.citation, 'unknown') || '(' || s.mfid || ') on '
        || COALESCE(s.review_name, 'an unnamed review')
        || ' has a history status of ' || COALESCE(s.history_status, 'unknown')
        || ' on a Compliant-outcome review.'
        || CASE WHEN s.cnt > 1
          THEN ' There are ' || s.cnt || ' examples of this alert condition.'
          ELSE ''
        END,
      cur.alert,
      jsonb_build_object(
        'entity_type', 'MonitoringFindings',
        'observation_name', 'history_vs_outcome',
        'count', s.cnt,
        'sample_entity_ids', (SELECT (ARRAY_AGG(entity_id ORDER BY entity_id))[1:20] FROM flagged)
      ),
      NOW(),
      NOW()
    FROM sample s
    CROSS JOIN validation_run cur
    WHERE s.cnt > 0
    ;

    -- Marker rows for every threshold check above that populated
    -- threshold_flagged - feeds next cycle's previously_flagged anti-join.
    INSERT INTO "ValidationRecords" (run_id, entity_type, entity_id, observation_name, category, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'ValidationThresholdCheck',
      tf.entity_id,
      tf.check_name,
      tf.category,
      NOW(),
      NOW()
    FROM threshold_flagged tf
    CROSS JOIN validation_run cur
    ;
    `,
    { raw: true, transaction }
  );
};

export default refreshMonitoringAlerts;
