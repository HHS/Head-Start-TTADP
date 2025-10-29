/**
JSON: {
  "name": "Monitoring Citation-AR Report",
  "description": {
    "standard": "Presents a report showing Monitoring Goals with associated Activity Reports.",
    "technical": "This report links citations to activity reports through monitoring reviews to monitoring Goals to grants on ARs to objectives and again to citations."
  },
  "output": {
    "defaultName": "monitoring-citation-ar-report",
    "schema": [
  gid,
  grid,
  grnumber,
  g_created,
  region,
  rname,
  rtype,
  rdelivery_date,
  routcome,
  freport_date,
  fclosed_date,
  citation,
  ftype,
  fstatus,
  fdetermination,
  correction_deadline,
  ar.id arid,
  ar."startDate" arstart_date,
  ar."deliveryMethod" ar_delivery_method,
  cr.user_name || ':' || cr.roles AS creator,
  STRING_AGG(DISTINCT cr.user_name || ':' || cr.roles, ';') collaborators,
  STRING_AGG(DISTINCT t.name,';') topics
      {
        "columnName": "gid",
        "type": "integer",
        "nullable": false,
        "description": "goal ID."
      },
      {
        "columnName": "grid",
        "type": "integer",
        "nullable": false,
        "description": "grant ID."
      },
      {
        "columnName": "grnumber",
        "type": "string",
        "nullable": false,
        "description": "The grant number string."
      },
      {
        "columnName": "g_created",
        "type": "timestamp",
        "nullable": false,
        "description": "The timestamp for when the Monitoring Goals was created."
      {
        "columnName": "region",
        "type": "integer",
        "nullable": false,
        "description": "Region ID."
      },
      {
        "columnName": "rname",
        "type": "string",
        "nullable": true,
        "description": "The alphanumeric review name."
      },
      {
        "columnName": "rtype",
        "type": "string",
        "nullable": false,
        "description": "The type of review."
      },
      {
        "columnName": "rdelivery_date",
        "type": "date",
        "nullable": false,
        "description": "The date when the review was delivered."
      },
      {
        "columnName": "routcome",
        "type": "string",
        "nullable": true,
        "description": "The outcome of the review."
      },
      {
        "columnName": "freport_date",
        "type": "date",
        "nullable": false,
        "description": "The date the potential citation was reported."
      },
      {
        "columnName": "fclosed_date",
        "type": "date",
        "nullable": true,
        "description": "The date the finding was considered closed."
      },
      {
        "columnName": "citation",
        "type": "string",
        "nullable": true,
        "description": "The specific citation related to the finding."
      },
      {
        "columnName": "ftype",
        "type": "string",
        "nullable": true,
        "description": "The type of finding in the review."
      },
      {
        "columnName": "fstatus",
        "type": "string",
        "nullable": true,
        "description": "The status label on the findingm."
      },
    ]
  },
  "filters": [
    {
      "name": "region",
      "type": "integer[]",
      "description": "One or more values for 1 through 12",
      "options": {
        "query": {
          "sqlQuery": "SELECT name::int AS name FROM \"Regions\" WHERE name ~ E'^\\d+$' AND (NULLIF(current_setting('ssdi.region', true), '') IS NULL OR name::int IN (SELECT value::integer AS my_array FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.region', true), ''), '[]')::json) AS value)) ORDER BY name;",
          "column": "name"
        }
      }
    },
    {
      "name": "reportDeliveryDate",
      "type": "date[]",
      "description": "Two dates defining a range for the reportDeliveryDate to be within. If only one date is supplied, the range is from the supplied date to the current timestamp. If no dates are supplied, this filter is ignored.",
      "supportsExclusion": true
    },
    {
      "name": "reviewOutcomes",
      "type": "string[]",
      "description": "One or more review outcomes. If no values are supplied, this filter is ignored.",
      "supportsExclusion": true,
      "options": {
        "query": {
          "sqlQuery": "SELECT DISTINCT outcome FROM \"MonitoringReviews\" WHERE outcome IS NOT NULL AND \"reportDeliveryDate\" > '2023-01-01' ORDER BY outcome;",
          "column": "outcome"
        }
      }
    },
    {
      "name": "reviewTypes",
      "type": "string[]",
      "description": "One or more review types. If no values are supplied, this filter is ignored.",
      "supportsExclusion": true,
      "options": {
        "query": {
          "sqlQuery": "SELECT DISTINCT \"reviewType\" FROM \"MonitoringReviews\" WHERE \"reviewType\" IS NOT NULL AND \"reportDeliveryDate\" > '2023-01-01' ORDER BY \"reviewType\";",
          "column": "reviewType"
        }
      }
    },
    {
      "name": "findingReportedDate",
      "type": "date[]",
      "description": "Two dates defining a range for the findingReportedDate to be within. If only one date is supplied, the range is from the supplied date to the current timestamp. If no dates are supplied, this filter is ignored.",
      "supportsExclusion": true
    },
    {
      "name": "findingStatus",
      "type": "string[]",
      "description": "One or more finding statuses. If no values are supplied, this filter is ignored.",
      "supportsExclusion": true,
      "options": {
        "query": {
          "sqlQuery": "SELECT name FROM \"MonitoringFindingStatuses\" ORDER BY name;",
          "column": "name"
        }
      }
    },
    {
      "name": "findingTypes",
      "type": "string[]",
      "description": "One or more finding types. If no values are supplied, this filter is ignored.",
      "supportsExclusion": true,
      "options": {
        "query": {
          "sqlQuery": "SELECT DISTINCT \"findingType\" FROM \"MonitoringFindings\" WHERE \"findingType\" IS NOT NULL ORDER BY \"findingType\";",
          "column": "findingType"
        }
      }
    },
    {
      "name": "citations",
      "type": "string[]",
      "description": "One or more citations. If no values are supplied, this filter is ignored.",
      "supportsExclusion": true,
      "supportsFuzzyMatch": true,
      "options": {
        "query": {
          "sqlQuery": "SELECT DISTINCT citation FROM \"MonitoringStandards\" WHERE citation IS NOT NULL ORDER BY citation;",
          "column": "citation"
        }
      }
    },
    {
      "name": "grantNumber",
      "type": "string[]",
      "description": "One or more grant numbers. If no values are supplied, this filter is ignored.",
      "supportsExclusion": true,
      "supportsFuzzyMatch": true
    },
    {
      "name": "recipient",
      "type": "string[]",
      "description": "One or more recipient names. If no values are supplied, this filter is ignored.",
      "supportsExclusion": true,
      "supportsFuzzyMatch": true,
      "options": {
        "query": {
          "sqlQuery": "SELECT DISTINCT r.name FROM \"Recipients\" r JOIN \"Grants\" gr ON r.id = gr.\"recipientId\" WHERE gr.status = 'Active' AND (NULLIF(current_setting('ssdi.region', true), '') IS NULL OR gr.\"regionId\"::int IN (SELECT value::integer AS my_array FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.region', true), ''), '[]')::json) AS value)) ORDER BY r.name;",
          "column": "name"
        }
      }
    }
  ],
  "sorting": {
    "default": [
      { "level": 1, "name": "regionId", "order": "ASC" },
      { "level": 2, "name": "number", "order": "ASC" },
      { "level": 3, "name": "reportDeliveryDate", "order": "ASC" }
    ]
  },
  "customSortingSupported": false,
  "paginationSupported": false,
  "exampleUsage": "SELECT SET_CONFIG('ssdi.reportDeliveryDate', '[\"2023-01-01\", \"2023-12-31\"]', TRUE);"
}
*/
WITH grantreviews AS (
SELECT DISTINCT
  g.id gid,
  gr.id grid,
  gr.number grnumber,
  g."createdAt" g_created,
  gr."regionId" region,
  mr.name rname,
  mr."reviewType" rtype,
  mr."reportDeliveryDate"::date rdelivery_date,
  mr.outcome routcome,
  mr."reviewId" ruuid
FROM "Goals" g
JOIN "GoalTemplates" gt
  ON g."goalTemplateId" = gt.id
JOIN "Grants" gr
  ON g."grantId" = gr.id
JOIN "MonitoringReviewGrantees" mrg
  ON gr.number = mrg."grantNumber"
JOIN "MonitoringReviews" mr
  ON mrg."reviewId" = mr."reviewId"
JOIN "MonitoringFindingHistories" mfh
  ON mr."reviewId" = mfh."reviewId"
JOIN "MonitoringFindings" mf
  ON mfh."findingId" = mf."findingId"
WHERE gt.standard = 'Monitoring'
  AND mrg."sourceDeletedAt" IS NULL
  AND mr."sourceDeletedAt" IS NULL
  AND mfh."sourceDeletedAt" IS NULL
  AND mf."findingType" IN ('Preliminary Area of Noncompliance', 'Noncompliance', 'Deficiency')
  AND mr."reportDeliveryDate" > '2025-01-20'
  AND mr."reportDeliveryDate" < g."createdAt"
  AND g."createdAt" - mr."reportDeliveryDate" < INTERVAL '30 days'
  AND (
    NULLIF(current_setting('ssdi.reportDeliveryDate', true), '') IS NULL
    OR (
      (current_setting('ssdi.reportDeliveryDate.not', true) = 'true'
        AND NOT mr."reportDeliveryDate"::date <@ (
          SELECT
              CONCAT(
                  '[',
                  MIN(value::timestamp),
                  ',',
                  COALESCE(NULLIF(MAX(value::timestamp), MIN(value::timestamp)), NOW()::timestamp),
                  ')'
              )::daterange AS my_array
          FROM json_array_elements_text(
            COALESCE(NULLIF(current_setting('ssdi.reportDeliveryDate', true), ''), '[]')::json
          ) AS value
        )
      )
      OR (current_setting('ssdi.reportDeliveryDate.not', true) != 'true'
        AND mr."reportDeliveryDate"::date <@ (
          SELECT
              CONCAT(
                  '[',
                  MIN(value::timestamp),
                  ',',
                  COALESCE(NULLIF(MAX(value::timestamp), MIN(value::timestamp)), NOW()::timestamp),
                  ')'
              )::daterange AS my_array
          FROM json_array_elements_text(
            COALESCE(NULLIF(current_setting('ssdi.reportDeliveryDate', true), ''), '[]')::json
          ) AS value
        )
      )
    )
  )
  AND (
  NULLIF(current_setting('ssdi.goalDate', true), '') IS NULL
    OR (
      (current_setting('ssdi.goalDate.not', true) = 'true'
        AND NOT g."createdAt"::date <@ (
          SELECT
              CONCAT(
                  '[',
                  MIN(value::timestamp),
                  ',',
                  COALESCE(NULLIF(MAX(value::timestamp), MIN(value::timestamp)), NOW()::timestamp),
                  ')'
              )::daterange AS my_array
          FROM json_array_elements_text(
            COALESCE(NULLIF(current_setting('ssdi.goalDate', true), ''), '[]')::json
          ) AS value
        )
      )
      OR (current_setting('ssdi.goalDate.not', true) != 'true'
        AND g."createdAt"::date <@ (
          SELECT
              CONCAT(
                  '[',
                  MIN(value::timestamp),
                  ',',
                  COALESCE(NULLIF(MAX(value::timestamp), MIN(value::timestamp)), NOW()::timestamp),
                  ')'
              )::daterange AS my_array
          FROM json_array_elements_text(
            COALESCE(NULLIF(current_setting('ssdi.goalDate', true), ''), '[]')::json
          ) AS value
        )
      )
    )
  )
),
findings AS (
SELECT
  gid,
  grid,
  grnumber,
  g_created,
  region,
  rname,
  rtype,
  rdelivery_date,
  routcome,
  mf."reportedDate"::date freport_date,
  mf."closedDate"::date fclosed_date,
  ms.citation,
  mf."findingType" ftype,
  mfst.name fstatus,
  mfh.determination fdetermination,
  mf.id mfid
FROM grantreviews
JOIN "MonitoringFindingHistories" mfh
  ON ruuid = mfh."reviewId"
JOIN "MonitoringFindings" mf
  ON mfh."findingId" = mf."findingId"
JOIN "MonitoringFindingStatuses" mfst
  ON mf."statusId" = mfst."statusId"
JOIN "MonitoringFindingStandards" mfs
  ON mf."findingId" = mfs."findingId"
JOIN "MonitoringStandards" ms
  ON mfs."standardId" = ms."standardId"
WHERE mfst.name NOT IN ('Withdrawn') 
),
orig_correction_deadlines AS (
SELECT DISTINCT ON (data_id)
  data_id,
  (new_row_data->>'correctionDeadLine')::date correction_deadline
FROM findings
JOIN "ZALMonitoringFindings"
  ON mfid = data_id
WHERE dml_timestamp < g_created
  AND new_row_data->>'correctionDeadLine' IS NOT NULL
ORDER BY data_id, id DESC
),
joined_ars AS (
SELECT DISTINCT
  gid,
  grid,
  grnumber,
  g_created,
  region,
  rname,
  rtype,
  rdelivery_date,
  routcome,
  freport_date,
  fclosed_date,
  findings.citation,
  ftype,
  fstatus,
  fdetermination,
  correction_deadline,
  ar.id arid,
  aro.id aroid,
  aroc.id arocid
FROM findings
LEFT JOIN orig_correction_deadlines
  ON mfid = data_id
LEFT JOIN "Objectives" o
  ON o."goalId" = gid
LEFT JOIN "ActivityReportGoals" arg
  ON arg."goalId" = gid
LEFT JOIN "ActivityReports" ar
  ON arg."activityReportId" = ar.id
LEFT JOIN "ActivityReportObjectives" aro
  ON ar.id = aro."activityReportId"
  AND o.id = aro."objectiveId"
LEFT JOIN "ActivityReportObjectiveCitations" aroc
  ON aro.id = aroc."activityReportObjectiveId"
  AND findings.citation = aroc.citation
),
collab_roles AS (
SELECT
  u.id user_id,
  u.name user_name,
  STRING_AGG(DISTINCT r.name,'/') roles
FROM "Users" u
JOIN "UserRoles" ur
  ON u.id = ur."userId"
JOIN "Roles" r
  ON r.id = ur."roleId"
GROUP BY 1,2
)
SELECT
  gid,
  grid,
  grnumber,
  g_created,
  region,
  rname,
  rtype,
  rdelivery_date,
  routcome,
  freport_date,
  fclosed_date,
  citation,
  ftype,
  fstatus,
  fdetermination,
  correction_deadline,
  ar.id arid,
  ar."startDate" arstart_date,
  ar."deliveryMethod" ar_delivery_method,
  cr.user_name || ':' || cr.roles AS creator,
  STRING_AGG(DISTINCT cr.user_name || ':' || cr.roles, ';') collaborators,
  STRING_AGG(DISTINCT t.name,';') topics
