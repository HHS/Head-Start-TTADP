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
      -- find just relevant grants with all needed grant info
      grants AS (
      SELECT DISTINCT
        gr.id grid,
        gr.number grnumber,
        grta."activeGrantId" active_grid
      FROM "Grants" gr
      JOIN "GrantRelationshipToActive" grta
        ON gr.id = grta."grantId"
      WHERE grta."activeGrantId" IN (${grantIds.join(',')})
        OR gr.id IN (${grantIds.join(',')})
      ),
      -- associate each citation with its most recent review
      ordered_citation_reviews AS (
      SELECT DISTINCT ON (mf."findingId")
        mf."findingId" fid,
        mf."findingType" finding_type,
        mfs.name finding_status,
        mfh."reviewId" rid,
        mrs.name review_status,
        mr."reportDeliveryDate" rdd,
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
      JOIN grants
        ON mrg."grantNumber" = grnumber
      CROSS JOIN monitoring_dates
      WHERE mfh."sourceDeletedAt" IS NULL
        AND (mr."reportDeliveryDate" > monitoring_start_date OR mr."reportDeliveryDate" IS NULL)
      ORDER BY 1,mr."startDate" DESC, mr."sourceCreatedAt" DESC, mr.id DESC
      ),
      -- finding the latest close date for Monitoring Goals to optimize
      -- query speed for
      closed_monitoring_goals AS (
      SELECT DISTINCT ON (g.id)
        g.id gid,
        grid,
        gsc."performedAt" last_close
      FROM "Goals" g
      JOIN grants
        ON g."grantId" = grid
      JOIN monitoring_template
        ON g."goalTemplateId" = monitoring_gtid
      JOIN "GoalStatusChanges" gsc
        ON g.id = gsc."goalId"
      WHERE "newStatus" = 'Closed'
      ORDER BY 1,2,gsc."performedAt"
      ),
      -- Ignore any findings where a Monitoring Goal was closed since the latest
      -- review reporting the finding was delivered
      ignoreable_findings AS (
      SELECT fid ignoreable_fid
      FROM ordered_citation_reviews ocr
      JOIN closed_monitoring_goals cmg
        ON ocr.grid = cmg.grid
      GROUP BY 1
      HAVING BOOL_OR(last_close > rdd)
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
      WHERE review_status != 'Complete'
      ),
      -- Get the most recent review for each finding-grant combination
      -- that was delivered before the reportStartDate
      "RecentMonitoring" AS (
        SELECT DISTINCT ON (oc.fid, grid)
          oc.fid "findingId",
          grid "grantId",
          active_grid "activeGrantId",
          grnumber "grantNumber",
          mr."reviewId",
          mr."name" "reviewName",
          mr."reportDeliveryDate",
          mrg."granteeId"
        FROM open_citations oc
        JOIN "MonitoringFindingHistories" mfh
          ON mfh."findingId" = oc.fid
        JOIN "MonitoringReviews" mr
          ON mfh."reviewId" = mr."reviewId"
        JOIN "MonitoringReviewGrantees" mrg
          ON mrg."reviewId" = mr."reviewId"
        JOIN grants
          ON grnumber = mrg."grantNumber"
        CROSS JOIN monitoring_dates
        WHERE mr."reportDeliveryDate"::date BETWEEN monitoring_start_date AND '${reportStartDate}'
        ORDER BY oc.fid, grid, mr."reportDeliveryDate" DESC
      )
    SELECT
      ms."standardId",
      ms.citation,
      JSONB_AGG( DISTINCT
        JSONB_BUILD_OBJECT(
          'findingId', mf."findingId",
          'grantId', rm."grantId",
          'grantNumber', rm."grantNumber",
          'reviewName', rm."reviewName",
          'reportDeliveryDate', rm."reportDeliveryDate",
          'findingType', mf."findingType",
          'findingSource', mf."source",
          'monitoringFindingStatusName', mfs."name",
          'citation', ms.citation,
          'severity', CASE
                  WHEN mf."findingType" = 'Deficiency' THEN 1
                  WHEN mf."findingType" = 'Noncompliance' THEN 2
                  ELSE 3 -- Area of Concern
                END,
          'acro', CASE
                  WHEN mf."findingType" = 'Deficiency' THEN 'DEF'
                  WHEN mf."findingType" = 'Noncompliance' THEN 'ANC'
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
    JOIN "MonitoringFindings" mf
      ON rm."findingId" = mf."findingId"
    JOIN "MonitoringFindingStatuses" mfs
      ON mf."statusId" = mfs."statusId"
    JOIN "MonitoringFindingStandards" mfs2
      ON mf."findingId" = mfs2."findingId"
    JOIN "MonitoringStandards" ms
      ON mfs2."standardId" = ms."standardId"
    JOIN "MonitoringFindingGrants" mfg
      ON mf."findingId" = mfg."findingId"
      AND rm."granteeId" = mfg."granteeId"
    GROUP BY 1,2
    ORDER BY 2,1;
    `,
  );

  return grantsByCitations[0];
}
