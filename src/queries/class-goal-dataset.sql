/**
* This query collects all the goals.
*
* The query results are filterable by the SSDI flags. All SSDI flags are passed as an array of values
* The following are the available flags within this script:
* - ssdi.regionIds - one or more values for 1 through 12
* - ssdi.recipients - one or more verbatium recipient names
* - ssdi.grantNumbers - one or more verbatium grant numbers
* - ssdi.goals - one or more verbatium goal text
* - ssdi.status - one or more verbatium statuses
* - ssdi.createdVia - one or more verbatium created via values
* - ssdi.onApprovedAR - true or false
* - ssdi.createdbetween - two dates defining a range for the createdAt to be within
*
* zero or more SSDI flags can be set within the same transaction as the query is executed.
* The following is an example of how to set a SSDI flag:
* SELECT SET_CONFIG('ssdi.createdbetween','["2022-07-01","2023-06-30"]',TRUE);
*/
SELECT
	g."id" AS "goal id",
	gr."id" AS "grant id",
	gr."number" AS "grant number",
	g."goalTemplateId" AS "template id",
	gr."recipientId" AS "recipient id",
	gr."regionId" AS "region id",
	g."name" AS "goal text",
	g."status" AS "goal status",
	g."createdAt" AS "create date"
FROM "Goals" g
JOIN "Grants" gr
ON g."grantId" = gr."id"
JOIN "Recipients" r
ON gr."recipientId" = r.id
WHERE
-- Filter for regionIds if ssdi.regionIds is defined
(NULLIF(current_setting('ssdi.regionIds', true), '') IS NULL
      OR gr."regionId" in (
        SELECT value::integer AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.regionIds', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for recipients if ssdi.recipients is defined
(NULLIF(current_setting('ssdi.recipients', true), '') IS NULL
      OR r.name in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.recipients', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for grantNumbers if ssdi.grantNumbers is defined
(NULLIF(current_setting('ssdi.grantNumbers', true), '') IS NULL
      OR gr.number in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.grantNumbers', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for status if ssdi.goals is defined
(NULLIF(current_setting('ssdi.goals', true), '') IS NULL
      OR g.name in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.goals', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for status if ssdi.status is defined
(NULLIF(current_setting('ssdi.status', true), '') IS NULL
      OR g.status in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.status', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for createdVia if ssdi.createdVia is defined
(NULLIF(current_setting('ssdi.createdVia', true), '') IS NULL
      OR g."createdVia" in (
        SELECT value::"enum_Goals_createdVia" AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.createdVia', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for onApprovedAR if ssdi.onApprovedAR is defined
(NULLIF(current_setting('ssdi.onApprovedAR', true), '') IS NULL
      OR g."onApprovedAR" in (
        SELECT value::BOOLEAN AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.onApprovedAR', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for createdAt dates between two values if ssdi.createdbetween is defined
(NULLIF(current_setting('ssdi.createdbetween', true), '') IS NULL
      OR g."createdAt"::date <@ (
        SELECT CONCAT('[',MIN(value::timestamp),',',MAX(value::timestamp),')')::daterange AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.createdbetween', true), ''),'[]')::json) AS value
      ))
ORDER BY 6,5;
