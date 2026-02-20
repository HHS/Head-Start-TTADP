/*
JSON: {
  "name": "QA Dashboard: No TTA",
  "description": {
    "standard": "Filterable aggrigrated no tta data for QA Dashboard",
    "technical": "Filterable aggrigrated no tta data for QA Dashboard for no tta widget and no tta details page."
  },
 "output": {
    "defaultName": "qa_notta",
    "schema": [
      {
        "columnName": "data_set",
        "type": "string",
        "nullable": false,
        "description": "The name of the dataset being returned."
      },
      {
        "columnName": "records",
        "type": "number",
        "nullable": false,
        "description": "The number of records in the dataset."
      },
      {
        "columnName": "data",
        "type": "jsonb",
        "nullable": false,
        "description": "The actual data for the dataset, returned as a JSON object."
      },
      {
        "columnName": "active_filters",
        "type": "string[]",
        "nullable": false,
        "description": "Array of active filters applied during the query execution."
      }
    ],
    "multipleDataSets": [
      {
        "name": "no_tta_widget",
        "defaultName": "No TTA Widget",
        "description": "Summary of recipients who have not received TTA, including the percentage and total number of recipients without TTA.",
        "schema": [
          {
            "columnName": "% recipients without tta",
            "type": "decimal",
            "nullable": false,
            "description": "Percentage of recipients who have not received TTA in the last 90 days."
          },
          {
            "columnName": "recipients without tta",
            "type": "number",
            "nullable": false,
            "description": "Number of recipients who have not received TTA in the last 90 days."
          },
          {
            "columnName": "total",
            "type": "number",
            "nullable": false,
            "description": "Total number of recipients."
          }
        ]
      },
      {
        "name": "no_tta_page",
        "defaultName": "Detailed No TTA Data",
        "description": "Detailed information about recipients who have not received TTA in the last 90 days, including recipient details and the number of days since the last TTA.",
        "schema": [
          {
            "columnName": "recipient id",
            "type": "number",
            "nullable": false,
            "description": "Unique identifier for the recipient."
          },
          {
            "columnName": "recipient name",
            "type": "string",
            "nullable": true,
            "description": "Name of the recipient."
          },
          {
            "columnName": "region id",
            "type": "number",
            "nullable": true,
            "description": "Region number associated with the recipient's grant."
          },
          {
            "columnName": "last tta",
            "type": "date",
            "nullable": true,
            "description": "Date of the last TTA received by the recipient."
          },
          {
            "columnName": "days since last tta",
            "type": "number",
            "nullable": true,
            "description": "Number of days since the recipient last received TTA."
          }
        ]
      },
      {
        "name": "process_log",
        "defaultName": "Process Log",
        "description": "Log of actions and record counts from query processing.",
        "schema": [
          {
            "columnName": "action",
            "type": "string",
            "nullable": false,
            "description": "Description of the process action."
          },
          {
            "columnName": "record_cnt",
            "type": "number",
            "nullable": false,
            "description": "Number of records affected by the action."
          }
        ]
      }
    ]
  },
  "filters": [
    {
      "name": "recipient",
      "type": "string[]",
      "display": "Recipient Names",
      "description": "Filter based on the names of the recipients.",
      "supportsExclusion": true,
      "supportsFuzzyMatch": true,
      "options": {
        "query": {
          "sqlQuery": "SELECT name FROM \"Recipients\"",
          "column": "name"
        }
      }
    },
    {
      "name": "grantNumber",
      "type": "string[]",
      "display": "Grant Numbers",
      "description": "Filter based on the grant numbers.",
      "supportsExclusion": true,
      "supportsFuzzyMatch": true,
      "options": {
        "query": {
          "sqlQuery": "SELECT number FROM \"Grants\"",
          "column": "number"
        }
      }
    },
    {
      "name": "programType",
      "type": "string[]",
      "display": "Program Type",
      "description": "Filter based on the type of program.",
      "supportsExclusion": true,
      "options": {
        "query": {
          "sqlQuery": "SELECT DISTINCT \"programType\" FROM \"Programs\" ORDER BY 1",
          "column": "programType"
        }
      }
    },
    {
      "name": "stateCode",
      "type": "string[]",
      "display": "State Code",
      "description": "Filter based on the state code.",
      "supportsExclusion": true,
      "options": {
        "query": {
          "sqlQuery": "SELECT DISTINCT \"stateCode\" FROM \"Grants\" ORDER BY 1",
          "column": "stateCode"
        }
      }
    },
    {
      "name": "region",
      "type": "integer[]",
      "display": "Region IDs",
      "description": "Filter based on region identifiers.",
      "options": {
        "staticValues": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      }
    },
    {
      "name": "startDate",
      "type": "date[]",
      "display": "Start Date",
      "description": "Filter based on the start date of the activity reports.",
      "supportsExclusion": true
    },
    {
      "name": "endDate",
      "type": "date[]",
      "display": "End Date",
      "description": "Filter based on the end date of the activity reports.",
      "supportsExclusion": true
    },
    {
      "name": "grantStatus",
      "type": "string[]",
      "display": "Grant Status",
      "description": "Filter based on the status of the grant.",
      "supportsExclusion": true,
      "options": {
        "staticValues": ["active", "inactive", "interim-management-cdi"]
      }
    }
  ]
}
*/
DO $$
DECLARE
    -- Declare filter variables
    recipient_filter TEXT := NULLIF(current_setting('ssdi.recipient', true), '');
    program_type_filter TEXT := NULLIF(current_setting('ssdi.programType', true), '');
    grant_numbers_filter TEXT := NULLIF(current_setting('ssdi.grantNumber', true), '');
    state_code_filter TEXT := NULLIF(current_setting('ssdi.stateCode', true), '');
    region_ids_filter TEXT := NULLIF(current_setting('ssdi.region', true), '');
    start_date_filter TEXT := NULLIF(current_setting('ssdi.startDate', true), '');
    end_date_filter TEXT := NULLIF(current_setting('ssdi.endDate', true), '');
    grant_status_filter TEXT := NULLIF(current_setting('ssdi.grantStatus', true), '');

    -- Declare `.not` variables
    recipient_not_filter BOOLEAN := COALESCE(current_setting('ssdi.recipient.not', true), 'false') = 'true';
    program_type_not_filter BOOLEAN := COALESCE(current_setting('ssdi.programType.not', true), 'false') = 'true';
    grant_numbers_not_filter BOOLEAN := COALESCE(current_setting('ssdi.grantNumber.not', true), 'false') = 'true';
    state_code_not_filter BOOLEAN := COALESCE(current_setting('ssdi.stateCode.not', true), 'false') = 'true';
    region_ids_not_filter BOOLEAN := COALESCE(current_setting('ssdi.region.not', true), 'false') = 'true';
    start_date_not_filter BOOLEAN := COALESCE(current_setting('ssdi.startDate.not', true), 'false') = 'true';
    end_date_not_filter BOOLEAN := COALESCE(current_setting('ssdi.endDate.not', true), 'false') = 'true';
    grant_status_not_filter BOOLEAN := COALESCE(current_setting('ssdi.grantStatus.not', true), 'false') = 'true';

