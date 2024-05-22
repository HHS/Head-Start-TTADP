/**
* This query collects all the Monitoring goals used on approved reports within the defined time range.
*
* The query results are filterable by the JDI flags. All JDI flags are passed as an array of values
* The following are the available flags within this script:
* - jdi.regionIds - one or more values for 1 through 12
* - jdi.startDate - two dates defining a range for the startDate to be within
*
* zero or more JDI flags can be set within the same transaction as the query is executed.
* The following is an example of how to set a JDI flag:
* SELECT SET_CONFIG('jdi.regionIds','[11]',TRUE);
* SELECT SET_CONFIG('jdi.startDate','["2024-04-01","2024-04-30"]',TRUE);
*/
WITH
  reports AS (
    SELECT
      a.id,
      a."userId",
      a.duration,
      a."deliveryMethod",
      a."calculatedStatus",
      a."startDate"
    FROM "ActivityReports" a
    WHERE a."calculatedStatus" = 'approved'
    -- Filter for regionIds if jdi.regionIds is defined
    AND (NULLIF(current_setting('jdi.regionIds', true), '') IS NULL
        OR a."regionId" in (
        SELECT value::integer AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('jdi.regionIds', true), ''),'[]')::json) AS value
        ))
    -- Filter for startDate dates between two values if jdi.startDate is defined
    AND (NULLIF(current_setting('jdi.startDate', true), '') IS NULL
        OR a."startDate"::date <@ (
        SELECT CONCAT('[',MIN(value::timestamp),',',MAX(value::timestamp),')')::daterange AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('jdi.startDate', true), ''),'[]')::json) AS value
        ))
    UNION

    SELECT
      a.id,
      arc."userId",
      a.duration,
      a."deliveryMethod",
      a."calculatedStatus",
      a."startDate"
    FROM "ActivityReports" a
    JOIN "ActivityReportCollaborators" arc
    ON a.id = arc."activityReportId"
    WHERE a."calculatedStatus" = 'approved'
    -- Filter for regionIds if jdi.regionIds is defined
    AND (NULLIF(current_setting('jdi.regionIds', true), '') IS NULL
        OR a."regionId" in (
        SELECT value::integer AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('jdi.regionIds', true), ''),'[]')::json) AS value
        ))
    -- Filter for startDate dates between two values if jdi.startDate is defined
    AND (NULLIF(current_setting('jdi.startDate', true), '') IS NULL
        OR a."startDate"::date <@ (
        SELECT CONCAT('[',MIN(value::timestamp),',',MAX(value::timestamp),')')::daterange AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('jdi.startDate', true), ''),'[]')::json) AS value
        ))
  ),
  users_is_scope AS (
    SELECT
      u.id,
      u.name,
      u."homeRegionId"
    FROM "Users" u
    LEFT JOIN "Permissions" p ON u.id = p."userId"
    LEFT JOIN "Scopes" s ON p."scopeId" = s.id
    LEFT JOIN "reports" a ON a."userId" = u.id
    WHERE (NULLIF(current_setting('jdi.regionIds', true), '') IS NULL
        OR u."homeRegionId" in (
        SELECT value::integer AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('jdi.regionIds', true), ''),'[]')::json) AS value
        ))
    GROUP BY 1,2,3
    HAVING COUNT(DISTINCT a.id) > 0 OR 'SITE_ACCESS' = ANY(ARRAY_AGG(s.name))
  ),
  duration_data AS (
    SELECT
      r.name AS "User Role",
      NULL AS "User",
      COUNT(DISTINCT a.id) AS "Reports",
      SUM(a.duration) AS "Total Duration",
      SUM(a.duration) FILTER (WHERE a."deliveryMethod" = 'in-person') AS "Total Duration - in-person",
      SUM(a.duration) FILTER (WHERE a."deliveryMethod" = 'virtual') AS "Total Duration - virtual",
      SUM(a.duration) FILTER (WHERE a."deliveryMethod" = 'hybrid') AS "Total Duration - hybrid"
    FROM "users_is_scope" u
    JOIN "UserRoles" ur ON u.id = ur."userId"
    JOIN "Roles" r ON ur."roleId" = r.id
    LEFT JOIN "reports" a ON a."userId" = u.id
    GROUP BY 1,2

    UNION ALL

    SELECT
      r.name AS "User Role",
      u.name AS "User",
      COUNT(DISTINCT a.id) AS "Reports",
      SUM(a.duration) AS "Total Duration",
      SUM(a.duration) FILTER (WHERE a."deliveryMethod" = 'in-person') AS "Total Duration - in-person",
      SUM(a.duration) FILTER (WHERE a."deliveryMethod" = 'virtual') AS "Total Duration - virtual",
      SUM(a.duration) FILTER (WHERE a."deliveryMethod" = 'hybrid') AS "Total Duration - hybrid"
    FROM "users_is_scope" u
    JOIN "UserRoles" ur ON u.id = ur."userId"
    JOIN "Roles" r ON ur."roleId" = r.id
    LEFT JOIN "reports" a ON a."userId" = u.id
    GROUP BY 1,2

    UNION ALL

    SELECT
      'Total' AS "User Role",
      NULL AS "User",
      COUNT(DISTINCT a.id) AS "Reports",
      SUM(a.duration) AS "Total Duration",
      SUM(a.duration) FILTER (WHERE a."deliveryMethod" = 'in-person') AS "Total Duration - in-person",
      SUM(a.duration) FILTER (WHERE a."deliveryMethod" = 'virtual') AS "Total Duration - virtual",
      SUM(a.duration) FILTER (WHERE a."deliveryMethod" = 'hybrid') AS "Total Duration - hybrid"
    FROM "reports" a
    JOIN "users_is_scope" u ON a."userId" = u.id
    JOIN "UserRoles" ur ON u.id = ur."userId"
    JOIN "Roles" r ON ur."roleId" = r.id
  ),
  grant_counts AS (
    SELECT
      r.name,
      COUNT(DISTINCT gr."number") AS grant_count,
      COUNT(DISTINCT gr."recipientId") AS recipient_count
    FROM "users_is_scope" u
    LEFT JOIN "UserRoles" ur
      ON u.id = ur."userId"
    LEFT JOIN "Roles" r
      ON ur."roleId" = r.id
    LEFT JOIN "reports" a
      ON u.id = a."userId"
    LEFT JOIN "ActivityRecipients" ar
      ON a.id = ar."activityReportId"
    LEFT JOIN "Grants" gr
      ON gr."id" = ar."grantId"
    WHERE (gr.status = 'Active' OR gr.status IS NULL)
      AND r.name IS NOT NULL
    GROUP BY r.name
  ),
  grant_count_users AS (
    SELECT
      r.name,
      u.name "User",
      COUNT(DISTINCT gr.number) AS grant_count,
      COUNT(DISTINCT gr."recipientId") AS recipient_count
    FROM "users_is_scope" u
    LEFT JOIN "UserRoles" ur
      ON u.id = ur."userId"
    LEFT JOIN "Roles" r
      ON ur."roleId" = r.id
    LEFT JOIN "reports" a
      ON u.id = a."userId"
    LEFT JOIN "ActivityRecipients" ar
      ON a.id = ar."activityReportId"
    LEFT JOIN "Grants" gr
      ON gr."id" = ar."grantId"
    WHERE (gr.status = 'Active' OR gr.status IS NULL)
      AND r.name IS NOT NULL
    GROUP BY 1,2
  ),
  total_grants AS (
    SELECT
      COUNT(DISTINCT gr.number) AS grant_count,
      COUNT(DISTINCT gr."recipientId") AS recipient_count
    FROM "Grants" gr
    WHERE gr.status = 'Active'
      -- Filter for regionIds if jdi.regionIds is defined
      AND (NULLIF(current_setting('jdi.regionIds', true), '') IS NULL
          OR gr."regionId" in (
          SELECT value::integer AS my_array
            FROM json_array_elements_text(COALESCE(NULLIF(current_setting('jdi.regionIds', true), ''),'[]')::json) AS value
          ))
  ),
  recipient_data AS (
    SELECT
      gc.name AS "User Role",
      NULL AS "User",
      gc.grant_count,
      ((gc.grant_count::float / tg.grant_count) * 100)::DECIMAL(5,2) AS grant_percentage,
      ((gc.recipient_count::float / tg.recipient_count) * 100)::DECIMAL(5,2) AS recipient_percentage
    FROM grant_counts gc
    CROSS JOIN total_grants tg

    UNION ALL

    SELECT
      gc.name AS "User Role",
      gc."User" AS "User",
      gc.grant_count,
      ((gc.grant_count::float / tg.grant_count) * 100)::DECIMAL(5,2) AS grant_percentage,
      ((gc.recipient_count::float / tg.recipient_count) * 100)::DECIMAL(5,2) AS recipient_percentage
    FROM grant_count_users gc
    CROSS JOIN total_grants tg

    UNION ALL

    SELECT
      'Total' AS "User Role",
      NULL AS "User",
      SUM(gc.grant_count) AS grant_count,
      ((SUM(gc.grant_count)::float / MAX(tg.grant_count)) * 100)::DECIMAL(5,2) AS grant_percentage,
      ((SUM(gc.recipient_count)::float / MAX(tg.recipient_count)) * 100)::DECIMAL(5,2) AS recipient_percentage
    FROM grant_counts gc
    CROSS JOIN total_grants tg
  ),
  collected AS (
    SELECT
      CASE
        WHEN dd."User Role" = 'Total' THEN NULL
        ELSE dd."User Role"
      END "User Role",
      dd."User",
      dd."Reports",
      dd."Total Duration",
      dd."Total Duration - in-person",
      dd."Total Duration - virtual",
      dd."Total Duration - hybrid",
      rd.grant_count AS "Grants",
      rd.grant_percentage AS "Percentage of Grants",
      rd.recipient_percentage AS "Percentage of Recipients"
    FROM duration_data dd
    JOIN recipient_data rd
    ON dd."User Role" = rd."User Role"
    AND (dd."User" = rd."User" OR (dd."User" IS NULL AND rd."User" IS NULL))
    ORDER BY
      1 NULLS FIRST,
      2 NULLS FIRST
  )
  SELECT
    COALESCE("User Role",'Total') "User Role",
    COALESCE("User",'Total') "User",
    "Reports",
    "Total Duration",
    "Total Duration - in-person",
    "Total Duration - virtual",
    "Total Duration - hybrid",
    "Grants",
    "Percentage of Grants",
    "Percentage of Recipients"
  FROM collected;
