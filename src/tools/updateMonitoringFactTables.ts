/* eslint-disable no-console */

import { sequelize } from '../models';
import { prepMigration } from '../lib/migration';

/**
 * Creates or replaces citations_live_values and deliveredreviews_live_values.
 *
 * This is the canonical definition of both views. They are recreated nightly as part
 * of updateMonitoringFactTables, and exported so that migrations can call this function
 * directly — ensuring fresh environments and CI always get the current definitions without
 * any SQL being duplicated.
 *
 * A new migration that calls this function is only needed if you need existing deployed
 * environments to pick up a view change before the next nightly pipeline run (e.g., when
 * deploying application code that depends on a new view column).
 *
 * NOTE: If this file is ever moved or renamed, update the require() path in any migration
 * that imports it (currently 20260424000000-create_live_values_views.js).
 */
export const recreateLiveValuesViews = async (
  queryInterface: ReturnType<typeof sequelize.getQueryInterface>,
  transaction: import('sequelize').Transaction,
) => {
  await queryInterface.sequelize.query(`
    CREATE OR REPLACE VIEW citations_live_values
    AS
    WITH last_ar AS (
    SELECT DISTINCT ON (aroc."citationId")
      aroc."citationId" ar_cid,
      ar."startDate" last_tta,
      ar.id last_ar_id
    FROM "ActivityReportObjectiveCitations" aroc
    JOIN "ActivityReportObjectives" aro
      ON aro.id = aroc."activityReportObjectiveId"
    JOIN "ActivityReports" ar
      ON ar.id = aro."activityReportId"
    WHERE ar."calculatedStatus" = 'approved'
    ORDER BY 1,2 DESC NULLS LAST
    ),
    last_goal AS (
    SELECT DISTINCT ON (gc."citationId")
      gc."citationId" g_cid,
      gsc."performedAt" last_closed_goal,
      g.id last_closed_goal_id
    FROM "GrantCitations" gc
    JOIN "Goals" g
      ON g."grantId" = gc."grantId"
    JOIN "GoalTemplates" gt
      ON g."goalTemplateId" = gt.id
      AND gt.standard = 'Monitoring'
    JOIN "GoalStatusChanges" gsc
      ON gsc."goalId" = g.id AND gsc."newStatus" = 'Closed'
    WHERE g."deletedAt" IS NULL
    ORDER BY 1,2 DESC NULLS LAST
    )
    SELECT
      c.id,
      la.last_tta,
      la.last_ar_id,
      lg.last_closed_goal,
      lg.last_closed_goal_id
    FROM "Citations" c
    LEFT JOIN last_ar la
      ON id = ar_cid
    LEFT JOIN last_goal lg
      ON id = g_cid
    WHERE c."deletedAt" IS NULL
    ;
  `, { transaction });

  await queryInterface.sequelize.query(`
    CREATE OR REPLACE VIEW deliveredreviews_live_values
    AS
    WITH last_ar AS (
    SELECT DISTINCT ON (drc."deliveredReviewId")
      drc."deliveredReviewId" ar_drid,
      ar."startDate" last_tta,
      ar.id last_ar_id
    FROM "DeliveredReviewCitations" drc
    JOIN "Citations" c
      ON c.id = drc."citationId"
      AND c."deletedAt" IS NULL
    JOIN "ActivityReportObjectiveCitations" aroc
      ON aroc."citationId" = c.id
    JOIN "ActivityReportObjectives" aro
      ON aro.id = aroc."activityReportObjectiveId"
    JOIN "ActivityReports" ar
      ON ar.id = aro."activityReportId"
    WHERE ar."calculatedStatus" = 'approved'
    ORDER BY 1,2 DESC NULLS LAST
    ),
    last_goal AS (
    SELECT DISTINCT ON (gdr."deliveredReviewId")
      gdr."deliveredReviewId" g_drid,
      gsc."performedAt" last_closed_goal,
      g.id last_closed_goal_id
    FROM "GrantDeliveredReviews" gdr
    JOIN "Goals" g
      ON g."grantId" = gdr."grantId"
    JOIN "GoalTemplates" gt
      ON g."goalTemplateId" = gt.id
      AND gt.standard = 'Monitoring'
    JOIN "GoalStatusChanges" gsc
      ON gsc."goalId" = g.id AND gsc."newStatus" = 'Closed'
    WHERE g."deletedAt" IS NULL
    ORDER BY 1,2 DESC NULLS LAST
    )
    SELECT
      dr.id,
      la.last_tta,
      la.last_ar_id,
      lg.last_closed_goal,
      lg.last_closed_goal_id
    FROM "DeliveredReviews" dr
    LEFT JOIN last_ar la
      ON id = ar_drid
    LEFT JOIN last_goal lg
      ON id = g_drid
    WHERE dr."deletedAt" IS NULL
    ;
  `, { transaction });
};

