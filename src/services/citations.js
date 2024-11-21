/* eslint-disable no-plusplus */
/* eslint-disable import/prefer-default-export */
import { sequelize } from '../models';

/*
  The purpose of this function is to get citations by grant id.
  We then need to format the response for how it needs to be
  displayed on the FE for selection on objectives.
*/
export async function getCitationsByGrantIds(grantIds) {
  /*
   Questions:
   - Do we need to take into account the grant replacements table? (what if a grant was replaced?)
   - Is it enough to join on grant number? Or do we need to use links table?
   */

  const cutOffStartDate = '2024-10-01'; // TODO: Set this before we deploy to prod.

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
            'monitoringFindingStatusName', mfs."name"
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
        AND mfh."reportDeliveryDate" BETWEEN '${cutOffStartDate}' AND NOW() -- Between is inclusive.
        AND gr.status = 'Active'
        AND mfs.name = 'Active'
      GROUP BY 1,2
      ORDER BY 2,1;
    `,
  );

  // From the response we need to get a list of citations for each grant.
  const citationsByGrant = Object.values(grantsByCitations[0].reduce(
    (acc, citation) => {
      const { grants } = citation;
      // Create a for loop to iterate over every object in the grants array.
      for (let i = 0; i < grants.length; i++) {
        const grant = grants[i];
        // Check if the grant number is already in the accumulator.
        if (!acc[grant.grantId]) {
          acc[grant.grantId] = {
            grantId: grant.grantId,
            citations: [],
          };
        }

        // Build a citation object to push into the array.
        const citationObject = {
          findingType: grant.findingType,
          findingSource: grant.findingSource,
          grantId: grant.grantId,
          standardId: citation.standardId,
          citation: citation.citation,
          findingId: grant.findingId,
          reviewName: grant.reviewName,
          grantNumber: grant.grantNumber,
          reportDeliveryDate: grant.reportDeliveryDate,
          monitoringFindingStatusName: grant.monitoringFindingStatusName,
        };
        // Push the citation into the array for the grant number.
        acc[grant.grantId].citations.push(citationObject);
      }
      return acc;
    },
    {},
  ));

  return citationsByGrant;
}
