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

/**
 * Upserts long/narrow time-series statistics describing Monitoring activity into
 * ValidationTimeSeries. As of MVP, the full range since TIME_SERIES_START is
 * recomputed every run. Each stat is built into a temp table, upserted, then
 * reconciled. New stats are just new feature_set/stat_name values, no schema
 * change. Shared intermediates (e.g. finding_deliveries) are temp tables reused
 * by later stats. See docs/monitoring-data-validation.md.
 *
 * Skeleton: two example statistics.
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

  return statsUpserted;
};

export default updateMonitoringTimeSeries;
