/*
JSON: {
  "name": "Monitoring Goals Report",
  "description": {
    "standard": "This report collects all the monitoring goals used on approved activity reports within the defined time range.",
    "technical": "The query retrieves monitoring goals details including region, grant number, recipient name, start date, end date, and the reason for the activity report, filtered by various SSDI flags such as region IDs, recipients, grant numbers, goal status, and date ranges for createdAt, startDate, and endDate."
  },
  "output": {
    "defaultName": "monitoring_goals_report",
    "schema": [
      {
        "columnName": "regionId",
        "type": "integer",
        "nullable": false,
        "description": "The region ID associated with the grant."
      },
      {
        "columnName": "Recipient Name",
        "type": "string",
        "nullable": false,
        "description": "The name of the recipient associated with the grant."
      },
      {
        "columnName": "grant number",
        "type": "string",
        "nullable": false,
        "description": "The grant number associated with the goal."
      },
      {
        "columnName": "reason",
        "type": "string",
        "nullable": true,
        "description": "The reason for the activity report."
      },
      {
        "columnName": "startDate",
        "type": "date",
        "nullable": true,
        "description": "The start date of the activity report."
      },
      {
        "columnName": "endDate",
        "type": "date",
        "nullable": true,
        "description": "The end date of the activity report."
      }
    ]
  },
  "filters": [
    {
      "name": "regionIds",
      "type": "integer[]",
      "display": "Region IDs",
      "description": "One or more values for 1 through 12 representing the region IDs."
    },
    {
      "name": "recipients",
      "type": "string[]",
      "display": "Recipient Names",
      "description": "One or more recipient names to filter the results."
    },
    {
      "name": "grantNumbers",
      "type": "string[]",
      "display": "Grant Numbers",
      "description": "One or more grant numbers to filter the results."
    },
    {
      "name": "goals",
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
      "name": "createdbetween",
      "type": "date[]",
      "display": "Created Date Range",
      "description": "Two dates defining a range for the 'createdAt' timestamp to be within."
    },
    {
      "name": "startDate",
      "type": "date[]",
      "display": "Start Date Range",
      "description": "Two dates defining a range for the 'startDate' timestamp to be within."
    },
    {
      "name": "endDate",
      "type": "date[]",
      "display": "End Date Range",
      "description": "Two dates defining a range for the 'endDate' timestamp to be within."
    }
  ],
  "sorting": {
    "default": [
      { "level": 1, "name": "regionId", "order": "ASC" },
      { "level": 2, "name": "Recipient Name", "order": "ASC" },
      { "level": 3, "name": "grant number", "order": "ASC" },
      { "level": 4, "name": "startDate", "order": "ASC" }
    ]
  },
  "customSortingSupported": true,
  "paginationSupported": false,
  "exampleUsage": "SELECT SET_CONFIG('ssdi.createdbetween', '[\"2023-10-01\",\"2023-10-15\"]', TRUE);"
}
*/
SELECT
	gr."regionId",
	r.name "Recipient Name",
	gr.number "grant number",
	ar.reason,
	ar."startDate",
	ar."endDate"
FROM "Goals" g
JOIN "GoalTemplates" gt
ON (g."goalTemplateId" = gt.id
	OR g.name = gt."templateName")
AND gt.id = 18172
AND gt."creationMethod"::text = 'Curated'
JOIN "ActivityReportGoals" arg
ON g.id = arg."goalId"
JOIN "ActivityReports" ar
ON arg."activityReportId" = ar.id
JOIN "Grants" gr
ON g."grantId" = gr.id
JOIN "Recipients" r
ON gr."recipientId" = r.id
WHERE ar."calculatedStatus" = 'approved'
AND
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
AND
-- Filter for startDate dates between two values if ssdi.startDate is defined
(NULLIF(current_setting('ssdi.startDate', true), '') IS NULL
      OR ar."startDate"::date <@ (
        SELECT CONCAT('[',MIN(value::timestamp),',',MAX(value::timestamp),')')::daterange AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.startDate', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for endDate dates between two values if ssdi.endDate is defined
(NULLIF(current_setting('ssdi.endDate', true), '') IS NULL
      OR ar."endDate"::date <@ (
        SELECT CONCAT('[',MIN(value::timestamp),',',MAX(value::timestamp),')')::daterange AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.endDate', true), ''),'[]')::json) AS value
      ))
ORDER BY 1,2,3,5;
