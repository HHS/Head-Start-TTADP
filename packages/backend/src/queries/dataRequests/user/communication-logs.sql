/*
JSON: {
  "name": "Communication Log Report",
  "description": {
    "standard": "A comprehensive report of communication logs based on several criteria.",
    "technical": "This query collects all the communication logs based on multiple filters such as region, recipient name, user name, role, communication method, and date range. It retrieves various details, including the communication method, purpose, result, and any next steps."
  },
  "output": {
    "defaultName": "communication_log_report",
    "schema": [
      {
        "columnName": "name",
        "type": "string",
        "nullable": false,
        "description": "The name of the recipient associated with the communication log."
      },
      {
        "columnName": "uei",
        "type": "string",
        "nullable": true,
        "description": "The Unique Entity Identifier (UEI) for the recipient."
      },
      {
        "columnName": "user",
        "type": "string",
        "nullable": false,
        "description": "The name of the user who conducted the communication."
      },
      {
        "columnName": "roles",
        "type": "string",
        "nullable": false,
        "description": "The roles of the user conducting the communication, separated by spaces."
      },
      {
        "columnName": "createdAt",
        "type": "timestamp",
        "nullable": false,
        "description": "The timestamp of when the communication log was created."
      },
      {
        "columnName": "method",
        "type": "string",
        "nullable": true,
        "description": "The communication method used, such as 'email' or 'phone'."
      },
      {
        "columnName": "result",
        "type": "string",
        "nullable": true,
        "description": "The result of the communication."
      },
      {
        "columnName": "purpose",
        "type": "string",
        "nullable": true,
        "description": "The purpose of the communication."
      },
      {
        "columnName": "duration",
        "type": "string",
        "nullable": true,
        "description": "The duration of the communication, if available."
      },
      {
        "columnName": "region",
        "type": "string",
        "nullable": true,
        "description": "The region ID where the communication took place."
      },
      {
        "columnName": "communicationDate",
        "type": "date",
        "nullable": false,
        "description": "The date of the communication in MM/DD/YYYY format."
      },
      {
        "columnName": "pocComplete",
        "type": "string",
        "nullable": true,
        "description": "Indicates if the Point of Contact (POC) for the communication is complete."
      },
      {
        "columnName": "notes",
        "type": "string",
        "nullable": true,
        "description": "Any additional notes related to the communication."
      },
      {
        "columnName": "recipientNextSteps",
        "type": "string",
        "nullable": true,
        "description": "Details of the next steps expected from the recipient, formatted as a JSON array string."
      },
      {
        "columnName": "specialistNextSteps",
        "type": "string",
        "nullable": true,
        "description": "Details of the next steps expected from the specialist, formatted as a JSON array string."
      },
      {
        "columnName": "filenames",
        "type": "string",
        "nullable": true,
        "description": "Names of any attached files related to the communication."
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
      "name": "communicationDate",
      "type": "date[]",
      "display": "Communication Date Range",
      "description": "Two dates defining a range for the communicationDate. If only one date is supplied, the range is from the supplied date to the current timestamp. If no dates are supplied, this filter is ignored."
    },
    {
      "name": "recipient",
      "type": "string[]",
      "display": "Recipient Names",
      "description": "One or more recipient names to filter the results."
    },
    {
      "name": "users",
      "type": "string[]",
      "display": "User Names",
      "description": "One or more user names to filter the results."
    },
    {
      "name": "role",
      "type": "string[]",
      "display": "Role Names",
      "description": "One or more role names to filter the results."
    },
    {
      "name": "method",
      "type": "string[]",
      "display": "Communication Methods",
      "description": "One or more communication methods to filter the results, such as 'email' or 'phone'."
    },
    {
      "name": "uei",
      "type": "string[]",
      "display": "UEI Values",
      "description": "One or more UEI values to filter the results."
    }
  ],
  "sorting": {
    "default": [
      { "level": 1, "name": "name", "order": "ASC" },
      { "level": 2, "name": "communicationDate", "order": "ASC" }
    ]
  }
}
*/
SELECT
    r.name,
    r.uei,
    u.name AS "user",
    STRING_AGG(DISTINCT rr.name, ' ') AS "roles",
    cl."createdAt",
    COALESCE(cl.data ->> 'method', '') AS "method",
    cl.data ->> 'result' AS "result",
    COALESCE(cl.data ->> 'purpose', '') AS "purpose",
    COALESCE(cl.data ->> 'duration', '') AS "duration",
    COALESCE(cl.data ->> 'regionId', '') AS "region",
    TO_DATE(data ->> 'communicationDate', 'MM/DD/YYYY') "communicationDate",
    COALESCE(cl.data ->> 'pocComplete', '') AS "pocComplete",
    COALESCE(cl.data ->> 'notes', '') AS "notes",
    COALESCE((
        SELECT jsonb_agg(elem)
        FROM jsonb_array_elements(cl.data -> 'recipientNextSteps') elem
        WHERE elem != '{"note": "","completeDate": ""}'::jsonb
    )::TEXT,'') AS recipientNextSteps,
    COALESCE((
        SELECT jsonb_agg(elem)
        FROM jsonb_array_elements(cl.data -> 'specialistNextSteps') elem
        WHERE elem != '{"note": "","completeDate": ""}'::jsonb
    )::TEXT,'') AS specialistNextSteps,
    COALESCE(NULLIF(array_remove(array_agg(f."originalFileName"), null), '{}')::TEXT,'') AS filenames
