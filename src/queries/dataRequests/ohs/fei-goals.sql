/*
JSON: {
  "name": "FEI Goals Report",
  "description": {
    "standard": "This report collects all the FEI and near FEI goals based on various criteria.",
    "technical": "The query retrieves FEI goal details including region, grant number, recipient name, goal ID, goal text, createdAt, goal status, createdVia, onApprovedAR, and response values. It uses multiple SSDI flags such as region IDs, recipients, grant numbers, goals, statuses, created via values, and date ranges for filtering."
  },
  "output": {
    "defaultName": "fei_goals_report",
    "schema": [
      {
        "columnName": "recipient",
        "type": "string",
        "nullable": false,
        "description": "The name of the recipient associated with the goal."
      },
      {
        "columnName": "grant number",
        "type": "string",
        "nullable": false,
        "description": "The grant number associated with the goal."
      },
      {
        "columnName": "regionId",
        "type": "integer",
        "nullable": false,
        "description": "The region ID associated with the grant."
      },
      {
        "columnName": "goalId",
        "type": "integer",
        "nullable": false,
        "description": "The unique identifier of the goal."
      },
      {
        "columnName": "goalTemplateId",
        "type": "integer",
        "nullable": true,
        "description": "The ID of the goal template if the goal is associated with a template."
      },
      {
        "columnName": "goal text",
        "type": "string",
        "nullable": false,
        "description": "The text of the goal."
      },
      {
        "columnName": "createdAt",
        "type": "date",
        "nullable": true,
        "description": "The timestamp when the goal was created."
      },
      {
        "columnName": "status",
        "type": "string",
        "nullable": true,
        "description": "The status of the goal."
      },
      {
        "columnName": "createdVia",
        "type": "string",
        "nullable": true,
        "description": "The method through which the goal was created."
      },
      {
        "columnName": "onApprovedAR",
        "type": "boolean",
        "nullable": true,
        "description": "Indicates whether the goal is linked to an approved Activity Report."
      },
      {
        "columnName": "response",
        "type": "string",
        "nullable": true,
        "description": "The response values associated with the goal."
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
      "name": "recipient",
      "type": "string[]",
      "display": "Recipient Names",
      "description": "One or more recipient names to filter the results."
    },
    {
      "name": "grantNumber",
      "type": "string[]",
      "display": "Grant Numbers",
      "description": "One or more grant numbers to filter the results."
    },
    {
      "name": "goalName",
      "type": "string[]",
      "display": "Goals",
      "description": "One or more goal text values to filter the results."
    },
    {
      "name": "status",
      "type": "string[]",
      "display": "Goal Status",
      "description": "One or more status values to filter the goals."
    },
    {
      "name": "createdVia",
      "type": "string[]",
      "display": "Created Via",
      "description": "One or more created via values to filter the goals."
    },
    {
      "name": "onApprovedAR",
      "type": "boolean[]",
      "display": "On Approved AR",
      "description": "Boolean filter indicating if the goal is linked to an approved Activity Report."
    },
    {
      "name": "response",
      "type": "string[]",
      "display": "Response",
      "description": "One or more response values to filter the goals."
    },
    {
      "name": "createDate",
      "type": "date[]",
      "display": "Created Date Range",
      "description": "Two dates defining a range for the 'createdAt' timestamp to be within."
    }
  ],
  "sorting": {
    "default": [
      { "level": 1, "name": "regionId", "order": "ASC" },
      { "level": 2, "name": "recipient", "order": "ASC" },
      { "level": 3, "name": "grant number", "order": "ASC" },
      { "level": 4, "name": "goalId", "order": "ASC" }
    ]
  },
  "customSortingSupported": true,
  "paginationSupported": false,
  "exampleUsage": "SELECT SET_CONFIG('ssdi.createDate', '[\"2023-10-01\",\"2023-10-15\"]', TRUE);"
}
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
-- Filter for region if ssdi.region is defined
(NULLIF(current_setting('ssdi.region', true), '') IS NULL
      OR gr."regionId" in (
        SELECT value::integer AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.region', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for recipient if ssdi.recipient is defined
(NULLIF(current_setting('ssdi.recipient', true), '') IS NULL
      OR r.name in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.recipient', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for grantNumber if ssdi.grantNumber is defined
(NULLIF(current_setting('ssdi.grantNumber', true), '') IS NULL
      OR gr.number in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.grantNumber', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for goalName if ssdi.goalName is defined
(NULLIF(current_setting('ssdi.goalName', true), '') IS NULL
      OR b.name in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.goalName', true), ''),'[]')::json) AS value
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
-- Filter for createdAt dates between two values if ssdi.createDate is defined
(NULLIF(current_setting('ssdi.createDate', true), '') IS NULL
      OR b."createdAt"::date <@ (
        SELECT CONCAT('[',MIN(value::timestamp),',',MAX(value::timestamp),')')::daterange AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.createDate', true), ''),'[]')::json) AS value
      ))
order by 3,1,2,4
