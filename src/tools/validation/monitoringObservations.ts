import type { Transaction } from 'sequelize';
import { VALIDATION_PROCESS } from '../../constants';
import { sequelize } from '../../models';

/**
 * Rebuilds per-entity observations in ValidationRecords for the monitoring
 * process. Each row records one observation about one entity
 * (entity_type/entity_id): a continuous measurement in "scalar" (e.g. the
 * number of findings on a review) or a categorization in "category" (e.g. a
 * finding's closure consistency). Observations are raw material for
 * validations - the checks in ./monitoringAlerts and, in the future,
 * anomaly-detection models - and let a human drill into the specific entities
 * behind an alert.
 *
 * The current run id is read from the validation_run temp table created by the
 * orchestrator (src/tools/validateMonitoringData.ts).
 *
 * Retention is CYCLE-aware: this table keeps the current run and the latest run
 * of the previous cycle (a different import_id, i.e. a different version of the
 * imported data), so comparison is always against a different data version rather
 * than a re-run over the same data. Re-running a process on the same cycle
 * therefore replaces that cycle's prior run here. NOTE: a fuller retention /
 * archival strategy is future work.
 *
 * Skeleton: four example observations.
 */
const refreshMonitoringObservations = async (transaction: Transaction): Promise<void> => {
  // Keep only the current run and the latest run of the most recent EARLIER cycle
  // (a different import_id / data version), scoped through
  // ValidationRuns.process_name so other processes are untouched. This drops any
  // prior run of the CURRENT cycle (a same-cycle re-run replaces its data) while
  // preserving a different data version to compare against.
  await sequelize.query(
    `
    WITH cur AS (
      SELECT r.id AS run_id, r.import_id
      FROM "ValidationRuns" r
      JOIN validation_run v ON v.run_id = r.id
    ),
    prev_cycle_run AS (
      SELECT r.id AS run_id
      FROM "ValidationRuns" r
      CROSS JOIN cur
      WHERE r.process_name = :processName
        AND r.id <> cur.run_id
        AND r.import_id IS DISTINCT FROM cur.import_id
      ORDER BY r.id DESC
      LIMIT 1
    ),
    keep AS (
      SELECT run_id FROM cur
      UNION
      SELECT run_id FROM prev_cycle_run
    )
    DELETE FROM "ValidationRecords" rec
    USING "ValidationRuns" r
    WHERE rec.run_id = r.id
      AND r.process_name = :processName
      AND rec.run_id NOT IN (SELECT run_id FROM keep)
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
    -- when that delivery date first showed up in the imported ITAMS data
    -- (the sourceUpdatedAt on the earliest audit row where reportDeliveryDate
    -- appeared). A large lag means we learned about a delivered review well
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
      (run_id, entity_type, entity_id, observation_name, scalar, "createdAt", "updatedAt")
    SELECT
      cur.run_id,
      'MonitoringReviews',
      mr.id,
      'delivery_report_lag_days',
      fds.set_date - mr."reportDeliveryDate"::date,
      NOW(),
      NOW()
    FROM "MonitoringReviews" mr
    CROSS JOIN validation_run cur
    JOIN first_delivery_set fds
      ON fds.data_id = mr.id
    WHERE mr."sourceDeletedAt" IS NULL
      AND mr."deletedAt" IS NULL
      AND mr."reportDeliveryDate" IS NOT NULL
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

    -- closure_state: a finding whose status is Active should not carry a
    -- closedDate; categorize each finding's consistency
    WITH known_statuses AS (
    SELECT DISTINCT
      "statusId",
      name
    FROM "MonitoringFindingStatuses"
    WHERE "sourceDeletedAt" IS NULL
      AND "deletedAt" IS NULL
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
    `,
    { raw: true, transaction }
  );
};

export default refreshMonitoringObservations;
