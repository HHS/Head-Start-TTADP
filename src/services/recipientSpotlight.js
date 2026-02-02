/* eslint-disable max-len */
import { Op, QueryTypes } from 'sequelize';
import {
  sequelize,
  Grant,
  Recipient,
} from '../models';

// Map from indicator label (as shown in UI) to column name in SQL
const INDICATOR_LABEL_TO_COLUMN = {
  'Child incidents': 'childIncidents',
  Deficiency: 'deficiency',
  'New recipient': 'newRecipients',
  'New staff': 'newStaff',
  'No TTA': 'noTTA',
  DRS: 'DRS',
  FEI: 'FEI',
};

// Whitelist of allowed sortBy column names to prevent SQL injection
const ALLOWED_SORT_COLUMNS = [
  'recipientId',
  'regionId',
  'recipientName',
  'lastTTA',
  'childIncidents',
  'deficiency',
  'newRecipients',
  'newStaff',
  'noTTA',
  'DRS',
  'FEI',
  'indicatorCount',
];

// Whitelist of allowed sort directions
const ALLOWED_DIRECTIONS = ['ASC', 'DESC'];

/* eslint-disable import/prefer-default-export */
export async function getRecipientSpotlightIndicators(
  scopes,
  sortBy,
  direction,
  offset,
  limit,
  regions,
  indicatorsToInclude = [],
  indicatorsToExclude = [],
) {
  // Early return if no regions are provided
  if (!regions || regions.length === 0) {
    return {
      recipients: [],
      count: 0,
      overview: {
        numRecipients: '0',
        totalRecipients: '0',
        recipientPercentage: '0%',
      },
    };
  }

  const INACTIVATION_CUT_OFF = new Date(new Date() - 365 * 24 * 60 * 60 * 1000);
  // Build where for grants, filter by region early on.
  // Get the where clause from scopes.grant (may be empty object if no filters)
  const grantScopeWhere = scopes?.grant?.where || {};

  const grantsWhere = {
    [Op.and]: [
      grantScopeWhere,
      {
        regionId: { [Op.in]: regions.map((r) => parseInt(r, 10)) },
      },
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

  // Get a list of grant ids using the scopes.
  // Use Recipient.findAll with include to ensure scope aliases work correctly.
  // The grant scopes use "grants"."id" which requires the include pattern.
  const grantResults = await Recipient.findAll({
    attributes: [],
    include: [
      {
        model: Grant,
        as: 'grants',
        attributes: ['id'],
        where: grantsWhere,
        required: true,
      },
    ],
    raw: true,
    nest: true,
  });

  // Extract unique grant ids from the nested results
  const uniqueGrantIds = [...new Set(grantResults.map((r) => r.grants.id))];
  const grantIds = uniqueGrantIds.map((id) => ({ id }));

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
    two years (ProgramPersonnel.effectiveDate) indicate it for director and cfo,
    which matches recipientLeadership() in src/services/recipient.js
    5. No TTA: There are no approved reports (AR) for this recipient in the LTM.
    6. DRS: TBD
    7. FEI: TBD
*/
  const grantIdList = grantIds.map((g) => g.id);
  const hasGrantIds = grantIdList.length > 0;
  const grantIdFilter = hasGrantIds ? `gr.id IN (${grantIdList.join(',')})` : 'FALSE';

  // Query total distinct recipient-region pairs for the selected regions
  // This counts all recipients with active/recently-inactive grants in the regions,
  // regardless of other scope filters, to get the true denominator for the percentage
  const totalRecipientsResult = await sequelize.query(`
    SELECT COUNT(*) AS "totalRecipients"
    FROM (
      SELECT DISTINCT r.id, gr."regionId"
      FROM "Recipients" r
      JOIN "Grants" gr ON r.id = gr."recipientId"
      WHERE gr."regionId" IN (:regions)
        AND (
          gr.status = 'Active'
          OR (
            gr.status = 'Inactive'
            AND gr."inactivationDate" >= :cutoffDate
          )
        )
    ) AS recipient_regions
  `, {
    replacements: {
      regions: regions.map((r) => parseInt(r, 10)),
      cutoffDate: INACTIVATION_CUT_OFF,
    },
    type: QueryTypes.SELECT,
  });
  const totalRecipients = parseInt(totalRecipientsResult[0]?.totalRecipients || 0, 10);

  // Validate and sanitize sortBy and direction to prevent SQL injection
  const safeSortBy = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : 'recipientName';
  const safeDirection = ALLOWED_DIRECTIONS.includes(direction?.toUpperCase()) ? direction.toUpperCase() : 'ASC';

  // Build indicator WHERE clause for filtering by priority indicators
  // Default to only showing recipients with at least one indicator
  let indicatorWhereClause = '"indicatorCount" > 0';

  if (indicatorsToInclude.length > 0) {
    const includeConditions = indicatorsToInclude
      .map((label) => INDICATOR_LABEL_TO_COLUMN[label])
      .filter(Boolean)
      .map((col) => `"${col}" = TRUE`);

    if (includeConditions.length > 0) {
      indicatorWhereClause = `(${includeConditions.join(' OR ')})`;
    }
  }

  // Handle exclusion filter - exclude recipients with any of the excluded indicators
  if (indicatorsToExclude.length > 0) {
    const excludeConditions = indicatorsToExclude
      .map((label) => INDICATOR_LABEL_TO_COLUMN[label])
      .filter(Boolean)
      .map((col) => `"${col}" = FALSE`);

    if (excludeConditions.length > 0) {
      // All excluded indicators must be FALSE (i.e., recipient must NOT have any of them)
      indicatorWhereClause = `${indicatorWhereClause} AND (${excludeConditions.join(' AND ')})`;
    }
  }

  const spotLightSql = `
    WITH
    -- Creating some useful CTEs
    -- Join grants and recipients so we don't have to do it repeatedly
    grant_recipients AS (
      SELECT
        r.id rid,
        r.name AS rname,
        gr."regionId" region,
        gr.id grid,
        gr.number grnumber
      FROM "Recipients" r
      JOIN "Grants" gr
        ON r.id = gr."recipientId"
      WHERE ${grantIdFilter}
    ),
    recipients AS (
    SELECT
      rid,
      rname,
      region,
      ARRAY_AGG(DISTINCT grid)::text[] grant_ids,
      MAX(ar."startDate") last_tta
    FROM grant_recipients
    LEFT JOIN "Goals" g
      ON g."grantId" = grid
    LEFT JOIN "ActivityReportGoals" arg
      ON arg."goalId" = g.id
    LEFT JOIN "ActivityReports" ar
      ON arg."activityReportId" = ar.id
      AND ar."calculatedStatus" = 'approved'
    GROUP BY 1,2,3
    ),
    -- Usually we care about all the grants for a recipient
    -- not just the ones in the filter
    all_grants AS (
    SELECT DISTINCT
      rid,
      rname,
      region,
      gr.id grid,
      gr."startDate" grstart,
      gr.number grnumber
    FROM recipients
    JOIN "Grants" gr
      ON rid = gr."recipientId"
    WHERE gr.deleted IS NULL OR NOT gr.deleted
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
    FROM all_grants
    JOIN "MonitoringReviewGrantees" mrg
      ON grnumber = mrg."grantNumber"
    JOIN "MonitoringReviews" mr
      ON mrg."reviewId" = mr."reviewId"
    JOIN "MonitoringReviewStatuses" mrs
      ON mr."statusId" = mrs."statusId"
    WHERE mr."deletedAt" IS NULL 
      AND (
        mr."reportDeliveryDate" > '2025-01-20'
        OR
        mr."sourceCreatedAt" > '2025-01-20'
      )
    ),
    ---------------------------------------
    -- Spotlight indicators ---------------
    ---------------------------------------
    -- 1. Child Incidents: Grants with more than one RAN citation in the last 12 months
    child_incidents AS (
      SELECT
        rid incident_rid,
        region incident_region
      FROM all_reviews
      WHERE review_type = 'RAN'
        AND review_status = 'Complete'
        AND rdd >= NOW() - INTERVAL '12 months'
      GROUP BY 1,2
      HAVING COUNT(*) > 1
    ),
    
    -- 2. Deficiency: Recipients with at least one uncorrected deficiency
    --    in monitoring findings. The logic for "uncorrected" is complex
    --    because we cannot simply rely on the finding's statusId value.

    -- associate each citation with its most recent review
    -- TODO: recheck the definition of "deficiency"
    ordered_citation_reviews AS (
    SELECT DISTINCT ON (mf."findingId")
      rid,
      region,
      grid,
      mf."findingId" fid,
      -- this is only safe with deficiencies because AOCs and ANCs are not
      -- consistent between findingType and determination
      COALESCE(mfh.determination, mf."findingType") finding_type,
      mfs.name finding_status,
      ruuid,
      review_status,
      rdd
    FROM "MonitoringFindings" mf
    JOIN "MonitoringFindingHistories" mfh
      ON mf."findingId" = mfh."findingId"
    JOIN all_reviews
      ON mfh."reviewId" = ruuid
    JOIN "MonitoringFindingStatuses" mfs
      ON mf."statusId" = mfs."statusId"
    WHERE mf."findingType" = 'Deficiency'
      OR mfs.name = 'Elevated Deficiency'
    ORDER BY mf."findingId",rsd DESC, rsc DESC
    ),
    deficiencies AS (
      SELECT DISTINCT
        rid deficiency_rid,
        region deficiency_region
      FROM ordered_citation_reviews
      WHERE finding_status IN ('Active','Elevated Deficiency')
        OR rdd IS NULL
    ),

    -- 3. New Recipients: Recipients with oldest grant less than 4 years old
    new_recipients AS (
      SELECT
        rid new_recip_rid,
        region new_recip_region
      FROM all_grants
      GROUP BY 1,2
      HAVING MIN(grstart) >= NOW() - INTERVAL '4 years'
    ),

    -- 4. New Staff: Any program personnel with effective date in the past 2 years
    new_staff AS (
      SELECT
        rid new_staff_rid,
        region new_staff_region
      FROM all_grants
      JOIN "ProgramPersonnel" pp
        ON grid = pp."grantId"
      WHERE pp.role IN ('cfo','director') 
        AND pp."effectiveDate" >= NOW() - INTERVAL '2 years'
      GROUP BY 1,2
    ),

    -- 5. No TTA: Grants with no approved reports or TR sessions
    --    in the last 12 months
    recent_session_grants AS (
    SELECT (jsonb_array_elements(data->'recipients')->>'value')::integer session_grid
    FROM "SessionReportPilots"
    WHERE data->>'status' = 'Complete'
      AND (data->>'startDate')::timestamp >= NOW() - INTERVAL '12 months'
    ),
    grants_with_tta AS (
      SELECT
        grid,
        rid,
        region
      FROM grant_recipients
      JOIN "Goals" g
        ON g."grantId" = grid
      JOIN "ActivityReportGoals" arg
        ON arg."goalId" = g.id
      JOIN "ActivityReports" ar
        ON arg."activityReportId" = ar.id
      WHERE ar."calculatedStatus" = 'approved'
        AND ar."startDate" >= NOW() - INTERVAL '12 months'
      UNION
      SELECT
        grid,
        rid,
        region
      FROM grant_recipients
      JOIN recent_session_grants
        ON grid = session_grid
    ),
    grants_without_tta AS (
      SELECT 
        grid,
        rid,
        region
      FROM grant_recipients
      EXCEPT
      SELECT
        grid,
        rid,
        region
      FROM grants_with_tta
    ),
    no_tta AS (
      SELECT DISTINCT
        rid no_tta_rid,
        region no_tta_region
      FROM grants_without_tta
    ),
    -- Combine all indicators into one result set
    combined_indicators AS (
      SELECT
        rid "recipientId",
        region "regionId",
        rname "recipientName",
        grant_ids "grantIds",
        last_tta "lastTTA",
        incident_rid IS NOT NULL "childIncidents",
        deficiency_rid IS NOT NULL "deficiency",
        new_recip_rid IS NOT NULL "newRecipients",
        new_staff_rid IS NOT NULL "newStaff",
        no_tta_rid IS NOT NULL "noTTA",
        FALSE AS "DRS",  -- Placeholder for future implementation
        FALSE AS "FEI",   -- Placeholder for future implementation
        (incident_rid IS NOT NULL)::int +
        (deficiency_rid IS NOT NULL)::int +
        (new_recip_rid IS NOT NULL)::int +
        (new_staff_rid IS NOT NULL)::int +
        (no_tta_rid IS NOT NULL)::int "indicatorCount"
      FROM recipients
      LEFT JOIN child_incidents ci
        ON rid = incident_rid
        AND region = incident_region
      LEFT JOIN deficiencies d
        ON rid = deficiency_rid
        AND region = deficiency_region
      LEFT JOIN new_recipients nr
        ON rid = new_recip_rid
        AND region = new_recip_region
      LEFT JOIN new_staff ns
        ON rid = new_staff_rid
        AND region = new_staff_region
      LEFT JOIN no_tta nt
        ON rid = no_tta_rid
        AND region = no_tta_region
    )

    SELECT
      *,
      COUNT(*) OVER() AS "totalCount"
    FROM combined_indicators
    WHERE ${indicatorWhereClause}
    ORDER BY "${safeSortBy}" ${safeDirection}${
  (safeSortBy === 'indicatorCount' || safeSortBy === 'regionId') ? ', "recipientName" ASC' : ''
}
    ${hasGrantIds ? `LIMIT ${limit}` : ''}
    OFFSET ${offset}
  `;

  // Execute the raw SQL query to get the recipient spotlight indicators.
  const spotlightSqlData = await sequelize.query(
    spotLightSql,
    {
      type: QueryTypes.SELECT,
    },
  );

  // Extract total count from the first row (window function includes it on every row)
  const totalCount = spotlightSqlData.length > 0
    ? parseInt(spotlightSqlData[0].totalCount, 10)
    : 0;

  // Remove totalCount from each recipient object before returning
  const recipients = spotlightSqlData.map(({ totalCount: _, ...recipient }) => recipient);

  // Return spotlight data with count for pagination
  return {
    recipients,
    count: totalCount,
    overview: {
      numRecipients: totalCount.toString(), // This is the total number of cards (recipient:region).
      totalRecipients: totalRecipients.toString(), // This is the total number of recipient:region for denom.
      recipientPercentage: totalRecipients > 0
        ? `${Math.round((totalCount / totalRecipients) * 100)}%`
        : '0%',
    },
  };
}
