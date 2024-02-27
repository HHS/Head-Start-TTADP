/**
* This query collects all the goals.
*
* The query results are filterable by the JDI flags. All JDI flags are passed as an array of values
* The following are the available flags within this script:
* - jdi.regionIds - one or more values for 1 through 12
* - jdi.recipients - one or more verbatium recipient names
* - jdi.grantNumbers - one or more verbatium grant numbers
* - jdi.goals - one or more verbatium goal text
* - jdi.status - one or more verbatium statuses
* - jdi.createdVia - one or more verbatium created via values
* - jdi.onApprovedAR - true or false
* - jdi.createdbetween - two dates defining a range for the createdAt to be within
*
* zero or more JDI flags can be set within the same transaction as the query is executed.
* The following is an example of how to set a JDI flag:
* SELECT SET_CONFIG('jdi.createdbetween','["2022-07-01","2023-06-30"]',TRUE);
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
-- Filter for regionIds if jdi.regionIds is defined
(NULLIF(current_setting('jdi.regionIds', true), '') IS NULL
      OR gr."regionId" in (
        SELECT value::integer AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('jdi.regionIds', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for recipients if jdi.recipients is defined
(NULLIF(current_setting('jdi.recipients', true), '') IS NULL
      OR r.name in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('jdi.recipients', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for grantNumbers if jdi.grantNumbers is defined
(NULLIF(current_setting('jdi.grantNumbers', true), '') IS NULL
      OR gr.number in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('jdi.grantNumbers', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for status if jdi.goals is defined
(NULLIF(current_setting('jdi.goals', true), '') IS NULL
      OR g.name in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('jdi.goals', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for status if jdi.status is defined
(NULLIF(current_setting('jdi.status', true), '') IS NULL
      OR g.status in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('jdi.status', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for createdVia if jdi.createdVia is defined
(NULLIF(current_setting('jdi.createdVia', true), '') IS NULL
      OR g."createdVia" in (
        SELECT value::"enum_Goals_createdVia" AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('jdi.createdVia', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for onApprovedAR if jdi.onApprovedAR is defined
(NULLIF(current_setting('jdi.onApprovedAR', true), '') IS NULL
      OR g."onApprovedAR" in (
        SELECT value::BOOLEAN AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('jdi.onApprovedAR', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for createdAt dates between two values if jdi.createdbetween is defined
(NULLIF(current_setting('jdi.createdbetween', true), '') IS NULL
      OR g."createdAt"::date <@ (
        SELECT CONCAT('[',MIN(value::timestamp),',',MAX(value::timestamp),')')::daterange AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('jdi.createdbetween', true), ''),'[]')::json) AS value
      ))
ORDER BY 6,5;
