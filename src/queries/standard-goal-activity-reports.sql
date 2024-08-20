/**
* @name: Standard Goal Report Download URL Generator
* @description: Generates downloadable URLs for approved reports based on various filters for standard goals.
* @defaultOutputName: standard_goal_report_download_urls
*
* This query filters reports based on several SSDI flags and generates URLs for downloading the reports.
*
* The query results are filterable by the following SSDI flags, which are passed as an array of values:
* - ssdi.regionIds - integer[] - One or more values for 1 through 12
* - ssdi.startDate - date[] - Two dates defining a range for the startDate to be within. If only one date is supplied, the range is from the supplied date to the current timestamp. If no dates are supplied, this filter is ignored.
* - ssdi.standardGoal - text[] - One or more values for 'CLASS' and/or 'FEI' for filtering goalTemplateId. If this filter is empty or null, it defaults to 'CLASS'.
* - ssdi.grantNumbers - text[] - One or more grant numbers
* - ssdi.recipients - text[] - One or more recipient names
* - ssdi.uei - text[] - One or more UEI values
*
* Zero or more SSDI flags can be set within the same transaction as the query is executed.
* The following is an example of how to set a SSDI flag:
* SELECT SET_CONFIG('ssdi.startDate','["2023-10-01"]',TRUE);
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
      a.id
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
    -- Filter for regionIds if ssdi.regionIds is defined
    AND (NULLIF(current_setting('ssdi.regionIds', true), '') IS NULL
      OR a."regionId" in (
        SELECT
          value::integer AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.regionIds', true), ''),'[]')::json) AS value
      ))
    -- Filter for grantNumbers if ssdi.grantNumbers is defined
    AND (NULLIF(current_setting('ssdi.grantNumbers', true), '') IS NULL
      OR gr.number in (
        SELECT
          value::text AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.grantNumbers', true), ''),'[]')::json) AS value
      ))
    -- Filter for recipients if ssdi.recipients is defined
    AND (NULLIF(current_setting('ssdi.recipients', true), '') IS NULL
      OR r.name in (
        SELECT
          value::text AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.recipients', true), ''),'[]')::json) AS value
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