FROM "Recipients" r
JOIN "CommunicationLogs" cl
    ON cl."recipientId" = r.id
JOIN "Users" u
    ON cl."userId" = u.id
JOIN "UserRoles" ur
    ON u.id = ur."userId"
JOIN "Roles" rr
    ON ur."roleId" = rr.id
LEFT JOIN "CommunicationLogFiles" clf
    ON cl.id = clf."communicationLogId"
LEFT JOIN "Files" f
    ON clf."fileId" = f.id
WHERE
-- Filter for region if ssdi.region is defined
(NULLIF(current_setting('ssdi.region', true), '') IS NULL
        OR (cl.data ->> 'regionId')::int in (
        SELECT value::integer AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.region', true), ''),'[]')::json) AS value
        ))
AND
-- Filter for communicationDate if ssdi.communicationDate is defined
(NULLIF(current_setting('ssdi.communicationDate', true), '') IS NULL
        OR (
			CASE
			    WHEN data ->> 'communicationDate' ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$' THEN TO_DATE(data ->> 'communicationDate', 'MM/DD/YYYY')
			    WHEN data ->> 'communicationDate' ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{2}$' THEN TO_DATE(data ->> 'communicationDate', 'MM/DD/YY')
			    WHEN data ->> 'communicationDate' ~ '^[0-9]{1,2}-[0-9]{1,2}-[0-9]{2}$' THEN TO_DATE(data ->> 'communicationDate', 'MM-DD-YY')
			    WHEN data ->> 'communicationDate' ~ '^[0-9]{1,2}/[0-9]{1,2}//[0-9]{2}$' THEN TO_DATE(regexp_replace(data ->> 'communicationDate', '//', '/'), 'MM/DD/YY')
			    WHEN data ->> 'communicationDate' ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}?[0-9]{1,2}.[0-9]{1,2}$' THEN TO_DATE(LEFT(data ->> 'communicationDate', 10), 'MM/DD/YYYY')
			    ELSE NULL
			END
		) <@ (
        SELECT CONCAT('[',MIN(value::timestamp),',',MAX(value::timestamp),')')::daterange AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.communicationDate', true), ''),'[]')::json) AS value
        ))
AND
-- Filter for recipient if ssdi.recipient is defined
(NULLIF(current_setting('ssdi.recipient', true), '') IS NULL
      OR r.name in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.recipient', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for users if ssdi.users is defined
(NULLIF(current_setting('ssdi.users', true), '') IS NULL
      OR u.name in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.users', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for role if ssdi.role is defined
(NULLIF(current_setting('ssdi.role', true), '') IS NULL
      OR rr.name in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.role', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for method if ssdi.method is defined
(NULLIF(current_setting('ssdi.method', true), '') IS NULL
      OR cl.data ->> 'method' in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.method', true), ''),'[]')::json) AS value
      ))
AND
-- Filter for UEI if ssdi.uei is defined
(NULLIF(current_setting('ssdi.uei', true), '') IS NULL
      OR r.uei in (
        SELECT value::text AS my_array
          FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.uei', true), ''),'[]')::json) AS value
      ))
AND cl.data -> 'pageState' ->> '1' = 'Complete'
AND cl.data -> 'pageState' ->> '2' = 'Complete'
AND cl.data -> 'pageState' ->> '3' = 'Complete'
GROUP BY 1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15
ORDER BY 1, 11;
