/*
JSON: {
  "name": "QA Dashboard: FEI",
  "description": {
    "standard": "Filterable aggrigrated fei data for QA Dashboard",
    "technical": "Filterable aggrigrated fei data for QA Dashboard for fei widget, fei graph and fei details page."
  },
  "output": {
    "defaultName": "qa_fei",
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
        "name": "with_fei_widget",
        "defaultName": "FEI Widget",
        "description": "Summary data for recipients with FEI goals, including the percentage of recipients with FEI and the total number of recipients.",
        "schema": [
          {
            "columnName": "% recipients with fei",
            "type": "decimal",
            "nullable": false,
            "description": "Percentage of recipients with a FEI goal."
          },
          {
            "columnName": "recipients with fei",
            "type": "number",
            "nullable": false,
            "description": "Number of recipients with a FEI goal."
          },
          {
            "columnName": "total",
            "type": "number",
            "nullable": false,
            "description": "Total number of recipients."
          },
          {
            "columnName": "grants with fei",
            "type": "number",
            "nullable": false,
            "description": "Number of grants with a FEI goal."
          }
        ]
      },
      {
        "name": "with_fei_page",
        "defaultName": "Detailed FEI Data",
        "description": "Detailed information about recipients with FEI goals, including recipient, grant, and goal information.",
        "schema": [
          {
            "columnName": "recipientId",
            "type": "number",
            "nullable": false,
            "description": "Unique identifier for the recipient."
          },
          {
            "columnName": "recipientName",
            "type": "string",
            "nullable": true,
            "description": "Name of the recipient."
          },
          {
            "columnName": "grantNumber",
            "type": "string",
            "nullable": true,
            "description": "Grant number associated with the recipient."
          },
          {
            "columnName": "region id",
            "type": "number",
            "nullable": true,
            "description": "Region number associated with the recipient's grant."
          },
          {
            "columnName": "goalId",
            "type": "number",
            "nullable": true,
            "description": "Unique identifier for the goal."
          },
          {
            "columnName": "createdAt",
            "type": "date",
            "nullable": true,
            "description": "Timestamp when the goal was created."
          },
          {
            "columnName": "goalStatus",
            "type": "string",
            "nullable": true,
            "description": "Status of the goal."
          },
          {
            "columnName": "rootCause",
            "type": "string",
            "nullable": true,
            "description": "Root cause response associated with the goal."
          }
        ]
      },
      {
        "name": "with_fei_graph",
        "defaultName": "FEI Graph",
        "description": "Graph data for root cause responses related to FEI goals, including response counts and percentages.",
        "schema": [
          {
            "columnName": "rootCause",
            "type": "string",
            "nullable": false,
            "description": "The root cause response."
          },
          {
            "columnName": "response_count",
            "type": "number",
            "nullable": false,
            "description": "Number of occurrences of the root cause response."
          },
          {
            "columnName": "percentage",
            "type": "decimal",
            "nullable": false,
            "description": "Percentage of the total root cause responses."
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
      "description": "Filter based on the names of the recipients",
      "supportsExclusion": true,
      "supportsFuzzyMatch": true
    },
    {
      "name": "grantNumber",
      "type": "string[]",
      "display": "Grant Numbers",
      "description": "Filter based on the grant numbers",
      "supportsExclusion": true,
      "supportsFuzzyMatch": true
    },
    {
      "name": "programType",
      "type": "string[]",
      "display": "Program Type",
      "description": "Filter based on the type of program",
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
      "description": "Filter based on the state code",
      "supportsExclusion": true,
      "options": {
        "query": {
          "sqlQuery": "SELECT DISTINCT \"stateCode\" FROM \"Grants\" WHERE \"stateCode\" IS NOT NULL ORDER BY 1",
          "column": "stateCode"
        }
      }
    },
    {
      "name": "region",
      "type": "integer[]",
      "display": "Region IDs",
      "description": "Filter based on region identifiers",
      "options": {
        "staticValues": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      }
    },
    {
      "name": "group",
      "type": "integer[]",
      "display": "Group",
      "description": "Filter based on group membership",
      "supportsExclusion": true
    },
    {
      "name": "currentUserId",
      "type": "integer[]",
      "display": "Current User",
      "description": "Filter based on the current user ID",
      "supportsExclusion": true
    },
    {
      "name": "createDate",
      "type": "date[]",
      "display": "Creation Date",
      "description": "Filter based on the date range of creation",
      "supportsExclusion": true
    },
    {
      "name": "activityReportGoalResponse",
      "type": "string[]",
      "display": "Activity Report Goal Response",
      "description": "Filter based on goal field responses in activity reports",
      "supportsExclusion": true
    },
    {
      "name": "status",
      "type": "string[]",
      "display": "Goal Status",
      "description": "Filter based on goal status",
      "supportsExclusion": true
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
    group_filter TEXT := NULLIF(current_setting('ssdi.group', true), '');
    current_user_id_filter TEXT := NULLIF(current_setting('ssdi.currentUserId', true), '');
    create_date_filter TEXT := NULLIF(current_setting('ssdi.createDate', true), '');
    activity_report_goal_response_filter TEXT := NULLIF(current_setting('ssdi.activityReportGoalResponse', true), '');
    goal_status_filter TEXT := NULLIF(current_setting('ssdi.status', true), '');

    -- Declare `.not` variables
    recipient_not_filter BOOLEAN := COALESCE(current_setting('ssdi.recipient.not', true), 'false') = 'true';
    program_type_not_filter BOOLEAN := COALESCE(current_setting('ssdi.programType.not', true), 'false') = 'true';
    grant_numbers_not_filter BOOLEAN := COALESCE(current_setting('ssdi.grantNumber.not', true), 'false') = 'true';
    state_code_not_filter BOOLEAN := COALESCE(current_setting('ssdi.stateCode.not', true), 'false') = 'true';
    region_ids_not_filter BOOLEAN := COALESCE(current_setting('ssdi.region.not', true), 'false') = 'true';
    group_not_filter BOOLEAN := COALESCE(current_setting('ssdi.group.not', true), 'false') = 'true';
    current_user_id_not_filter BOOLEAN := COALESCE(current_setting('ssdi.currentUserId.not', true), 'false') = 'true';
    create_date_not_filter BOOLEAN := COALESCE(current_setting('ssdi.createDate.not', true), 'false') = 'true';
    activity_report_goal_response_not_filter BOOLEAN := COALESCE(current_setting('ssdi.activityReportGoalResponse.not', true), 'false') = 'true';
    goal_status_not_filter BOOLEAN := COALESCE(current_setting('ssdi.status.not', true), 'false') = 'true';

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
-- Step 1.2: If grant filters active, delete from filtered_grants any grants filtered grants
  IF
    recipient_filter IS NOT NULL OR
    program_type_filter IS NOT NULL OR
    grant_numbers_filter IS NOT NULL OR
    state_code_filter IS NOT NULL OR
    region_ids_filter IS NOT NULL
  THEN
  raise notice 'applying filter';
    WITH
      applied_filtered_grants AS (
        SELECT
          gr.id
        FROM filtered_grants fgr
        JOIN "Grants" gr
        ON fgr.id = gr.id
        JOIN "Recipients" r
        ON gr."recipientId" = r.id
        -- Filter for recipients if ssdi.recipients is defined
        AND (
          recipient_filter IS NULL
          OR (
          EXISTS (
            SELECT 1
            FROM json_array_elements_text(COALESCE(recipient_filter, '[]')::json) AS value
            WHERE r.name ~* value::text
          ) != recipient_not_filter
          )
        )
        JOIN "Programs" p
        ON gr.id = p."grantId"
        -- Filter for programType if ssdi.programType is defined
        AND (
          program_type_filter IS NULL
          OR (
            COALESCE(program_type_filter, '[]')::jsonb @> to_jsonb(p."programType") != program_type_not_filter
          )
        )
        WHERE 1 = 1
        -- Filter for grantNumbers if ssdi.grantNumbers is defined
        AND (
          grant_numbers_filter IS NULL
          OR (
          EXISTS (
            SELECT 1
            FROM json_array_elements_text(COALESCE(grant_numbers_filter, '[]')::json) AS value
            WHERE gr.number ~* value::text
          ) != grant_numbers_not_filter
          )
        )
        -- Filter for stateCode if ssdi.stateCode is defined
        AND (
          state_code_filter IS NULL
          OR (
            COALESCE(state_code_filter, '[]')::jsonb @> to_jsonb(gr."stateCode") != state_code_not_filter
          )
        )
        -- Filter for regionIds if ssdi.regionIds is defined
        AND (
          region_ids_filter IS NULL
          OR (
            COALESCE(region_ids_filter, '[]')::jsonb @> to_jsonb(gr."regionId")::jsonb
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
      SELECT
        'Apply Grant Filters' AS action,
        COUNT(*)
      FROM delete_from_grant_filter
      GROUP BY 1;
  END IF;
---------------------------------------------------------------------------------------------------
-- Step 1.3: If grant filters active, delete from filtered_grants any grants filtered grants
  IF
    group_filter IS NOT NULL OR
    current_user_id_filter IS NOT NULL
  THEN
    WITH
      applied_filtered_grants AS (
        SELECT
          gr.id
        FROM filtered_grants fgr
        JOIN "Grants" gr
        ON fgr.id = gr.id
        LEFT JOIN "GroupGrants" gg
        ON gr.id = gg."grantId"
        LEFT JOIN "Groups" g
        ON gg."groupId" = g.id
        -- Filter for group if ssdi.group is defined
        AND (
          group_filter IS NULL
          OR (
            COALESCE(group_filter, '[]')::jsonb @> to_jsonb(g.id) != group_not_filter
          )
        )
        LEFT JOIN "GroupCollaborators" gc
        ON g.id = gc."groupId"
        AND gc."deletedAt" IS NULL
        -- Filter for userId if ssdi.currentUserId is defined
        AND (
          current_user_id_filter IS NULL
          OR (
            COALESCE(current_user_id_filter, '[]')::jsonb @> to_jsonb(gc."userId")::jsonb
          )
        )
        WHERE 1 = 1
        -- Continued Filter for group if ssdi.group is defined from left joined table above
        AND (group_filter IS NULL OR (g.id IS NOT NULL AND (gc.id IS NOT NULL OR g."sharedWith" = 'Everyone')))
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
      SELECT
        'Apply Grant Filters' AS action,
        COUNT(*)
      FROM delete_from_grant_filter
      GROUP BY 1;
  END IF;
---------------------------------------------------------------------------------------------------
-- Step 2.1: Seed filtered_goals using filtered_grants
  -- DROP TABLE IF EXISTS filtered_goals;
  CREATE TEMP TABLE IF NOT EXISTS filtered_goals (id INT);

  WITH seed_filtered_goals AS (
      INSERT INTO filtered_goals (id)
      SELECT
        g.id
      FROM "Goals" g
      JOIN filtered_grants fgr
      ON g."grantId" = fgr.id
      WHERE g."deletedAt" IS NULL
      AND g."mapsToParentGoalId" IS NULL
      GROUP BY 1
      ORDER BY 1
      RETURNING id
  )
  INSERT INTO process_log (action, record_cnt)
  SELECT
      'Seed filtered_goals' AS action,
      COUNT(*)
  FROM seed_filtered_goals
  GROUP BY 1;
---------------------------------------------------------------------------------------------------
-- Step 2.2 If grant filters active, delete from filtered_goals for any goals filtered, delete from filtered_grants using filtered_goals
    IF
        create_date_filter IS NOT NULL OR
        goal_status_filter IS NOT NULL OR
        activity_report_goal_response_filter IS NOT NULL
    THEN
    WITH
      applied_filtered_goals AS (
        SELECT
          g.id
        FROM filtered_goals fg
        JOIN "Goals" g
        ON fg.id = g.id
        -- Filter for createDate dates between two values if ssdi.createDate is defined
        AND (
          create_date_filter IS NULL
          OR (
          g."createdAt"::date <@ (
            SELECT
            CONCAT(
              '[', MIN(value::timestamp), ',', 
              COALESCE(NULLIF(MAX(value::timestamp), MIN(value::timestamp)), NOW()::timestamp), ')'
            )::daterange AS my_array
            FROM json_array_elements_text(COALESCE(create_date_filter, '[]')::json) AS value
          ) != create_date_not_filter
          )
        )
        -- Filter for status if ssdi.status is defined
        AND (
          goal_status_filter IS NULL
          OR (
            g.status IN (
              SELECT value
              FROM json_array_elements_text(COALESCE(goal_status_filter, '[]')::json) AS value
            ) != goal_status_not_filter
          )
        )
        LEFT JOIN "GoalFieldResponses" gfr
        ON g.id = gfr."goalId"
        AND g."goalTemplateId" = 19017
        -- Filter for activityReportGoalResponse if ssdi.activityReportGoalResponse is defined, for array columns
        AND (
          activity_report_goal_response_filter IS NULL
          OR (
          (gfr."response" && ARRAY(
            SELECT value::text
            FROM json_array_elements_text(
            COALESCE(activity_report_goal_response_filter, '[]')::json
            )
          )) != activity_report_goal_response_not_filter
          )
        )
        WHERE 1 = 1
        -- Continued Filter for activityReportGoalResponse if ssdi.activityReportGoalResponse is defined, for array columns
        AND (activity_report_goal_response_filter IS NULL OR gfr.id IS NOT NULL)
        GROUP BY 1
        ORDER BY 1
      ),
        applied_filtered_out_goals AS (
            SELECT
              fg.id
            FROM filtered_goals fg
            LEFT JOIN applied_filtered_goals afg ON fg.id = afg.id
            GROUP BY 1
            HAVING COUNT(afg.id) = 0
            ORDER BY 1
        ),
        delete_from_goal_filter AS (
            DELETE FROM filtered_goals fg
            USING applied_filtered_out_goals afog
            WHERE fg.id = afog.id
            RETURNING fg.id
        ),
        applied_filtered_out_grants AS (
            SELECT
              fgr.id
            FROM filtered_grants fgr
            LEFT JOIN "Goals" g ON fgr.id = g."grantId"
            LEFT JOIN filtered_goals fg ON g.id = fg.id
            GROUP BY 1
            HAVING COUNT(fg.id) = 0
            ORDER BY 1
        ),
        delete_from_grant_filter AS (
            DELETE FROM filtered_grants fgr
            USING applied_filtered_out_grants afog
            WHERE fgr.id = afog.id
            RETURNING fgr.id
        )
      INSERT INTO process_log (action, record_cnt)
      SELECT
        'Apply Goal Filters' AS action,
        COUNT(*)
      FROM delete_from_goal_filter
      GROUP BY 1
      UNION
      SELECT
        'Apply Goal Filters To Grants' AS action,
        COUNT(*)
      FROM delete_from_grant_filter
      GROUP BY 1;
  END IF;
END $$;
---------------------------------------------------------------------------------------------------

WITH
  has_current_grant AS (
    SELECT
      "recipientId" rid,
      BOOL_OR(status = 'Active') has_current_active_grant
    FROM "Grants"
    GROUP BY 1
  ),
  with_fei AS (
    SELECT
      r.id,
      COUNT(DISTINCT fg.id) FILTER (WHERE COALESCE(g."goalTemplateId",0) = 19017) > 0 has_fei,
      COUNT(DISTINCT gr.id) FILTER (WHERE COALESCE(g."goalTemplateId",0) = 19017 AND fg.id IS NOT NULL) grant_count
    FROM "Recipients" r
    JOIN has_current_grant hcg
    ON r.id = hcg.rid
    JOIN "Grants" gr
    ON r.id = gr."recipientId"
    JOIN filtered_grants fgr
    ON gr.id = fgr.id
    LEFT JOIN "Goals" g
    ON gr.id = g."grantId"
    LEFT JOIN filtered_goals fg
    ON g.id = fg.id
    WHERE hcg.has_current_active_grant
    AND g."deletedAt" IS NULL
    AND g."mapsToParentGoalId" IS NULL
    GROUP BY 1
  ),
  with_fei_widget AS (
    SELECT
      (COALESCE((COUNT(DISTINCT wf.id) FILTER (WHERE has_fei)::decimal/
      NULLIF(COUNT(DISTINCT wf.id),0)),0)*100)::decimal(5,2) "% recipients with fei",
      COUNT(DISTINCT wf.id) FILTER (WHERE wf.has_fei) "recipients with fei",
      COUNT(DISTINCT wf.id) total,
      COALESCE(SUM(grant_count),0) "grants with fei"
    FROM with_fei wf
  ),
  
  -- Add active filters collection here
  active_filters_array AS (
    SELECT ARRAY_REMOVE(ARRAY[
      CASE WHEN NULLIF(current_setting('ssdi.recipients', true), '') IS NOT NULL THEN 'recipients' END,
      CASE WHEN NULLIF(current_setting('ssdi.programType', true), '') IS NOT NULL THEN 'programType' END,
      CASE WHEN NULLIF(current_setting('ssdi.grantNumbers', true), '') IS NOT NULL THEN 'grantNumbers' END,
      CASE WHEN NULLIF(current_setting('ssdi.stateCode', true), '') IS NOT NULL THEN 'stateCode' END,
      CASE WHEN NULLIF(current_setting('ssdi.regionIds', true), '') IS NOT NULL THEN 'regionIds' END,
      CASE WHEN NULLIF(current_setting('ssdi.group', true), '') IS NOT NULL THEN 'group' END,
      CASE WHEN NULLIF(current_setting('ssdi.currentUserId', true), '') IS NOT NULL THEN 'currentUserId' END,
      CASE WHEN NULLIF(current_setting('ssdi.createDate', true), '') IS NOT NULL THEN 'createDate' END,
      CASE WHEN NULLIF(current_setting('ssdi.activityReportGoalResponse', true), '') IS NOT NULL THEN 'activityReportGoalResponse' END
    ], NULL) AS active_filters
  ),
  
  with_fei_page AS (
    SELECT
      r.id "recipientId",
      r.name "recipientName",
      gr.number "grantNumber",
      gr."regionId",
      g.id "goalId",
      g."createdAt",
      g.status "goalStatus",
      gfr.response "rootCause"
    FROM with_fei wf
    JOIN "Recipients" r
    ON wf.id = r.id
    AND has_fei
    JOIN "Grants" gr
    ON r.id = gr."recipientId"
    JOIN filtered_grants fgr
    ON gr.id = fgr.id
    JOIN "Goals" g
    ON gr.id = g."grantId"
    AND g."goalTemplateId" = 19017
    JOIN filtered_goals fg
    ON g.id = fg.id
    LEFT JOIN "GoalFieldResponses" gfr
    ON g.id = gfr."goalId"
    WHERE 1 = 1
    AND g."deletedAt" IS NULL
    AND g."mapsToParentGoalId" IS NULL
  ),
  with_fei_graph AS (
    SELECT
        wfpr.response,
        COUNT(*) AS response_count,
        ROUND(COALESCE(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (),0),0), 0)::decimal(5,2) AS percentage
    FROM with_fei_page wfp
    CROSS JOIN UNNEST(wfp."rootCause") wfpr(response)
    GROUP BY 1
  ),
  datasets AS (
    SELECT
    'with_fei_widget' data_set,
    COUNT(*) records,
    JSONB_AGG(JSONB_BUILD_OBJECT(
      '% recipients with fei', "% recipients with fei",
      'recipients with fei', "recipients with fei",
      'total', total,
      'grants with fei', "grants with fei"
    )) AS data,
    af.active_filters
    FROM with_fei_widget
    CROSS JOIN active_filters_array af
    GROUP BY af.active_filters
    
    UNION
    
    SELECT
      'with_fei_page' data_set,
      COUNT(*) records,
      JSONB_AGG(JSONB_BUILD_OBJECT(
        'recipientId', "recipientId",
        'recipientName', "recipientName",
        'grantNumber', "grantNumber",
        'region id', "regionId",
        'goalId', "goalId",
        'createdAt', "createdAt",
        'goalStatus', "goalStatus",
        'rootCause', "rootCause"
      )) AS data,
      af.active_filters
    FROM with_fei_page
    CROSS JOIN active_filters_array af
    GROUP BY af.active_filters
    
    UNION

    SELECT
      'with_fei_page' data_set,
      0 records,
     '[]'::JSONB,
      af.active_filters  -- Use precomputed active_filters
    FROM active_filters_array af
    GROUP BY af.active_filters
    
    UNION
    
    SELECT
    'with_fei_graph' data_set,
    COUNT(*) records,
    JSONB_AGG(JSONB_BUILD_OBJECT(
      'rootCause', "response",
      'response_count', "response_count",
      'percentage', "percentage"
    )) AS data,
    af.active_filters
    FROM with_fei_graph
    CROSS JOIN active_filters_array af
    GROUP BY af.active_filters
    
    UNION

    SELECT
      'with_fei_graph' data_set,
      0 records,
     '[]'::JSONB,
      af.active_filters  -- Use precomputed active_filters
    FROM active_filters_array af
    GROUP BY af.active_filters
    
    UNION
    
    SELECT
      'process_log' data_set,
      COUNT(*) records,
      JSONB_AGG(JSONB_BUILD_OBJECT(
        'action', action,
        'record_cnt', record_cnt
      )) AS data,
      af.active_filters
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
