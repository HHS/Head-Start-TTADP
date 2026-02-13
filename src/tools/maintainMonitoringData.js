/* eslint-disable no-multi-str */
/* eslint-disable no-console */

import { sequelize } from '../models'

const maintainMonitoringData = async () => {
  console.info('Starting Monitoring data maintenance')
  const result = await sequelize.query(
    `
    -------------------------------------------------------------
    -- This marks source-deleted Monitoring data with deletedAt
    -- It also clears away "deletedAt" if the sourceDeletedAt is
    -- updated to null
    -- 
    -- It also clears away all Monitoring table "updates" that
    -- are only sourceUpdatedAt & and updatedAt changes, except
    -- the latest one. These take up lots of space and provide no
    -- value.
    -------------------------------------------------------------

    -- If running manually, start with the BEGIN; below and run
    -- through COMMIT; at the end, uncommenting both.
    -- BEGIN;
    set maint.tableset = '{
        "MonitoringClassSummaries",
        "MonitoringFindings",
        "MonitoringFindingStatuses",
        "MonitoringFindingStandards",
        "MonitoringFindingGrants",
        "MonitoringFindingHistories",
        "MonitoringFindingHistoryStatuses",
        "MonitoringReviews",
        "MonitoringReviewStatuses",
        "MonitoringReviewGrantees",
        "MonitoringStandards"
        }';

    SELECT
      set_config('audit.loggedUser', '0', TRUE) as "loggedUser",
      set_config('audit.transactionId', NULL, TRUE) as "transactionId",
      set_config('audit.sessionSig', 'MonitoringMaintenance' || NOW()::text, TRUE) as "sessionSig",
      set_config('audit.auditDescriptor', 'MonitoringMaintenance', TRUE) as "auditDescriptor";

    -- softdelete Goals that have been deleted at the source
    -- This is a simple process because the Monitoring data import process
    -- updates sourceDeletedAt to null if the record comes back.
    CREATE OR REPLACE PROCEDURE softdelete_sourcedeleted(IN tablename TEXT)
    LANGUAGE plpgsql
    AS $$
    DECLARE
      querytxt TEXT;
    BEGIN
    querytxt := FORMAT ('
    CREATE TEMP TABLE %I
    AS
    WITH delset AS (
    SELECT
      id tid,
      CASE
        WHEN "sourceDeletedAt" IS NOT NULL THEN NOW()
        ELSE NULL::timestamptz
      END AS deleted_at
    FROM %I
    WHERE
      ("sourceDeletedAt" IS NOT NULL AND "deletedAt" IS NULL)
      OR
      ("sourceDeletedAt" IS NULL AND "deletedAt" IS NOT NULL)
    ),
    del AS (
    UPDATE %I t
    SET
      "deletedAt" = deleted_at
    FROM delset
    WHERE id = tid
    RETURNING
      t.id tid,
      deleted_at
    )
    SELECT * FROM del
    ','sourcedel' || tablename,tablename,tablename);
    EXECUTE querytxt;
    END;
    $$;

    CREATE OR REPLACE PROCEDURE clean_monitoring_audit_log(IN tablename TEXT)
    LANGUAGE plpgsql
    AS $$
    DECLARE
      querytxt TEXT;
    BEGIN
    querytxt := FORMAT ('
    CREATE TEMP TABLE %I
    AS
    WITH last_updates AS (
    SELECT DISTINCT ON (data_id)
      data_id did, id zid
    FROM %I
    WHERE new_row_data->''updatedAt'' IS NOT NULL
    ORDER BY data_id, id DESC
    ),
    del AS (
    DELETE FROM %I t
    USING %I z
    LEFT JOIN last_updates
      ON zid = z.id
    WHERE t.id = z.id
      AND zid IS NULL
      AND NULLIF(t.new_row_data - ''updatedAt'' - ''sourceUpdatedAt'' - ''createTime'' - ''updateTime'',''{}'') IS NULL
    RETURNING t.id tid
    )
    SELECT * FROM del
    ','del' || tablename,'ZAL' || tablename,'ZAL' || tablename,'ZAL' || tablename);
    EXECUTE querytxt;
    END;
    $$;

    DO
    $$
    DECLARE
      tlist TEXT[] := current_setting('maint.tableset');
      tname TEXT;
    BEGIN
      FOREACH tname IN ARRAY tlist
      LOOP
        CALL softdelete_sourcedeleted(tname);
      END LOOP;
    END
    $$;
    

    -- clean up useless audit log entries
    SELECT "ZAFSetTriggerState"(null, null, null, 'DISABLE');
    DO
    $$
    DECLARE
      tlist TEXT[] := current_setting('maint.tableset');
      tname TEXT;
    BEGIN
      FOREACH tname IN ARRAY tlist
      LOOP
        CALL clean_monitoring_audit_log(tname);
      END LOOP;
    END
    $$;
    SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');
    
    -- This lists the change in the number of findings on reviews
    -- due to deletion or undeletion activity. Thus negative numbers
    -- are findings being deleted and positive numbers are findings
    -- being restored from prior deletion
    SELECT
      'Finding deletion activity in Review:' || mr.name review,
      gr.number grant_number,
      "regionId" region,
      COUNT(DISTINCT t."findingId") FILTER (WHERE deleted_at IS NULL) -
      COUNT(DISTINCT t."findingId") FILTER (WHERE deleted_at IS NOT NULL) 
      AS change
    FROM "sourcedelMonitoringFindings"
    JOIN "MonitoringFindings" t
      ON t.id = tid
    JOIN "MonitoringFindingHistories" mfh
      ON t."findingId" = mfh."findingId"
    JOIN "MonitoringReviews" mr
      ON mfh."reviewId" = mr."reviewId"
    JOIN "MonitoringReviewGrantees" mrg
      ON mfh."reviewId" = mrg."reviewId"
    JOIN "Grants" gr
      ON mrg."grantNumber" = gr.number
    GROUP BY 1,2,3
    ORDER BY 3,2,1;
    
    -- COMMIT;
    `,
    { raw: true }
  )
  console.info(`Recent Finding Deletion or Undeletions: ${JSON.stringify(result[0])}`)
}

export default maintainMonitoringData
