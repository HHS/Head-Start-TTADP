/**
* @name: Fake FEI Goals
* @description: A report of all goals realting to under/full enrollment that are not linked to the official FEI template.
* @defaultOutputName: fake_fei_report
*
* This query collects goals realting to under/full enrollment that are not linked to the official FEI template.
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
		similarity('(FEI) The recipient will eliminate and/or reduce underenrollment as part of the Full Enrollment Initiative (as measured by monthly reported enrollment)', g.name),
		similarity('(FEI) The recipient will eliminate and/or reduce underenrollment as part of the Full Enrollment Initiative (as measured by monthly reported enrollment)', LEFT(g.name, LENGTH('(FEI) The recipient will eliminate and/or reduce underenrollment as part of the Full Enrollment Initiative (as measured by monthly reported enrollment)'))),
		similarity('(FEI) The recipient will eliminate and/or reduce underenrollment as part of the Full Enrollment Initiative (as measured by monthly reported enrollment)', RIGHT(g.name, LENGTH('(FEI) The recipient will eliminate and/or reduce underenrollment as part of the Full Enrollment Initiative (as measured by monthly reported enrollment)')))
	) similarity,
	g.name
FROM "Goals" g
JOIN "Grants" gr
ON g."grantId" = gr.id
JOIN "Recipients" r
ON gr."recipientId" = r.id
LEFT JOIN "ActivityReportGoals" arg
ON g.id = arg."goalId"
LEFT JOIN "ActivityReports" a
ON arg."activityReportId" = a.id
WHERE g."deletedAt" IS NULL
AND g."mapsToParentGoalId" IS NULL
AND g.name ILIKE ANY (ARRAY['%underenrollment%','%under-enrollment%','%under enrollment%','%Full Enrollment%','%Full-Enrollment%','%FullEnrollment%','%FEI%'])
-- Real FEI goal is in the production DATABASE with an id of 19017 in the GoalTemplates table
AND COALESCE(g."goalTemplateId", 0) != 19017
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
GROUP BY 1,2,3,4,5,6,7,8,12
ORDER BY 5,11 desc;