const updateMonitoringFactTables = async () => {
  console.info('Starting Monitoring fact table update');
  await sequelize.transaction(async (transaction) => {
    await prepMigration(
      sequelize.getQueryInterface(),
      transaction,
      `UpdateMonitoringFactTables${new Date().toISOString()}`,
      'UpdateMonitoringFactTables',
    );

    await sequelize.query(
      `
    SET LOCAL TIME ZONE 'UTC';

    ----------------------------------
    -- Primary Entity Data Creation --
    ----------------------------------

      -- Collect all potentially valid grant-review combinations
    -- This includes non-delivered reviews that are ineligible for direct use
    -- or exposure to the user, but are used to determine whether Findings are
    -- effectively "Active" due to having undelivered reviews outstanding
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
    SELECT DISTINCT ON (review_uuid,grid)
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
      mr.name review_name,
      mr."reportDeliveryDate"::date rdd,
      mr."startDate" rsd,
      mr."endDate" red,
      mr.outcome,
      mr."sourceCreatedAt" rsc
    FROM grant_recipients
    JOIN "MonitoringReviewGrantees" mrg
      ON grnumber = mrg."grantNumber"
      AND mrg."sourceDeletedAt" IS NULL
    JOIN "MonitoringReviews" mr
      ON mrg."reviewId" = mr."reviewId"
    JOIN "MonitoringReviewStatuses" mrs
      ON mr."statusId" = mrs."statusId"
    CROSS JOIN monitoring_dates
    WHERE mr."deletedAt" IS NULL
      AND mr."sourceDeletedAt" IS NULL 
      AND (
        mr."reportDeliveryDate" > monitoring_start_date
        OR
        mr."sourceCreatedAt" > monitoring_start_date
      )
    ORDER BY review_uuid, grid, mr.id
    ;

    -- Collapse down to a single record per review to
    -- yield a list of all possible reviews of interest
    DROP TABLE IF EXISTS all_reviews;
    CREATE TEMP TABLE all_reviews
    AS
    SELECT
      MIN(mrid) mrid,
      review_uuid,
      review_type,
      review_status,
      review_name,
      rdd,
      rsd,
      red,
      outcome,
      rsc
    FROM all_grant_reviews
    GROUP BY 2,3,4,5,6,7,8,9,10
    ;

    -- Collapse down to a single record per grant to
    -- yield a list of all possible grants of interest
    DROP TABLE IF EXISTS all_grants;
    CREATE TEMP TABLE all_grants
    AS
    SELECT DISTINCT
      rid,
      rname,
      region,
      grid,
      grnumber,
      grstatus
    FROM all_grant_reviews
    ;


    -- Collect all the relevant monitoring Goals
    -- and when they were most recently closed
    DROP TABLE IF EXISTS monitoring_goals;
    CREATE TEMP TABLE monitoring_goals
    AS
    SELECT DISTINCT ON (grid)
      grid goal_grid,
      g.id gid,
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
    ORDER BY grid, "performedAt" DESC NULLS LAST
    ;

    -- Connect Findings of interest to their raw/naive statuses plus
    -- the citation and other information from FindingStandards
    DROP TABLE IF EXISTS denormed_findings;
    CREATE TEMP TABLE denormed_findings
    AS
    SELECT DISTINCT
      mf.id mfid,
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
      AND mfh."sourceDeletedAt" IS NULL
    JOIN "MonitoringFindings" mf
      ON mfh."findingId" = mf."findingId"
      AND mf."sourceDeletedAt" IS NULL
    JOIN "MonitoringFindingStatuses" mfss
      ON mf."statusId" = mfss."statusId"
    JOIN "MonitoringFindingStandards" mfst
      ON mf."findingId" = mfst."findingId"
      AND mfst."sourceDeletedAt" IS NULL
    JOIN "MonitoringStandards" ms
      ON mfst."standardId" = ms."standardId"
      AND ms."sourceDeletedAt" IS NULL
    ;

    -- Connect findings to their most recent DELIVERED review and also
    -- mark it with the finding type based on that finding history as
    -- well as pull in the latest Monitoring Goal closure, which we
    -- use to decide whether Findings are considered to have been
    -- addressed by TTA staff.
    DROP TABLE IF EXISTS latest_citation_reviews;
    CREATE TEMP TABLE latest_citation_reviews
    AS
    SELECT DISTINCT ON (finding_uuid)
      mfid,
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
      review_uuid latest_review_uuid,
      mfh.narrative latest_narrative,
      mfh.determination latest_determination,
      rdd latest_report_delivery_date,
      latest_goal_closure
    FROM denormed_findings df
    JOIN "MonitoringFindingHistories" mfh
      ON finding_uuid = mfh."findingId"
      AND mfh."sourceDeletedAt" IS NULL
    JOIN all_grant_reviews
      ON mfh."reviewId" = review_uuid
      AND rdd IS NOT NULL
    LEFT JOIN monitoring_goals
      ON grid = goal_grid
    ORDER BY finding_uuid,rdd DESC, latest_goal_closure DESC NULLS LAST, rsd DESC, rsc DESC, mfid
    ;
    
    -- Connect the Finding with whatever review is currently in progress;
    -- If it is undelivered, the Finding is considered Active regardless of
    -- its naive/raw status
    DROP TABLE IF EXISTS current_citation_reviews;
    CREATE TEMP TABLE current_citation_reviews
    AS
    SELECT DISTINCT ON (finding_uuid)
      mfid,
      finding_uuid,
      raw_status,
      CASE
        WHEN calculated_finding_type = 'Area of Concern' AND latest_goal_closure > latest_report_delivery_date THEN 'Closed'
        WHEN rdd IS NOT NULL AND review_status = 'Complete' THEN raw_status
        ELSE 'Active'
      END calculated_status,
      rdd IS NOT NULL last_review_delivered,
      raw_finding_type,
      calculated_finding_type,
      source_category,
      finding_deadline,
      reported_date,
      closed_date,
      citation,
      standard_text,
      guidance_category,
      latest_review_uuid,
      latest_narrative,
      latest_determination,
      latest_report_delivery_date,
      latest_goal_closure
    FROM latest_citation_reviews lcr
    JOIN "MonitoringFindingHistories" mfh
      ON finding_uuid = mfh."findingId"
      AND mfh."sourceDeletedAt" IS NULL
    JOIN all_reviews
      ON mfh."reviewId" = review_uuid
    ORDER BY finding_uuid,rdd DESC NULLS FIRST, rsd DESC, rsc DESC, mfid
    ;

    -- Connect the Finding with the initial delivered review that made
    -- it eligible for TTA. This could be useful for showing historical
    -- information about a Finding, but it's most important for establishing
    -- the timeframe during which we considered the Finding "Active"
    --
    -- This is basically the finished 'Citation" record set
    DROP TABLE IF EXISTS full_citations;
    CREATE TEMP TABLE full_citations
    AS
    SELECT DISTINCT ON (finding_uuid)
      mfid,
      finding_uuid,
      raw_status,
      calculated_status,
      calculated_status IN ('Active','Elevated Deficiency') active,
      last_review_delivered,
      raw_finding_type,
      calculated_finding_type,
      source_category,
      finding_deadline,
      reported_date,
      closed_date,
      citation,
      standard_text,
      guidance_category,
      review_uuid initial_review_uuid,
      mfh.narrative initial_narrative,
      mfh.determination initial_determination,
      rdd initial_report_delivery_date,
      latest_review_uuid,
      latest_narrative,
      latest_determination,
      latest_report_delivery_date,
      latest_goal_closure,
      CASE
        WHEN calculated_finding_type = 'Area of Concern' AND calculated_status = 'Closed' THEN latest_goal_closure
        WHEN NOT last_review_delivered THEN CURRENT_DATE + 1
        ELSE latest_report_delivery_date
      END active_through
    FROM current_citation_reviews ccr
    JOIN "MonitoringFindingHistories" mfh
      ON finding_uuid = mfh."findingId"
      AND mfh."sourceDeletedAt" IS NULL
    JOIN all_reviews
      ON mfh."reviewId" = review_uuid
    ORDER BY finding_uuid,rdd NULLS LAST, rsd, rsc, mfid
    ;

    -- Use Findings to determine if a chain of reviews is complete
    -- by connecting to the linked Findings and seeing if any is
    -- still active and if not then when they were complete 
    --
    -- This is basically the finished 'DeliveredReviews" record set
    DROP TABLE IF EXISTS delivered_reviews;
    CREATE TEMP TABLE delivered_reviews
    AS
    SELECT
      mrid,
      review_uuid,
      review_type,
      review_status,
      review_name,
      rdd,
      rsd,
      red,
      outcome,
      CASE WHEN BOOL_AND(last_review_delivered) THEN MAX(active_through) END complete_date,
      BOOL_AND(last_review_delivered) complete,
      BOOL_AND(last_review_delivered) AND NOT BOOL_OR(active) corrected
    FROM all_reviews
    JOIN "MonitoringFindingHistories" mfh
      ON mfh."reviewId" = review_uuid
      AND mfh."sourceDeletedAt" IS NULL
    JOIN full_citations
      ON mfh."findingId" = finding_uuid
    WHERE rdd IS NOT NULL
    GROUP BY 1,2,3,4,5,6,7,8,9
    ;

    ----------------------------------
    -- Primary Entity Table Upserts --
    ----------------------------------

    -- DeliveredReviews upsert
    INSERT INTO "DeliveredReviews" (
      mrid,
      review_uuid,
      review_type,
      review_status,
      review_name,
      report_delivery_date,
      report_start_date,
      report_end_date,
      outcome,
      complete_date,
      complete,
      corrected,
      "createdAt"
    )
    SELECT
      mrid,
      review_uuid,
      review_type,
      review_status,
      review_name,
      rdd,
      rsd,
      red,
      outcome,
      complete_date,
      complete,
      corrected,
      NOW()
    FROM delivered_reviews d_r
    ON CONFLICT (mrid)
    DO UPDATE SET
      review_uuid = EXCLUDED.review_uuid,
      review_type = EXCLUDED.review_type,
      review_status = EXCLUDED.review_status,
      review_name = EXCLUDED.review_name,
      report_delivery_date = EXCLUDED.report_delivery_date,
      report_start_date = EXCLUDED.report_start_date,
      report_end_date = EXCLUDED.report_end_date,
      outcome = EXCLUDED.outcome,
      complete_date = EXCLUDED.complete_date,
      complete = EXCLUDED.complete,
      corrected = EXCLUDED.corrected,
      "updatedAt" = NOW(),
      "deletedAt" = NULL
    WHERE
      "DeliveredReviews".review_uuid IS DISTINCT FROM EXCLUDED.review_uuid
      OR "DeliveredReviews".review_type IS DISTINCT FROM EXCLUDED.review_type
      OR "DeliveredReviews".review_status IS DISTINCT FROM EXCLUDED.review_status
      OR "DeliveredReviews".review_name IS DISTINCT FROM EXCLUDED.review_name
      OR "DeliveredReviews".report_delivery_date IS DISTINCT FROM EXCLUDED.report_delivery_date
      OR "DeliveredReviews".report_start_date IS DISTINCT FROM EXCLUDED.report_start_date
      OR "DeliveredReviews".report_end_date IS DISTINCT FROM EXCLUDED.report_end_date
      OR "DeliveredReviews".outcome IS DISTINCT FROM EXCLUDED.outcome
      OR "DeliveredReviews".complete_date IS DISTINCT FROM EXCLUDED.complete_date
      OR "DeliveredReviews".complete IS DISTINCT FROM EXCLUDED.complete
      OR "DeliveredReviews".corrected IS DISTINCT FROM EXCLUDED.corrected
      OR "DeliveredReviews"."deletedAt" IS NOT NULL
    ;

    -- DeliveredReviews deleted record marking
    UPDATE "DeliveredReviews" dr
    SET "deletedAt" = NOW()
    WHERE "deletedAt" IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM delivered_reviews d_r
        WHERE dr.mrid = d_r.mrid
      )
    ;

    -- Citations upsert
    INSERT INTO "Citations" (
      mfid,
      finding_uuid,
      raw_status,
      calculated_status,
      active,
      last_review_delivered,
      raw_finding_type,
      calculated_finding_type,
      source_category,
      finding_deadline,
      reported_date,
      closed_date,
      citation,
      standard_text,
      guidance_category,
      initial_review_uuid,
      initial_narrative,
      initial_determination,
      initial_report_delivery_date,
      latest_review_uuid,
      latest_narrative,
      latest_determination,
      latest_report_delivery_date,
      latest_goal_closure,
      active_through,
      "createdAt"
    )
    SELECT
      mfid,
      finding_uuid,
      raw_status,
      calculated_status,
      active,
      last_review_delivered,
      raw_finding_type,
      calculated_finding_type,
      source_category,
      finding_deadline,
      reported_date,
      closed_date,
      citation,
      standard_text,
      guidance_category,
      initial_review_uuid,
      initial_narrative,
      initial_determination,
      initial_report_delivery_date,
      latest_review_uuid,
      latest_narrative,
      latest_determination,
      latest_report_delivery_date,
      latest_goal_closure,
      active_through,
      NOW()
    FROM full_citations
    ON CONFLICT (finding_uuid)
    DO UPDATE SET
      mfid = EXCLUDED.mfid,
      raw_status = EXCLUDED.raw_status,
      calculated_status = EXCLUDED.calculated_status,
      active = EXCLUDED.active,
      last_review_delivered = EXCLUDED.last_review_delivered,
      raw_finding_type = EXCLUDED.raw_finding_type,
      calculated_finding_type = EXCLUDED.calculated_finding_type,
      source_category = EXCLUDED.source_category,
      finding_deadline = EXCLUDED.finding_deadline,
      reported_date = EXCLUDED.reported_date,
      closed_date = EXCLUDED.closed_date,
      citation = EXCLUDED.citation,
      standard_text = EXCLUDED.standard_text,
      guidance_category = EXCLUDED.guidance_category,
      initial_review_uuid = EXCLUDED.initial_review_uuid,
      initial_narrative = EXCLUDED.initial_narrative,
      initial_determination = EXCLUDED.initial_determination,
      initial_report_delivery_date = EXCLUDED.initial_report_delivery_date,
      latest_review_uuid = EXCLUDED.latest_review_uuid,
      latest_narrative = EXCLUDED.latest_narrative,
      latest_determination = EXCLUDED.latest_determination,
      latest_report_delivery_date = EXCLUDED.latest_report_delivery_date,
      latest_goal_closure = EXCLUDED.latest_goal_closure,
      active_through = EXCLUDED.active_through,
      "updatedAt" = NOW(),
      "deletedAt" = NULL
    WHERE
      "Citations".mfid IS DISTINCT FROM EXCLUDED.mfid
      OR "Citations".raw_status IS DISTINCT FROM EXCLUDED.raw_status
      OR "Citations".calculated_status IS DISTINCT FROM EXCLUDED.calculated_status
      OR "Citations".active IS DISTINCT FROM EXCLUDED.active
      OR "Citations".last_review_delivered IS DISTINCT FROM EXCLUDED.last_review_delivered
      OR "Citations".raw_finding_type IS DISTINCT FROM EXCLUDED.raw_finding_type
      OR "Citations".calculated_finding_type IS DISTINCT FROM EXCLUDED.calculated_finding_type
      OR "Citations".source_category IS DISTINCT FROM EXCLUDED.source_category
      OR "Citations".finding_deadline IS DISTINCT FROM EXCLUDED.finding_deadline
      OR "Citations".reported_date IS DISTINCT FROM EXCLUDED.reported_date
      OR "Citations".closed_date IS DISTINCT FROM EXCLUDED.closed_date
      OR "Citations".citation IS DISTINCT FROM EXCLUDED.citation
      OR "Citations".standard_text IS DISTINCT FROM EXCLUDED.standard_text
      OR "Citations".guidance_category IS DISTINCT FROM EXCLUDED.guidance_category
      OR "Citations".initial_review_uuid IS DISTINCT FROM EXCLUDED.initial_review_uuid
      OR "Citations".initial_narrative IS DISTINCT FROM EXCLUDED.initial_narrative
      OR "Citations".initial_determination IS DISTINCT FROM EXCLUDED.initial_determination
      OR "Citations".initial_report_delivery_date IS DISTINCT FROM EXCLUDED.initial_report_delivery_date
      OR "Citations".latest_review_uuid IS DISTINCT FROM EXCLUDED.latest_review_uuid
      OR "Citations".latest_narrative IS DISTINCT FROM EXCLUDED.latest_narrative
      OR "Citations".latest_determination IS DISTINCT FROM EXCLUDED.latest_determination
      OR "Citations".latest_report_delivery_date IS DISTINCT FROM EXCLUDED.latest_report_delivery_date
      OR "Citations".latest_goal_closure IS DISTINCT FROM EXCLUDED.latest_goal_closure
      OR "Citations".active_through IS DISTINCT FROM EXCLUDED.active_through
      OR "Citations"."deletedAt" IS NOT NULL
    ;

    -- Citations deleted record marking
    UPDATE "Citations"
    SET "deletedAt" = NOW()
    WHERE "deletedAt" IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM full_citations fc
        WHERE fc.finding_uuid = "Citations".finding_uuid
      );

    ----------------------------
    -- Junction Table Upserts --
    ----------------------------

    -- GrantDeliveredReviews upsert
    INSERT INTO "GrantDeliveredReviews" (
      "grantId",
      "deliveredReviewId",
      recipient_id,
      recipient_name,
      region_id,
      "createdAt"
    )
    SELECT DISTINCT
      agr.grid,
      dr.id,
      agr.rid,
      agr.rname,
      agr.region,
      NOW()
    FROM all_grant_reviews agr
    JOIN "DeliveredReviews" dr
      ON agr.mrid = dr.mrid
    ON CONFLICT ("grantId", "deliveredReviewId")
    DO UPDATE SET
      recipient_id = EXCLUDED.recipient_id,
      recipient_name = EXCLUDED.recipient_name,
      region_id = EXCLUDED.region_id,
      "updatedAt" = NOW()
    WHERE
      "GrantDeliveredReviews".recipient_id IS DISTINCT FROM EXCLUDED.recipient_id
      OR "GrantDeliveredReviews".recipient_name IS DISTINCT FROM EXCLUDED.recipient_name
      OR "GrantDeliveredReviews".region_id IS DISTINCT FROM EXCLUDED.region_id
    ;

    -- GrantDeliveredReviews stale record cleanup
    DELETE FROM "GrantDeliveredReviews" gdr
    WHERE NOT EXISTS (
      SELECT 1 FROM all_grant_reviews agr
      JOIN "DeliveredReviews" dr
        ON agr.mrid = dr.mrid
      WHERE gdr."grantId" = agr.grid
        AND gdr."deliveredReviewId" = dr.id
    )
    ;

    -- Create the DeliveredReviewCitations junction record set
    DROP TABLE IF EXISTS delivered_review_citations;
    CREATE TEMP TABLE delivered_review_citations
    AS
    SELECT DISTINCT
      mfid,
      mrid
    FROM full_citations
    JOIN "MonitoringFindingHistories" mfh
      ON mfh."findingId" = finding_uuid
      AND mfh."sourceDeletedAt" IS NULL
    JOIN all_reviews
      ON mfh."reviewId" = review_uuid
    ;

    -- DeliveredReviewCitations upsert
    INSERT INTO "DeliveredReviewCitations" ("deliveredReviewId", "citationId", "createdAt")
    SELECT DISTINCT
      dr.id,
      c.id,
      NOW()
    FROM delivered_review_citations drc
    JOIN "DeliveredReviews" dr
      ON drc.mrid = dr.mrid
    JOIN "Citations" c
      ON drc.mfid = c.mfid
    ON CONFLICT ("deliveredReviewId", "citationId")
    DO NOTHING
    ;

    -- DeliveredReviewCitations stale record cleanup
    DELETE FROM "DeliveredReviewCitations" drc
    WHERE NOT EXISTS (
      SELECT 1 FROM delivered_review_citations t
      JOIN "DeliveredReviews" dr
        ON t.mrid = dr.mrid
      JOIN "Citations" c
        ON t.mfid = c.mfid
      WHERE drc."deliveredReviewId" = dr.id
        AND drc."citationId" = c.id
    )
    ;

    -- Create the GrantCitations junction record set
    DROP TABLE IF EXISTS citation_grants;
    CREATE TEMP TABLE citation_grants
    AS
    SELECT DISTINCT
      mfid,
      grid,
      rid,
      rname,
      region
    FROM full_citations
    JOIN "MonitoringFindingGrants" mfg
      ON mfg."findingId" = finding_uuid
      AND mfg."sourceDeletedAt" IS NULL
    JOIN "MonitoringReviewGrantees" mrg
      ON mfg."granteeId" = mrg."granteeId"
      AND mrg."sourceDeletedAt" IS NULL
    JOIN all_grants
      ON grnumber = mrg."grantNumber"
    ;

    -- GrantCitations upsert
    INSERT INTO "GrantCitations" (
      "grantId",
      "citationId",
      recipient_id,
      recipient_name,
      region_id,
      "createdAt"
    )
    SELECT DISTINCT
      cg.grid,
      c.id,
      cg.rid,
      cg.rname,
      cg.region,
      NOW()
    FROM citation_grants cg
    JOIN "Citations" c
      ON cg.mfid = c.mfid
    ON CONFLICT ("grantId", "citationId")
    DO UPDATE SET
      recipient_id = EXCLUDED.recipient_id,
      recipient_name = EXCLUDED.recipient_name,
      region_id = EXCLUDED.region_id,
      "updatedAt" = NOW()
    WHERE
      "GrantCitations".recipient_id IS DISTINCT FROM EXCLUDED.recipient_id
      OR "GrantCitations".recipient_name IS DISTINCT FROM EXCLUDED.recipient_name
      OR "GrantCitations".region_id IS DISTINCT FROM EXCLUDED.region_id
    ;

    -- GrantCitations stale record cleanup
    DELETE FROM "GrantCitations" gc
    WHERE NOT EXISTS (
      SELECT 1 FROM citation_grants cg
      JOIN "Citations" c
        ON cg.mfid = c.mfid
      WHERE gc."grantId" = cg.grid
        AND gc."citationId" = c.id
    )
    ;

    `,
      { raw: true, transaction },
    );

    await recreateLiveValuesViews(sequelize.getQueryInterface(), transaction);
  });
  console.info('Monitoring fact table update complete');
};

export default updateMonitoringFactTables;
