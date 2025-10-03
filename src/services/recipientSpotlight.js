import { Op, QueryTypes } from 'sequelize';
import {
  sequelize,
  Grant,
} from '../models';

/* eslint-disable import/prefer-default-export */
export async function getRecipientSpotlightIndicators(
  recipientId,
  regionId,
  scopes,
  sortBy,
  direction,
  offset,
  userRegions,
) {
  // Get a list of grant ids using the scopes.
  const INACTIVATION_CUT_OFF = new Date(new Date() - 365 * 24 * 60 * 60 * 1000);
  const grantIds = await Grant.findAll({
    attributes: [
      'id',
    ],
    where: {
      [Op.and]: [
        scopes.grant,
        {
          [Op.or]: [
            { status: 'Active' },
            {
              status: 'Inactive',
              inactivationDate: {
                [Op.gte]: INACTIVATION_CUT_OFF,
              },
            },
          ],
        },
      ],
    },
    raw: true,
  });

  /*
    Create the spotlight query using the grant ids and other params.
    At the time of writing this comment, there will be a total of seven spotlight indicators.
    For the MVP we will only implement 5 of them. Based on the grant ids we will create the
    raw sql query and return an array of objects. Each row is a recipient the recipient object
    should have the following properties
    recipientId, regionId, grantIds, childIncidents, deficiency, newRecipients,
    newStaff, noTTA, DRS, FEI
    with a true or false for each of the seven indicators. We want to handle pagination,
    sorting
    given the parameters. For now for DRS and FEI we will return false.

    Note: LTM = Last Twelve Months

    Description of the seven indicators:
    1. Child Incidents (monitoring data): Grants that have more than one child incident
    (RAN) monitoring citation in LTM (MonitoringReviews.ReviewType).
    2. Deficiency (monitoring data): Grants that have at least one review > finding > standard
      (citation) that has a MonitoringFindingHistories.determination of Deficiency.
    3. New Recipients: if the start date of their oldest grant is less than four years old.
    4. New Staff: If any program personnel effective date falls within the past
    two years (ProgramPersonnel.effectiveDate) indicate it (we don't know the exact roles yet).
    5. No TTA: There are no approved reports (AR) for this grant in the LTM.
    6. DRS: TBD
    7. FEI: TBD
*/
  const grantIdList = grantIds.map((g) => g.id);
  // If there are no grants found, return an empty array
  if (grantIdList.length === 0) {
    return [];
  }

  const spotLightSql = `
    WITH 
    -- Get the base set of recipients with their regions
    recipients AS (
      SELECT DISTINCT
        r.id AS "recipientId",
        g."regionId",
        r.name AS "recipientName"
      FROM "Recipients" r
      JOIN "Grants" g ON r.id = g."recipientId"
      WHERE g.id IN (${grantIdList.join(',')})
      ${recipientId ? `AND r.id = ${recipientId}` : ''}
      ${regionId ? `AND g."regionId" = ${regionId}` : ''}
      ${!recipientId && userRegions && userRegions.length > 0 ? `AND g."regionId" IN (${userRegions.join(',')})` : ''}
    ),
    
    -- 1. Child Incidents: Grants with more than one RAN citation in the last 12 months
    child_incidents AS (
      SELECT 
        r."recipientId",
        TRUE AS "childIncidents"
      FROM recipients r
      JOIN "Grants" g ON r."recipientId" = g."recipientId"
      JOIN "MonitoringReviewGrantees" mrg ON g.number = mrg."grantNumber"
      JOIN "MonitoringReviews" mr ON mrg."reviewId" = mr."reviewId"
      JOIN "MonitoringReviewStatuses" mrs ON mr."statusId" = mrs."statusId"
      WHERE g.id IN (${grantIdList.join(',')})
      AND mr."reviewType" = 'RAN'
      AND mrs."name" = 'Complete'
      AND mr."reportDeliveryDate" >= NOW() - INTERVAL '12 months'
      GROUP BY r."recipientId"
      HAVING COUNT(*) > 1
    ),
    
    -- 2. Deficiency: Grants with at least one deficiency in findings
    deficiencies AS (
      SELECT 
        r."recipientId",
        TRUE AS "deficiency"
      FROM recipients r
      JOIN "Grants" g ON r."recipientId" = g."recipientId"
      JOIN "MonitoringReviewGrantees" mrg ON g.number = mrg."grantNumber"
      JOIN "MonitoringReviews" mr ON mrg."reviewId" = mr."reviewId"
      JOIN "MonitoringReviewStatuses" mrs ON mr."statusId" = mrs."statusId"
      JOIN "MonitoringFindingHistories" mfh ON mr."reviewId" = mfh."reviewId"
      JOIN "MonitoringFindings" mf ON mfh."findingId" = mf."findingId"
      JOIN "MonitoringFindingStatuses" mfs ON mf."statusId" = mfs."statusId"
      WHERE g.id IN (${grantIdList.join(',')})
      AND mrs."name" = 'Complete'
      AND mfs."name" IN ('Active', 'Elevated Deficiency')
      AND mfh.determination = 'Deficiency'
      GROUP BY r."recipientId"
    ),
    
    -- 3. New Recipients: Recipients with oldest grant less than 4 years old
    new_recipients AS (
      SELECT 
        r."recipientId",
        TRUE AS "newRecipients"
      FROM recipients r
      JOIN (
        SELECT 
          g."recipientId",
          MIN(g."startDate") AS oldest_start_date
        FROM "Grants" g
        WHERE g.id IN (${grantIdList.join(',')})
        GROUP BY g."recipientId"
      ) oldest_grant ON r."recipientId" = oldest_grant."recipientId"
      WHERE oldest_grant.oldest_start_date >= NOW() - INTERVAL '4 years'
    ),
    
    -- 4. New Staff: Any program personnel with effective date in the past 2 years
    new_staff AS (
      SELECT 
        r."recipientId",
        TRUE AS "newStaff"
      FROM recipients r
      JOIN "Grants" g ON r."recipientId" = g."recipientId"
      JOIN "ProgramPersonnel" pp ON g.id = pp."grantId"
      WHERE g.id IN (${grantIdList.join(',')})
      AND pp."effectiveDate" >= NOW() - INTERVAL '2 years'
      GROUP BY r."recipientId"
    ),
    
    -- 5. No TTA: Grants with no approved reports in the last 12 months
    grants_with_tta AS (
      SELECT DISTINCT
        r."recipientId"
      FROM recipients r
      JOIN "Grants" g ON r."recipientId" = g."recipientId"
      JOIN "ActivityReportGoals" arg ON arg."goalId" IN (
        SELECT goals.id FROM "Goals" goals WHERE goals."grantId" = g.id
      )
      JOIN "ActivityReports" ar ON arg."activityReportId" = ar.id
      WHERE g.id IN (${grantIdList.join(',')})
      AND ar."calculatedStatus" = 'approved'
      AND ar."approvedAt" >= NOW() - INTERVAL '12 months'
    ),
    
    no_tta AS (
      SELECT 
        r."recipientId",
        TRUE AS "noTTA"
      FROM recipients r
      WHERE r."recipientId" NOT IN (SELECT "recipientId" FROM grants_with_tta)
    ),
    
    -- Combine all indicators into one result set
    combined_indicators AS (
      SELECT 
        r."recipientId",
        r."regionId",
        r."recipientName",
        ARRAY_AGG(g.id)::text[] AS "grantIds",
        COALESCE(ci."childIncidents", FALSE) AS "childIncidents",
        COALESCE(d."deficiency", FALSE) AS "deficiency",
        COALESCE(nr."newRecipients", FALSE) AS "newRecipients",
        COALESCE(ns."newStaff", FALSE) AS "newStaff",
        COALESCE(nt."noTTA", FALSE) AS "noTTA",
        FALSE AS "DRS",  -- Placeholder for future implementation
        FALSE AS "FEI"   -- Placeholder for future implementation
      FROM recipients r
      LEFT JOIN child_incidents ci ON r."recipientId" = ci."recipientId"
      LEFT JOIN deficiencies d ON r."recipientId" = d."recipientId"
      LEFT JOIN new_recipients nr ON r."recipientId" = nr."recipientId"
      LEFT JOIN new_staff ns ON r."recipientId" = ns."recipientId"
      LEFT JOIN no_tta nt ON r."recipientId" = nt."recipientId"
      JOIN "Grants" g ON r."recipientId" = g."recipientId" AND g.id IN (${grantIdList.join(',')})
      GROUP BY 
        r."recipientId", 
        r."regionId", 
        r."recipientName", 
        ci."childIncidents", 
        d."deficiency", 
        nr."newRecipients", 
        ns."newStaff", 
        nt."noTTA"
    )
    
    SELECT * FROM combined_indicators
    ORDER BY "${sortBy || 'recipientName'}" ${direction || 'ASC'}
    LIMIT 10 OFFSET ${offset || 0}
  `;

  // Execute the raw SQL query to get the recipient spotlight indicators.
  const spotlightData = await sequelize.query(
    spotLightSql,
    {
      type: QueryTypes.SELECT,
    },
  );

  return spotlightData;
}
