/*
JSON: {
  "name": "Standard Goal Report Download URL Generator",
  "description": {
    "standard": "Generates downloadable URLs for approved reports based on various filters for standard goals.",
    "technical": "Runs a query using the supplied filters to build a set of URLs. Pasting each URL to the browser downloads an Activity Report Export CSV from the TTA Hub containing filtered goals that use the desired standard goal template. Future standard goals will need to be added to the case statement where specified."
  },
  "output": {
    "defaultName": "standard_goal_report_download_urls",
    "schema": [
      {
        "columnName": "group_num",
        "type": "integer",
        "nullable": false,
        "description": "The group number used to partition the reports into separate download URLs."
      },
      {
        "columnName": "report_count",
        "type": "integer",
        "nullable": false,
        "description": "The count of distinct report IDs within the current group."
      },
      {
        "columnName": "download_url",
        "type": "string",
        "nullable": false,
        "description": "The generated URL for downloading the activity report CSV for this group."
      }
    ]
  },
  "filters": [
    {
      "name": "region",
      "type": "integer[]",
      "display": "Region IDs",
      "description": "One or more values for 1 through 12 representing the region IDs."
    },
    {
      "name": "startDate",
      "type": "date[]",
      "display": "Start Date Range",
      "description": "Two dates defining a range for the startDate. If only one date is supplied, the range is from the supplied date to the current timestamp. If no dates are supplied, this filter is ignored."
    },
    {
      "name": "standardGoal",
      "type": "string[]",
      "display": "Standard Goals",
      "description": "One or more values for 'CLASS' and/or 'FEI' to filter by goal template. Defaults to 'CLASS' if no value is provided."
    },
    {
      "name": "grantNumber",
      "type": "string[]",
      "display": "Grant Numbers",
      "description": "One or more grant numbers to filter the results."
    },
    {
      "name": "recipient",
      "type": "string[]",
      "display": "Recipient Names",
      "description": "One or more recipient names to filter the results."
    },
    {
      "name": "uei",
      "type": "string[]",
      "display": "UEI Values",
      "description": "One or more UEI values to filter the results."
    }
  ],
  "sorting": {
    "default": [
      { "level": 1, "name": "group_num", "order": "ASC" }
    ]
  },
  "customSortingSupported": false,
  "paginationSupported": false,
  "exampleUsage": "SELECT SET_CONFIG('ssdi.startDate', '[\"2023-10-01\"]', TRUE);"
}
*/
WITH
  "BaseURL" AS (
    SELECT
      'https://ttahub.ohs.acf.hhs.gov/api/activity-reports/download-all?' ||
      'region.in[]=1&region.in[]=2&region.in[]=3&region.in[]=4&region.in[]=5&region.in[]=6&region.in[]=7&region.in[]=8&region.in[]=9&region.in[]=10&region.in[]=11&region.in[]=12' ||
      '&reportId.ctn[]=' AS base_url
  ),
  "FixedPartLength" AS (
    SELECT
      LENGTH(base_url) AS fixed_length
    FROM "BaseURL"
  ),
  "DistinctIDs" AS (
    SELECT DISTINCT
      CASE
        WHEN a.id > 9999 THEN a.id::text
        WHEN a."legacyId" IS NOT NULL THEN "legacyId"
        ELSE '-' || a.id::text || '$'
      END AS id
    FROM "Goals" g
    JOIN "ActivityReportGoals" arg
    ON g.id = arg."goalId"
    JOIN "ActivityReports" a
    ON arg."activityReportId" = a.id
    JOIN "Grants" gr
    ON g."grantId" = gr.id
    JOIN "Recipients" r
    ON gr."recipientId" = r.id
    WHERE a."calculatedStatus" = 'approved'
    -- Filter for goalTemplateId based on standardGoal
    AND g."goalTemplateId" = ANY (COALESCE(
        NULLIF(
            ARRAY(
                SELECT
                  CASE
                    -- List of supported standard goals:
                    WHEN value = 'CLASS' THEN 18172 -- CLASS
                    WHEN value = 'FEI' THEN 19017 -- FEI
                    -- Note: Add new standard goals above this line
                    ELSE NULL
                  END::integer
                FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.standardGoal', true), ''),'["CLASS"]')::json) AS value
            )::integer[],
            ARRAY[]::integer[]
        ),
        ARRAY[18172]::integer[] -- Default: CLASS
    ))
    -- Filter for startDate dates between two values if ssdi.startDate is defined
    AND (NULLIF(current_setting('ssdi.startDate', true), '') IS NULL
      OR a."startDate"::date <@ (
        SELECT
          CONCAT(
              '[',
              MIN(value::timestamp),
              ',',
              COALESCE(NULLIF(MAX(value::timestamp), MIN(value::timestamp)), NOW()::timestamp),
              ')'
          )::daterange AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.startDate', true), ''),'[]')::json) AS value
      ))
    -- Filter for region if ssdi.region is defined
    AND (NULLIF(current_setting('ssdi.region', true), '') IS NULL
      OR a."regionId" in (
        SELECT
          value::integer AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.region', true), ''),'[]')::json) AS value
      ))
    -- Filter for grantNumber if ssdi.grantNumber is defined
    AND (NULLIF(current_setting('ssdi.grantNumber', true), '') IS NULL
      OR gr.number in (
        SELECT
          value::text AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.grantNumber', true), ''),'[]')::json) AS value
      ))
    -- Filter for recipient if ssdi.recipient is defined
    AND (NULLIF(current_setting('ssdi.recipient', true), '') IS NULL
      OR r.name in (
        SELECT
          value::text AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.recipient', true), ''),'[]')::json) AS value
      ))
    -- Filter for UEI if ssdi.uei is defined
    AND (NULLIF(current_setting('ssdi.uei', true), '') IS NULL
      OR r.uei in (
        SELECT
          value::text AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.uei', true), ''),'[]')::json) AS value
      ))
  ),
  "MaxGroupSize" AS (
    SELECT
      (2048 - MAX(fixed_length)) / (MAX(LENGTH(id::text)) + 1) AS max_ids_per_group
    FROM "FixedPartLength", "DistinctIDs"
  ),
  "NumberedIDs" AS (
      SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY id) AS row_num
      FROM "DistinctIDs"
  ),
  "GroupedIDs" AS (
      SELECT
        id,
        CEIL(row_num::numeric / max_ids_per_group::numeric) AS group_num
      FROM "NumberedIDs", "MaxGroupSize"
  )
SELECT
  group_num,
  COUNT(id) AS report_count,
  CONCAT(
    base_url,
    STRING_AGG(id::text, '|')
  ) AS download_url
FROM "GroupedIDs", "BaseURL"
GROUP BY group_num, base_url
ORDER BY group_num;
