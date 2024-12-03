/* eslint-disable no-plusplus */
/* eslint-disable import/prefer-default-export */
import { sequelize } from '../models';

const cutOffStartDate = '2024-01-01'; // TODO: Set this before we deploy to prod.
/*
  The purpose of this function is to get citations by grant id.
  We then need to format the response for how it needs to be
  displayed on the FE for selection on objectives.
*/
export async function getCitationsByGrantIds(grantIds, reportStartDate) {
  /*
   Questions:
   - Do we need to take into account the grant replacements table? (what if a grant was replaced?)
   - Is it enough to join on grant number? Or do we need to use links table?
   */
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

/* Get the monitoring goals for the given grant ids and report start date */
/* We need to produce the same objects that come for the goals endpoint */
export async function getMonitoringGoals(grantIds, reportStartDate) {
  const monitoringGoals = await sequelize.query(
    /* sql */
    `SELECT

      g.id,
      g."name",
      g."status",
      g."endDate",
      g."onApprovedAR",
      g."source",
      g."createdVia",

      ARRAY_AGG(DISTINCT gr.id) AS "grantIds",
      ARRAY_AGG(DISTINCT g.id) AS "goalIds",
      ARRAY_AGG(DISTINCT grta."grantId") AS "oldGrantIds",
      MAX(g."createdAt") AS created,
      MAX(g."goalTemplateId") AS "goalTemplateId"

      FROM "Grants" gr
      JOIN "MonitoringReviewGrantees" mrg
            ON gr.number = mrg."grantNumber"
      JOIN "GrantRelationshipToActive" grta
        ON gr.id = grta."grantId"
      JOIN "Goals" g
        ON gr.id = g."grantId"
    JOIN "GoalTemplates" gt
        ON g."goalTemplateId" = gt.id
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
          AND g."createdVia" = 'monitoring'
          AND g.status NOT IN ('Closed', 'Suspended')
          AND gt.standard = 'Monitoring'
          AND g.name != ''
      GROUP BY 1, 2, 3, 4, 5, 6, 7
      ORDER BY 11 DESC;
    `,
  );
  return monitoringGoals[0];
}
