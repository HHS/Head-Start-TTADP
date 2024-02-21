/**
* This query collects all the fake Monitoring goals used on approved reports within the defined time range.
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
* - jdi.startDate - two dates defining a range for the startDate to be within
* - jdi.endDate - two dates defining a range for the endDate to be within
*
* zero or more JDI flags can be set within the same transaction as the query is executed.
* The following is an example of how to set a JDI flag:
* SELECT SET_CONFIG('jdi.createdbetween','["2023-10-01","2023-10-15"]',TRUE);
*/
SELECT
	gr."regionId",
	r.name "Recipient Name",
	gr.number "grant number",
	ar.reason,
	ar."startDate",
	ar."endDate",
	g.name
FROM "Goals" g
JOIN "ActivityReportGoals" arg
ON g.id = arg."goalId"
JOIN "ActivityReports" ar
ON arg."activityReportId" = ar.id
JOIN "Grants" gr
ON g."grantId" = gr.id
JOIN "Recipients" r
ON gr."recipientId" = r.id
WHERE ar."calculatedStatus" = 'approved'
AND g.name like '%CLASS%' 
AND g.name like '%improve%' 
AND g.name like '%teacher%' 
AND g.name like '%child%'
and g."goalTemplateId" != 18172 
AND
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
AND
-- Filter for startDate dates between two values if jdi.startDate is defined
(NULLIF(current_setting('jdi.startDate', true), '') IS NULL
      OR ar."startDate"::date <@ (
        SELECT CONCAT('[',MIN(value::timestamp),',',MAX(value::timestamp),')')::daterange AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('jdi.startDate', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for endDate dates between two values if jdi.endDate is defined
(NULLIF(current_setting('jdi.endDate', true), '') IS NULL
      OR ar."endDate"::date <@ (
        SELECT CONCAT('[',MIN(value::timestamp),',',MAX(value::timestamp),')')::daterange AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('jdi.endDate', true), ''),'[]')::json) AS value
      ))
ORDER BY 1,2,3,5;