BEGIN
---------------------------------------------------------------------------------------------------
-- Step 0.1: make a table to hold applied filters
  DROP TABLE IF EXISTS process_log;
  CREATE TEMP TABLE IF NOT EXISTS process_log(
    action TEXT,
    record_cnt int,
    occured_at TIMESTAMP DEFAULT NOW()
  );

---------------------------------------------------------------------------------------------------
-- Step 1.1: Seed filtered_grants
  DROP TABLE IF EXISTS filtered_grants;
  CREATE TEMP TABLE IF NOT EXISTS filtered_grants (id INT);

  WITH seed_filtered_grants AS (
      INSERT INTO filtered_grants (id)
      SELECT
        id
      FROM "Grants"
      WHERE COALESCE(deleted, false) = false
      GROUP BY 1
      ORDER BY 1
      RETURNING id
  )
  INSERT INTO process_log (action, record_cnt)
  SELECT
      'Seed filtered_grants' AS action,
      COUNT(*)
  FROM seed_filtered_grants
  GROUP BY 1;

---------------------------------------------------------------------------------------------------
-- Step 1.2: Apply grant filters and remove grants that don't meet the criteria
  IF
    recipient_filter IS NOT NULL OR
    program_type_filter IS NOT NULL OR
    grant_numbers_filter IS NOT NULL OR
    state_code_filter IS NOT NULL OR
    region_ids_filter IS NOT NULL OR
    grant_status_filter IS NOT NULL
  THEN
    WITH
      applied_filtered_grants AS (
        SELECT
          gr.id
        FROM filtered_grants fgr
        JOIN "Grants" gr ON fgr.id = gr.id
        JOIN "Recipients" r ON gr."recipientId" = r.id
        -- Filter for recipients if ssdi.recipients is defined
        AND (
          recipient_filter IS NULL
          OR EXISTS (
            SELECT 1
            FROM json_array_elements_text(COALESCE(recipient_filter, '[]')::json) AS value
            WHERE r.name ~* value::text
          ) != recipient_not_filter
        )
        JOIN "Programs" p ON gr.id = p."grantId"
        -- Filter for programType if ssdi.programType is defined
        AND (
          program_type_filter IS NULL
          OR COALESCE(program_type_filter, '[]')::jsonb @> to_jsonb(p."programType") != program_type_not_filter
        )
        WHERE 1 = 1
        -- Filter for grantNumbers if ssdi.grantNumbers is defined
        AND (
          grant_numbers_filter IS NULL
          OR EXISTS (
            SELECT 1
            FROM json_array_elements_text(COALESCE(grant_numbers_filter, '[]')::json) AS value
            WHERE gr.number ~* value::text
          ) != grant_numbers_not_filter
        )
        -- Filter for stateCode if ssdi.stateCode is defined
        AND (
          state_code_filter IS NULL
          OR COALESCE(state_code_filter, '[]')::jsonb @> to_jsonb(gr."stateCode") != state_code_not_filter
        )
        -- Filter for regionIds if ssdi.regionIds is defined
        AND (
          region_ids_filter IS NULL
          OR COALESCE(region_ids_filter, '[]')::jsonb @> to_jsonb(gr."regionId") != region_ids_not_filter
        )
        -- Filter for grantStatus if ssdi.grantStatus is defined
        AND (
          grant_status_filter IS NULL
          OR (
            (
              ((grant_status_filter::jsonb ->> 0) = 'active' AND gr.status = 'Active' AND gr.cdi = false)
              OR ((grant_status_filter::jsonb ->> 0) = 'inactive' AND gr.status = 'Inactive' AND gr.cdi = false)
              OR ((grant_status_filter::jsonb ->> 0) = 'interim-management-cdi' AND gr.cdi = true AND gr.status = 'Active')
            ) != grant_status_not_filter
          )
        )
        GROUP BY 1
        ORDER BY 1
      ),
      applied_filtered_out_grants AS (
        SELECT
          fgr.id
        FROM filtered_grants fgr
        LEFT JOIN applied_filtered_grants afgr ON fgr.id = afgr.id
        GROUP BY 1
        HAVING COUNT(afgr.id) = 0
        ORDER BY 1
      ),
      delete_from_grant_filter AS (
        DELETE FROM filtered_grants fgr
        USING applied_filtered_out_grants afogr
        WHERE fgr.id = afogr.id
        RETURNING fgr.id
      )
    INSERT INTO process_log (action, record_cnt)
    SELECT 'Apply Grant Filters' AS action, COUNT(*)
    FROM delete_from_grant_filter
    GROUP BY 1;
  END IF;

