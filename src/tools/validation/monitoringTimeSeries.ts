import type { Transaction } from 'sequelize';
import { sequelize } from '../../models';

// Number of affected rows from a raw sequelize.query result's metadata,
// which differs in shape between statement types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const affectedRows = (meta: any): number => {
  if (typeof meta === 'number') return meta;
  return meta?.rowCount ?? 0;
};

// Earliest period the time series covers. Populating back this far gives
// threshold checks (and future anomaly-detection models) a sufficiently long
// baseline; the upsert key makes recomputing the whole range idempotent.
const TIME_SERIES_START = '2025-01-01';

// Floor for scanning ZALMonitoringReviews directly (the lag measures' Z-score
// trailing window needs audit history further back than TIME_SERIES_START).
// Comfortably covers that window with room to spare, and keeps the scan from
// reaching back into years-old audit history that isn't otherwise relevant.
const AUDIT_LOG_FLOOR = '2024-01-01';

/**
 * Upserts long/narrow time-series statistics describing Monitoring activity into
 * ValidationTimeSeries. Each stat is built into a temp table, upserted, then
 * reconciled. New stats are just new feature_set/stat_name values, no schema
 * change. Shared intermediates (e.g. finding_deliveries) are temp tables reused
 * by later stats. See docs/monitoring-data-validation.md for the process this
 * fits into, and docs/monitoring-validation-checks.md for what each stat below
 * means and why.
 *
 * recomputeFloor bounds how far back a run recomputes and reconciles. Every
 * stat reads it from validation_params, aligned to its own period type, so a
 * run with a trailing-window floor and a full backfill are the same code with
 * a different floor. It defaults to TIME_SERIES_START, i.e. the full range
 * every run, which also serves as the backfill when a stat is added.
 *
 * @returns number of ValidationTimeSeries rows inserted or updated
 */
