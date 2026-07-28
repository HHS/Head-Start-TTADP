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
 * Upserts time-series aggregated statistics describing Monitoring data activity
 * into ValidationTimeSeries (long/narrow; sliced by region_id / geo_id, where
 * 0 = not applicable/unknown). The full range since TIME_SERIES_START is
 * recomputed every run, so late-arriving data self-corrects; new stats are
 * added by inserting new feature_set/stat_name values, no schema change
 * required.
 *
 * Shared intermediate results are built as temp tables (finding_deliveries)
 * so future time series calculations can reuse them.
 *
 * Skeleton: two example statistics. Consumers include the threshold checks in
 * ./monitoringAlerts and, in the future, anomaly-detection models.
 *
 * @returns number of ValidationTimeSeries rows inserted or updated
 */
const updateMonitoringTimeSeries = async (transaction: Transaction): Promise<number> => {
  let statsUpserted = 0;

  // reviews_created: weekly count of distinct reviews first created in ITAMS,
  // sliced by region/geographic region. Bucketed on "sourceCreatedAt" (ITAMS
  // activity) rather than "createdAt" (our import time) so that import
  // backfills don't register as spikes. A review spanning grants in multiple
  // regions counts once in each region slice.
  const [, reviewsMeta] = await sequelize.query(
    `
    INSERT INTO "ValidationTimeSeries"
      (feature_set, period_type, period_start, region_id, geo_id, stat_name, value, "createdAt", "updatedAt")
    SELECT
      'monitoring_reviews',
      'week',
      date_trunc('week', mr."sourceCreatedAt")::date,
      gr."regionId",
      COALESCE(gr."geographicRegionId", 0),
      'reviews_created',
      COUNT(DISTINCT mr."reviewId"),
      NOW(),
      NOW()
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
    GROUP BY 3, 4, 5
    ON CONFLICT (feature_set, period_type, period_start, region_id, geo_id, stat_name)
    DO UPDATE SET
      value = EXCLUDED.value,
      "updatedAt" = NOW()
    WHERE "ValidationTimeSeries".value IS DISTINCT FROM EXCLUDED.value
    ;
    `,
    { raw: true, transaction, replacements: { timeSeriesStart: TIME_SERIES_START } }
  );
  statsUpserted += affectedRows(reviewsMeta);

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

  // findings_delivered: monthly count of distinct findings by first delivery.
  // Region slice via MonitoringFindingGrants -> MonitoringReviewGrantees ->
  // Grants (the same chain updateMonitoringFactTables uses for citation grants).
  const [, findingsMeta] = await sequelize.query(
    `
    INSERT INTO "ValidationTimeSeries"
      (feature_set, period_type, period_start, region_id, geo_id, stat_name, value, "createdAt", "updatedAt")
    SELECT
      'monitoring_findings',
      'month',
      date_trunc('month', fd.first_delivered)::date,
      gr."regionId",
      COALESCE(gr."geographicRegionId", 0),
      'findings_delivered',
      COUNT(DISTINCT fd.finding_uuid),
      NOW(),
      NOW()
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
    GROUP BY 3, 4, 5
    ON CONFLICT (feature_set, period_type, period_start, region_id, geo_id, stat_name)
    DO UPDATE SET
      value = EXCLUDED.value,
      "updatedAt" = NOW()
    WHERE "ValidationTimeSeries".value IS DISTINCT FROM EXCLUDED.value
    ;
    `,
    { raw: true, transaction, replacements: { timeSeriesStart: TIME_SERIES_START } }
  );
  statsUpserted += affectedRows(findingsMeta);

  return statsUpserted;
};

export default updateMonitoringTimeSeries;
