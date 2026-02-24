/* eslint-disable no-console */

import { sequelize } from '../models';

const updateMonitoringFactTables = async () => {
  console.info('Starting Monitoring fact table update');
  await sequelize.query(
    `
    SELECT
      set_config('audit.loggedUser', '0', TRUE) as "loggedUser",
      set_config('audit.transactionId', NULL, TRUE) as "transactionId",
      set_config('audit.sessionSig', 'UpdateMonitoringFactTables' || NOW()::text, TRUE) as "sessionSig",
      set_config('audit.auditDescriptor', 'UpdateMonitoringFactTables', TRUE) as "auditDescriptor";

    -- Collect all potentially valid grant-review combinations
    DROP TABLE IF EXISTS all_grant_reviews;
    CREATE TEMP TABLE all_grant_reviews
    AS
    WITH monitoring_dates AS (SELECT '2025-01-21'::date monitoring_start_date),
    grant_recipients AS (
    SELECT
      r.id rid,
      r.name AS rname,
      gr."regionId" region,
      gr.id grid,
      gr.number grnumber,
      gr.status grstatus
    FROM "Recipients" r
    JOIN "Grants" gr
      ON r.id = gr."recipientId"
    WHERE NOT gr.deleted
    )
    SELECT DISTINCT
      mr.id mrid,
      rid,
      rname,
      region,
      grid,
      grnumber,
      grstatus,
      mr."reviewId" review_uuid,
      mr."reviewType" review_type,
      mrs.name review_status,
      mr."reportDeliveryDate"::date rdd,
      mr."startDate" rsd,
      mr."sourceCreatedAt" rsc
    FROM grant_recipients
    JOIN "MonitoringReviewGrantees" mrg
      ON grnumber = mrg."grantNumber"
    JOIN "MonitoringReviews" mr
      ON mrg."reviewId" = mr."reviewId"
    JOIN "MonitoringReviewStatuses" mrs
      ON mr."statusId" = mrs."statusId"
    CROSS JOIN monitoring_dates
    WHERE mr."deletedAt" IS NULL 
      AND (
        mr."reportDeliveryDate" > monitoring_start_date
        OR
        mr."sourceCreatedAt" > monitoring_start_date
      )
    ;

    -- Collapse down to a single record per review to
    -- yeild a list of all possible reviews of interest
    DROP TABLE IF EXISTS all_reviews;
    CREATE TEMP TABLE all_reviews
    AS
    SELECT
      mrid,
      rid,
      region,
      ARRAY_AGG(grid) grids,
      review_uuid,
      review_type,
      review_status,
      rdd,
      rsd,
      rsc
    FROM all_grant_reviews
    GROUP BY 1,2,3,5,6,7,8,9,10
    ;

    -- Collapse down to a single record per grant to
    -- yeild a list of all possible grants of interest
    DROP TABLE IF EXISTS all_grants;
    CREATE TEMP TABLE all_grants
    SELECT DISTINCT
      rid,
      rname,
      region,
      grid,
      grnumber,
      grstatus
    FROM all_grant_reviews
    ;

    -- DROP TABLE IF EXISTS monitoring_goals;
    CREATE TEMP TABLE monitoring_goals
    AS
    SELECT DISTINCT ON (g.id)
      g.id gid,
      grid goal_grid,
      "activeGrantId" active_grid,
      "performedAt" latest_goal_closure
    FROM all_grants
    JOIN "GrantRelationshipToActive" grta
      ON grid = grta."grantId"
    JOIN "Goals" g
      ON g."grantId" = grid
      OR g."grantId" = grta."activeGrantId"
    JOIN "GoalTemplates" gt
      ON g."goalTemplateId" = gt.id
      AND standard = 'Monitoring'
    LEFT JOIN "GoalStatusChanges" gsc
      ON g.id = gsc."goalId"
      AND "newStatus" = 'Closed'
    ORDER BY g.id, "performedAt" DESC
    ;

    DROP TABLE IF EXISTS denormed_findings;
    CREATE TEMP TABLE denormed_findings
    AS
    SELECT DISTINCT
      mf."findingId" finding_uuid,
      mfss.name raw_status,
      mf."findingType" raw_finding_type,
      mf.source source_category,
      mf."correctionDeadLine" finding_deadline,
      mf."reportedDate"::date reported_date,
      mf."closedDate"::date closed_date,
      ms.citation,
      ms.text standard_text,
      ms.guidance guidance_category
    FROM all_reviews
    JOIN "MonitoringFindingHistories" mfh
      ON review_uuid = mfh."reviewId"
      AND rdd IS NOT NULL
    JOIN "MonitoringFindings" mf
      ON mfh."findingId" = mf."findingId"
    JOIN "MonitoringFindingStatuses" mfss
      ON mf."statusId" = mfss."statusId"
    JOIN "MonitoringFindingStandards" mfst
      ON mf."findingId" = mfst."findingId"
    JOIN "MonitoringStandards" ms
      ON mfst."standardId" = ms."standardId"
    ;
      

    DROP TABLE IF EXISTS latest_citation_reviews;
    CREATE TEMP TABLE latest_citation_reviews
    AS
    SELECT DISTINCT ON (finding_uuid)
      finding_uuid,
      raw_status,
      raw_finding_type,
      regexp_replace(
        COALESCE(mfh.determination, raw_finding_type),
        '^Concern$',
        'Area of Concern'
      ) calculated_finding_type,
      source_category,
      finding_deadline,
      reported_date,
      closed_date,
      citation,
      standard_text,
      guidance_category,
      rid recipient_id,
      region region_id,
      grid latest_grant_id,
      review_uuid latest_review_uuid,
      mfh.narrative latest_narrative,
      mfh.determination latest_determination,
      rdd latest_report_delivery_date,
      latest_goal_closure
    FROM denormed_findings df
    JOIN "MonitoringFindingHistories" mfh
      ON finding_uuid = mfh."findingId"
    JOIN all_reviews
      ON mfh."reviewId" = review_uuid
      AND rdd IS NOT NULL
    LEFT JOIN monitoring_goals
      ON grid = goal_grid
      OR grid = active_grid
    ORDER BY 1,rdd DESC, latest_goal_closure DESC NULLS LAST, rsd DESC, rsc DESC
    ;
    
    DROP TABLE IF EXISTS current_citation_reviews;
    CREATE TEMP TABLE current_citation_reviews
    AS
    SELECT DISTINCT ON (finding_uuid)
      finding_uuid,
      raw_status,
      CASE
        WHEN calculated_finding_type = 'Area of Concern' AND latest_goal_closure > latest_report_delivery_date THEN 'Closed'
        WHEN rdd IS NOT NULL AND review_status = 'Complete' THEN raw_status
        ELSE 'Active'
      END calculated_status,
      raw_finding_type,
      calculated_finding_type,
      source_category,
      finding_deadline,
      reported_date,
      closed_date,
      citation,
      standard_text,
      guidance_category,
      recipient_id,
      region_id,
      latest_grant_id,
      latest_review_uuid,
      latest_narrative,
      latest_determination,
      latest_report_delivery_date,
      latest_goal_closure
    FROM latest_citation_reviews lcr
    JOIN "MonitoringFindingHistories" mfh
      ON finding_uuid = mfh."findingId"
    JOIN all_reviews
      ON mfh."reviewId" = review_uuid
    ORDER BY 1,rdd DESC NULLS FIRST, rsd DESC, rsc DESC
    ;

    DROP TABLE IF EXISTS full_citation_reviews;
    CREATE TEMP TABLE full_citation_reviews
    AS
    SELECT DISTINCT ON (finding_uuid)
      finding_uuid,
      raw_status,
      calculated_status,
      raw_finding_type,
      calculated_finding_type,
      source_category,
      finding_deadline,
      reported_date,
      closed_date,
      citation,
      standard_text,
      guidance_category,
      rid recipient_id,
      region region_id,
      grid initial_grant_id,
      review_uuid initial_review_uuid,
      mfh.narrative initial_narrative,
      mfh.determination initial_determination,
      rdd initial_report_delivery_date,
      latest_grant_id,
      latest_review_uuid,
      latest_narrative,
      latest_determination,
      latest_report_delivery_date,
      latest_goal_closure,
      CASE
        WHEN calculated_status IN ('Active','Elevated Deficiency') THEN CURRENT_DATE + 1
        ELSE latest_report_delivery_date
      END active_through
    FROM current_citation_reviews ccr
    JOIN "MonitoringFindingHistories" mfh
      ON finding_uuid = mfh."findingId"
    JOIN all_reviews
      ON mfh."reviewId" = review_uuid
    ORDER BY 1,rdd NULLS LAST, rsd, rsc
    ;
    -- Create the GrantCitations junction record set
    DROP TABLE IF EXISTS citation_grants;
    CREATE TEMP TABLE citation_grants
    AS
    SELECT
    `,
    { raw: true },
  );
  console.info('Monitoring fact table update complete');
};

export default updateMonitoringFactTables;
