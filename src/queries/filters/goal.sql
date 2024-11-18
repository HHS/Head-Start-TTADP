/*
JSON: {
  "type": "filters"
  "name": "goal filters",
  "description": {
    "standard": "Generates a temp table of filtered goals.",
    "technical": "Generates a temp table of filtered goals."
  },
  "dependancies": [
    "base",
    "grant"
  ],
  "filters": [
    {
      "group": "goal",
      "name": "createDate",
      "type": "date[]",
      "display": "Creation Date",
      "description": "Filter based on the date range of creation",
      "supportsExclusion": true
    },
    {
      "group": "goal",
      "name": "status",
      "type": "string[]",
      "display": "Goal Status",
      "description": "Filter based on goal status",
      "supportsExclusion": true
    },
    {
      "group": "goal",
      "name": "goalName",
      "type": "string[]",
      "display": "Goal Text",
      "description": "Filter based on the text of the goal.",
      "supportsExclusion": true,
      "supportsFuzzyMatch": true
    },
    {
      "group": "goal",
      "name": "activityReportGoalResponse",
      "type": "string[]",
      "display": "Activity Report Goal Response",
      "description": "Filter based on goal field responses in activity reports",
      "supportsExclusion": true
    }
  ]
}
*/
DO $$
DECLARE
    create_date_filter TEXT := NULLIF(current_setting('ssdi.createDate', true), '');
    goal_status_filter TEXT := NULLIF(current_setting('ssdi.status', true), '');
    goal_name_filter TEXT := NULLIF(current_setting('ssdi.goalName', true), '');
    activity_report_goal_response_filter TEXT := NULLIF(current_setting('ssdi.activityReportGoalResponse', true), '');

    create_date_not_filter BOOLEAN := COALESCE(current_setting('ssdi.createDate.not', true), 'false') = 'true';
    goal_status_not_filter BOOLEAN := COALESCE(current_setting('ssdi.status.not', true), 'false') = 'true';
    goal_name_not_filter BOOLEAN := COALESCE(current_setting('ssdi.goalName.not', true), 'false') = 'true';
    activity_report_goal_response_not_filter BOOLEAN := COALESCE(current_setting('ssdi.activityReportGoalResponse.not', true), 'false') = 'true';
BEGIN
---------------------------------------------------------------------------------------------------
-- Step 2.1: Seed filtered_goals using filtered_grants
  DROP TABLE IF EXISTS filtered_goals;
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
        goal_status_filter IS NOT NULL
    THEN
    INSERT INTO active_filters (name)
    SELECT
        UNNEST(
            ARRAY_REMOVE(
                ARRAY[
                    CASE
                        WHEN create_date_filter IS NOT NULL AND create_date_not_filter THEN 'createDate.not'
                        WHEN create_date_filter IS NOT NULL THEN 'createDate'
                    END,
                    CASE
                        WHEN goal_status_filter IS NOT NULL AND goal_status_not_filter 'status.not'
                        WHEN goal_status_filter IS NOT NULL THEN 'status'
                    END
                ],
                NULL
            )
        );
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
        -- Filter for status if ssdi.status is defined
        AND (
          goal_status_filter IS NULL
          OR (
            LOWER(g.status) IN (
              SELECT LOWER(value)
              FROM json_array_elements_text(COALESCE(goal_status_filter, '[]')::json) AS value
            ) != goal_status_not_filter
          )
        )
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
  
---------------------------------------------------------------------------------------------------
-- Step 2.2 If grant filters active, delete from filtered_goals for any goals filtered, delete from filtered_grants using filtered_goals

    IF
        goal_name_filter IS NOT NULL OR
        activity_report_goal_response_filter IS NOT NULL
    THEN
    INSERT INTO active_filters (name)
    SELECT
        UNNEST(
            ARRAY_REMOVE(
                ARRAY[
                    CASE
                        WHEN goal_name_filter IS NOT NULL AND goal_name_not_filter THEN 'goalName.not'
                        WHEN goal_name_filter IS NOT NULL THEN 'goalName'
                    END,
                    CASE
                        WHEN activity_report_goal_response_filter IS NOT NULL AND activity_report_goal_response_not_filter 'activityReportGoalResponse.not'
                        WHEN activity_report_goal_response_filter IS NOT NULL THEN 'activityReportGoalResponse'
                    END
                ],
                NULL
            )
        );
    WITH
      applied_filtered_goals AS (
        SELECT
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
