/**
* @name: Fake FEI Goals
* @description: A report of all goals relating to under/full enrollment that are not linked to the official FEI template.
* @defaultOutputName: fake_fei_report
*
* This query collects goals relating to under/full enrollment that are not linked to the official FEI template.
*
* The query results are filterable by the SSDI flags. All SSDI flags are passed as an array of values
* The following are the available flags within this script:
* - ssdi.regionIds - integer[] - one or more values for 1 through 12
* - ssdi.createdbetween - date[] - two dates defining a range for the createdAt to be within
* - ssdi.recipients - string[] - one or more verbatim recipient names
* - ssdi.uei - text[] - one or more verbatim UEI values
* - ssdi.grantNumbers - string[] - one or more verbatim grant numbers
* - ssdi.status - string[] - one or more verbatim statuses
*
* zero or more SSDI flags can be set within the same transaction as the query is executed.
* The following is an example of how to set a SSDI flag:
* SELECT SET_CONFIG('ssdi.regionIds','[11]',TRUE);
*/
CREATE EXTENSION IF NOT EXISTS pg_trgm;
------------------+------------
WITH gnames AS (
SELECT DISTINCT g.name gname
FROM "Goals" g
JOIN "Grants" gr
  ON g."grantId" = gr.id
WHERE g."deletedAt" IS NULL
  AND gr.deleted = FALSE
),
oldest_name_instances AS (
SELECT
  gname,
  MIN(id) firstgoalid
FROM gnames
JOIN "Goals"
  ON gname = name
GROUP BY 1
),
name_creations AS (
SELECT
  gname,
  firstgoalid,
  "createdVia" first_createdvia,
  MIN(zag.id) firstzagid
FROM oldest_name_instances
JOIN "Goals" g
  ON g.id = firstgoalid
LEFT JOIN "ZALGoals" zag
  ON data_id = firstgoalid
  AND new_row_data->>'name' = gname
GROUP BY 1,2,3
),
name_creators AS (
SELECT
  gname,
  first_createdvia,
  u.name creator_name
FROM name_creations
LEFT JOIN "ZALGoals" zag
  ON firstzagid = zag.id
LEFT JOIN "Users" u
  ON zag.dml_as = u.id
)
SELECT
  r.name,
  r.uei,
  gr.number "grant number",
  gr.status "grant status",
  gr."regionId",
  g.id "goal id",
  g.status "goal status",
  g."createdAt",
  COUNT(DISTINCT a.id) FILTER (WHERE a."calculatedStatus" = 'approved') "approved reports",
  COUNT(DISTINCT a.id) FILTER (WHERE a."calculatedStatus" IN ('draft', 'submitted')) "pending reports",
  GREATEST(
    similarity(gt."templateName", g.name),
    similarity(gt."templateName", LEFT(g.name, LENGTH(gt."templateName"))),
    similarity(gt."templateName", RIGHT(g.name, LENGTH(gt."templateName")))
  ) similarity,
  COALESCE(nc.creator_name, 'unrecorded creator createdVia: ' || g."createdVia") "goal text creator",
  g.name
FROM "Goals" g
JOIN "GoalTemplates" gt
-- Real FEI goal is in the production DATABASE with an id of 19017 in the GoalTemplates table
ON gt.id = 19017
JOIN "Grants" gr
ON g."grantId" = gr.id
JOIN "Recipients" r
ON gr."recipientId" = r.id
LEFT JOIN "ActivityReportGoals" arg
ON g.id = arg."goalId"
LEFT JOIN "ActivityReports" a
ON arg."activityReportId" = a.id
LEFT JOIN name_creators nc
ON g.name = nc.gname
WHERE g."deletedAt" IS NULL
AND g."mapsToParentGoalId" IS NULL
-- excluding goals attached to deleted grants and goals only on TRs, because those are invisible to users
AND NOT gr.deleted
AND NOT (g."createdVia" = 'tr' AND a.id IS NULL)
AND g.name ~* '(^|[^a-zA-Z])(under[- ]?enrollment|full[- ]?enrollment|fei)($|[^a-zA-Z])'
AND COALESCE(g."goalTemplateId", 0) != gt.id
-- Filter for regionIds if ssdi.regionIds is defined
AND (NULLIF(current_setting('ssdi.regionIds', true), '') IS NULL
  OR gr."regionId" in (
  SELECT value::integer AS my_array
    FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.regionIds', true), ''),'[]')::json) AS value
  ))
-- Filter for createdAt dates between two values if ssdi.createdbetween is defined
AND (NULLIF(current_setting('ssdi.createdbetween', true), '') IS NULL
      OR g."createdAt"::date <@ (
        SELECT CONCAT('[',MIN(value::timestamp),',',MAX(value::timestamp),')')::daterange AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.createdbetween', true), ''),'[]')::json) AS value
      ))
-- Filter for recipients if ssdi.recipients is defined
AND (NULLIF(current_setting('ssdi.recipients', true), '') IS NULL
      OR r.name in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.recipients', true), ''),'[]')::json) AS value
      ))
-- Filter for UEI if ssdi.uei is defined
AND (NULLIF(current_setting('ssdi.uei', true), '') IS NULL
      OR r.uei in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.uei', true), ''),'[]')::json) AS value
      ))
-- Filter for grantNumbers if ssdi.grantNumbers is defined
AND (NULLIF(current_setting('ssdi.grantNumbers', true), '') IS NULL
      OR gr.number in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.grantNumbers', true), ''),'[]')::json) AS value
      ))
-- Filter for status if ssdi.status is defined
AND (NULLIF(current_setting('ssdi.status', true), '') IS NULL
      OR g.status in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.status', true), ''),'[]')::json) AS value
      ))
GROUP BY 1,2,3,4,5,6,7,8,11,12
-- Ghost goal filter
HAVING NOT (g."createdVia" = 'activityReport'
	AND COUNT(DISTINCT a.id) FILTER (WHERE a."calculatedStatus" = 'approved') = 0
	AND COUNT(DISTINCT a.id) FILTER (WHERE a."calculatedStatus" IN ('draft', 'submitted')) = 0)
ORDER BY 5,11 desc;
