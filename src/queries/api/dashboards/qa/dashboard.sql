/* 
JSON: {
  "name": "QA Dashboard: dashboard",
  "description": {
    "standard": "Aggregated data for delivery methods and roles in activity reports.",
    "technical": "Filters and aggregates data for reporting on delivery methods and user roles from activity reports."
  },
  "output": {
    "defaultName": "qa_dashboard",
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
        "name": "delivery_method_graph",
        "defaultName": "Delivery Method Graph",
        "description": "Aggregated data showing the number and percentage of activity reports by delivery method.",
        "schema": [
          {
            "columnName": "month",
            "type": "date",
            "nullable": false,
            "description": "The month of the activity report."
          },
          {
            "columnName": "in_person_count",
            "type": "number",
            "nullable": false,
            "description": "The count of in-person activity reports."
          },
          {
            "columnName": "virtual_count",
            "type": "number",
            "nullable": false,
            "description": "The count of virtual activity reports."
          },
          {
            "columnName": "hybrid_count",
            "type": "number",
            "nullable": false,
            "description": "The count of hybrid activity reports."
          },
          {
            "columnName": "in_person_percentage",
            "type": "decimal",
            "nullable": false,
            "description": "The percentage of in-person activity reports."
          },
          {
            "columnName": "virtual_percentage",
            "type": "decimal",
            "nullable": false,
            "description": "The percentage of virtual activity reports."
          },
          {
            "columnName": "hybrid_percentage",
            "type": "decimal",
            "nullable": false,
            "description": "The percentage of hybrid activity reports."
          }
        ]
      },
      {
        "name": "role_graph",
        "defaultName": "Role Graph",
        "description": "Aggregated data showing the roles of creators in activity reports and their respective counts and percentages.",
        "schema": [
          {
            "columnName": "role_name",
            "type": "string",
            "nullable": false,
            "description": "The name of the role associated with the activity report creator."
          },
          {
            "columnName": "role_count",
            "type": "number",
            "nullable": false,
            "description": "The count of activity reports created by users with this role."
          },
          {
            "columnName": "percentage",
            "type": "decimal",
            "nullable": false,
            "description": "The percentage of activity reports created by users with this role."
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
      "name": "recipients",
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
      "name": "grantNumbers",
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
      "name": "regionIds",
      "type": "integer[]",
      "display": "Region IDs",
      "description": "Filter based on region identifiers.",
      "options": {
        "staticValues": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      }
    },
    {
      "name": "group",
      "type": "string[]",
      "display": "Group",
      "description": "Filter based on group membership.",
      "supportsExclusion": true
    },
    {
      "name": "currentUserId",
      "type": "integer[]",
      "display": "Current User",
      "description": "Filter based on the current user ID.",
      "supportsExclusion": true
    },
    {
      "name": "createDate",
      "type": "date[]",
      "display": "Creation Date",
      "description": "Filter based on the date range of creation.",
      "supportsExclusion": true
    },
    {
      "name": "activityReportGoalResponse",
      "type": "string[]",
      "display": "Activity Report Goal Response",
      "description": "Filter based on goal field responses in activity reports.",
      "supportsExclusion": true
    }
  ]
}
*/
DO $$
DECLARE
    -- Declare filter variables
    recipient_filter TEXT := NULLIF(current_setting('ssdi.recipients', true), '');
    program_type_filter TEXT := NULLIF(current_setting('ssdi.programType', true), '');
    grant_numbers_filter TEXT := NULLIF(current_setting('ssdi.grantNumbers', true), '');
    state_code_filter TEXT := NULLIF(current_setting('ssdi.stateCode', true), '');
    region_ids_filter TEXT := NULLIF(current_setting('ssdi.regionIds', true), '');
    group_filter TEXT := NULLIF(current_setting('ssdi.group', true), '');
    current_user_id_filter TEXT := NULLIF(current_setting('ssdi.currentUserId', true), '');
    goal_name_filter TEXT := NULLIF(current_setting('ssdi.goalName', true), '');
    create_date_filter TEXT := NULLIF(current_setting('ssdi.createDate', true), '');
    activity_report_goal_response_filter TEXT := NULLIF(current_setting('ssdi.activityReportGoalResponse', true), '');
    start_date_filter TEXT := NULLIF(current_setting('ssdi.startDate', true), '');
    end_date_filter TEXT := NULLIF(current_setting('ssdi.endDate', true), '');
    reason_filter TEXT := NULLIF(current_setting('ssdi.reason', true), '');
    target_populations_filter TEXT := NULLIF(current_setting('ssdi.targetPopulations', true), '');
    tta_type_filter TEXT := NULLIF(current_setting('ssdi.ttaType', true), '');
    report_text_filter TEXT := NULLIF(current_setting('ssdi.reportText', true), '');
    topic_filter TEXT := NULLIF(current_setting('ssdi.topic', true), '');
    recipient_single_or_multi_filter TEXT := NULLIF(current_setting('ssdi.recipientSingleOrMulti', true), '');
    roles_filter TEXT := NULLIF(current_setting('ssdi.roles', true), '');

    -- Declare `.not` variables
    recipient_not_filter BOOLEAN := COALESCE(current_setting('ssdi.recipients.not', true), 'false') = 'true';
    program_type_not_filter BOOLEAN := COALESCE(current_setting('ssdi.programType.not', true), 'false') = 'true';
    grant_numbers_not_filter BOOLEAN := COALESCE(current_setting('ssdi.grantNumbers.not', true), 'false') = 'true';
    state_code_not_filter BOOLEAN := COALESCE(current_setting('ssdi.stateCode.not', true), 'false') = 'true';
    region_ids_not_filter BOOLEAN := COALESCE(current_setting('ssdi.regionIds.not', true), 'false') = 'true';
    group_not_filter BOOLEAN := COALESCE(current_setting('ssdi.group.not', true), 'false') = 'true';
    current_user_id_not_filter BOOLEAN := COALESCE(current_setting('ssdi.currentUserId.not', true), 'false') = 'true';
    goal_name_not_filter BOOLEAN := COALESCE(current_setting('ssdi.goalName.not', true), 'false') = 'true';
    create_date_not_filter BOOLEAN := COALESCE(current_setting('ssdi.createDate.not', true), 'false') = 'true';
    activity_report_goal_response_not_filter BOOLEAN := COALESCE(current_setting('ssdi.activityReportGoalResponse.not', true), 'false') = 'true';
    start_date_not_filter BOOLEAN := COALESCE(current_setting('ssdi.startDate.not', true), 'false') = 'true';
    end_date_not_filter BOOLEAN := COALESCE(current_setting('ssdi.endDate.not', true), 'false') = 'true';
    reason_not_filter BOOLEAN := COALESCE(current_setting('ssdi.reason.not', true), 'false') = 'true';
    target_populations_not_filter BOOLEAN := COALESCE(current_setting('ssdi.targetPopulations.not', true), 'false') = 'true';
    tta_type_not_filter BOOLEAN := COALESCE(current_setting('ssdi.ttaType.not', true), 'false') = 'true';
    report_text_not_filter BOOLEAN := COALESCE(current_setting('ssdi.reportText.not', true), 'false') = 'true';
    topic_not_filter BOOLEAN := COALESCE(current_setting('ssdi.topic.not', true), 'false') = 'true';
    recipient_single_or_multi_not_filter BOOLEAN := COALESCE(current_setting('ssdi.recipientSingleOrMulti.not', true), 'false') = 'true';
    roles_not_filter BOOLEAN := COALESCE(current_setting('ssdi.roles.not', true), 'false') = 'true';

