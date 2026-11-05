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
 * ValidationTimeSeries. As of MVP, the full range since TIME_SERIES_START is
 * recomputed every run. Each stat is built into a temp table, upserted, then
 * reconciled. New stats are just new feature_set/stat_name values, no schema
 * change. Shared intermediates (e.g. finding_deliveries) are temp tables reused
 * by later stats. See docs/monitoring-data-validation.md for the process this
 * fits into, and docs/monitoring-validation-checks.md for what each stat below
 * means and why.
 *
 * @returns number of ValidationTimeSeries rows inserted or updated
 */
const updateMonitoringTimeSeries = async (transaction: Transaction): Promise<number> => {
  let statsUpserted = 0;

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
    JOIN "MonitoringReviewGrantees" mrg
      ON mrg."reviewId" = mr."reviewId"
      AND mrg."sourceDeletedAt" IS NULL
      AND mrg."deletedAt" IS NULL
    JOIN "Grants" gr
      ON gr.number = mrg."grantNumber"
      AND NOT gr.deleted
    WHERE mr."sourceDeletedAt" IS NULL
      AND mr."deletedAt" IS NULL
      AND mr."sourceCreatedAt" >= :timeSeriesStart
    GROUP BY 1, 2, 3
    ;
    `,
    { raw: true, transaction, replacements: { timeSeriesStart: TIME_SERIES_START } }
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
    WHERE v.feature_set = 'monitoring_reviews'
      AND v.period_type = 'week'
      AND v.stat_name = 'reviews_created'
      AND v.period_start >= date_trunc('week', :timeSeriesStart::date)::date
      AND NOT EXISTS (
        SELECT 1 FROM reviews_ts t
        WHERE t.period_start = v.period_start
          AND t.region_id = v.region_id
          AND t.geo_id = v.geo_id
      )
    ;
    `,
    { raw: true, transaction, replacements: { timeSeriesStart: TIME_SERIES_START } }
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
    WHERE fd.first_delivered >= :timeSeriesStart
    GROUP BY 1, 2, 3
    ;

    DROP TABLE IF EXISTS findings_national_ts;
    CREATE TEMP TABLE findings_national_ts
    AS
    SELECT
      date_trunc('month', fd.first_delivered)::date period_start,
      COUNT(DISTINCT fd.finding_uuid) value
    FROM finding_deliveries fd
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
    WHERE fd.first_delivered >= :timeSeriesStart
    GROUP BY 1
    ;
    `,
    { raw: true, transaction, replacements: { timeSeriesStart: TIME_SERIES_START } }
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
    WHERE v.feature_set = 'monitoring_findings'
      AND v.period_type = 'month'
      AND v.stat_name = 'findings_delivered'
      AND v.region_id <> 0
      AND v.period_start >= date_trunc('month', :timeSeriesStart::date)::date
      AND NOT EXISTS (
        SELECT 1 FROM findings_ts t
        WHERE t.period_start = v.period_start
          AND t.region_id = v.region_id
          AND t.geo_id = v.geo_id
      )
    ;

    DELETE FROM "ValidationTimeSeries" v
    WHERE v.feature_set = 'monitoring_findings'
      AND v.period_type = 'month'
      AND v.stat_name = 'findings_delivered'
      AND v.region_id = 0
      AND v.period_start >= date_trunc('month', :timeSeriesStart::date)::date
      AND NOT EXISTS (
        SELECT 1 FROM findings_national_ts t
        WHERE t.period_start = v.period_start
      )
    ;
    `,
    { raw: true, transaction, replacements: { timeSeriesStart: TIME_SERIES_START } }
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
    JOIN "GrantCitations" gc
      ON gc."citationId" = c.id
    JOIN "Grants" gr
      ON gr.id = gc."grantId"
      AND NOT gr.deleted
    WHERE c."deletedAt" IS NULL
      AND c.initial_report_delivery_date >= :timeSeriesStart
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
    WHERE c."deletedAt" IS NULL
      AND c.initial_report_delivery_date >= :timeSeriesStart
      AND c.calculated_finding_type IN ('Area of Concern', 'Deficiency', 'Noncompliance')
    GROUP BY 1, 2
    ;
    `,
    { raw: true, transaction, replacements: { timeSeriesStart: TIME_SERIES_START } }
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
    WHERE v.feature_set = 'monitoring_findings'
      AND v.period_type = 'month'
      AND v.stat_name LIKE 'findings\\_delivered\\_%'
      AND v.region_id <> 0
      AND v.period_start >= date_trunc('month', :timeSeriesStart::date)::date
      AND NOT EXISTS (
        SELECT 1 FROM findings_by_type_ts t
        WHERE t.period_start = v.period_start
          AND t.region_id = v.region_id
          AND t.geo_id = v.geo_id
          AND v.stat_name = 'findings_delivered_' || lower(replace(t.finding_type, ' ', '_'))
      )
    ;

    DELETE FROM "ValidationTimeSeries" v
    WHERE v.feature_set = 'monitoring_findings'
      AND v.period_type = 'month'
      AND v.stat_name LIKE 'findings\\_delivered\\_%'
      AND v.region_id = 0
      AND v.period_start >= date_trunc('month', :timeSeriesStart::date)::date
      AND NOT EXISTS (
        SELECT 1 FROM findings_by_type_national_ts t
        WHERE t.period_start = v.period_start
          AND v.stat_name = 'findings_delivered_' || lower(replace(t.finding_type, ' ', '_'))
      )
    ;
    `,
    { raw: true, transaction, replacements: { timeSeriesStart: TIME_SERIES_START } }
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
    JOIN "GrantCitations" gc
      ON gc."citationId" = c.id
    JOIN "Grants" gr
      ON gr.id = gc."grantId"
      AND NOT gr.deleted
    WHERE c."deletedAt" IS NULL
      AND c.closed_date IS NOT NULL
      AND c.closed_date >= :timeSeriesStart
    GROUP BY 1, 2, 3
    ;

    DROP TABLE IF EXISTS finding_closure_national_ts;
    CREATE TEMP TABLE finding_closure_national_ts
    AS
    SELECT
      date_trunc('month', c.closed_date)::date period_start,
      COUNT(DISTINCT c.id) value
    FROM "Citations" c
    WHERE c."deletedAt" IS NULL
      AND c.closed_date IS NOT NULL
      AND c.closed_date >= :timeSeriesStart
    GROUP BY 1
    ;
    `,
    { raw: true, transaction, replacements: { timeSeriesStart: TIME_SERIES_START } }
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
    WHERE v.feature_set = 'monitoring_finding_closure'
      AND v.period_type = 'month'
      AND v.stat_name = 'closure_count'
      AND v.region_id <> 0
      AND v.period_start >= date_trunc('month', :timeSeriesStart::date)::date
      AND NOT EXISTS (
        SELECT 1 FROM finding_closure_ts t
        WHERE t.period_start = v.period_start
          AND t.region_id = v.region_id
          AND t.geo_id = v.geo_id
      )
    ;

    DELETE FROM "ValidationTimeSeries" v
    WHERE v.feature_set = 'monitoring_finding_closure'
      AND v.period_type = 'month'
      AND v.stat_name = 'closure_count'
      AND v.region_id = 0
      AND v.period_start >= date_trunc('month', :timeSeriesStart::date)::date
      AND NOT EXISTS (
        SELECT 1 FROM finding_closure_national_ts t
        WHERE t.period_start = v.period_start
      )
    ;
    `,
    { raw: true, transaction, replacements: { timeSeriesStart: TIME_SERIES_START } }
  );

  // import_lag_days / source_lag_days / completion_gap_days. Reads the raw
  // audit log directly (not a fact table): none of these timestamps are
  // carried onto the fact tables.
  await sequelize.query(
    `
    -- Set once so the rest of this run (including refreshMonitoringAlerts,
    -- later in the same transaction) can read these instead of
    -- substituting/recomputing them per-statement - same pattern as
    -- runValidation.ts's validation_run temp table.
    DROP TABLE IF EXISTS pg_temp.validation_params;
    CREATE TEMP TABLE validation_params
    ON COMMIT DROP
    AS
    SELECT
      :timeSeriesStart::date time_series_start,
      :auditLogFloor::date audit_log_floor,
      date_trunc('week', NOW())::date current_week_start,
      (date_trunc('week', NOW()) - INTERVAL '1 week')::date last_complete_week,
      date_trunc('month', NOW())::date current_month_start,
      (date_trunc('month', NOW()) - INTERVAL '1 month')::date last_complete_month
    ;

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
      AND mr."reportDeliveryDate" >= p.time_series_start
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
    {
      raw: true,
      transaction,
      replacements: { timeSeriesStart: TIME_SERIES_START, auditLogFloor: AUDIT_LOG_FLOOR },
    }
  );

  // Narrow (stat_name, period_start, value) shape so the reconcile below can
  // key on exactly the rows this run produces per stat, including weeks where
  // elevated_z has no value.
  await sequelize.query(
    `
    DROP TABLE IF EXISTS report_delivery_lag_rows;
    CREATE TEMP TABLE report_delivery_lag_rows
    AS
    SELECT 'import_lag_elevated_z' stat_name, period_start, import_elevated_z value
    FROM report_delivery_lag_national_ts WHERE import_elevated_z IS NOT NULL
    UNION ALL
    SELECT 'import_lag_elevated_count', period_start, import_elevated_count
    FROM report_delivery_lag_national_ts
    UNION ALL
    SELECT 'import_lag_sample_count', period_start, import_sample_count
    FROM report_delivery_lag_national_ts
    UNION ALL
    SELECT 'source_lag_elevated_z', period_start, source_elevated_z
    FROM report_delivery_lag_national_ts WHERE source_elevated_z IS NOT NULL
    UNION ALL
    SELECT 'source_lag_elevated_count', period_start, source_elevated_count
    FROM report_delivery_lag_national_ts
    UNION ALL
    SELECT 'source_lag_sample_count', period_start, source_sample_count
    FROM report_delivery_lag_national_ts
    UNION ALL
    SELECT 'completion_gap_elevated_z', period_start, completion_elevated_z
    FROM report_delivery_lag_national_ts WHERE completion_elevated_z IS NOT NULL
    UNION ALL
    SELECT 'completion_gap_elevated_count', period_start, completion_elevated_count
    FROM report_delivery_lag_national_ts
    UNION ALL
    SELECT 'completion_gap_sample_count', period_start, completion_sample_count
    FROM report_delivery_lag_national_ts
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
      AND v.period_start >= date_trunc('week', p.time_series_start)::date
      AND NOT EXISTS (
        SELECT 1 FROM report_delivery_lag_rows t
        WHERE t.period_start = v.period_start AND t.stat_name = v.stat_name
      )
    ;
    `,
    { raw: true, transaction }
  );

  return statsUpserted;
};

export default updateMonitoringTimeSeries;