---------------------------------------------------------------------------------------------------
-- Step 3.1: Seed filtered_activity_reports
  DROP TABLE IF EXISTS filtered_activity_reports;
  CREATE TEMP TABLE IF NOT EXISTS filtered_activity_reports (id INT);

  WITH seed_filtered_activity_reports AS (
      INSERT INTO filtered_activity_reports (id)
      SELECT
        a.id
      FROM "ActivityReports" a
      JOIN "ActivityRecipients" ar ON a.id = ar."activityReportId"
      JOIN filtered_grants fgr ON ar."grantId" = fgr.id
      JOIN "ActivityReportGoals" arg ON a.id = arg."activityReportId"
      --JOIN filtered_goals fg ON arg."goalId" = fg.id
      WHERE a."calculatedStatus" = 'approved'
      GROUP BY 1
      ORDER BY 1
      RETURNING id
  )
  INSERT INTO process_log (action, record_cnt)
  SELECT 'Seed filtered_activity_reports' AS action, COUNT(*)
  FROM seed_filtered_activity_reports
  GROUP BY 1;

---------------------------------------------------------------------------------------------------
-- Step 3.2: Apply activity report filters (start/end date) and remove reports that don't meet criteria
  IF
        start_date_filter IS NOT NULL OR
        end_date_filter IS NOT NULL
    THEN
    WITH
      applied_filtered_activity_reports AS (
        SELECT
          a.id
        FROM filtered_activity_reports fa
        JOIN "ActivityReports" a ON fa.id = a.id
        WHERE a."calculatedStatus" = 'approved'
        -- Filter for startDate dates between two values
        AND (
          start_date_filter IS NULL
          OR a."startDate"::date <@ (
            SELECT CONCAT(
            '[', MIN(value::timestamp), ',',
            COALESCE(NULLIF(MAX(value::timestamp), MIN(value::timestamp)), NOW()::timestamp), ')'
            )::daterange
            FROM json_array_elements_text(COALESCE(start_date_filter, '[]')::json) AS value
          ) != start_date_not_filter
        )
        -- Filter for endDate dates between two values
        AND (
          end_date_filter IS NULL
          OR a."endDate"::date <@ (
            SELECT CONCAT(
            '[', MIN(value::timestamp), ',',
            COALESCE(NULLIF(MAX(value::timestamp), MIN(value::timestamp)), NOW()::timestamp), ')'
            )::daterange
            FROM json_array_elements_text(COALESCE(end_date_filter, '[]')::json) AS value
          ) != end_date_not_filter
        )
        GROUP BY 1
        ORDER BY 1
      ),
      applied_filtered_out_activity_reports AS (
        SELECT 
          fa.id
        FROM filtered_activity_reports fa
        LEFT JOIN applied_filtered_activity_reports afa ON fa.id = afa.id
        GROUP BY 1
        HAVING COUNT(afa.id) = 0
        ORDER BY 1
      ),
      delete_from_activity_report_filter AS (
        DELETE FROM filtered_activity_reports fa
        USING applied_filtered_out_activity_reports afaoar
        WHERE fa.id = afaoar.id
        RETURNING fa.id
      )
    INSERT INTO process_log (action, record_cnt)
    SELECT 'Apply Activity Report Filters' AS action, COUNT(*)
    FROM delete_from_activity_report_filter
    GROUP BY 1;
  END IF;

