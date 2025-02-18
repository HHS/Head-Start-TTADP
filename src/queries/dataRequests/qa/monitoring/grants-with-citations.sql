/*
JSON: {
  "name": "Recent Monitoring Findings Report",
  "description": {
    "standard": "This report aggregates the most recent monitoring findings for grants, including citations, active grants, and replacements.",
    "technical": "The query retrieves monitoring review details, grant relationships, and associated citations. It filters findings based on report delivery date, ensures only the most recent history per grant-finding combination, and groups the results by region and grant IDs."
  },
  "output": {
    "defaultName": "recent_monitoring_findings",
    "schema": [
      {
        "columnName": "regionId",
        "type": "integer",
        "nullable": false,
        "description": "The region ID associated with the grant."
      },
      {
        "columnName": "replacedGrantId",
        "type": "integer",
        "nullable": true,
        "description": "The ID of the grant that has been replaced."
      },
      {
        "columnName": "replacedGrantNumber",
        "type": "string",
        "nullable": true,
        "description": "The number of the grant that has been replaced."
      },
      {
        "columnName": "activeGrantId",
        "type": "integer",
        "nullable": false,
        "description": "The ID of the active grant."
      },
      {
        "columnName": "activeGrantNumber",
        "type": "string",
        "nullable": false,
        "description": "The number of the active grant."
      },
      {
        "columnName": "citations",
        "type": "array",
        "nullable": false,
        "description": "An array of distinct citations associated with the monitoring findings."
      }
    ]
  },
  "filters": [
    {
      "name": "region",
      "type": "integer[]",
      "display": "Region IDs",
      "description": "One or more values for 1 through 12 representing different regions."
    },
    {
      "name": "reportDeliveryDate",
      "type": "date[]",
      "display": "Report Delivery Date Range",
      "description": "Two dates defining the range for the 'reportDeliveryDate' field."
    }
  ],
  "sorting": {
    "default": [
      { "level": 1, "name": "regionId", "order": "ASC" },
      { "level": 2, "name": "replacedGrantId", "order": "ASC" },
      { "level": 3, "name": "activeGrantId", "order": "ASC" }
    ]
  },
  "customSortingSupported": false,
  "paginationSupported": false,
  "exampleUsage": "SELECT SET_CONFIG('ssdi.reportDeliveryDate', '[\"2024-01-01\",\"2024-12-31\"]', TRUE);"
}
*/

WITH 
  -- Subquery ensures only the most recent history for each finding-grant combination
"RecentMonitoring" AS ( 
    SELECT DISTINCT ON (mfh."findingId", gr.id)
    mfh."findingId",
    gr.id AS "grantId",
    mr."reviewId",
    mr."name",
    mr."reportDeliveryDate"
    FROM "MonitoringFindingHistories" mfh
    JOIN "MonitoringReviews" mr
    ON mfh."reviewId" = mr."reviewId"
    JOIN "MonitoringReviewGrantees" mrg
    ON mrg."reviewId" = mr."reviewId"
    JOIN "Grants" gr
    ON gr.number = mrg."grantNumber"
    WHERE 1 = 1
    AND (
        (
            NULLIF(current_setting('ssdi.reportDeliveryDate', true), '') IS NULL
            AND mr."reportDeliveryDate"::date BETWEEN '2024-01-01' AND NOW()
        )
        OR (
        mr."reportDeliveryDate"::date <@ (
            SELECT CONCAT(
            '[', MIN(value::timestamp), ',',
            COALESCE(NULLIF(MAX(value::timestamp), MIN(value::timestamp)), NOW()::timestamp), ')'
            )::daterange
            FROM json_array_elements_text(
            COALESCE(NULLIF(current_setting('ssdi.reportDeliveryDate', true), ''), '[]')::json
            ) AS value
        ) != false
        )
        )
    ORDER BY mfh."findingId", gr.id, mr."reportDeliveryDate" DESC
)
SELECT
    gr."regionId",
    NULLIF(gr.id, gr2.id) "replacedGrantId",
    NULLIF(gr.number, gr2.number) "replacedGrantNumber",
    gr2.id "activeGrantId",
    gr2.number "activeGrantNumber",
    ARRAY_AGG(DISTINCT ms.citation)
FROM "GrantRelationshipToActive" grta
JOIN "Grants" gr
  ON  grta."grantId" = gr.id
JOIN "Goals" g
  ON grta."activeGrantId" = g."grantId"
  AND g."status" NOT IN ('Closed', 'Suspended')
JOIN "GoalTemplates" gt
  ON g."goalTemplateId" = gt."id"
  AND gt."standard" = 'Monitoring'
JOIN "MonitoringReviewGrantees" mrg
  ON gr.number = mrg."grantNumber"
JOIN "RecentMonitoring" rm 
ON rm."grantId" = gr.id
JOIN "MonitoringFindings" mf
  ON rm."findingId" = mf."findingId"
JOIN "MonitoringFindingStatuses" mfs
  ON mf."statusId" = mfs."statusId"
JOIN "MonitoringFindingStandards" mfs2
  ON mf."findingId" = mfs2."findingId"
JOIN "MonitoringStandards" ms
  ON mfs2."standardId" = ms."standardId"
JOIN "MonitoringFindingGrants" mfg
  ON mf."findingId" = mfg."findingId"
  AND mrg."granteeId" = mfg."granteeId"
JOIN "Grants" gr2
ON grta."activeGrantId" = gr2.id
WHERE 1 = 1
-- Filter for region if ssdi.region is defined
AND (NULLIF(current_setting('ssdi.region', true), '') IS NULL
    OR gr."regionId" in (
    SELECT value::integer AS my_array
        FROM json_array_elements_text(COALESCE(NULLIF(current_setting('ssdi.region', true), ''),'[]')::json) AS value
    ))
GROUP BY 1,2,3,4,5
ORDER BY 1,2,4;