FROM joined_ars
LEFT JOIN "ActivityReports" ar
  ON arid = ar.id
  AND arocid IS NOT NULL
LEFT JOIN "ActivityReportObjectiveTopics" arot
  ON aroid = arot."activityReportObjectiveId"
LEFT JOIN "Topics" t
  ON arot."topicId" = t.id
LEFT JOIN collab_roles cr
  ON ar."userId" = cr.user_id
LEFT JOIN "ActivityReportCollaborators" arc
  ON arc."activityReportId" = ar.id
LEFT JOIN collab_roles cl
  ON arc."userId" = cl.user_id
GROUP BY 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20
-- Filter for review outcome if ssdi.reviewOutcomes is defined
AND (
  NULLIF(current_setting('ssdi.reviewOutcomes', true), '') IS NULL
  OR (
    (current_setting('ssdi.reviewOutcomes.not', true) = 'true'
      AND routcome NOT IN (
        SELECT
          value::text
        FROM json_array_elements_text(
          COALESCE(NULLIF(current_setting('ssdi.reviewOutcomes', true), '[]')::json, '[]'::json)
        )
      )
    )
    OR (current_setting('ssdi.reviewOutcomes.not', true) != 'true'
      AND routcome IN (
        SELECT
          value::text
        FROM json_array_elements_text(
          COALESCE(NULLIF(current_setting('ssdi.reviewOutcomes', true), '[]')::json, '[]'::json)
        )
      )
    )
  )
)
-- Filter for reviewType if ssdi.reviewTypes is defined
AND (
  NULLIF(current_setting('ssdi.reviewTypes', true), '') IS NULL
  OR (
    (current_setting('ssdi.reviewTypes.not', true) = 'true'
      AND rtype NOT IN (
        SELECT
          value::text
        FROM json_array_elements_text(
          COALESCE(NULLIF(current_setting('ssdi.reviewTypes', true), '[]')::json, '[]'::json)
        )
      )
    )
    OR (current_setting('ssdi.reviewTypes.not', true) != 'true'
      AND rtype IN (
        SELECT
          value::text
        FROM json_array_elements_text(
          COALESCE(NULLIF(current_setting('ssdi.reviewTypes', true), '[]')::json, '[]'::json)
        )
      )
    )
  )
)
-- Filter for finding reportedDate dates between two values if ssdi.findingReportedDate is defined
AND (
  NULLIF(current_setting('ssdi.findingReportedDate', true), '') IS NULL
  OR (
    (current_setting('ssdi.findingReportedDate.not', true) = 'true'
      AND NOT freport_date <@ (
        SELECT
            CONCAT(
                '[',
                MIN(value::timestamp),
                ',',
                COALESCE(NULLIF(MAX(value::timestamp), MIN(value::timestamp)), NOW()::timestamp),
                ')'
            )::daterange AS my_array
        FROM json_array_elements_text(
          COALESCE(NULLIF(current_setting('ssdi.findingReportedDate', true), ''), '[]')::json
        ) AS value
      )
    )
    OR (current_setting('ssdi.findingReportedDate.not', true) != 'true'
      AND freport_date <@ (
        SELECT
            CONCAT(
                '[',
                MIN(value::timestamp),
                ',',
                COALESCE(NULLIF(MAX(value::timestamp), MIN(value::timestamp)), NOW()::timestamp),
                ')'
            )::daterange AS my_array
        FROM json_array_elements_text(
          COALESCE(NULLIF(current_setting('ssdi.findingReportedDate', true), ''), '[]')::json
        ) AS value
      )
    )
  )
)
-- Filter for findingStatus if ssdi.findingStatus is defined
AND (
  NULLIF(current_setting('ssdi.findingStatus', true), '') IS NULL
  OR (
    (current_setting('ssdi.findingStatus.not', true) = 'true'
      AND fstatus NOT IN (
        SELECT
          value::text
        FROM json_array_elements_text(
          COALESCE(NULLIF(current_setting('ssdi.findingStatus', true), '[]')::json, '[]'::json)
        )
      )
    )
    OR (current_setting('ssdi.findingStatus.not', true) != 'true'
      AND fstatus IN (
        SELECT
          value::text
        FROM json_array_elements_text(
          COALESCE(NULLIF(current_setting('ssdi.findingStatus', true), '[]')::json, '[]'::json)
        )
      )
    )
  )
)
-- Filter for findingType if ssdi.findingTypes is defined
AND (
  NULLIF(current_setting('ssdi.findingTypes', true), '') IS NULL
  OR (
    (current_setting('ssdi.findingTypes.not', true) = 'true'
      AND ftype NOT IN (
        SELECT
          value::text
        FROM json_array_elements_text(
          COALESCE(NULLIF(current_setting('ssdi.findingTypes', true), '[]')::json, '[]'::json)
        )
      )
    )
    OR (current_setting('ssdi.findingTypes.not', true) != 'true'
      AND ftype IN (
        SELECT
          value::text
        FROM json_array_elements_text(
          COALESCE(NULLIF(current_setting('ssdi.findingTypes', true), '[]')::json, '[]'::json)
        )
      )
    )
  )
)
-- Filter for region if ssdi.region is defined
AND (
  NULLIF(current_setting('ssdi.region', true), '') IS NULL
  OR (
    gr."regionId" IN (
      SELECT
        value::integer
      FROM json_array_elements_text(
        COALESCE(NULLIF(current_setting('ssdi.region', true), '[]')::json, '[]'::json)
      )
    )
  )
)
;
