/* eslint-disable no-plusplus */
import db, { sequelize } from '../models';

const { MonitoringStandard } = db;

export async function textByCitation(
  citationIds: string[],
): Promise<{ text: string, citation: string }[]> {
  return MonitoringStandard.findAll({
    attributes: ['text', 'citation'],
    where: {
      citation: citationIds,
    },
    group: ['text', 'citation'],
    order: ['citation'],
  });
}

const cutOffStartDate = '2025-01-21';
/*
  The purpose of this function is to get citations by grant id.
  We then need to format the response for how it needs to be
  displayed on the FE for selection on objectives.
*/

export interface CitationsByGrantId {
  standardId: number;
  citation: string;
  grants: {
    acro: string;
    grantId: number;
    citation: string;
    severity: number;
    findingId: string;
    reviewName: string;
    findingType: string;
    grantNumber: string;
    findingSource: string;
    reportDeliveryDate: Date;
    monitoringFindingStatusName: string;
  }[];
}

export async function getCitationsByGrantIds(
  grantIds: number[],
  reportStartDate: string,
): Promise<CitationsByGrantId[]> {
  // Query to get the citations by grant id.
  const grantsByCitations = await sequelize.query(
    /* sql */
    `WITH
      ---------------------
      -- Convenient CTEs --
      ---------------------
      -- making a convenient single source for monitoring dates that
      -- get used in the logic
      monitoring_dates AS ( SELECT '${cutOffStartDate}'::date monitoring_start_date),
      -- Get the monitoring Goal template ID. Having this here makes
      -- most of the logic run anywhere without changes
      monitoring_template AS (
      SELECT DISTINCT ON (standard) id monitoring_gtid
      FROM "GoalTemplates"
      WHERE standard = 'Monitoring'
        AND "deletedAt" IS NULL
      ORDER BY standard, id DESC
      ),
      -- Join grants to active grants and recipients so we don't have to do it repeatedly
      grant_recipients AS (
        SELECT
          r.id rid,
          r.name AS rname,
          gr."regionId" region,
          gr.id grid,
          gr.number grnumber,
          grta."activeGrantId" active_grid
        FROM "Recipients" r
        JOIN "Grants" gr
          ON r.id = gr."recipientId"
        JOIN "GrantRelationshipToActive" grta
          ON gr.id = grta."grantId"
        WHERE  grta."activeGrantId" IN (${grantIds.join(',')}) 
          OR gr.id IN (${grantIds.join(',')})
      ),
      -- Select all the potentially-relevant reviews
      -- for early filtering of monitoring datasets
      all_reviews AS (
      SELECT DISTINCT
        rid,
        region,
        grid,
        mr."reviewId" ruuid,
        mr."reviewType" review_type,
        mrs.name review_status,
        mr."reportDeliveryDate" rdd,
        mr."startDate" rsd,
        mr."sourceCreatedAt" rsc
      FROM grant_recipients
      JOIN "MonitoringReviewGrantees" mrg
        ON grnumber = mrg."grantNumber"
      JOIN "MonitoringReviews" mr
        ON mrg."reviewId" = mr."reviewId"
      JOIN "MonitoringReviewStatuses" mrs
        ON mr."statusId" = mrs."statusId"
      CROSS JOIN monitoring_dates monitoring_start_date
      WHERE mr."deletedAt" IS NULL 
        AND (
          mr."reportDeliveryDate" > monitoring_start_date
          OR
          mr."sourceCreatedAt" > monitoring_start_date
        )
      ),
      ----------------
      -- Main logic --
      ----------------
      -- associate each citation with its most recent review
      ordered_citation_reviews AS (
      SELECT DISTINCT ON (mf."findingId")
        mf."findingId" fid,
        CASE
          WHEN mfh.determination = 'Concern' THEN 'Area of Concern'
          WHEN mfh.determination IS NOT NULL THEN mfh.determination
          ELSE mf."findingType"
        END AS finding_type,
        mfs.name finding_status,
        mf.source,
        mfh."reviewId" rid,
        mrs.name review_status,
        mr."reviewType" review_type,
        mr."reportDeliveryDate" rdd,
        -- get the latest reportDeliveryDate from any delivered review for this finding
        -- (needed for ignoreable_findings since most recent review may be In Progress with NULL rdd)
        MAX(mr."reportDeliveryDate") OVER (PARTITION BY mf."findingId") last_rdd,
        grid
      FROM "MonitoringFindings" mf
      JOIN "MonitoringFindingHistories" mfh
        ON mf."findingId" = mfh."findingId"
      JOIN "MonitoringReviews" mr
        ON mfh."reviewId" = mr."reviewId"
      JOIN "MonitoringReviewStatuses" mrs
        ON mr."statusId" = mrs."statusId"
      JOIN "MonitoringFindingStatuses" mfs
        ON mf."statusId" = mfs."statusId"
      JOIN "MonitoringReviewGrantees" mrg
        ON mr."reviewId" = mrg."reviewId"
      JOIN grant_recipients
        ON mrg."grantNumber" = grnumber
      CROSS JOIN monitoring_dates
      WHERE mfh."sourceDeletedAt" IS NULL
        AND (mr."reportDeliveryDate" > monitoring_start_date OR mr."reportDeliveryDate" IS NULL)
      ORDER BY 1,mr."startDate" DESC, mr."sourceCreatedAt" DESC, mr.id DESC
      ),
      -- finding the latest close date for Monitoring Goals
      closed_monitoring_goals AS (
      SELECT DISTINCT ON (g."grantId")
        g.id gid,
        grid,
        gsc."performedAt" last_close
      FROM "Goals" g
      JOIN grant_recipients
        ON g."grantId" = grid
      JOIN monitoring_template
        ON g."goalTemplateId" = monitoring_gtid
      JOIN "GoalStatusChanges" gsc
        ON g.id = gsc."goalId"
      WHERE "newStatus" = 'Closed'
      ORDER BY 2,gsc."performedAt" DESC
      ),
      -- Ignore any findings where a Monitoring Goal was closed since the latest
      -- review reporting the finding was delivered
      ignoreable_findings AS (
      SELECT fid ignoreable_fid
      FROM ordered_citation_reviews ocr
      JOIN closed_monitoring_goals cmg
        ON ocr.grid = cmg.grid
      GROUP BY 1
      HAVING BOOL_OR(last_close > last_rdd)
      ),
      -- find active status citations but ignore Findings we don't
      -- consider to truly be 'Active'
      active_citations AS (
      SELECT fid
      FROM ordered_citation_reviews
      WHERE finding_status IN ('Active', 'Elevated Deficiency')
      EXCEPT
      SELECT ignoreable_fid FROM ignoreable_findings
      ),
      -- union together active citations with those whose most recent linked
      -- review is not complete, yielding the list of citations on which TTA
      -- might still be in progress
      open_citations AS (
      SELECT fid FROM active_citations
      UNION
      SELECT fid FROM ordered_citation_reviews
      WHERE rdd IS NULL
      ),
      -- Subquery ensures only the most recent history for each finding-grant combination
      "RecentMonitoring" AS ( 
        SELECT DISTINCT ON (oc.fid, ocr.grid)
          oc.fid "findingId",
          source,
          ocr.grid AS "grantId",
          finding_status,
          active_grid "activeGrantId",
          grnumber "grantNumber",
          mr."reviewId",
          mr.name "reviewName",
          mr."reportDeliveryDate",
          mrg."granteeId",
          finding_type
        FROM open_citations oc
        JOIN ordered_citation_reviews ocr
          ON oc.fid = ocr.fid
        JOIN "MonitoringFindingHistories" mfh
          ON mfh."findingId" = oc.fid
        JOIN "MonitoringReviews" mr
          ON mfh."reviewId" = mr."reviewId"
        JOIN "MonitoringReviewGrantees" mrg
          ON mrg."reviewId" = mr."reviewId"
        JOIN grant_recipients
          ON grnumber = mrg."grantNumber"
        CROSS JOIN monitoring_dates
        WHERE mr."reportDeliveryDate"::date BETWEEN monitoring_start_date AND '${reportStartDate}'
        ORDER BY oc.fid, ocr.grid, mr."reportDeliveryDate" DESC
      )
    SELECT
      ms."standardId",
      ms.citation,
      JSONB_AGG( DISTINCT
        JSONB_BUILD_OBJECT(
          'findingId', rm."findingId",
          'grantId', rm."grantId",
          'originalGrantId', rm."grantId", -- this is not used anywhere
          'grantNumber', rm."grantNumber",
          'reviewName', rm."reviewName",
          'reportDeliveryDate', rm."reportDeliveryDate",
          'findingType', finding_type,
          'findingSource', rm.source,
          'monitoringFindingStatusName', finding_status,
          'citation', ms.citation,
          'severity', CASE
                  WHEN finding_type = 'Deficiency' THEN 1
                  WHEN finding_type = 'Noncompliance' THEN 2
                  ELSE 3 -- Area of Concern
                END,
          'acro', CASE
                  WHEN finding_type = 'Deficiency' THEN 'DEF'
                  WHEN finding_type = 'Noncompliance' THEN 'ANC'
                  ELSE 'AOC' -- Area of Concern
                END
        )
      ) grants
    FROM "RecentMonitoring" rm
    JOIN "Goals" g
      ON (g."grantId" = rm."grantId" OR g."grantId" = rm."activeGrantId")
      AND g."status" NOT IN ('Closed', 'Suspended')
    JOIN monitoring_template
      ON g."goalTemplateId" = monitoring_gtid
    JOIN "MonitoringFindingStandards" mfs
      ON rm."findingId" = mfs."findingId"
    JOIN "MonitoringStandards" ms
      ON mfs."standardId" = ms."standardId"
    GROUP BY 1,2
    ORDER BY 2,1;
    `,
  );

  return grantsByCitations[0];
}
