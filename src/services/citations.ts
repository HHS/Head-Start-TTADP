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
  });
}

// TODO: Update this to the day we deploy to PROD.
const cutOffStartDate = new Date().toISOString().split('T')[0];
//const cutOffStartDate = '2021-01-01';
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
    `
      SELECT
        ms."standardId",
        ms.citation,
        JSONB_AGG( DISTINCT
          JSONB_BUILD_OBJECT(
            'findingId', mf."findingId",
            'grantId', gr.id,
            'grantNumber', gr.number,
            'reviewName', mfh."name",
            'reportDeliveryDate', mfh."reportDeliveryDate",
            'findingType', mf."findingType",
            'findingSource', mf."source",
            'monitoringFindingStatusName', mfs."name",
            'reportDeliveryDate', mfh."reportDeliveryDate",
            'citation', ms.citation,
            'severity', CASE
                    WHEN mf."findingType" = 'Deficiency' THEN 1
                    WHEN mf."findingType" = 'Noncompliance' THEN 2
                    ELSE 3
                  END,
            'acro', CASE
                    WHEN mf."findingType" = 'Deficiency' THEN 'DEF'
                    WHEN mf."findingType" = 'Noncompliance' THEN 'ANC'
                    ELSE 'AOC'
                  END
          )
        ) grants
      FROM "Grants" gr
      JOIN "MonitoringReviewGrantees" mrg
        ON gr.number = mrg."grantNumber"
      JOIN (
        -- The below 'DISTINCT ON' determines the single record to return values from by the 'ORDER BY' clause.
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
        ORDER BY mfh."findingId", gr.id, mr."reportDeliveryDate" DESC
      ) mfh -- Subquery ensures only the most recent history for each finding-grant combination
      ON mfh."grantId" = gr.id
      JOIN "MonitoringFindings" mf
        ON mfh."findingId" = mf."findingId"
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
        AND gr.id IN (${grantIds.join(',')}) -- :grantIds
          AND mfh."reportDeliveryDate"::date BETWEEN '${cutOffStartDate}' AND '${reportStartDate}'
        AND gr.status = 'Active'
        AND mfs.name = 'Active'
      GROUP BY 1,2
      ORDER BY 2,1;
    `,
  );

  return grantsByCitations[0];
}