---------------------------------------------------------------------------------------------------
-- Step 3.3: Update filtered_grants based on the reduced filtered_activity_reports dataset
WITH reduced_grants AS (
    SELECT DISTINCT 
      ar."grantId"
    FROM filtered_activity_reports fa
    JOIN "ActivityRecipients" ar ON fa.id = ar."activityReportId"
    GROUP BY 1
    ORDER BY 1
),
applied_filtered_out_grants AS (
    SELECT
      fgr.id
    FROM filtered_grants fgr
    LEFT JOIN reduced_grants rg ON fgr.id = rg."grantId"
    GROUP BY 1
    HAVING COUNT(rg."grantId") = 0
    ORDER BY 1
),
delete_from_grant_filter AS (
    DELETE FROM filtered_grants fgr
    USING applied_filtered_out_grants afog
    WHERE fgr.id = afog.id
    RETURNING fgr.id
)
INSERT INTO process_log (action, record_cnt)
SELECT 'Apply Activity Report to Grant Filters' AS action, COUNT(*)
FROM delete_from_grant_filter
GROUP BY 1;

END $$;

---------------------------------------------------------------------------------------------------
-- Final CTEs for dataset generation
WITH
has_current_grant AS (
  SELECT
    "recipientId" rid,
    BOOL_OR(status = 'Active') has_current_active_grant
  FROM "Grants"
  GROUP BY 1
),
active_filters_array AS (
    SELECT array_remove(ARRAY[
      CASE WHEN NULLIF(current_setting('ssdi.recipients', true), '') IS NOT NULL THEN 'recipients' END,
      CASE WHEN NULLIF(current_setting('ssdi.programType', true), '') IS NOT NULL THEN 'programType' END,
      CASE WHEN NULLIF(current_setting('ssdi.grantNumber', true), '') IS NOT NULL THEN 'grantNumber' END,
      CASE WHEN NULLIF(current_setting('ssdi.stateCode', true), '') IS NOT NULL THEN 'stateCode' END,
      CASE WHEN NULLIF(current_setting('ssdi.region', true), '') IS NOT NULL THEN 'region' END,
      CASE WHEN NULLIF(current_setting('ssdi.startDate', true), '') IS NOT NULL THEN 'startDate' END,
      CASE WHEN NULLIF(current_setting('ssdi.endDate', true), '') IS NOT NULL THEN 'endDate' END,
      CASE WHEN NULLIF(current_setting('ssdi.grantStatus', true), '') IS NOT NULL THEN 'grantStatus' END
    ], NULL) AS active_filters

),

