/*
JSON: {
  "name": "Fake FEI Goals",
  "description": {
    "standard": "Report of goals related to under/full enrollment that are not linked to the official FEI template.",
    "technical": "The query collects goals relating to under/full enrollment, excluding those linked to the official FEI template. The results are filterable using SSDI flags set at the transaction level."
  },
  "output": {
    "defaultName": "fake_fei_report",
    "schema": [
      {
        "columnName": "name",
        "type": "string",
        "nullable": false,
        "description": "Name of the recipient associated with the grant."
      },
      {
        "columnName": "uei",
        "type": "string",
        "nullable": true,
        "description": "Unique Entity Identifier (UEI) of the recipient."
      },
      {
        "columnName": "grant number",
        "type": "string",
        "nullable": false,
        "description": "Number identifying the grant associated with the goal."
      },
      {
        "columnName": "grant status",
        "type": "string",
        "nullable": false,
        "description": "Current status of the grant."
      },
      {
        "columnName": "regionId",
        "type": "integer",
        "nullable": false,
        "description": "ID representing the region the grant belongs to."
      },
      {
        "columnName": "goal id",
        "type": "integer",
        "nullable": false,
        "description": "Unique identifier for the goal."
      },
      {
        "columnName": "goal status",
        "type": "string",
        "nullable": false,
        "description": "Current status of the goal."
      },
      {
        "columnName": "goal creation time",
        "type": "timestamp",
        "nullable": false,
        "description": "Timestamp indicating when the goal was created."
      },
      {
        "columnName": "approved reports",
        "type": "integer",
        "nullable": true,
        "description": "Count of approved Activity Reports linked to the goal."
      },
      {
        "columnName": "pending reports",
        "type": "integer",
        "nullable": true,
        "description": "Count of draft or submitted Activity Reports linked to the goal."
      },
      {
        "columnName": "similarity",
        "type": "decimal",
        "nullable": false,
        "description": "Similarity score between the goal name and the official FEI template name."
      },
      {
        "columnName": "goal user list",
        "type": "string",
        "nullable": true,
        "description": "List of collaborators associated with the goal."
      },
      {
        "columnName": "goal text",
        "type": "string",
        "nullable": false,
        "description": "Full text of the goal."
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
      "name": "createdbetween",
      "type": "date[]",
      "display": "Creation Date Range",
      "description": "Two dates defining a range for the 'createdAt' timestamp to be within."
    },
    {
      "name": "recipient",
      "type": "string[]",
      "display": "Recipient Names",
      "description": "Filter based on the names of the recipients."
    },
    {
      "name": "uei",
      "type": "string[]",
      "display": "UEI",
      "description": "Filter based on the Unique Entity Identifier of the recipient."
    },
    {
      "name": "grantNumber",
      "type": "string[]",
      "display": "Grant Numbers",
      "description": "Filter based on the grant numbers."
    },
    {
      "name": "status",
      "type": "string[]",
      "display": "Goal Status",
      "description": "Filter based on the goal status."
    }
  ]
}
*/
CREATE EXTENSION IF NOT EXISTS pg_trgm;
SELECT
  r.name,
  r.uei,
  gr.number "grant number",
  gr.status "grant status",
  gr."regionId",
  g.id "goal id",
  g.status "goal status",
  g."createdAt" "goal creation time",
  COUNT(DISTINCT a.id) FILTER (WHERE a."calculatedStatus" = 'approved') "approved reports",
  COUNT(DISTINCT a.id) FILTER (WHERE a."calculatedStatus" IN ('draft', 'submitted')) "pending reports",
  GREATEST(
    similarity(gt."templateName", g.name),
    similarity(gt."templateName", LEFT(g.name, LENGTH(gt."templateName"))),
    similarity(gt."templateName", RIGHT(g.name, LENGTH(gt."templateName")))
  ) similarity,
  STRINGAGG(DISTINCT u.name, ';') "goal user list",
  g.name "goal text"
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
JOIN "CollaboratorTypes" ct
ON "validForId" = 1
AND ct.name = 'Linker'
LEFT JOIN "GoalCollaborators" gc
ON g.id = gc."goalId"
AND gc."collaboratorTypeId" = ct.id
LEFT JOIN "Users" u
ON u.id = gc."userId"
OR u.id = a."userId"
WHERE g."deletedAt" IS NULL
AND g."mapsToParentGoalId" IS NULL
-- excluding goals attached to deleted grants and goals only on TRs, because those are invisible to users
AND NOT gr.deleted
AND NOT (g."createdVia" = 'tr' AND a.id IS NULL)
AND g.name ~* '(^|[^a-zA-Z])(under[- ]?enrollment|full[- ]?enrollment|fei)($|[^a-zA-Z])'
AND COALESCE(g."goalTemplateId", 0) != gt.id
-- Filter for region if ssdi.region is defined
AND (NULLIF(current_setting('ssdi.region', true), '') IS NULL
  OR gr."regionId" in (
  SELECT value::integer AS my_array
    FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.region', true), ''),'[]')::json) AS value
  ))
-- Filter for createdAt dates between two values if ssdi.createdbetween is defined
AND (NULLIF(current_setting('ssdi.createdbetween', true), '') IS NULL
      OR g."createdAt"::date <@ (
        SELECT CONCAT('[',MIN(value::timestamp),',',MAX(value::timestamp),')')::daterange AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.createdbetween', true), ''),'[]')::json) AS value
      ))
-- Filter for recipient if ssdi.recipient is defined
AND (NULLIF(current_setting('ssdi.recipient', true), '') IS NULL
      OR r.name in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.recipient', true), ''),'[]')::json) AS value
      ))
-- Filter for UEI if ssdi.uei is defined
AND (NULLIF(current_setting('ssdi.uei', true), '') IS NULL
      OR r.uei in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.uei', true), ''),'[]')::json) AS value
      ))
-- Filter for grantNumber if ssdi.grantNumber is defined
AND (NULLIF(current_setting('ssdi.grantNumber', true), '') IS NULL
      OR gr.number in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.grantNumber', true), ''),'[]')::json) AS value
      ))
-- Filter for status if ssdi.status is defined
AND (NULLIF(current_setting('ssdi.status', true), '') IS NULL
      OR g.status in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.status', true), ''),'[]')::json) AS value
      ))
GROUP BY 1,2,3,4,5,6,7,8,11,13
-- Ghost goal filter
HAVING NOT (g."createdVia" = 'activityReport'
	AND COUNT(DISTINCT a.id) FILTER (WHERE a."calculatedStatus" = 'approved') = 0
	AND COUNT(DISTINCT a.id) FILTER (WHERE a."calculatedStatus" IN ('draft', 'submitted')) = 0)
ORDER BY 5,11 desc;
