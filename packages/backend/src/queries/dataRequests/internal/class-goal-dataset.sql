/*
JSON: {
  "name": "Goals Report",
  "description": {
    "standard": "Filterable goals report with detailed information on goals and associated grants.",
    "technical": "The query results are filterable by the SSDI flags, which are passed as an array of values. All available SSDI flags are listed and can be set within the same transaction as the query is executed."
  },
  "output": {
    "defaultName": "goals_report",
    "schema": [
      {
        "columnName": "goal id",
        "type": "integer",
        "nullable": false,
        "description": "Unique identifier for the goal."
      },
      {
        "columnName": "grant id",
        "type": "integer",
        "nullable": false,
        "description": "Unique identifier for the associated grant."
      },
      {
        "columnName": "grant number",
        "type": "string",
        "nullable": false,
        "description": "Number identifying the grant associated with the goal."
      },
      {
        "columnName": "template id",
        "type": "integer",
        "nullable": true,
        "description": "Unique identifier for the goal template."
      },
      {
        "columnName": "recipient id",
        "type": "integer",
        "nullable": false,
        "description": "Unique identifier for the recipient associated with the goal."
      },
      {
        "columnName": "region id",
        "type": "integer",
        "nullable": false,
        "description": "ID representing the region the grant belongs to."
      },
      {
        "columnName": "goal text",
        "type": "string",
        "nullable": true,
        "description": "Text description of the goal."
      },
      {
        "columnName": "goal status",
        "type": "string",
        "nullable": false,
        "description": "Current status of the goal."
      },
      {
        "columnName": "create date",
        "type": "date",
        "nullable": false,
        "description": "Date when the goal was created."
      }
    ]
  },
  "filters": [
    {
      "name": "region",
      "type": "integer[]",
      "display": "Region IDs",
      "description": "One or more values for 1 through 12."
    },
    {
      "name": "recipient",
      "type": "string[]",
      "display": "Recipient Names",
      "description": "Filter based on the names of the recipients."
    },
    {
      "name": "grantNumber",
      "type": "string[]",
      "display": "Grant Numbers",
      "description": "Filter based on the grant numbers."
    },
    {
      "name": "goalName",
      "type": "string[]",
      "display": "Goals",
      "description": "Filter based on the goal text."
    },
    {
      "name": "status",
      "type": "string[]",
      "display": "Goal Status",
      "description": "Filter based on the goal status."
    },
    {
      "name": "createdVia",
      "type": "string[]",
      "display": "Created Via",
      "description": "Filter based on the method used to create the goal."
    },
    {
      "name": "onApprovedAR",
      "type": "boolean[]",
      "display": "On Approved AR",
      "description": "Boolean filter indicating if the goal is on an approved Activity Report."
    },
    {
      "name": "createdbetween",
      "type": "date[]",
      "display": "Creation Date Range",
      "description": "Two dates defining a range for the 'createdAt' timestamp to be within."
    }
  ]
}
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
      OR g.name in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.goalName', true), ''),'[]')::json) AS value
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
      OR EXISTS (
        SELECT 1
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.onApprovedAR', true), ''),'[]')::json) AS value
        WHERE value::boolean = true
      ))
AND
-- Filter for createdAt dates between two values if ssdi.createdbetween is defined
(NULLIF(current_setting('ssdi.createdbetween', true), '') IS NULL
      OR g."createdAt"::date <@ (
        SELECT CONCAT('[',MIN(value::timestamp),',',MAX(value::timestamp),')')::daterange AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.createdbetween', true), ''),'[]')::json) AS value
      ))
ORDER BY 6,5;
