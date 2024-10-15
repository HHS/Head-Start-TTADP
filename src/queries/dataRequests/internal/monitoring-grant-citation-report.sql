/**
JSON: {
  "name": "Monitoring Grant Citation Report",
  "description": {
    "standard": "Retrieves monitoring report data based on various filters for compliance and audit purposes.",
    "technical": "This query extracts monitoring report details including region, grant number, report delivery date, finding type, and citations, filtered by several parameters such as report delivery date, review outcomes, review types, finding reported date, and others."
  },
  "output": {
    "defaultName": "monitoring_grant_citation_report",
    "schema": [
      {
        "columnName": "regionId",
        "type": "integer",
        "nullable": false,
        "description": "The region ID associated with the grant."
      },
      {
        "columnName": "number",
        "type": "string",
        "nullable": false,
        "description": "The grant number."
      },
      {
        "columnName": "reportDeliveryDate",
        "type": "date",
        "nullable": true,
        "description": "The date when the review was delivered."
      },
      {
        "columnName": "reviewType",
        "type": "string",
        "nullable": true,
        "description": "The type of review."
      },
      {
        "columnName": "findingType",
        "type": "string",
        "nullable": true,
        "description": "The type of finding in the review."
      },
      {
        "columnName": "citation",
        "type": "string",
        "nullable": true,
        "description": "The specific citation related to the finding."
      }
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
    },
    {
      "name": "uei",
      "type": "string[]",
      "description": "One or more UEI values. If no values are supplied, this filter is ignored.",
      "supportsExclusion": true,
      "supportsFuzzyMatch": true,
      "options": {
        "query": {
          "sqlQuery": "SELECT DISTINCT r.uei FROM \"Recipients\" r JOIN \"Grants\" gr ON r.id = gr.\"recipientId\" WHERE gr.status = 'Active' AND (NULLIF(current_setting('ssdi.region', true), '') IS NULL OR gr.\"regionId\"::int IN (SELECT value::integer AS my_array FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.region', true), ''), '[]')::json) AS value)) ORDER BY r.uei;",
          "column": "uei"
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
SELECT DISTINCT
    gr."regionId",
    gr.number,
    mr."reportDeliveryDate",
    mr."reviewType",
    mf."findingType",
    ms."citation"
FROM "Grants" gr
JOIN "Recipients" r
    ON gr."recipientId" = r.id
JOIN "MonitoringReviewGrantees" mrg
    ON gr.number = mrg."grantNumber"
JOIN "MonitoringReviews" mr
    ON mrg."reviewId" = mr."reviewId"
JOIN "MonitoringReviewStatuses" mrs
    ON mr."statusId" = mrs."statusId"
JOIN "MonitoringFindingHistories" mfh
    ON mr."reviewId" = mfh."reviewId"
JOIN "MonitoringFindings" mf
    ON mfh."findingId" = mf."findingId"
JOIN "MonitoringFindingStandards" mfs
    ON mf."findingId" = mfs."findingId"
JOIN "MonitoringStandards" ms
    ON mfs."standardId" = ms."standardId"
JOIN "MonitoringFindingStatuses" mfs2
    ON mf."statusId" = mfs2."statusId"
WHERE mrs.name = 'Complete'
-- Filter for reportDeliveryDate dates between two values if ssdi.reportDeliveryDate is defined
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
-- Filter for review outcome if ssdi.reviewOutcomes is defined
AND (
  NULLIF(current_setting('ssdi.reviewOutcomes', true), '') IS NULL
  OR (
    (current_setting('ssdi.reviewOutcomes.not', true) = 'true'
      AND mr."outcome" NOT IN (
        SELECT
          value::text
        FROM json_array_elements_text(
          COALESCE(NULLIF(current_setting('ssdi.reviewOutcomes', true), '[]')::json, '[]'::json)
        )
      )
    )
    OR (current_setting('ssdi.reviewOutcomes.not', true) != 'true'
      AND mr."outcome" IN (
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
      AND mr."reviewType" NOT IN (
        SELECT
          value::text
        FROM json_array_elements_text(
          COALESCE(NULLIF(current_setting('ssdi.reviewTypes', true), '[]')::json, '[]'::json)
        )
      )
    )
    OR (current_setting('ssdi.reviewTypes.not', true) != 'true'
      AND mr."reviewType" IN (
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
      AND NOT mf."reportedDate"::date <@ (
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
      AND mf."reportedDate"::date <@ (
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
      AND mfs2."name" NOT IN (
        SELECT
          value::text
        FROM json_array_elements_text(
          COALESCE(NULLIF(current_setting('ssdi.findingStatus', true), '[]')::json, '[]'::json)
        )
      )
    )
    OR (current_setting('ssdi.findingStatus.not', true) != 'true'
      AND mfs2."name" IN (
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
      AND mf."findingType" NOT IN (
        SELECT
          value::text
        FROM json_array_elements_text(
          COALESCE(NULLIF(current_setting('ssdi.findingTypes', true), '[]')::json, '[]'::json)
        )
      )
    )
    OR (current_setting('ssdi.findingTypes.not', true) != 'true'
      AND mf."findingType" IN (
        SELECT
          value::text
        FROM json_array_elements_text(
          COALESCE(NULLIF(current_setting('ssdi.findingTypes', true), '[]')::json, '[]'::json)
        )
      )
    )
  )
)
-- Filter for citations if ssdi.citations is defined
AND (
  NULLIF(current_setting('ssdi.citations', true), '') IS NULL
  OR (
    (current_setting('ssdi.citations.not', true) = 'true'
      AND NOT EXISTS (
        SELECT 1
        FROM json_array_elements_text(
          COALESCE(NULLIF(current_setting('ssdi.citations', true), '[]')::json, '[]'::json)
        ) AS value
        WHERE ms."citation" ~* value::text
      )
    )
    OR (current_setting('ssdi.citations.not', true) != 'true'
      AND EXISTS (
        SELECT 1
        FROM json_array_elements_text(
          COALESCE(NULLIF(current_setting('ssdi.citations', true), '[]')::json, '[]'::json)
        ) AS value
        WHERE ms."citation" ~* value::text
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
-- Filter for grantNumber if ssdi.grantNumber is defined
AND (
  NULLIF(current_setting('ssdi.grantNumber', true), '') IS NULL
  OR (
    (current_setting('ssdi.grantNumber.not', true) = 'true'
      AND NOT EXISTS (
        SELECT 1
        FROM json_array_elements_text(
          COALESCE(NULLIF(current_setting('ssdi.grantNumber', true), '[]')::json, '[]'::json)
        ) AS value
        WHERE gr.number ~* value::text
      )
    )
    OR (current_setting('ssdi.grantNumber.not', true) != 'true'
      AND EXISTS (
        SELECT 1
        FROM json_array_elements_text(
          COALESCE(NULLIF(current_setting('ssdi.grantNumber', true), '[]')::json, '[]'::json)
        ) AS value
        WHERE gr.number ~* value::text
      )
    )
  )
)
-- Filter for recipient if ssdi.recipient is defined
AND (
  NULLIF(current_setting('ssdi.recipient', true), '') IS NULL
  OR (
    (current_setting('ssdi.recipient.not', true) = 'true'
      AND NOT EXISTS (
        SELECT 1
        FROM json_array_elements_text(
          COALESCE(NULLIF(current_setting('ssdi.recipient', true), '[]')::json, '[]'::json)
        ) AS value
        WHERE r.name ~* value::text
      )
    )
    OR (current_setting('ssdi.recipient.not', true) != 'true'
      AND EXISTS (
        SELECT 1
        FROM json_array_elements_text(
          COALESCE(NULLIF(current_setting('ssdi.recipient', true), '[]')::json, '[]'::json)
        ) AS value
        WHERE r.name ~* value::text
      )
    )
  )
)
-- Filter for UEI if ssdi.uei is defined
AND (
  NULLIF(current_setting('ssdi.uei', true), '') IS NULL
  OR (
    (current_setting('ssdi.uei.not', true) = 'true'
      AND NOT EXISTS (
        SELECT 1
        FROM json_array_elements_text(
          COALESCE(NULLIF(current_setting('ssdi.uei', true), '[]')::json, '[]'::json)
        ) AS value
        WHERE r.uei ~* value::text
      )
    )
    OR (current_setting('ssdi.uei.not', true) != 'true'
      AND EXISTS (
        SELECT 1
        FROM json_array_elements_text(
          COALESCE(NULLIF(current_setting('ssdi.uei', true), '[]')::json, '[]'::json)
        ) AS value
        WHERE r.uei ~* value::text
      )
    )
  )
)
ORDER BY 1,2,3;