const updateMonitoringTimeSeries = async (
  transaction: Transaction,
  { recomputeFloor = TIME_SERIES_START }: { recomputeFloor?: string } = {}
): Promise<number> => {
  let statsUpserted = 0;

  // Set once so the rest of this run (including refreshMonitoringAlerts, later
  // in the same transaction) can read these instead of substituting/recomputing
  // them per-statement - same pattern as runValidation.ts's validation_run
  // temp table.
  await sequelize.query(
    `
    DROP TABLE IF EXISTS pg_temp.validation_params;
    CREATE TEMP TABLE validation_params
    ON COMMIT DROP
    AS
    -- The substituted inputs are set once here so a manual run only has to
    -- change each date in one place.
    WITH input AS (
      SELECT
        :timeSeriesStart::date time_series_start,
        :auditLogFloor::date audit_log_floor,
        :recomputeFloor::date recompute_floor
    )
    SELECT
      i.time_series_start,
      i.audit_log_floor,
      i.recompute_floor,
      date_trunc('week', i.recompute_floor)::date recompute_floor_week,
      date_trunc('month', i.recompute_floor)::date recompute_floor_month,
      date_trunc('week', NOW())::date current_week_start,
      (date_trunc('week', NOW()) - INTERVAL '1 week')::date last_complete_week,
      date_trunc('month', NOW())::date current_month_start,
      (date_trunc('month', NOW()) - INTERVAL '1 month')::date last_complete_month
    FROM input i
    ;
    `,
    {
      raw: true,
      transaction,
      replacements: {
        timeSeriesStart: TIME_SERIES_START,
        auditLogFloor: AUDIT_LOG_FLOOR,
        recomputeFloor,
      },
    }
  );

  // reviews_created: weekly count of distinct reviews first created in ITAMS,
  // sliced by region/geographic region. Bucketed on "sourceCreatedAt" (ITAMS
  // activity) rather than "createdAt" (our import time) so that import
  // backfills don't register as spikes.
  await sequelize.query(
    `
    DROP TABLE IF EXISTS reviews_ts;
    CREATE TEMP TABLE reviews_ts
    AS
    SELECT
      date_trunc('week', mr."sourceCreatedAt")::date period_start,
      gr."regionId" region_id,
      COALESCE(gr."geographicRegionId", 0) geo_id,
      COUNT(DISTINCT mr."reviewId") value
    FROM "MonitoringReviews" mr
    CROSS JOIN validation_params p
    JOIN "MonitoringReviewGrantees" mrg
      ON mrg."reviewId" = mr."reviewId"
      AND mrg."sourceDeletedAt" IS NULL
      AND mrg."deletedAt" IS NULL
    JOIN "Grants" gr
      ON gr.number = mrg."grantNumber"
      AND NOT gr.deleted
    WHERE mr."sourceDeletedAt" IS NULL
      AND mr."deletedAt" IS NULL
      AND mr."sourceCreatedAt" >= p.recompute_floor_week
    GROUP BY 1, 2, 3
    ;
    `,
    { raw: true, transaction }
  );

  const [, reviewsMeta] = await sequelize.query(
    `
    INSERT INTO "ValidationTimeSeries"
      (feature_set, period_type, period_start, region_id, geo_id, stat_name, value, "createdAt", "updatedAt")
    SELECT 'monitoring_reviews', 'week', period_start, region_id, geo_id, 'reviews_created', value, NOW(), NOW()
    FROM reviews_ts
    ON CONFLICT (feature_set, period_type, period_start, region_id, geo_id, stat_name)
    DO UPDATE SET
      value = EXCLUDED.value,
      "updatedAt" = NOW()
    WHERE "ValidationTimeSeries".value IS DISTINCT FROM EXCLUDED.value
    ;
    `,
    { raw: true, transaction }
  );
  statsUpserted += affectedRows(reviewsMeta);

  // Reconcile: drop keys no longer produced this cycle.
  await sequelize.query(
    `
    DELETE FROM "ValidationTimeSeries" v
    USING validation_params p
    WHERE v.feature_set = 'monitoring_reviews'
      AND v.period_type = 'week'
      AND v.stat_name = 'reviews_created'
      AND v.period_start >= p.recompute_floor_week
      AND NOT EXISTS (
        SELECT 1 FROM reviews_ts t
        WHERE t.period_start = v.period_start
          AND t.region_id = v.region_id
          AND t.geo_id = v.geo_id
      )
    ;
    `,
    { raw: true, transaction }
  );

  // finding_deliveries: each finding paired with the reportDeliveryDate of the
  // earliest delivered review associated with it (via
  // MonitoringFindingHistories). The finding's own reportedDate has too loose
  // a relationship with the underlying ITAMS Monitoring timeline to bucket on.
  await sequelize.query(
    `
    DROP TABLE IF EXISTS finding_deliveries;
    CREATE TEMP TABLE finding_deliveries
    AS
    SELECT
      mf."findingId" finding_uuid,
      MIN(mr."reportDeliveryDate")::date first_delivered
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
    GROUP BY 1
    ;
    `,
    { raw: true, transaction }
  );

  // findings_delivered: monthly count of distinct findings by first delivery,
  // region slice via MonitoringFindingGrants -> MonitoringReviewGrantees ->
  // Grants. Per-region rows plus a national (region_id = 0) deduplicated total.
  // See docs/monitoring-data-validation.md.
  await sequelize.query(
    `
    DROP TABLE IF EXISTS findings_ts;
    CREATE TEMP TABLE findings_ts
    AS
    SELECT
      date_trunc('month', fd.first_delivered)::date period_start,
      gr."regionId" region_id,
      COALESCE(gr."geographicRegionId", 0) geo_id,
      COUNT(DISTINCT fd.finding_uuid) value
    FROM finding_deliveries fd
    CROSS JOIN validation_params p
    JOIN "MonitoringFindingGrants" mfg
      ON mfg."findingId" = fd.finding_uuid
      AND mfg."sourceDeletedAt" IS NULL
      AND mfg."deletedAt" IS NULL
    JOIN "MonitoringReviewGrantees" mrg
      ON mfg."granteeId" = mrg."granteeId"
      AND mrg."sourceDeletedAt" IS NULL
      AND mrg."deletedAt" IS NULL
    JOIN "Grants" gr
      ON gr.number = mrg."grantNumber"
      AND NOT gr.deleted
    WHERE fd.first_delivered >= p.recompute_floor_month
    GROUP BY 1, 2, 3
    ;

    DROP TABLE IF EXISTS findings_national_ts;
    CREATE TEMP TABLE findings_national_ts
    AS
    SELECT
      date_trunc('month', fd.first_delivered)::date period_start,
      COUNT(DISTINCT fd.finding_uuid) value
    FROM finding_deliveries fd
    CROSS JOIN validation_params p
    JOIN "MonitoringFindingGrants" mfg
      ON mfg."findingId" = fd.finding_uuid
      AND mfg."sourceDeletedAt" IS NULL
      AND mfg."deletedAt" IS NULL
    JOIN "MonitoringReviewGrantees" mrg
      ON mfg."granteeId" = mrg."granteeId"
      AND mrg."sourceDeletedAt" IS NULL
      AND mrg."deletedAt" IS NULL
    JOIN "Grants" gr
      ON gr.number = mrg."grantNumber"
      AND NOT gr.deleted
    WHERE fd.first_delivered >= p.recompute_floor_month
    GROUP BY 1
    ;
    `,
    { raw: true, transaction }
  );

  const [, findingsMeta] = await sequelize.query(
    `
    INSERT INTO "ValidationTimeSeries"
      (feature_set, period_type, period_start, region_id, geo_id, stat_name, value, "createdAt", "updatedAt")
    SELECT 'monitoring_findings', 'month', period_start, region_id, geo_id, 'findings_delivered', value, NOW(), NOW()
    FROM findings_ts
    ON CONFLICT (feature_set, period_type, period_start, region_id, geo_id, stat_name)
    DO UPDATE SET
      value = EXCLUDED.value,
      "updatedAt" = NOW()
    WHERE "ValidationTimeSeries".value IS DISTINCT FROM EXCLUDED.value
    ;
    `,
    { raw: true, transaction }
  );
  statsUpserted += affectedRows(findingsMeta);

  const [, findingsNationalMeta] = await sequelize.query(
    `
    INSERT INTO "ValidationTimeSeries"
      (feature_set, period_type, period_start, region_id, geo_id, stat_name, value, "createdAt", "updatedAt")
    SELECT 'monitoring_findings', 'month', period_start, 0, 0, 'findings_delivered', value, NOW(), NOW()
    FROM findings_national_ts
    ON CONFLICT (feature_set, period_type, period_start, region_id, geo_id, stat_name)
    DO UPDATE SET
      value = EXCLUDED.value,
      "updatedAt" = NOW()
    WHERE "ValidationTimeSeries".value IS DISTINCT FROM EXCLUDED.value
    ;
    `,
    { raw: true, transaction }
  );
  statsUpserted += affectedRows(findingsNationalMeta);

  // Reconcile per-region rows and the national (region_id = 0) row separately.
  await sequelize.query(
    `
    DELETE FROM "ValidationTimeSeries" v
    USING validation_params p
    WHERE v.feature_set = 'monitoring_findings'
      AND v.period_type = 'month'
      AND v.stat_name = 'findings_delivered'
      AND v.region_id <> 0
      AND v.period_start >= p.recompute_floor_month
      AND NOT EXISTS (
        SELECT 1 FROM findings_ts t
        WHERE t.period_start = v.period_start
          AND t.region_id = v.region_id
          AND t.geo_id = v.geo_id
      )
    ;

    DELETE FROM "ValidationTimeSeries" v
    USING validation_params p
    WHERE v.feature_set = 'monitoring_findings'
      AND v.period_type = 'month'
      AND v.stat_name = 'findings_delivered'
      AND v.region_id = 0
      AND v.period_start >= p.recompute_floor_month
      AND NOT EXISTS (
        SELECT 1 FROM findings_national_ts t
        WHERE t.period_start = v.period_start
      )
    ;
    `,
    { raw: true, transaction }
  );

  // findings_delivered_<type>. Region slice via GrantCitations, which already
  // denormalizes region_id onto the junction row - no join to Grants needed.
  await sequelize.query(
    `
    DROP TABLE IF EXISTS findings_by_type_ts;
    CREATE TEMP TABLE findings_by_type_ts
    AS
    SELECT
      date_trunc('month', c.initial_report_delivery_date)::date period_start,
      gc.region_id region_id,
      COALESCE(gr."geographicRegionId", 0) geo_id,
      c.calculated_finding_type finding_type,
      COUNT(DISTINCT c.id) value
    FROM "Citations" c
    CROSS JOIN validation_params p
    JOIN "GrantCitations" gc
      ON gc."citationId" = c.id
    JOIN "Grants" gr
      ON gr.id = gc."grantId"
      AND NOT gr.deleted
    WHERE c."deletedAt" IS NULL
      AND c.initial_report_delivery_date >= p.recompute_floor_month
      AND c.calculated_finding_type IN ('Area of Concern', 'Deficiency', 'Noncompliance')
    GROUP BY 1, 2, 3, 4
    ;

    DROP TABLE IF EXISTS findings_by_type_national_ts;
    CREATE TEMP TABLE findings_by_type_national_ts
    AS
    SELECT
      date_trunc('month', c.initial_report_delivery_date)::date period_start,
      c.calculated_finding_type finding_type,
      COUNT(DISTINCT c.id) value
    FROM "Citations" c
    CROSS JOIN validation_params p
    WHERE c."deletedAt" IS NULL
      AND c.initial_report_delivery_date >= p.recompute_floor_month
      AND c.calculated_finding_type IN ('Area of Concern', 'Deficiency', 'Noncompliance')
    GROUP BY 1, 2
    ;
    `,
    { raw: true, transaction }
  );

  const [, findingsByTypeMeta] = await sequelize.query(
    `
    INSERT INTO "ValidationTimeSeries"
      (feature_set, period_type, period_start, region_id, geo_id, stat_name, value, "createdAt", "updatedAt")
    SELECT
      'monitoring_findings', 'month', period_start, region_id, geo_id,
      'findings_delivered_' || lower(replace(finding_type, ' ', '_')), value, NOW(), NOW()
    FROM findings_by_type_ts
    ON CONFLICT (feature_set, period_type, period_start, region_id, geo_id, stat_name)
    DO UPDATE SET
      value = EXCLUDED.value,
      "updatedAt" = NOW()
    WHERE "ValidationTimeSeries".value IS DISTINCT FROM EXCLUDED.value
    ;
    `,
    { raw: true, transaction }
  );
  statsUpserted += affectedRows(findingsByTypeMeta);

  const [, findingsByTypeNationalMeta] = await sequelize.query(
    `
    INSERT INTO "ValidationTimeSeries"
      (feature_set, period_type, period_start, region_id, geo_id, stat_name, value, "createdAt", "updatedAt")
    SELECT
      'monitoring_findings', 'month', period_start, 0, 0,
      'findings_delivered_' || lower(replace(finding_type, ' ', '_')), value, NOW(), NOW()
    FROM findings_by_type_national_ts
    ON CONFLICT (feature_set, period_type, period_start, region_id, geo_id, stat_name)
    DO UPDATE SET
      value = EXCLUDED.value,
      "updatedAt" = NOW()
    WHERE "ValidationTimeSeries".value IS DISTINCT FROM EXCLUDED.value
    ;
    `,
    { raw: true, transaction }
  );
  statsUpserted += affectedRows(findingsByTypeNationalMeta);

  // LIKE, not '=': matches all three per-type stat_names at once. The plain
  // 'findings_delivered' stat_name doesn't match (nothing follows the
  // trailing underscore), so this reconciliation and the one above it don't collide.
  await sequelize.query(
    `
    DELETE FROM "ValidationTimeSeries" v
    USING validation_params p
    WHERE v.feature_set = 'monitoring_findings'
      AND v.period_type = 'month'
      AND v.stat_name LIKE 'findings\\_delivered\\_%'
      AND v.region_id <> 0
      AND v.period_start >= p.recompute_floor_month
      AND NOT EXISTS (
        SELECT 1 FROM findings_by_type_ts t
        WHERE t.period_start = v.period_start
          AND t.region_id = v.region_id
          AND t.geo_id = v.geo_id
          AND v.stat_name = 'findings_delivered_' || lower(replace(t.finding_type, ' ', '_'))
      )
    ;

    DELETE FROM "ValidationTimeSeries" v
    USING validation_params p
    WHERE v.feature_set = 'monitoring_findings'
      AND v.period_type = 'month'
      AND v.stat_name LIKE 'findings\\_delivered\\_%'
      AND v.region_id = 0
      AND v.period_start >= p.recompute_floor_month
      AND NOT EXISTS (
        SELECT 1 FROM findings_by_type_national_ts t
        WHERE t.period_start = v.period_start
          AND v.stat_name = 'findings_delivered_' || lower(replace(t.finding_type, ' ', '_'))
      )
    ;
    `,
    { raw: true, transaction }
  );

  // finding_closure_count.
  await sequelize.query(
    `
    DROP TABLE IF EXISTS finding_closure_ts;
    CREATE TEMP TABLE finding_closure_ts
    AS
    SELECT
      date_trunc('month', c.closed_date)::date period_start,
      gc.region_id region_id,
      COALESCE(gr."geographicRegionId", 0) geo_id,
      COUNT(DISTINCT c.id) value
    FROM "Citations" c
    CROSS JOIN validation_params p
    JOIN "GrantCitations" gc
      ON gc."citationId" = c.id
    JOIN "Grants" gr
      ON gr.id = gc."grantId"
      AND NOT gr.deleted
    WHERE c."deletedAt" IS NULL
      AND c.closed_date IS NOT NULL
      AND c.closed_date >= p.recompute_floor_month
    GROUP BY 1, 2, 3
    ;

    DROP TABLE IF EXISTS finding_closure_national_ts;
    CREATE TEMP TABLE finding_closure_national_ts
    AS
    SELECT
      date_trunc('month', c.closed_date)::date period_start,
      COUNT(DISTINCT c.id) value
    FROM "Citations" c
    CROSS JOIN validation_params p
    WHERE c."deletedAt" IS NULL
      AND c.closed_date IS NOT NULL
      AND c.closed_date >= p.recompute_floor_month
    GROUP BY 1
    ;
    `,
    { raw: true, transaction }
  );

  const [, closureMeta] = await sequelize.query(
    `
    INSERT INTO "ValidationTimeSeries"
      (feature_set, period_type, period_start, region_id, geo_id, stat_name, value, "createdAt", "updatedAt")
    SELECT 'monitoring_finding_closure', 'month', period_start, region_id, geo_id, 'closure_count', value, NOW(), NOW()
    FROM finding_closure_ts
    ON CONFLICT (feature_set, period_type, period_start, region_id, geo_id, stat_name)
    DO UPDATE SET
      value = EXCLUDED.value,
      "updatedAt" = NOW()
    WHERE "ValidationTimeSeries".value IS DISTINCT FROM EXCLUDED.value
    ;
    `,
    { raw: true, transaction }
  );
  statsUpserted += affectedRows(closureMeta);

  const [, closureNationalMeta] = await sequelize.query(
    `
    INSERT INTO "ValidationTimeSeries"
      (feature_set, period_type, period_start, region_id, geo_id, stat_name, value, "createdAt", "updatedAt")
    SELECT 'monitoring_finding_closure', 'month', period_start, 0, 0, 'closure_count', value, NOW(), NOW()
    FROM finding_closure_national_ts
    ON CONFLICT (feature_set, period_type, period_start, region_id, geo_id, stat_name)
    DO UPDATE SET
      value = EXCLUDED.value,
      "updatedAt" = NOW()
    WHERE "ValidationTimeSeries".value IS DISTINCT FROM EXCLUDED.value
    ;
    `,
    { raw: true, transaction }
  );
  statsUpserted += affectedRows(closureNationalMeta);

  await sequelize.query(
    `
    DELETE FROM "ValidationTimeSeries" v
    USING validation_params p
    WHERE v.feature_set = 'monitoring_finding_closure'
      AND v.period_type = 'month'
      AND v.stat_name = 'closure_count'
      AND v.region_id <> 0
      AND v.period_start >= p.recompute_floor_month
      AND NOT EXISTS (
        SELECT 1 FROM finding_closure_ts t
        WHERE t.period_start = v.period_start
          AND t.region_id = v.region_id
          AND t.geo_id = v.geo_id
      )
    ;

    DELETE FROM "ValidationTimeSeries" v
    USING validation_params p
    WHERE v.feature_set = 'monitoring_finding_closure'
      AND v.period_type = 'month'
      AND v.stat_name = 'closure_count'
      AND v.region_id = 0
      AND v.period_start >= p.recompute_floor_month
      AND NOT EXISTS (
        SELECT 1 FROM finding_closure_national_ts t
        WHERE t.period_start = v.period_start
      )
    ;
    `,
    { raw: true, transaction }
  );

  // import_lag_days / source_lag_days / completion_gap_days. Reads the raw
  // audit log directly (not a fact table): none of these timestamps are
  // carried onto the fact tables.
  await sequelize.query(
    `
    DROP TABLE IF EXISTS pg_temp.known_review_statuses;
    CREATE TEMP TABLE known_review_statuses
    ON COMMIT DROP
    AS
    SELECT DISTINCT ON ("statusId") "statusId", name
    FROM "MonitoringReviewStatuses"
    WHERE "sourceDeletedAt" IS NULL
    ORDER BY "statusId", "sourceUpdatedAt" DESC NULLS LAST, id DESC
    ;

    DROP TABLE IF EXISTS pg_temp.report_delivery_first_set;
    CREATE TEMP TABLE report_delivery_first_set
    ON COMMIT DROP
    AS
    SELECT DISTINCT ON (zmr.data_id)
      zmr.data_id,
      zmr.dml_timestamp::date set_date,
      (zmr.new_row_data->>'sourceUpdatedAt')::timestamptz::date source_set_date
    FROM "ZALMonitoringReviews" zmr
    CROSS JOIN validation_params p
    JOIN "MonitoringReviews" mr2
      ON mr2.id = zmr.data_id
      AND (zmr.new_row_data->>'reportDeliveryDate')::timestamptz = mr2."reportDeliveryDate"
    WHERE zmr.dml_timestamp >= p.audit_log_floor
    ORDER BY zmr.data_id, zmr.dml_timestamp
    ;

    -- First audit row where the resolved status became 'Complete'. Not
    -- restricted to reviews still Complete today - this is a historical
    -- fact that doesn't change if the status moved again afterward.
    DROP TABLE IF EXISTS pg_temp.review_complete_first_set;
    CREATE TEMP TABLE review_complete_first_set
    ON COMMIT DROP
    AS
    SELECT DISTINCT ON (zmr.data_id)
      zmr.data_id,
      zmr.dml_timestamp::date complete_date
    FROM "ZALMonitoringReviews" zmr
    CROSS JOIN validation_params p
    JOIN known_review_statuses krs
      ON krs."statusId" = (zmr.new_row_data->>'statusId')::int
      AND krs.name = 'Complete'
    WHERE zmr.dml_timestamp >= p.audit_log_floor
    ORDER BY zmr.data_id, zmr.dml_timestamp
    ;

    -- One row per week: each measure's elevated fraction, used both to
    -- derive the stored elevated_count/sample_count stats and as the
    -- population the Z-score (below) is computed from.
    DROP TABLE IF EXISTS pg_temp.weekly_lag_fractions;
    CREATE TEMP TABLE weekly_lag_fractions
    ON COMMIT DROP
    AS
    SELECT
      date_trunc('week', mr."reportDeliveryDate")::date period_start,
      COUNT(*) FILTER (
        WHERE fds.set_date - mr."reportDeliveryDate"::date > 7
      ) import_elevated_count,
      COUNT(*) import_sample_count,
      (COUNT(*) FILTER (
        WHERE fds.set_date - mr."reportDeliveryDate"::date > 7
      ))::numeric / NULLIF(COUNT(*), 0) import_fraction,
      COUNT(*) FILTER (
        WHERE fds.source_set_date - mr."reportDeliveryDate"::date > 5
      ) source_elevated_count,
      COUNT(*) source_sample_count,
      (COUNT(*) FILTER (
        WHERE fds.source_set_date - mr."reportDeliveryDate"::date > 5
      ))::numeric / NULLIF(COUNT(*), 0) source_fraction,
      COUNT(*) FILTER (
        WHERE rcfs.data_id IS NOT NULL AND ABS(fds.source_set_date - rcfs.complete_date) > 2
      ) completion_elevated_count,
      COUNT(*) FILTER (WHERE rcfs.data_id IS NOT NULL) completion_sample_count,
      (COUNT(*) FILTER (
        WHERE rcfs.data_id IS NOT NULL AND ABS(fds.source_set_date - rcfs.complete_date) > 2
      ))::numeric / NULLIF(COUNT(*) FILTER (WHERE rcfs.data_id IS NOT NULL), 0) completion_fraction
    FROM "MonitoringReviews" mr
    CROSS JOIN validation_params p
    JOIN report_delivery_first_set fds
      ON fds.data_id = mr.id
    LEFT JOIN review_complete_first_set rcfs
      ON rcfs.data_id = mr.id
    WHERE mr."sourceDeletedAt" IS NULL
      AND mr."deletedAt" IS NULL
      AND mr."reportDeliveryDate" IS NOT NULL
      -- Reaches 52 weeks below the floor so the weeks being recomputed have
      -- their full trailing baseline; only weeks at or above the floor are
      -- stored (see report_delivery_lag_rows).
      AND mr."reportDeliveryDate" >= GREATEST(
        p.time_series_start,
        (p.recompute_floor_week - INTERVAL '52 weeks')::date
      )
    GROUP BY 1
    ;

    -- A correlated subquery per measure rather than a window function, since
    -- the trailing set is itself conditional (weeks with a defined fraction
    -- only) - comfortably performant at this data's scale (~150 weeks).
    DROP TABLE IF EXISTS report_delivery_lag_national_ts;
    CREATE TEMP TABLE report_delivery_lag_national_ts
    AS
    SELECT
      w.period_start,
      w.import_elevated_count,
      w.import_sample_count,
      w.source_elevated_count,
      w.source_sample_count,
      w.completion_elevated_count,
      w.completion_sample_count,
      CASE WHEN w.import_sample_count >= 20 AND import_trailing.n >= 20 AND import_trailing.sd > 0
        THEN ROUND((w.import_fraction - import_trailing.avg) / import_trailing.sd, 2)
      END import_elevated_z,
      CASE WHEN w.source_sample_count >= 20 AND source_trailing.n >= 20 AND source_trailing.sd > 0
        THEN ROUND((w.source_fraction - source_trailing.avg) / source_trailing.sd, 2)
      END source_elevated_z,
      CASE WHEN w.completion_sample_count >= 20 AND completion_trailing.n >= 20 AND completion_trailing.sd > 0
        THEN ROUND((w.completion_fraction - completion_trailing.avg) / completion_trailing.sd, 2)
      END completion_elevated_z
    FROM weekly_lag_fractions w
    CROSS JOIN LATERAL (
      SELECT COUNT(*) n, AVG(b.import_fraction) avg, STDDEV_SAMP(b.import_fraction) sd
      FROM weekly_lag_fractions b
      WHERE b.period_start >= w.period_start - INTERVAL '52 weeks'
        AND b.period_start < w.period_start
        AND b.import_fraction IS NOT NULL
    ) import_trailing
    CROSS JOIN LATERAL (
      SELECT COUNT(*) n, AVG(b.source_fraction) avg, STDDEV_SAMP(b.source_fraction) sd
      FROM weekly_lag_fractions b
      WHERE b.period_start >= w.period_start - INTERVAL '52 weeks'
        AND b.period_start < w.period_start
        AND b.source_fraction IS NOT NULL
    ) source_trailing
    CROSS JOIN LATERAL (
      SELECT COUNT(*) n, AVG(b.completion_fraction) avg, STDDEV_SAMP(b.completion_fraction) sd
      FROM weekly_lag_fractions b
      WHERE b.period_start >= w.period_start - INTERVAL '52 weeks'
        AND b.period_start < w.period_start
        AND b.completion_fraction IS NOT NULL
    ) completion_trailing
    ;
    `,
    { raw: true, transaction }
  );

  // Narrow (stat_name, period_start, value) shape so the reconcile below can
  // key on exactly the rows this run produces per stat, including weeks where
  // elevated_z has no value. Weeks below the floor were computed only as
  // trailing baseline and are not stored.
  await sequelize.query(
    `
    DROP TABLE IF EXISTS report_delivery_lag_rows;
    CREATE TEMP TABLE report_delivery_lag_rows
    AS
    WITH w AS (
      SELECT l.*
      FROM report_delivery_lag_national_ts l
      CROSS JOIN validation_params p
      WHERE l.period_start >= p.recompute_floor_week
    )
    SELECT 'import_lag_elevated_z' stat_name, period_start, import_elevated_z value
    FROM w WHERE import_elevated_z IS NOT NULL
    UNION ALL
    SELECT 'import_lag_elevated_count', period_start, import_elevated_count
    FROM w
    UNION ALL
    SELECT 'import_lag_sample_count', period_start, import_sample_count
    FROM w
    UNION ALL
    SELECT 'source_lag_elevated_z', period_start, source_elevated_z
    FROM w WHERE source_elevated_z IS NOT NULL
    UNION ALL
    SELECT 'source_lag_elevated_count', period_start, source_elevated_count
    FROM w
    UNION ALL
    SELECT 'source_lag_sample_count', period_start, source_sample_count
    FROM w
    UNION ALL
    SELECT 'completion_gap_elevated_z', period_start, completion_elevated_z
    FROM w WHERE completion_elevated_z IS NOT NULL
    UNION ALL
    SELECT 'completion_gap_elevated_count', period_start, completion_elevated_count
    FROM w
    UNION ALL
    SELECT 'completion_gap_sample_count', period_start, completion_sample_count
    FROM w
    ;
    `,
    { raw: true, transaction }
  );

  const [, lagNationalMeta] = await sequelize.query(
    `
    INSERT INTO "ValidationTimeSeries"
      (feature_set, period_type, period_start, region_id, geo_id, stat_name, value, "createdAt", "updatedAt")
    SELECT 'monitoring_report_delivery', 'week', period_start, 0, 0, stat_name, value, NOW(), NOW()
    FROM report_delivery_lag_rows
    ON CONFLICT (feature_set, period_type, period_start, region_id, geo_id, stat_name)
    DO UPDATE SET
      value = EXCLUDED.value,
      "updatedAt" = NOW()
    WHERE "ValidationTimeSeries".value IS DISTINCT FROM EXCLUDED.value
    ;
    `,
    { raw: true, transaction }
  );
  statsUpserted += affectedRows(lagNationalMeta);

  await sequelize.query(
    `
    DELETE FROM "ValidationTimeSeries" v
    USING validation_params p
    WHERE v.feature_set = 'monitoring_report_delivery'
      AND v.period_type = 'week'
      AND v.stat_name IN (
        'import_lag_elevated_z', 'import_lag_elevated_count', 'import_lag_sample_count',
        'source_lag_elevated_z', 'source_lag_elevated_count', 'source_lag_sample_count',
        'completion_gap_elevated_z', 'completion_gap_elevated_count', 'completion_gap_sample_count'
      )
      AND v.region_id = 0
      AND v.period_start >= p.recompute_floor_week
      AND NOT EXISTS (
        SELECT 1 FROM report_delivery_lag_rows t
        WHERE t.period_start = v.period_start AND t.stat_name = v.stat_name
      )
    ;
    `,
    { raw: true, transaction }
  );

  // Shared as-of-month-end tables, read from the Grants / Citations /
  // GrantCitations bands built in monitoringValidationStaging.ts. Each month's
  // state is read as of the start of the next month (or now, for the current
  // month). These carry finding type, outcome and grant status as columns and
  // keep every undeleted row in effect at the month end; each stat applies
  // its own scope when it aggregates.
  await sequelize.query(
    `
    DROP TABLE IF EXISTS asof_periods;
    CREATE TEMP TABLE asof_periods
    ON COMMIT DROP
    AS
    SELECT
      m::date period_start,
      LEAST((m + INTERVAL '1 month')::timestamptz, NOW()) as_of
    FROM validation_params p
    CROSS JOIN generate_series(
      GREATEST(p.recompute_floor_month, p.time_series_start),
      p.current_month_start,
      INTERVAL '1 month'
    ) m
    ;

    -- Measures read from Citations bands can't predate Citations' own audit
    -- history, so they start at the month or week of its first band.
    DROP TABLE IF EXISTS citations_audit_start;
    CREATE TEMP TABLE citations_audit_start
    ON COMMIT DROP
    AS
    SELECT
      date_trunc('month', MIN(timeband_start))::date month_start,
      date_trunc('week', MIN(timeband_start))::date week_start
    FROM "Citations_timeseries"
    ;

    -- is_of_interest: Active, or with a direct replacement Active as of the
    -- same month end (one hop only). GrantReplacements is rewritten on import,
    -- so its current rows are used rather than its audit bands;
    -- replacementDate is NULL on some older rows, where the successor's start
    -- date stands in.
    DROP TABLE IF EXISTS asof_grants;
    CREATE TEMP TABLE asof_grants
    ON COMMIT DROP
    AS
    WITH g AS (
      SELECT
        pe.period_start,
        pe.as_of,
        g.data_id grant_id,
        g."regionId" region_id,
        g.status = 'Active' is_active,
        g."startDate" start_date
      FROM asof_periods pe
      JOIN "Grants_timeseries" g
        ON g.timeband_start <= pe.as_of
        AND g.timeband_end > pe.as_of
      WHERE NOT g.deleted
    ),
    has_active_successor AS (
      SELECT DISTINCT ga.period_start, ga.grant_id
      FROM g ga
      JOIN "GrantReplacements" r
        ON r."replacedGrantId" = ga.grant_id
      JOIN g sa
        ON sa.period_start = ga.period_start
        AND sa.grant_id = r."replacingGrantId"
        AND sa.is_active
      WHERE NOT ga.is_active
        AND COALESCE(r."replacementDate"::timestamptz, sa.start_date) <= ga.as_of
    )
    SELECT
      g.period_start,
      g.grant_id,
      g.region_id,
      g.is_active,
      g.is_active OR s.grant_id IS NOT NULL is_of_interest
    FROM g
    LEFT JOIN has_active_successor s
      ON s.period_start = g.period_start
      AND s.grant_id = g.grant_id
    ;
    CREATE INDEX ON asof_grants (period_start, grant_id);

    -- Every undeleted citation-grant link as of each month end.
    DROP TABLE IF EXISTS asof_citation_grants;
    CREATE TEMP TABLE asof_citation_grants
    ON COMMIT DROP
    AS
    SELECT
      pe.period_start,
      c.data_id citation_id,
      ga.grant_id,
      ga.region_id,
      ga.is_active grant_is_active,
      ga.is_of_interest grant_is_of_interest,
      c.calculated_finding_type finding_type,
      c.calculated_category category,
      c.active is_open,
      COALESCE(c.active AND c.finding_deadline < pe.as_of::date, FALSE) is_overdue
    FROM asof_periods pe
    JOIN citations_audit_start cs
      ON pe.period_start >= cs.month_start
    JOIN "Citations_timeseries" c
      ON c.timeband_start <= pe.as_of
      AND c.timeband_end > pe.as_of
    JOIN "GrantCitations_timeseries" gc
      ON gc.timeband_start <= pe.as_of
      AND gc.timeband_end > pe.as_of
      AND gc."citationId" = c.data_id
    JOIN asof_grants ga
      ON ga.period_start = pe.period_start
      AND ga.grant_id = gc."grantId"
    WHERE c."deletedAt" IS NULL
    ;

    -- Every delivered review-grant link, with the grant as of the end of the
    -- delivery month.
    DROP TABLE IF EXISTS delivered_review_grants;
    CREATE TEMP TABLE delivered_review_grants
    ON COMMIT DROP
    AS
    SELECT
      ga.period_start,
      dr.id review_id,
      ga.grant_id,
      ga.region_id,
      ga.is_active grant_is_active,
      ga.is_of_interest grant_is_of_interest,
      dr.outcome,
      dr.review_type
    FROM "DeliveredReviews" dr
    JOIN "GrantDeliveredReviews" gdr
      ON gdr."deliveredReviewId" = dr.id
    JOIN asof_grants ga
      ON ga.grant_id = gdr."grantId"
      AND ga.period_start = date_trunc('month', dr.report_delivery_date)::date
    WHERE dr."deletedAt" IS NULL
    ;
    `,
    { raw: true, transaction }
  );

  // monitoring_grants: monthly, per region (geo_id always 0) and national
  // (region_id 0, deduplicated).
  //
  // - Denominator: grants with status Active as of the month end.
  // - grants_with_open_ncdef_finding counts Active grants only, so it is a
  //   subset of the denominator.
  // - Event counts (reviews, open/overdue citations) count a review or
  //   citation when its grant is of interest; those on neither an Active
  //   grant nor one with an Active successor are dropped. A citation on
  //   grants in several regions counts once per region, and once nationally.
  await sequelize.query(
    `
    DROP TABLE IF EXISTS monitoring_grants_rows;
    CREATE TEMP TABLE monitoring_grants_rows
    ON COMMIT DROP
    AS
    WITH denom AS (
      SELECT period_start, region_id, COUNT(*) n
      FROM asof_grants WHERE is_active GROUP BY 1, 2
      UNION ALL
      SELECT period_start, 0, COUNT(*)
      FROM asof_grants WHERE is_active GROUP BY 1
    ),
    ncdef AS (
      SELECT
        period_start,
        region_id,
        COUNT(DISTINCT grant_id) FILTER (WHERE grant_is_active) grants_n,
        COUNT(DISTINCT citation_id) FILTER (WHERE grant_is_of_interest) open_n,
        COUNT(DISTINCT citation_id) FILTER (WHERE grant_is_of_interest AND is_overdue) overdue_n
      FROM asof_citation_grants
      WHERE is_open
        AND finding_type IN ('Noncompliance', 'Deficiency')
      GROUP BY 1, 2
      UNION ALL
      SELECT
        period_start,
        0,
        COUNT(DISTINCT grant_id) FILTER (WHERE grant_is_active),
        COUNT(DISTINCT citation_id) FILTER (WHERE grant_is_of_interest),
        COUNT(DISTINCT citation_id) FILTER (WHERE grant_is_of_interest AND is_overdue)
      FROM asof_citation_grants
      WHERE is_open
        AND finding_type IN ('Noncompliance', 'Deficiency')
      GROUP BY 1
    ),
    nc_reviews AS (
      SELECT period_start, region_id, COUNT(DISTINCT review_id) n
      FROM delivered_review_grants
      WHERE grant_is_of_interest
        AND outcome IN ('Non Compliant', 'Deficient')
      GROUP BY 1, 2
      UNION ALL
      SELECT period_start, 0, COUNT(DISTINCT review_id)
      FROM delivered_review_grants
      WHERE grant_is_of_interest
        AND outcome IN ('Non Compliant', 'Deficient')
      GROUP BY 1
    )
    SELECT d.period_start, d.region_id, s.stat_name, s.value
    FROM denom d
    CROSS JOIN citations_audit_start cs
    LEFT JOIN ncdef o
      ON o.period_start = d.period_start
      AND o.region_id = d.region_id
    LEFT JOIN nc_reviews r
      ON r.period_start = d.period_start
      AND r.region_id = d.region_id
    CROSS JOIN LATERAL (
      VALUES
        ('active_grant_count', d.n::numeric, TRUE),
        ('grants_with_open_ncdef_finding', COALESCE(o.grants_n, 0)::numeric,
          d.period_start >= cs.month_start),
        ('grants_with_open_ncdef_finding_fraction', ROUND(COALESCE(o.grants_n, 0)::numeric / d.n, 4),
          d.period_start >= cs.month_start),
        ('open_ncdef_findings', COALESCE(o.open_n, 0)::numeric,
          d.period_start >= cs.month_start),
        ('overdue_ncdef_findings', COALESCE(o.overdue_n, 0)::numeric,
          d.period_start >= cs.month_start),
        ('open_ncdef_findings_per_active_grant', ROUND(COALESCE(o.open_n, 0)::numeric / d.n, 4),
          d.period_start >= cs.month_start),
        ('noncompliant_reviews_delivered', COALESCE(r.n, 0)::numeric, TRUE),
        ('noncompliant_reviews_per_active_grant', ROUND(COALESCE(r.n, 0)::numeric / d.n, 4), TRUE)
    ) s(stat_name, value, defined)
    WHERE s.defined
    ;
    `,
    { raw: true, transaction }
  );

  const [, grantsMeta] = await sequelize.query(
    `
    INSERT INTO "ValidationTimeSeries"
      (feature_set, period_type, period_start, region_id, geo_id, stat_name, value, "createdAt", "updatedAt")
    SELECT 'monitoring_grants', 'month', period_start, region_id, 0, stat_name, value, NOW(), NOW()
    FROM monitoring_grants_rows
    ON CONFLICT (feature_set, period_type, period_start, region_id, geo_id, stat_name)
    DO UPDATE SET
      value = EXCLUDED.value,
      "updatedAt" = NOW()
    WHERE "ValidationTimeSeries".value IS DISTINCT FROM EXCLUDED.value
    ;
    `,
    { raw: true, transaction }
  );
  statsUpserted += affectedRows(grantsMeta);

  await sequelize.query(
    `
    DELETE FROM "ValidationTimeSeries" v
    USING validation_params p
    WHERE v.feature_set = 'monitoring_grants'
      AND v.period_type = 'month'
      AND v.period_start >= p.recompute_floor_month
      AND NOT EXISTS (
        SELECT 1 FROM monitoring_grants_rows t
        WHERE t.period_start = v.period_start
          AND t.region_id = v.region_id
          AND t.stat_name = v.stat_name
          AND v.geo_id = 0
      )
    ;
    `,
    { raw: true, transaction }
  );

  // monitoring_citations: citations delivered, bucketed on
  // initial_report_delivery_date, and citation status changes, read from the
  // Citations bands. delivered_citations keeps all history because the
  // Z-score baselines and each citation value's first appearance both reach
  // below the floor.
  //
  // - source: the regulation a citation value comes from (Head Start Program
  //   Performance Standards 1302, 45 CFR 75, the Head Start Act 6xx, or
  //   other).
  // - value_first_week: the week the citation value was first delivered on
  //   any citation.
  await sequelize.query(
    `
    DROP TABLE IF EXISTS delivered_citations;
    CREATE TEMP TABLE delivered_citations
    ON COMMIT DROP
    AS
    SELECT
      c.id citation_id,
      date_trunc('week', c.initial_report_delivery_date)::date delivered_week,
      date_trunc('month', c.initial_report_delivery_date)::date delivered_month,
      CASE
        WHEN c.citation ~ '^1302\\.' THEN 'hspps'
        WHEN c.citation ~ '^75\\.' THEN 'cfr_75'
        WHEN c.citation ~ '^6[0-9]{2}' THEN 'head_start_act'
        ELSE 'other'
      END source,
      btrim(lower(regexp_replace(c.calculated_category, '[^A-Za-z0-9]+', '_', 'g')), '_') category_slug,
      MIN(date_trunc('week', c.initial_report_delivery_date)) OVER (PARTITION BY c.citation)::date value_first_week
    FROM "Citations" c
    WHERE c."deletedAt" IS NULL
      AND c.initial_report_delivery_date IS NOT NULL
    ;

    -- One row per citation per week its calculated_status changed, with the
    -- region of each grant it was linked to at that moment (NULL if none).
    DROP TABLE IF EXISTS citation_status_changes;
    CREATE TEMP TABLE citation_status_changes
    ON COMMIT DROP
    AS
    WITH bands AS (
      SELECT
        data_id,
        timeband_start,
        "deletedAt",
        calculated_status,
        LAG(calculated_status) OVER (PARTITION BY data_id ORDER BY timeband_start) prev_status,
        ROW_NUMBER() OVER (PARTITION BY data_id ORDER BY timeband_start) band_seq
      FROM "Citations_timeseries"
    )
    SELECT
      b.data_id citation_id,
      date_trunc('week', b.timeband_start)::date period_start,
      gc.region_id
    FROM bands b
    LEFT JOIN "GrantCitations_timeseries" gc
      ON gc."citationId" = b.data_id
      AND gc.timeband_start <= b.timeband_start
      AND gc.timeband_end > b.timeband_start
    WHERE b.band_seq > 1
      AND b.prev_status IS DISTINCT FROM b.calculated_status
      AND b."deletedAt" IS NULL
    ;

    -- Weeks reach 52 below the floor so the weeks being recomputed have their
    -- full trailing baseline; only weeks at or above the floor are stored.
    DROP TABLE IF EXISTS citation_weeks;
    CREATE TEMP TABLE citation_weeks
    ON COMMIT DROP
    AS
    SELECT
      w::date period_start,
      w::date <= p.last_complete_week is_complete
    FROM validation_params p
    CROSS JOIN generate_series(
      GREATEST(
        date_trunc('week', p.time_series_start),
        p.recompute_floor_week - INTERVAL '52 weeks'
      ),
      p.current_week_start,
      INTERVAL '1 week'
    ) w
    ;

    -- National weekly counts, zero-filled from each series' first week so the
    -- trailing window is always the preceding 52 weeks. has_z marks the series
    -- that get a Z-score. citations_with_new_value starts six weeks after the
    -- first delivery, since nearly every value is new in the first weeks of
    -- data.
    DROP TABLE IF EXISTS citation_weekly_counts;
    CREATE TEMP TABLE citation_weekly_counts
    ON COMMIT DROP
    AS
    WITH series AS (
      SELECT 'citations_delivered' stat_name, '-infinity'::date series_start, TRUE has_z
      UNION ALL
      SELECT DISTINCT 'citations_delivered_' || category_slug, '-infinity'::date, TRUE
      FROM delivered_citations
      WHERE category_slug <> ''
      UNION ALL
      SELECT 'status_changes', week_start, TRUE
      FROM citations_audit_start
      UNION ALL
      SELECT 'citations_with_new_value', (MIN(delivered_week) + INTERVAL '6 weeks')::date, FALSE
      FROM delivered_citations
    ),
    counts AS (
      SELECT delivered_week period_start, 'citations_delivered' stat_name, COUNT(*) n
      FROM delivered_citations
      GROUP BY 1
      UNION ALL
      SELECT delivered_week, 'citations_delivered_' || category_slug, COUNT(*)
      FROM delivered_citations
      WHERE category_slug <> ''
      GROUP BY 1, 2
      UNION ALL
      SELECT delivered_week, 'citations_with_new_value', COUNT(*)
      FROM delivered_citations
      WHERE delivered_week = value_first_week
      GROUP BY 1
      UNION ALL
      SELECT period_start, 'status_changes', COUNT(DISTINCT citation_id)
      FROM citation_status_changes
      GROUP BY 1
    )
    SELECT
      w.period_start,
      w.is_complete,
      s.stat_name,
      s.has_z,
      COALESCE(c.n, 0)::numeric value
    FROM citation_weeks w
    JOIN series s
      ON w.period_start >= s.series_start
    LEFT JOIN counts c
      ON c.period_start = w.period_start
      AND c.stat_name = s.stat_name
    ;

    -- Z-scores need 20 trailing weeks, at least 20 events across them and a
    -- nonzero spread, and are computed for complete weeks only. Source mix
    -- shares are left out for months with fewer than 5 citations.
    DROP TABLE IF EXISTS monitoring_citations_rows;
    CREATE TEMP TABLE monitoring_citations_rows
    ON COMMIT DROP
    AS
    WITH weekly AS (
      SELECT
        c.*,
        COUNT(*) OVER w trailing_n,
        SUM(c.value) OVER w trailing_sum,
        AVG(c.value) OVER w trailing_avg,
        STDDEV_SAMP(c.value) OVER w trailing_sd
      FROM citation_weekly_counts c
      WINDOW w AS (PARTITION BY c.stat_name ORDER BY c.period_start ROWS BETWEEN 52 PRECEDING AND 1 PRECEDING)
    )
    SELECT 'week' period_type, w.period_start, 0 region_id, w.stat_name, w.value
    FROM weekly w
    CROSS JOIN validation_params p
    WHERE w.period_start >= p.recompute_floor_week
    UNION ALL
    SELECT 'week', w.period_start, 0, w.stat_name || '_z', ROUND((w.value - w.trailing_avg) / w.trailing_sd, 2)
    FROM weekly w
    CROSS JOIN validation_params p
    WHERE w.period_start >= p.recompute_floor_week
      AND w.has_z
      AND w.is_complete
      AND w.trailing_n >= 20
      AND w.trailing_sum >= 20
      AND w.trailing_sd > 0
    UNION ALL
    SELECT 'week', sc.period_start, sc.region_id, 'status_changes', COUNT(DISTINCT sc.citation_id)::numeric
    FROM citation_status_changes sc
    CROSS JOIN validation_params p
    WHERE sc.region_id IS NOT NULL
      AND sc.period_start >= p.recompute_floor_week
    GROUP BY 2, 3
    UNION ALL
    SELECT
      'month',
      dc.delivered_month,
      0,
      'source_share_' || s.source,
      ROUND(COUNT(*) FILTER (WHERE dc.source = s.source)::numeric / COUNT(*), 4)
    FROM delivered_citations dc
    CROSS JOIN (VALUES ('hspps'), ('cfr_75'), ('head_start_act'), ('other')) s(source)
    CROSS JOIN validation_params p
    WHERE dc.delivered_month >= GREATEST(p.recompute_floor_month, p.time_series_start)
    GROUP BY 2, 4
    HAVING COUNT(*) >= 5
    ;
    `,
    { raw: true, transaction }
  );

  const [, citationsMeta] = await sequelize.query(
    `
    INSERT INTO "ValidationTimeSeries"
      (feature_set, period_type, period_start, region_id, geo_id, stat_name, value, "createdAt", "updatedAt")
    SELECT 'monitoring_citations', period_type, period_start, region_id, 0, stat_name, value, NOW(), NOW()
    FROM monitoring_citations_rows
    ON CONFLICT (feature_set, period_type, period_start, region_id, geo_id, stat_name)
    DO UPDATE SET
      value = EXCLUDED.value,
      "updatedAt" = NOW()
    WHERE "ValidationTimeSeries".value IS DISTINCT FROM EXCLUDED.value
    ;
    `,
    { raw: true, transaction }
  );
  statsUpserted += affectedRows(citationsMeta);

  await sequelize.query(
    `
    DELETE FROM "ValidationTimeSeries" v
    USING validation_params p
    WHERE v.feature_set = 'monitoring_citations'
      AND (
        (v.period_type = 'week' AND v.period_start >= p.recompute_floor_week)
        OR (v.period_type = 'month' AND v.period_start >= p.recompute_floor_month)
      )
      AND NOT EXISTS (
        SELECT 1 FROM monitoring_citations_rows t
        WHERE t.period_type = v.period_type
          AND t.period_start = v.period_start
          AND t.region_id = v.region_id
          AND t.stat_name = v.stat_name
          AND v.geo_id = 0
      )
    ;
    `,
    { raw: true, transaction }
  );

  return statsUpserted;
};

export default updateMonitoringTimeSeries;
