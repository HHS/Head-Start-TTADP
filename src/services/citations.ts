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
      -- find active status citations
      active_citations AS (
      SELECT mf."findingId" fid
      FROM "MonitoringFindings" mf
      JOIN "MonitoringFindingStatuses" mfs
        ON mf."statusId" = mfs."statusId"
      WHERE mfs.name IN ('Active', 'Elevated Deficiency')
        AND mf."sourceDeletedAt" IS NULL
      ),
      -- get the order and status of reviews associated with citations
      ordered_citation_reviews AS (
      SELECT
        mfh."findingId" fid,
        mfh."reviewId" rid,
        mrs.name review_status,
        mr."reportDeliveryDate" rdd,
        ROW_NUMBER() OVER (
          PARTITION BY mfh."findingId"
          ORDER BY mr."startDate" DESC, mr."sourceCreatedAt" DESC, mr.id DESC
        ) recency_rank
      FROM "MonitoringFindingHistories" mfh
      JOIN "MonitoringReviews" mr
        ON mfh."reviewId" = mr."reviewId"
      JOIN "MonitoringReviewStatuses" mrs
        ON mr."statusId" = mrs."statusId"
      -- This works without bringing in MonitoringFindings because when MonitoringFindings
      -- are deleted in IT-AMS data, so are all linking MonitoringFindingHistories records
      WHERE mfh."sourceDeletedAt" IS NULL
      ),
      -- union together active citations with those whose most recent linked
      -- review is not complete, yielding the list of citations on which TTA
      -- might still be in progress
      open_citations AS (
      SELECT fid FROM active_citations
      UNION
      SELECT fid FROM ordered_citation_reviews
      WHERE recency_rank = 1
        AND (
          review_status != 'Complete'
          OR
          '${reportStartDate}'::date BETWEEN '${cutOffStartDate}' AND rdd
        )
      ),
      -- Subquery ensures only the most recent history for each finding-grant combination
      "RecentMonitoring" AS ( 
        SELECT DISTINCT ON (mfh."findingId", gr.id)
          mfh."findingId",
          gr.id AS "grantId",
          mr."reviewId",
          mr."name",
          mr."reportDeliveryDate"
        FROM "MonitoringFindingHistories" mfh
        JOIN "MonitoringReviews" mr
          ON mfh."reviewId" = mr."reviewId"
        JOIN "MonitoringReviewGrantees" mrg
          ON mrg."reviewId" = mr."reviewId"
        JOIN "Grants" gr
          ON gr.number = mrg."grantNumber"
        WHERE mr."reportDeliveryDate"::date BETWEEN '${cutOffStartDate}' AND '${reportStartDate}'
        ORDER BY mfh."findingId", gr.id, mr."reportDeliveryDate" DESC
      )
    SELECT
      ms."standardId",
      ms.citation,
      JSONB_AGG( DISTINCT
        JSONB_BUILD_OBJECT(
          'findingId', mf."findingId",
          'grantId', gr.id,
          'originalGrantId', grta."grantId", -- this is not used anywhere
          'grantNumber', gr.number,
          'reviewName', rm."name",
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
    FROM "GrantRelationshipToActive" grta
    JOIN "Grants" gr
      ON  grta."grantId" = gr.id
    JOIN "Goals" g
      ON (grta."grantId" = g."grantId" OR grta."activeGrantId" = g."grantId")
      AND g."status" NOT IN ('Closed', 'Suspended')
    JOIN "GoalTemplates" gt
      ON g."goalTemplateId" = gt."id"
      AND gt."standard" = 'Monitoring'
    JOIN "MonitoringReviewGrantees" mrg
      ON gr.number = mrg."grantNumber"
    JOIN "RecentMonitoring" rm 
      ON rm."grantId" = gr.id
    JOIN open_citations oc
      ON rm."findingId" = oc.fid
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
      AND mrg."granteeId" = mfg."granteeId"
    WHERE 1 = 1
      AND (
        grta."activeGrantId" IN (${grantIds.join(',')}) -- :grantIds
        OR gr.id IN (${grantIds.join(',')})
      )
    GROUP BY 1,2
    ORDER BY 2,1;
    `,
  );

  return grantsByCitations[0];
}