no_tta AS (
    SELECT
      r.id,
      COUNT(DISTINCT a.id) != 0 OR COUNT(DISTINCT srp.id) != 0 AS has_tta
    FROM "Recipients" r
    JOIN has_current_grant hcg ON r.id = hcg.rid
    JOIN "Grants" gr ON r.id = gr."recipientId"
    JOIN "GrantRelationshipToActive" grta ON gr.id = grta."grantId"
    JOIN filtered_grants fgr ON gr.id = fgr.id
    LEFT JOIN "ActivityRecipients" ar ON gr.id = ar."grantId"
    LEFT JOIN filtered_activity_reports far ON ar."activityReportId" = far.id
    LEFT JOIN "ActivityReports" a ON far.id = a.id
    AND a."calculatedStatus" = 'approved'
    AND a."startDate"::date > now() - INTERVAL '90 days'
    LEFT JOIN "SessionReportPilots" srp ON EXISTS (
        SELECT 1 
        FROM jsonb_array_elements(srp.data -> 'recipients') AS elem
        WHERE (elem ->> 'value')::int = r.id
    )
    AND srp.data ->> 'status' = 'Complete'
    AND (srp.data ->> 'endDate')::DATE > now() - INTERVAL '90 days'
    WHERE hcg.has_current_active_grant
    GROUP BY 1
    ORDER BY 1
),
no_tta_widget AS (
    SELECT
      (COALESCE((COUNT(*) FILTER (WHERE NOT has_tta))::decimal/NULLIF(COUNT(*),0),0)*100)::decimal(5,2) "% recipients without tta",
      COUNT(*) FILTER (WHERE not has_tta ) "recipients without tta",
      COUNT(*) total
    FROM no_tta
),
no_tta_page AS (
    SELECT
      r.id,
      r.name,
      gr."regionId",
      ((array_agg(a."endDate" ORDER BY a."endDate" DESC NULLS LAST))[1])::timestamp last_tta,
      now()::date - ((array_agg(a."endDate" ORDER BY a."endDate" DESC NULLS LAST))[1])::date days_since_last_tta
    FROM no_tta nt
    JOIN "Recipients" r ON nt.id = r.id
    AND NOT nt.has_tta
    JOIN has_current_grant hcg ON r.id = hcg.rid
    JOIN "Grants" gr ON r.id = gr."recipientId"
    LEFT JOIN "ActivityRecipients" ar ON gr.id = ar."grantId"
    LEFT JOIN "ActivityReports" a ON ar."activityReportId" = a.id
    AND a."calculatedStatus" = 'approved'
    WHERE hcg.has_current_active_grant
    GROUP BY 1,2,3
    ORDER BY 1
),
datasets AS (
    SELECT 'no_tta_widget' data_set, COUNT(*) records,
    JSONB_AGG(JSONB_BUILD_OBJECT(
      '% recipients without tta', "% recipients without tta",
      'recipients without tta', "recipients without tta",
      'total', total
    )) data,
      af.active_filters  -- Use precomputed active_filters
    FROM no_tta_widget
    CROSS JOIN active_filters_array af
    GROUP BY af.active_filters

    UNION

    SELECT 'no_tta_page' data_set, COUNT(*) records,
    JSONB_AGG(JSONB_BUILD_OBJECT(
        'recipient id', id,
        'recipient name', name,
        'region id', "regionId",
        'last tta', last_tta,
        'days since last tta', days_since_last_tta
    )) data,
      af.active_filters  -- Use precomputed active_filters
    FROM no_tta_page
    CROSS JOIN active_filters_array af
    GROUP BY af.active_filters

    UNION

    SELECT
      'no_tta_page' data_set,
      0 records,
     '[]'::JSONB,
      af.active_filters  -- Use precomputed active_filters
    FROM active_filters_array af
    GROUP BY af.active_filters

    UNION
    SELECT 'process_log' data_set, COUNT(*) records,
    JSONB_AGG(JSONB_BUILD_OBJECT(
        'action', action,
        'record_cnt', record_cnt
    )) data,
      af.active_filters  -- Use precomputed active_filters
    FROM process_log
    CROSS JOIN active_filters_array af
    GROUP BY af.active_filters
)

SELECT
  data_set,
  MAX(records) records,
  JSONB_AGG(data ORDER BY records DESC) -> 0 data,
  active_filters
FROM datasets
-- Filter for datasets if ssdi.dataSetSelection is defined
WHERE 1 = 1
AND (
  NULLIF(current_setting('ssdi.dataSetSelection', true), '') IS NULL
  OR (
    COALESCE(NULLIF(current_setting('ssdi.dataSetSelection', true), ''), '[]')::jsonb @> to_jsonb("data_set")::jsonb
  )
)
GROUP BY 1,4;
