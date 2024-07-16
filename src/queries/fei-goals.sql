/**
* @name: FEI Goals Report
* @description: This query collects all the FEI and near FEI goals based on several criteria.
* @defaultOutputName: fei_goals_report
*
* The query results are filterable by the SSDI flags. All SSDI flags are passed as an array of values
* The following are the available flags within this script:
* - ssdi.regionIds - integer[] - one or more values for 1 through 12
* - ssdi.recipients - string[] - one or more verbatim recipient names
* - ssdi.grantNumbers - string[] - one or more verbatim grant numbers
* - ssdi.goals - string[] - one or more verbatim goal text
* - ssdi.status - string[] - one or more verbatim statuses
* - ssdi.createdVia - string[] - one or more verbatim created via values
* - ssdi.onApprovedAR - boolean[] - true or false
* - ssdi.response - string[] - one or more verbatim response values
* - ssdi.createdbetween - date[] - two dates defining a range for the createdAt to be within
*
* Zero or more SSDI flags can be set within the same transaction as the query is executed.
* The following is an example of how to set an SSDI flag:
* SELECT SET_CONFIG('ssdi.createdbetween','["2023-10-01","2023-10-15"]',TRUE);
*/
WITH bad AS (
	SELECT *
	FROM public."Goals"
	WHERE name != '(FEI) The recipient will eliminate and/or reduce underenrollment as part of the Full Enrollment Initiative (as measured by monthly reported enrollment)'
	AND name like '%monthly reported enrollment%'
	and COALESCE("goalTemplateId",0) != 19017
	AND id not in (52460, 52461, 52462, 52463, 52248, 52251, 52249, 52250, 55244, 55172, 55908, 55420, 55421, 56033, 50565, 50613, 50612, 50343, 50614)
	UNION
	SELECT *
	FROM public."Goals"
	WHERE name = '(FEI) The recipient will eliminate and/or reduce underenrollment as part of the Full Enrollment Initiative (as measured by monthly reported enrollment)'
	and COALESCE("goalTemplateId",0) != 19017
	UNION
	SELECT *
	FROM public."Goals"
	WHERE name != '(FEI) The recipient will eliminate and/or reduce underenrollment as part of the Full Enrollment Initiative (as measured by monthly reported enrollment)'
	AND name like '(FEI)%'
	and COALESCE("goalTemplateId",0) != 19017
	UNION
	SELECT *
	FROM  public."Goals"
	WHERE "goalTemplateId" = 19017
)
SELECT
  r.name "recipient",
  gr.number "grant number",
  gr."regionId",
  b.id "goalId",
  b."goalTemplateId",
  b.name "goal text",
  b."createdAt",
  b.status,
  b."createdVia",
  b."onApprovedAR",
  gfr.response
FROM bad b
LEFT JOIN "GoalFieldResponses" gfr
ON b."id" = gfr."goalId"
JOIN "Grants" gr
ON b."grantId" = gr.id
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
-- Filter for goals if ssdi.goals is defined
(NULLIF(current_setting('ssdi.goals', true), '') IS NULL
      OR b.name in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.goals', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for status if ssdi.status is defined
(NULLIF(current_setting('ssdi.status', true), '') IS NULL
      OR b.status in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.status', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for createdVia if ssdi.createdVia is defined
(NULLIF(current_setting('ssdi.createdVia', true), '') IS NULL
      OR b."createdVia" in (
        SELECT value::"enum_Goals_createdVia" AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.createdVia', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for onApprovedAR if ssdi.onApprovedAR is defined
(NULLIF(current_setting('ssdi.onApprovedAR', true), '') IS NULL
      OR EXISTS (
        SELECT 1
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.onApprovedAR', true), ''),'[]')::json) AS value
        WHERE value::boolean = true
      ))
AND
-- Filter for response if ssdi.response is defined
(NULLIF(current_setting('ssdi.response', true), '') IS NULL
      OR gfr."response" && (
        SELECT ARRAY_AGG(value::text) AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.response', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for createdAt dates between two values if ssdi.createdbetween is defined
(NULLIF(current_setting('ssdi.createdbetween', true), '') IS NULL
      OR b."createdAt"::date <@ (
        SELECT CONCAT('[',MIN(value::timestamp),',',MAX(value::timestamp),')')::daterange AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.createdbetween', true), ''),'[]')::json) AS value
      ))
order by 3,1,2,4
