/* eslint-disable max-len */
import { Op, QueryTypes } from 'sequelize';
import {
  sequelize,
  Grant,
} from '../models';

/* eslint-disable import/prefer-default-export */
export async function getRecipientSpotlightIndicators(
  scopes,
  sortBy,
  direction,
  offset,
  limit,
) {
  // Commented out for testing - uncomment for production
  /*
  const INACTIVATION_CUT_OFF = new Date(new Date() - 365 * 24 * 60 * 60 * 1000);
  const grantsWhere = {
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
  };

  // Get a list of grant ids using the scopes
  const grantIds = await Grant.findAll({
    attributes: [
      'id',
    ],
    where: grantsWhere,
    raw: true,
  });
  */

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

  // Commented out for testing - uncomment for production SQL query
  /*
  const grantIdList = grantIds.map((g) => g.id);
  const hasGrantIds = grantIdList.length > 0;
  const grantIdFilter = hasGrantIds ? `g.id IN (${grantIdList.join(',')})` : 'TRUE';

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
      WHERE ${grantIdFilter}
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
      WHERE ${grantIdFilter}
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
      WHERE ${grantIdFilter}
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
        WHERE ${grantIdFilter}
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
      WHERE ${grantIdFilter}
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
      WHERE ${grantIdFilter}
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

    -- Last TTA date: Most recent approved report for each recipient
    last_tta AS (
      SELECT
        r."recipientId",
        MAX(ar."approvedAt") AS "lastTTA"
      FROM recipients r
      JOIN "Grants" g ON r."recipientId" = g."recipientId"
      JOIN "Goals" goals ON goals."grantId" = g.id
      JOIN "ActivityReportGoals" arg ON arg."goalId" = goals.id
      JOIN "ActivityReports" ar ON arg."activityReportId" = ar.id
      WHERE ${grantIdFilter}
      AND ar."calculatedStatus" = 'approved'
      GROUP BY r."recipientId"
    ),

    -- Combine all indicators into one result set
    combined_indicators AS (
      SELECT
        r."recipientId",
        r."regionId",
        r."recipientName",
        ARRAY_AGG(DISTINCT g.id)::text[] AS "grantIds",
        COALESCE(ci."childIncidents", FALSE) AS "childIncidents",
        COALESCE(d."deficiency", FALSE) AS "deficiency",
        COALESCE(nr."newRecipients", FALSE) AS "newRecipients",
        COALESCE(ns."newStaff", FALSE) AS "newStaff",
        COALESCE(nt."noTTA", FALSE) AS "noTTA",
        FALSE AS "DRS",  -- Placeholder for future implementation
        FALSE AS "FEI",   -- Placeholder for future implementation
        (
          COALESCE(ci."childIncidents"::int, 0) +
          COALESCE(d."deficiency"::int, 0) +
          COALESCE(nr."newRecipients"::int, 0) +
          COALESCE(ns."newStaff"::int, 0) +
          COALESCE(nt."noTTA"::int, 0)
        ) AS "indicatorCount",
        lt."lastTTA"
      FROM recipients r
      LEFT JOIN child_incidents ci ON r."recipientId" = ci."recipientId"
      LEFT JOIN deficiencies d ON r."recipientId" = d."recipientId"
      LEFT JOIN new_recipients nr ON r."recipientId" = nr."recipientId"
      LEFT JOIN new_staff ns ON r."recipientId" = ns."recipientId"
      LEFT JOIN no_tta nt ON r."recipientId" = nt."recipientId"
      LEFT JOIN last_tta lt ON r."recipientId" = lt."recipientId"
      JOIN "Grants" g ON r."recipientId" = g."recipientId" AND ${grantIdFilter}
      GROUP BY
        r."recipientId",
        r."regionId",
        r."recipientName",
        ci."childIncidents",
        d."deficiency",
        nr."newRecipients",
        ns."newStaff",
        nt."noTTA",
        lt."lastTTA"
      -- Filter out recipients with zero indicators
      HAVING (
        COALESCE(ci."childIncidents", FALSE) = TRUE OR
        COALESCE(d."deficiency", FALSE) = TRUE OR
        COALESCE(nr."newRecipients", FALSE) = TRUE OR
        COALESCE(ns."newStaff", FALSE) = TRUE OR
        COALESCE(nt."noTTA", FALSE) = TRUE
      )
    )

    SELECT * FROM combined_indicators
    ORDER BY
      CASE WHEN '${sortBy}' = 'indicatorCount' THEN "indicatorCount" END ${direction === 'desc' ? 'DESC' : 'ASC'},
      CASE WHEN '${sortBy}' = 'recipientName' THEN "recipientName" END ${direction === 'desc' ? 'DESC' : 'ASC'},
      CASE WHEN '${sortBy}' = 'lastTTA' THEN "lastTTA" END ${direction === 'desc' ? 'DESC NULLS LAST' : 'ASC NULLS LAST'},
      CASE WHEN '${sortBy}' = 'regionId' THEN "regionId" END ${direction === 'desc' ? 'DESC' : 'ASC'},
      "recipientName" ASC
    ${hasGrantIds && limit ? `LIMIT ${limit}` : ''}
    ${offset ? `OFFSET ${offset}` : ''}
  `;
  */

  // Temporarily using static data for testing - comment out for production
  // const spotlightData = await sequelize.query(
  //   spotLightSql,
  //   {
  //     type: QueryTypes.SELECT,
  //   },
  // );

  // Static test data - 20 recipients with varying indicators
  const allTestData = [
    {
      recipientId: 1,
      regionId: 1,
      recipientName: 'ABC Early Learning Center',
      grantIds: ['14CH001', '14CH002'],
      childIncidents: true,
      deficiency: true,
      newRecipients: false,
      newStaff: true,
      noTTA: false,
      DRS: false,
      FEI: true,
      indicatorCount: 3,
      lastTTA: '2024-03-15',
    },
    {
      recipientId: 2,
      regionId: 2,
      recipientName: 'Bright Beginnings Head Start',
      grantIds: ['14CH003'],
      childIncidents: false,
      deficiency: true,
      newRecipients: true,
      newStaff: false,
      noTTA: false,
      DRS: false,
      FEI: false,
      indicatorCount: 2,
      lastTTA: '2024-01-20',
    },
    {
      recipientId: 3,
      regionId: 3,
      recipientName: 'Children First Learning Academy',
      grantIds: ['14CH004', '14CH005'],
      childIncidents: true,
      deficiency: false,
      newRecipients: false,
      newStaff: true,
      noTTA: false,
      DRS: true,
      FEI: false,
      indicatorCount: 2,
      lastTTA: '2023-11-05',
    },
    {
      recipientId: 4,
      regionId: 4,
      recipientName: 'Discovery Learning Center',
      grantIds: ['14CH006'],
      childIncidents: false,
      deficiency: false,
      newRecipients: true,
      newStaff: false,
      noTTA: true,
      DRS: false,
      FEI: false,
      indicatorCount: 2,
      lastTTA: null,
    },
    {
      recipientId: 5,
      regionId: 5,
      recipientName: 'Early Explorers Child Development',
      grantIds: ['14CH007'],
      childIncidents: false,
      deficiency: true,
      newRecipients: false,
      newStaff: false,
      noTTA: false,
      DRS: false,
      FEI: true,
      indicatorCount: 1,
      lastTTA: '2024-02-28',
    },
    {
      recipientId: 6,
      regionId: 6,
      recipientName: 'Family Support Services',
      grantIds: ['14CH008', '14CH009'],
      childIncidents: true,
      deficiency: true,
      newRecipients: true,
      newStaff: true,
      noTTA: false,
      DRS: false,
      FEI: false,
      indicatorCount: 4,
      lastTTA: '2024-03-01',
    },
    {
      recipientId: 7,
      regionId: 7,
      recipientName: 'Growing Minds Preschool',
      grantIds: ['14CH010'],
      childIncidents: false,
      deficiency: false,
      newRecipients: false,
      newStaff: true,
      noTTA: false,
      DRS: false,
      FEI: false,
      indicatorCount: 1,
      lastTTA: '2024-03-10',
    },
    {
      recipientId: 8,
      regionId: 8,
      recipientName: 'Happy Hearts Early Learning',
      grantIds: ['14CH011'],
      childIncidents: true,
      deficiency: false,
      newRecipients: false,
      newStaff: false,
      noTTA: true,
      DRS: false,
      FEI: false,
      indicatorCount: 2,
      lastTTA: null,
    },
    {
      recipientId: 9,
      regionId: 9,
      recipientName: 'Imagination Station Head Start',
      grantIds: ['14CH012', '14CH013'],
      childIncidents: false,
      deficiency: true,
      newRecipients: true,
      newStaff: true,
      noTTA: false,
      DRS: true,
      FEI: true,
      indicatorCount: 3,
      lastTTA: '2023-12-15',
    },
    {
      recipientId: 10,
      regionId: 10,
      recipientName: 'Joyful Learners Academy',
      grantIds: ['14CH014'],
      childIncidents: false,
      deficiency: false,
      newRecipients: false,
      newStaff: false,
      noTTA: true,
      DRS: false,
      FEI: false,
      indicatorCount: 1,
      lastTTA: null,
    },
    {
      recipientId: 11,
      regionId: 11,
      recipientName: 'Kids First Community Center',
      grantIds: ['14CH015'],
      childIncidents: true,
      deficiency: true,
      newRecipients: false,
      newStaff: true,
      noTTA: false,
      DRS: false,
      FEI: false,
      indicatorCount: 3,
      lastTTA: '2024-02-05',
    },
    {
      recipientId: 12,
      regionId: 12,
      recipientName: 'Little Learners Education Center',
      grantIds: ['14CH016', '14CH017'],
      childIncidents: false,
      deficiency: true,
      newRecipients: true,
      newStaff: false,
      noTTA: false,
      DRS: false,
      FEI: true,
      indicatorCount: 2,
      lastTTA: '2024-01-15',
    },
    {
      recipientId: 13,
      regionId: 1,
      recipientName: 'Mountain View Head Start',
      grantIds: ['14CH018'],
      childIncidents: true,
      deficiency: false,
      newRecipients: false,
      newStaff: false,
      noTTA: false,
      DRS: true,
      FEI: false,
      indicatorCount: 1,
      lastTTA: '2024-03-20',
    },
    {
      recipientId: 14,
      regionId: 2,
      recipientName: 'New Horizons Child Development',
      grantIds: ['14CH019'],
      childIncidents: false,
      deficiency: false,
      newRecipients: true,
      newStaff: true,
      noTTA: true,
      DRS: false,
      FEI: false,
      indicatorCount: 3,
      lastTTA: null,
    },
    {
      recipientId: 15,
      regionId: 3,
      recipientName: 'Opportunity Youth Services',
      grantIds: ['14CH020', '14CH021'],
      childIncidents: true,
      deficiency: true,
      newRecipients: true,
      newStaff: true,
      noTTA: false,
      DRS: true,
      FEI: true,
      indicatorCount: 4,
      lastTTA: '2023-10-30',
    },
    {
      recipientId: 16,
      regionId: 4,
      recipientName: 'Pathways Early Education',
      grantIds: ['14CH022'],
      childIncidents: false,
      deficiency: true,
      newRecipients: false,
      newStaff: false,
      noTTA: false,
      DRS: false,
      FEI: false,
      indicatorCount: 1,
      lastTTA: '2024-03-25',
    },
    {
      recipientId: 17,
      regionId: 5,
      recipientName: 'Quality Kids Learning Center',
      grantIds: ['14CH023'],
      childIncidents: true,
      deficiency: false,
      newRecipients: true,
      newStaff: false,
      noTTA: false,
      DRS: false,
      FEI: false,
      indicatorCount: 2,
      lastTTA: '2024-02-10',
    },
    {
      recipientId: 18,
      regionId: 6,
      recipientName: 'Rainbow Child Care Services',
      grantIds: ['14CH024', '14CH025'],
      childIncidents: false,
      deficiency: false,
      newRecipients: false,
      newStaff: true,
      noTTA: false,
      DRS: false,
      FEI: true,
      indicatorCount: 1,
      lastTTA: '2024-03-05',
    },
    {
      recipientId: 19,
      regionId: 7,
      recipientName: 'Sunshine Academy',
      grantIds: ['14CH026'],
      childIncidents: true,
      deficiency: true,
      newRecipients: false,
      newStaff: false,
      noTTA: true,
      DRS: false,
      FEI: false,
      indicatorCount: 3,
      lastTTA: null,
    },
    {
      recipientId: 20,
      regionId: 8,
      recipientName: 'Tomorrow\'s Leaders Head Start',
      grantIds: ['14CH027'],
      childIncidents: false,
      deficiency: true,
      newRecipients: true,
      newStaff: true,
      noTTA: false,
      DRS: true,
      FEI: false,
      indicatorCount: 3,
      lastTTA: '2024-01-05',
    },
  ];

  // Apply sorting to test data
  const sortedData = [...allTestData].sort((a, b) => {
    let comparison = 0;

    if (sortBy === 'indicatorCount') {
      comparison = a.indicatorCount - b.indicatorCount;
    } else if (sortBy === 'recipientName') {
      comparison = a.recipientName.localeCompare(b.recipientName);
    } else if (sortBy === 'lastTTA') {
      const dateA = a.lastTTA ? new Date(a.lastTTA) : new Date(0);
      const dateB = b.lastTTA ? new Date(b.lastTTA) : new Date(0);
      comparison = dateA - dateB;
    } else if (sortBy === 'regionId') {
      comparison = a.regionId - b.regionId;
    }

    // Apply direction
    if (direction === 'desc') {
      comparison = -comparison;
    }

    // Secondary sort by recipientName for indicatorCount and regionId
    if ((sortBy === 'indicatorCount' || sortBy === 'regionId') && comparison === 0) {
      comparison = a.recipientName.localeCompare(b.recipientName);
    }

    return comparison;
  });

  // Apply pagination
  const paginatedData = limit
    ? sortedData.slice(offset || 0, (offset || 0) + limit)
    : sortedData.slice(offset || 0);

  const spotlightData = paginatedData;

  // Use static data count for testing
  const totalCount = allTestData.length;

  // Return spotlight data with count for pagination
  return {
    recipients: spotlightData,
    count: totalCount,
    overview: {
      numRecipients: totalCount.toString(),
      totalRecipients: '678', // This would need to be calculated separately if needed
      recipientPercentage: totalCount > 0 ? `${Math.round((totalCount / 678) * 100)}%` : '0%',
    },
  };
}
