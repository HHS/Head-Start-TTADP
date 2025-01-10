/*
JSON: {
  "name": "Delivery Report",
  "description": {
    "standard": "A time-boxed report of services delivered by user and role.",
    "technical": "This query collects all monitoring goals used on approved reports within a defined time range, filtered by region and date range flags. Results are aggregated by user role and include details on the number of reports, total duration, and delivery method breakdown."
  },
  "output": {
    "defaultName": "delivery_report",
    "schema": [
      {
        "columnName": "User Role",
        "type": "string",
        "nullable": false,
        "description": "Role of the user associated with the activity report."
      },
      {
        "columnName": "User",
        "type": "string",
        "nullable": true,
        "description": "Name of the user associated with the activity report."
      },
      {
        "columnName": "Reports",
        "type": "integer",
        "nullable": false,
        "description": "Count of distinct activity reports linked to the user."
      },
      {
        "columnName": "Total Duration",
        "type": "integer",
        "nullable": true,
        "description": "Total duration of services delivered in minutes."
      },
      {
        "columnName": "Total Duration - in-person",
        "type": "integer",
        "nullable": true,
        "description": "Total duration of in-person services delivered in minutes."
      },
      {
        "columnName": "Total Duration - virtual",
        "type": "integer",
        "nullable": true,
        "description": "Total duration of virtual services delivered in minutes."
      },
      {
        "columnName": "Total Duration - hybrid",
        "type": "integer",
        "nullable": true,
        "description": "Total duration of hybrid services delivered in minutes."
      },
      {
        "columnName": "Grants",
        "type": "integer",
        "nullable": true,
        "description": "Count of distinct grants linked to the user."
      },
      {
        "columnName": "Percentage of Grants",
        "type": "decimal",
        "nullable": true,
        "description": "Percentage of grants linked to the user out of the total active grants in the region."
      },
      {
        "columnName": "Percentage of Recipients",
        "type": "decimal",
        "nullable": true,
        "description": "Percentage of recipients linked to the user out of the total active recipients in the region."
      }
    ]
  },
  "filters": [
    {
      "name": "region",
      "type": "integer[]",
      "display": "Region IDs",
      "description": "One or more values for 1 through 12 representing different regions."
    },
    {
      "name": "startDate",
      "type": "date[]",
      "display": "Start Date Range",
      "description": "Two dates defining a range for the 'startDate' to be within."
    }
  ]
}
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
    -- Filter for region if ssdi.region is defined
    AND (NULLIF(current_setting('ssdi.region', true), '') IS NULL
        OR a."regionId" in (
        SELECT value::integer AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.region', true), ''),'[]')::json) AS value
        ))
    -- Filter for startDate dates between two values if ssdi.startDate is defined
    AND (NULLIF(current_setting('ssdi.startDate', true), '') IS NULL
        OR a."startDate"::date <@ (
        SELECT CONCAT('[',MIN(value::timestamp),',',MAX(value::timestamp),')')::daterange AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.startDate', true), ''),'[]')::json) AS value
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
    -- Filter for region if ssdi.region is defined
    AND (NULLIF(current_setting('ssdi.region', true), '') IS NULL
        OR a."regionId" in (
        SELECT value::integer AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.region', true), ''),'[]')::json) AS value
        ))
    -- Filter for startDate dates between two values if ssdi.startDate is defined
    AND (NULLIF(current_setting('ssdi.startDate', true), '') IS NULL
        OR a."startDate"::date <@ (
        SELECT CONCAT('[',MIN(value::timestamp),',',MAX(value::timestamp),')')::daterange AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.startDate', true), ''),'[]')::json) AS value
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
    WHERE (NULLIF(current_setting('ssdi.region', true), '') IS NULL
        OR u."homeRegionId" in (
        SELECT value::integer AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.region', true), ''),'[]')::json) AS value
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
  filtered_grants AS (
    SELECT DISTINCT
      gr.*
    FROM "Grants" gr
    LEFT JOIN "GrantReplacements" grr
    ON gr.id = grr."replacedGrantId"
    WHERE gr."deleted" != true
	AND (grr."replacementDate" IS NULL
        OR grr."replacementDate" > '2020-08-31')
    -- Filter for startDate dates between two values if ssdi.startDate is defined
    AND (NULLIF(current_setting('ssdi.startDate', true), '') IS NULL
        OR gr."inactivationDate" IS NULL
        OR gr."inactivationDate"::date >= (
        SELECT MIN(value::timestamp)::date
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.startDate', true), ''),'[]')::json) AS value
        ))
    AND (NULLIF(current_setting('ssdi.startDate', true), '') IS NULL
        OR gr."startDate"::date <= (
        SELECT MAX(value::timestamp)::date
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.startDate', true), ''),'[]')::json) AS value
        ))
    AND (NULLIF(current_setting('ssdi.startDate', true), '') IS NULL
        OR gr."endDate"::date >= (
        SELECT MIN(value::timestamp)::date
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.startDate', true), ''),'[]')::json) AS value
        ))
    -- Filter for region if ssdi.region is defined
    AND (NULLIF(current_setting('ssdi.region', true), '') IS NULL
        OR gr."regionId" in (
        SELECT value::integer AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.region', true), ''),'[]')::json) AS value
        ))
  ),
  grant_counts AS (
    SELECT
      r.name,
      COUNT(DISTINCT gr."number") AS grant_count,
      COUNT(DISTINCT gr."recipientId") AS recipient_count,
      ARRAY_AGG(DISTINCT gr."number") AS grant_numbers,
      ARRAY_AGG(DISTINCT gr."recipientId") AS recipient_ids
    FROM "users_is_scope" u
    LEFT JOIN "UserRoles" ur
      ON u.id = ur."userId"
    LEFT JOIN "Roles" r
      ON ur."roleId" = r.id
    LEFT JOIN "reports" a
      ON u.id = a."userId"
    LEFT JOIN "ActivityRecipients" ar
      ON a.id = ar."activityReportId"
    LEFT JOIN filtered_grants gr
      ON gr."id" = ar."grantId"
    WHERE r.name IS NOT NULL
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
    LEFT JOIN filtered_grants gr
      ON gr."id" = ar."grantId"
    WHERE r.name IS NOT NULL
    GROUP BY 1,2
  ),
  total_grants AS (
    SELECT
      COUNT(DISTINCT gr.number) AS grant_count,
      COUNT(DISTINCT gr."recipientId") AS recipient_count
    FROM filtered_grants gr
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
      COUNT(DISTINCT gn.number) AS grant_count,
      ((COUNT(DISTINCT gn.number)::float / MAX(tg.grant_count)) * 100)::DECIMAL(5,2) AS grant_percentage,
      ((COUNT(DISTINCT ri."recipientId")::float / MAX(tg.recipient_count)) * 100)::DECIMAL(5,2) AS recipient_percentage
    FROM grant_counts gc
    CROSS JOIN UNNEST(gc.grant_numbers) gn(number)
    CROSS JOIN UNNEST(gc.recipient_ids) ri("recipientId")
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
