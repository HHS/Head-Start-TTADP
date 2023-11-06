/**
* This query collects all the FEI and near FEI goals based on several criteria.
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
* - jdi.response - one or more verbatium response values
* - jdi.createdbetween - two dates defining a range for the createdAt to be within
*
* zero or more JDI flags can be set within the same transaction as the query is executed.
* The following is an example of how to set a JDI flag:
* SELECT SET_CONFIG('jdi.createdbetween','["2023-10-01","2023-10-15"]',TRUE);
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
-- Filter for goals if jdi.goals is defined
(NULLIF(current_setting('jdi.goals', true), '') IS NULL
      OR b.name in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('jdi.goals', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for status if jdi.status is defined
(NULLIF(current_setting('jdi.status', true), '') IS NULL
      OR b.status in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('jdi.status', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for createdVia if jdi.createdVia is defined
(NULLIF(current_setting('jdi.createdVia', true), '') IS NULL
      OR b."createdVia" in (
        SELECT value::"enum_Goals_createdVia" AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('jdi.createdVia', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for onApprovedAR if jdi.onApprovedAR is defined
(NULLIF(current_setting('jdi.onApprovedAR', true), '') IS NULL
      OR b."onApprovedAR" in (
        SELECT value::BOOLEAN AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('jdi.onApprovedAR', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for response if jdi.response is defined
(NULLIF(current_setting('jdi.response', true), '') IS NULL
      OR gfr."response" && (
        SELECT ARRAY_AGG(value::text) AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('jdi.response', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for createdAt dates between two values if jdi.createdbetween is defined
(NULLIF(current_setting('jdi.createdbetween', true), '') IS NULL
      OR b."createdAt"::date <@ (
        SELECT CONCAT('[',MIN(value::timestamp),',',MAX(value::timestamp),')')::daterange AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('jdi.createdbetween', true), ''),'[]')::json) AS value
      ))
order by 3,1,2,4