BEGIN
---------------------------------------------------------------------------------------------------
-- Step 0.1: make a table to hold applied filters
  -- DROP TABLE IF EXISTS process_log;
  CREATE TEMP TABLE IF NOT EXISTS process_log(
    action TEXT,
    record_cnt int,
    occured_at TIMESTAMP DEFAULT NOW()
  );
---------------------------------------------------------------------------------------------------
-- Step 1.1: Seed filtered_grants
  -- DROP TABLE IF EXISTS filtered_grants;
  CREATE TEMP TABLE IF NOT EXISTS filtered_grants (id INT);

  WITH seed_filtered_grants AS (
      INSERT INTO filtered_grants (id)
      SELECT DISTINCT id
      FROM "Grants"
      WHERE COALESCE(deleted, false) = false
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
-- Step 1.2: If grant filters active, delete from filtered_grants any grarnts filtered grants
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
        ORDER BY 1
      ),
      applied_filtered_out_grants AS (
        SELECT
          fgr.id
        FROM filtered_grants fgr
        LEFT JOIN applied_filtered_grants afgr
              ON fgr.id = afgr.id
            WHERE afgr.id IS NULL
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
-- Step 1.3: If grant filters active, delete from filtered_grants any grarnts filtered grants
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
            COALESCE(group_filter, '[]')::jsonb @> to_jsonb(g.name) != group_not_filter
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
        AND (group_filter IS NULL OR (g.id IS NOT NULL AND gc.id IS NOT NULL))
        ORDER BY 1
      ),
      applied_filtered_out_grants AS (
        SELECT
          fgr.id
        FROM filtered_grants fgr
        LEFT JOIN applied_filtered_grants afgr
              ON fgr.id = afgr.id
            WHERE afgr.id IS NULL
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
      SELECT DISTINCT g.id
      FROM "Goals" g
      JOIN filtered_grants fgr
      ON g."grantId" = fgr.id
      WHERE g."deletedAt" IS NULL
      AND g."mapsToParentGoalId" IS NULL
      ORDER BY g.id  -- Add ORDER BY here
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
        goal_name_filter IS NOT NULL OR
        create_date_filter IS NOT NULL OR
        activity_report_goal_response_filter IS NOT NULL
    THEN
    WITH
      applied_filtered_goals AS (
        SELECT DISTINCT
          g.id
        FROM filtered_goals fg
        JOIN "Goals" g
        ON fg.id = g.id
        -- Filter for name if ssdi.goalName is defined
        AND (
          goal_name_filter IS NULL
          OR (
          EXISTS (
            SELECT 1
            FROM json_array_elements_text(
            COALESCE(goal_name_filter, '[]')::json
            ) AS value
            WHERE g.name ~* value::text
          ) != goal_name_not_filter
          )
        )
        -- Filter for createDate dates between two values if ssdi.createDate is defined
        AND (
          create_date_filter IS NULL
          OR (
          g."createdAt"::date <@ (
            SELECT
            CONCAT(
              '[',
              MIN(value::timestamp),
              ',',
              COALESCE(NULLIF(MAX(value::timestamp), MIN(value::timestamp)), NOW()::timestamp),
              ')'
            )::daterange AS my_array
            FROM json_array_elements_text(
            COALESCE(create_date_filter, '[]')::json
            ) AS value
          ) != create_date_not_filter
          )
        )
        LEFT JOIN "GoalFieldResponses" gfr
        ON g.id = gfr."goalId"
        -- Real FEI goal is in the production DATABASE with an id of 19017 in the GoalTemplates table
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
      ),
        applied_filtered_out_goals AS (
            SELECT
                fg.id
            FROM filtered_goals fg
            LEFT JOIN applied_filtered_goals afg
            ON fg.id = afg.id
            WHERE afg.id IS NULL
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
            LEFT JOIN "Goals" g
            ON fgr.id = g."grantId"
            LEFT JOIN filtered_goals fg
            ON g.id = fg.id
            WHERE fg.id IS NULL
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
---------------------------------------------------------------------------------------------------
-- Step 3.1: Seed filterd_activity_reports
  -- DROP TABLE IF EXISTS filtered_activity_reports;
  CREATE TEMP TABLE IF NOT EXISTS filtered_activity_reports (id INT);

  WITH seed_filtered_activity_reports AS (
      INSERT INTO filtered_activity_reports (id)
      SELECT DISTINCT
          a.id
      FROM "ActivityReports" a
      JOIN "ActivityRecipients" ar
          ON a.id = ar."activityReportId"
      JOIN filtered_grants fgr
          ON ar."grantId" = fgr.id
      JOIN "ActivityReportGoals" arg
          ON a.id = arg."activityReportId"
      JOIN filtered_goals fg
          ON arg."goalId" = fg.id
      WHERE a."calculatedStatus" = 'approved'
      ORDER BY a.id  -- Add ORDER BY here
      RETURNING
      id
  )
  INSERT INTO process_log (action, record_cnt)
  SELECT
      'Seed filtered_activity_reports' AS action,
      COUNT(*)
  FROM seed_filtered_activity_reports
  GROUP BY 1;
---------------------------------------------------------------------------------------------------
-- Step 3.2: If activity reports filters (set 1), delete from filtered_activity_reports for any activity reports filtered, delete from filtered_goals using filterd_activity_reports, delete from filtered_grants using filtered_goals
    IF
        start_date_filter IS NOT NULL OR
        end_date_filter IS NOT NULL OR
        reason_filter IS NOT NULL OR
        target_populations_filter IS NOT NULL OR
        tta_type_filter IS NOT NULL
    THEN
    WITH
      applied_filtered_activity_reports AS (
        SELECT
          a.id "activityReportId"
        FROM filtered_activity_reports fa
        JOIN "ActivityReports" a
        ON fa.id = a.id
        WHERE a."calculatedStatus" = 'approved'
        -- Filter for startDate dates between two values if ssdi.startDate is defined
        AND (
          start_date_filter IS NULL
          OR (
          a."startDate"::date <@ (
            SELECT CONCAT(
            '[', MIN(value::timestamp), ',',
            COALESCE(NULLIF(MAX(value::timestamp), MIN(value::timestamp)), NOW()::timestamp), ')'
            )::daterange
            FROM json_array_elements_text(
            COALESCE(start_date_filter, '[]')::json
            ) AS value
          ) != start_date_not_filter
          )
        )
        -- Filter for endDate dates between two values if ssdi.endDate is defined
        AND (
          end_date_filter IS NULL
          OR (
          a."endDate"::date <@ (
            SELECT CONCAT(
            '[', MIN(value::timestamp), ',',
            COALESCE(NULLIF(MAX(value::timestamp), MIN(value::timestamp)), NOW()::timestamp), ')'
            )::daterange
            FROM json_array_elements_text(COALESCE(end_date_filter, '[]')::json) AS value
          ) != end_date_not_filter
          )
        )
        -- Filter for reason if ssdi.reason is defined, for array columns
        AND (
          reason_filter IS NULL
          OR (
          (a."reason"::string[] && ARRAY(
            SELECT value::text
            FROM json_array_elements_text(COALESCE(reason_filter, '[]')::json)
          )) != reason_not_filter
          )
        )
        -- Filter for targetPopulations if ssdi.targetPopulations is defined, for array columns
        AND (
          target_populations_filter IS NULL
          OR (
          (a."targetPopulations"::string[] && ARRAY(
            SELECT value::text
            FROM json_array_elements_text(COALESCE(target_populations_filter, '[]')::json)
          )) != target_populations_not_filter
          )
        )
        -- Filter for ttaType where both column and filter are jsonb arrays and compare them ignoring order
        AND (
          tta_type_filter IS NULL
          OR (
          (
            a."ttaType"::string[] @> ARRAY(
            SELECT value::text
            FROM json_array_elements_text(COALESCE(tta_type_filter, '[]')::json)
            )
            AND a."ttaType"::string[] <@ ARRAY(
            SELECT value::text
            FROM json_array_elements_text(COALESCE(tta_type_filter, '[]')::json)
            )
          ) != tta_type_not_filter
          )
        )
      ),
        applied_filtered_out_activity_reports AS (
            SELECT
                fa.id
            FROM filtered_activity_reports fa
            LEFT JOIN applied_filtered_activity_reports afa
            ON fa.id = afa."activityReportId"
            WHERE afa."activityReportId" IS NULL
            ORDER BY 1
        ),
        delete_from_activity_report_filter AS (
            DELETE FROM filtered_activity_reports fa
            USING applied_filtered_out_activity_reports afaoar
            WHERE fa.id = afaoar.id
            RETURNING fa.id
        ),
        applied_filtered_out_goals AS (
            SELECT
                fg.id
            FROM filtered_goals fg
            LEFT JOIN "ActivityReportGoals" arg
            ON fg.id = arg."goalId"
            LEFT JOIN filtered_activity_reports fa
            ON arg."activityReportId" = fa.id
            WHERE fa.id IS NULL
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
            LEFT JOIN "Goals" g
            ON fgr.id = g."grantId"
            LEFT JOIN filtered_goals fg
            ON g.id = fg.id
            WHERE fg.id IS NULL
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
        'Apply Activity Report Filters' AS action,
        COUNT(*)
      FROM delete_from_activity_report_filter
      GROUP BY 1
      UNION
      SELECT
        'Apply Activity Report Filters To Goals' AS action,
        COUNT(*)
      FROM delete_from_goal_filter
      GROUP BY 1
      UNION
      SELECT
        'Apply Activity Report Filters To Grants' AS action,
        COUNT(*)
      FROM delete_from_grant_filter
      GROUP BY 1;
  END IF;
---------------------------------------------------------------------------------------------------
-- Step 3.3: If activity reports filters (set 2), delete from filtered_activity_reports for any activity reports filtered, delete from filtered_goals using filterd_activity_reports, delete from filtered_grants using filtered_goals
  IF
        report_text_filter IS NOT NULL OR
    topic_filter IS NOT NULL
    THEN
    WITH
      applied_filtered_activity_reports AS (
      SELECT DISTINCT
        a.id
      FROM filtered_activity_reports fa
      JOIN "ActivityReports" a
      ON fa.id = a.id
      JOIN "ActivityReportGoals" arg
      ON a.id = arg."activityReportId"
      JOIN filterd_goals fg
      ON arg."goalId" = fg.id
      JOIN "ActivityReportObjectives" aro
      ON a.id = aro."activityReportId"
      JOIN "Objectives" o
      ON aro."objectiveId" = o.id
      AND arg."goalId" = o."goalId"
      JOIN "ActivityReportObjectiveTopics" arot
      ON aro.id = arot."activityReportObjectiveId"
      JOIN "Topics" t
      ON arot."topicId" = t.id
      JOIN "NextSteps" ns
      ON a.id = ns."activityReportId"
      WHERE 1 = 1
      -- Filter for reportText if ssdi.reportText is defined
      AND (
        report_text_filter IS NULL
        OR (
        EXISTS (
          SELECT 1
          FROM json_array_elements_text(COALESCE(report_text_filter, '[]')::json) AS value
          WHERE CONCAT(a.context, '\n', arg.name, '\n', aro.title, '\n', aro."ttaProvided", '\n', ns.note) ~* value::text
        ) != report_text_not_filter
        )
      )
      -- Filter for topic if ssdi.topic is defined
      AND (
        topic_filter IS NULL
        OR (
          COALESCE(topic_filter, '[]')::jsonb @> to_jsonb(t.name) != topic_not_filter
        )
      )
      ),
        applied_filtered_out_activity_reports AS (
            SELECT
                fa.id
            FROM filtered_activity_reports fa
            LEFT JOIN applied_filtered_activity_reports afa
            ON fa.id = afa."activityReportId"
            WHERE afa."activityReportId" IS NULL
            ORDER BY 1
        ),
        delete_from_activity_report_filter AS (
            DELETE FROM filtered_activity_reports fa
            USING applied_filtered_out_activity_reports afaoar
            WHERE fa.id = afaoar.id
            RETURNING fa.id
        ),
        applied_filtered_out_goals AS (
            SELECT
                fg.id
            FROM filtered_goals fg
            LEFT JOIN "ActivityReportGoals" arg
            ON fg.id = arg."goalId"
            LEFT JOIN filtered_activity_reports fa
            ON arg."activityReportId" = fa.id
            WHERE fa.id IS NULL
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
            LEFT JOIN "Goals" g
            ON fgr.id = g."grantId"
            LEFT JOIN filtered_goals fg
            ON g.id = fg.id
            WHERE fg.id IS NULL
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
        'Apply Activity Report Filters' AS action,
        COUNT(*)
      FROM delete_from_activity_report_filter
      GROUP BY 1
      UNION
      SELECT
        'Apply Activity Report Filters To Goals' AS action,
        COUNT(*)
      FROM delete_from_goal_filter
      GROUP BY 1
      UNION
      SELECT
        'Apply Activity Report Filters To Grants' AS action,
        COUNT(*)
      FROM delete_from_grant_filter
      GROUP BY 1;
  END IF;
---------------------------------------------------------------------------------------------------
-- Step 3.2: If activity reports filters (set 3), delete from filtered_activity_reports for any activity reports filtered, delete from filtered_goals using filterd_activity_reports, delete from filtered_grants using filtered_goals
  IF
        recipient_single_or_multi_filter IS NOT NULL
    THEN
    WITH
      applied_filtered_activity_reports AS (
        SELECT DISTINCT
          a.id
        FROM filtered_activity_reports fa
        JOIN "ActivityReports" a
        ON fa.id = a.id
        JOIN "ActivityRecipients" ar
        ON a.id = ar."activityReportId"
        JOIN "Grants" gr
        ON ar."grantId" = gr.id
        JOIN "Recipients" r
        ON gr."recipientId" = r.id
        GROUP BY 1
        HAVING 1 = 1
        -- Filter for recipientSingleOrMulti if ssdi.recipientSingleOrMulti is defined
        AND
        (
          recipient_single_or_multi_filter IS NULL
          OR (
          (COUNT(DISTINCT COALESCE(NULLIF(r."uei", ''), r."name")) = 1)
          =
          ('["single-recipient"]'::jsonb @> COALESCE(recipient_single_or_multi_filter, '[]')::jsonb)
          ) != recipient_single_or_multi_not_filter
        )

      ),
        applied_filtered_out_activity_reports AS (
            SELECT
                fa.id
            FROM filtered_activity_reports fa
            LEFT JOIN applied_filtered_activity_reports afa
            ON fa.id = afa."activityReportId"
            WHERE afa."activityReportId" IS NULL
            ORDER BY 1
        ),
        delete_from_activity_report_filter AS (
            DELETE FROM filtered_activity_reports fa
            USING applied_filtered_out_activity_reports afaoar
            WHERE fa.id = afaoar.id
            RETURNING fa.id
        ),
        applied_filtered_out_goals AS (
            SELECT
                fg.id
            FROM filtered_goals fg
            LEFT JOIN "ActivityReportGoals" arg
            ON fg.id = arg."goalId"
            LEFT JOIN filtered_activity_reports fa
            ON arg."activityReportId" = fa.id
            WHERE fa.id IS NULL
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
            LEFT JOIN "Goals" g
            ON fgr.id = g."grantId"
            LEFT JOIN filtered_goals fg
            ON g.id = fg.id
            WHERE fg.id IS NULL
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
        'Apply Activity Report Filters' AS action,
        COUNT(*)
      FROM delete_from_activity_report_filter
      GROUP BY 1
      UNION
      SELECT
        'Apply Activity Report Filters To Goals' AS action,
        COUNT(*)
      FROM delete_from_goal_filter
      GROUP BY 1
      UNION
      SELECT
        'Apply Activity Report Filters To Grants' AS action,
        COUNT(*)
      FROM delete_from_grant_filter
      GROUP BY 1;
  END IF;
---------------------------------------------------------------------------------------------------
-- Step 3.2: If activity reports filters (set 3), delete from filtered_activity_reports for any activity reports filtered, delete from filtered_goals using filterd_activity_reports, delete from filtered_grants using filtered_goals
  IF
        roles_filter IS NOT NULL
    THEN
    WITH
      applied_filtered_activity_reports AS (
        SELECT DISTINCT
          a.id
        FROM filtered_activity_reports fa
        JOIN "ActivityReports" a
        ON fa.id = a.id
        JOIN "ActivityReportCollaborators" arc
        ON a.id = arc."activityReportId"
        JOIN "UserRoles" ur1
        ON arc."userId" = ur1."userId"
        JOIN "Roles" r1
        ON ur1."roleId" = r1.id
        JOIN "UserRoles" ur2
        ON a."userId" = ur2."userId"
        JOIN "Roles" r2
        ON ur2."roleId" = r2.id
        WHERE 1 = 1
        -- Filter for roles if ssdi.roles is defined
        AND (
          roles_filter IS NULL
          OR (
            COALESCE(roles_filter, '[]')::jsonb @> to_jsonb(r1."fullName")
            OR COALESCE(roles_filter, '[]')::jsonb @> to_jsonb(r2."fullName")
          ) != roles_not_filter
        )
        GROUP BY 1
      ),
        applied_filtered_out_activity_reports AS (
            SELECT
                fa.id
            FROM filtered_activity_reports fa
            LEFT JOIN applied_filtered_activity_reports afa
            ON fa.id = afa."activityReportId"
            WHERE afa."activityReportId" IS NULL
            ORDER BY 1
        ),
        delete_from_activity_report_filter AS (
            DELETE FROM filtered_activity_reports fa
            USING applied_filtered_out_activity_reports afaoar
            WHERE fa.id = afaoar.id
            RETURNING fa.id
        ),
        applied_filtered_out_goals AS (
            SELECT
                fg.id
            FROM filtered_goals fg
            LEFT JOIN "ActivityReportGoals" arg
            ON fg.id = arg."goalId"
            LEFT JOIN filtered_activity_reports fa
            ON arg."activityReportId" = fa.id
            WHERE fa.id IS NULL
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
            LEFT JOIN "Goals" g
            ON fgr.id = g."grantId"
            LEFT JOIN filtered_goals fg
            ON g.id = fg.id
            WHERE fg.id IS NULL
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
        'Apply Activity Report Filters' AS action,
        COUNT(*)
      FROM delete_from_activity_report_filter
      GROUP BY 1
      UNION
      SELECT
        'Apply Activity Report Filters To Goals' AS action,
        COUNT(*)
      FROM delete_from_goal_filter
      GROUP BY 1
      UNION
      SELECT
        'Apply Activity Report Filters To Grants' AS action,
        COUNT(*)
      FROM delete_from_grant_filter
      GROUP BY 1;
  END IF;

--EXCEPTION
--  WHEN OTHERS THEN
--    RAISE ERROR 'Error: %', SQLERRM;
END $$;
---------------------------------------------------------------------------------------------------
WITH
  delivery_method_graph_values AS (
    SELECT
      DATE_TRUNC('month', "startDate")::DATE::TEXT AS month,
      COUNT(DISTINCT a.id) FILTER (WHERE a."deliveryMethod" IN ('In person', 'in-person', 'In-person')) AS in_person_count,
      COUNT(DISTINCT a.id) FILTER (WHERE a."deliveryMethod" IN ('Virtual', 'virtual')) AS virtual_count,
      COUNT(DISTINCT a.id) FILTER (WHERE a."deliveryMethod" IN ('Hybrid', 'hybrid')) AS hybrid_count,
      ((COUNT(DISTINCT a.id) FILTER (WHERE a."deliveryMethod" IN ('In person', 'in-person', 'In-person')) * 100.0) / COUNT(DISTINCT a.id))::decimal(5,2) AS in_person_percentage,
      ((COUNT(DISTINCT a.id) FILTER (WHERE a."deliveryMethod" IN ('Virtual', 'virtual')) * 100.0) / COUNT(DISTINCT a.id))::decimal(5,2) AS virtual_percentage,
      ((COUNT(DISTINCT a.id) FILTER (WHERE a."deliveryMethod" IN ('Hybrid', 'hybrid')) * 100.0) / COUNT(DISTINCT a.id))::decimal(5,2) AS hybrid_percentage
    FROM "ActivityReports" a
    JOIN filtered_activity_reports far
    ON a.id = far.id
    WHERE a."calculatedStatus" = 'approved'
    AND a."startDate" IS NOT NULL
    GROUP BY DATE_TRUNC('month', "startDate")
    ORDER BY 1
  ),
  delivery_method_graph_totals AS (
    SELECT
      'Total' AS month,
      SUM(in_person_count) in_person_count,
      SUM(virtual_count) virtual_count,
      SUM(hybrid_count) hybrid_count,
      ((SUM(in_person_count) * 100.0) / SUM(in_person_count + virtual_count + hybrid_count))::decimal(5,2) AS in_person_percentage,
      ((SUM(virtual_count) * 100.0) / SUM(in_person_count + virtual_count + hybrid_count))::decimal(5,2) AS virtual_percentage,
      ((SUM(hybrid_count) * 100.0) / SUM(in_person_count + virtual_count + hybrid_count))::decimal(5,2) AS hybrid_percentage
    FROM delivery_method_graph_values
  ),
  delivery_method_graph AS (
    SELECT *
    FROM delivery_method_graph_values
    UNION ALL 
    SELECT *
    FROM delivery_method_graph_totals
  ),
  role_graph AS (
    SELECT
      COALESCE(r.name, a."creatorRole"::text) AS role_name,
      COUNT(*) AS role_count,
      ((COUNT(*) * 100.0) / SUM(COUNT(*)) OVER ())::decimal(5,2) AS percentage
    FROM "ActivityReports" a
    JOIN filtered_activity_reports far
    ON a.id = far.id
    LEFT JOIN "Roles" r
    ON a."creatorRole"::text = r."fullName"
    WHERE a."calculatedStatus" = 'approved'
    AND a."creatorRole" IS NOT NULL
    GROUP BY COALESCE(r.name, a."creatorRole"::text)
    ORDER BY 1 DESC
  ),
  datasets AS (
    SELECT
    'delivery_method_graph' data_set,
    COUNT(*) records,
    JSONB_AGG(JSONB_BUILD_OBJECT(
      'month', month,
      'in_person_count', in_person_count,
      'virtual_count', virtual_count,
      'hybrid_count', hybrid_count,
      'in_person_percentage', in_person_percentage,
      'virtual_percentage', virtual_percentage,
      'hybrid_percentage', hybrid_percentage
    )) data
    FROM delivery_method_graph
    UNION
    SELECT
    'role_graph' data_set,
    COUNT(*) records,
    JSONB_AGG(JSONB_BUILD_OBJECT(
      'role_name', role_name,
      'role_count', role_count,
      'percentage', percentage
    )) data
    FROM role_graph
    UNION
    SELECT
      'process_log' data_set,
      COUNT(*) records,
      JSONB_AGG(JSONB_BUILD_OBJECT(
        'action', action,
        'record_cnt', record_cnt
      )) data
    FROM process_log
  )
  SELECT *
  FROM datasets
-- Filter for datasets if ssdi.dataSetSelection is defined
WHERE 1 = 1
AND (
  NULLIF(current_setting('ssdi.dataSetSelection', true), '') IS NULL
  OR (
    COALESCE(NULLIF(current_setting('ssdi.dataSetSelection', true), ''), '[]')::jsonb @> to_jsonb("data_set")::jsonb
  )
);