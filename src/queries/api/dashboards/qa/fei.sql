-- Plan:
-- Phase 1: Grants
-- Step 1.1: Seed filtered_grants
-- Step 1.2: If grant filters (set 1), delete from filtered_grants any grarnts filtered grants
-- Step 1.3: If grant filters (set 2), delete from filtered_grants any grarnts filtered grants
-- Step 1.4: If grant filters (set 3), delete from filtered_grants any grarnts filtered grants
-- Phase 2: Goals
-- Step 2.1: Seed filtered_goals using filtered_grants
-- Step 2.2 If grant filters active, delete from filtered_goals for any goals filtered, delete from filtered_grants using filtered_goals

-- Run main query using filtered_grants, filtered_goals, filtered_activity_reports as needed to generate filtered results
DO $$
DECLARE
    -- Declare filter variables
    recipient_filter TEXT := NULLIF(current_setting('ssdi.recipients', true), '');
    -- program_type_filter TEXT := NULLIF(current_setting('ssdi.programType', true), '');
    grant_numbers_filter TEXT := NULLIF(current_setting('ssdi.grantNumbers', true), '');
    state_code_filter TEXT := NULLIF(current_setting('ssdi.stateCode', true), '');
    region_ids_filter TEXT := NULLIF(current_setting('ssdi.regionIds', true), '');
    group_filter TEXT := NULLIF(current_setting('ssdi.group', true), '');
    current_user_id_filter TEXT := NULLIF(current_setting('ssdi.currentUserId', true), '');
    create_date_filter TEXT := NULLIF(current_setting('ssdi.createDate', true), '');
    activity_report_goal_response_filter TEXT := NULLIF(current_setting('ssdi.activityReportGoalResponse', true), '');

    -- Declare `.not` variables
    recipient_not_filter BOOLEAN := COALESCE(current_setting('ssdi.recipients.not', true), 'false') = 'true';
    -- program_type_not_filter BOOLEAN := COALESCE(current_setting('ssdi.programType.not', true), 'false') = 'true';
    grant_numbers_not_filter BOOLEAN := COALESCE(current_setting('ssdi.grantNumbers.not', true), 'false') = 'true';
    state_code_not_filter BOOLEAN := COALESCE(current_setting('ssdi.stateCode.not', true), 'false') = 'true';
    region_ids_not_filter BOOLEAN := COALESCE(current_setting('ssdi.regionIds.not', true), 'false') = 'true';
    group_not_filter BOOLEAN := COALESCE(current_setting('ssdi.group.not', true), 'false') = 'true';
    current_user_id_not_filter BOOLEAN := COALESCE(current_setting('ssdi.currentUserId.not', true), 'false') = 'true';
    create_date_not_filter BOOLEAN := COALESCE(current_setting('ssdi.createDate.not', true), 'false') = 'true';
    activity_report_goal_response_not_filter BOOLEAN := COALESCE(current_setting('ssdi.activityReportGoalResponse.not', true), 'false') = 'true';

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
  DROP TABLE IF EXISTS filtered_goals;
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
END $$;
---------------------------------------------------------------------------------------------------
WITH
  with_fei AS (
    SELECT
      r.id,
      COUNT(DISTINCT fg.id) FILTER (WHERE COALESCE(g."goalTemplateId",0) = 19017) > 0 has_fei
    FROM "Recipients" r
    JOIN "Grants" gr
    ON r.id = gr."recipientId"
    JOIN filtered_grants fgr
    ON gr.id = fgr.id
    LEFT JOIN "Goals" g
    ON gr.id = g."grantId"
    LEFT JOIN filtered_goals fg
    ON g.id = fg.id
    WHERE gr.status = 'Active'
    GROUP BY 1
  ),
  with_fei_widget AS (
    SELECT
      (((COUNT(DISTINCT wf.id) FILTER (WHERE has_fei)::decimal/
      COUNT(DISTINCT wf.id)))*100)::decimal(5,2) "% recipients with fei",
      COUNT(DISTINCT wf.id) FILTER (WHERE wf.has_fei) "recipients with fei",
      COUNT(DISTINCT wf.id) total
    FROM with_fei wf
  ),
  with_fei_page AS (
    SELECT
      r.id "recipientId",
      r.name "recipientName",
      gr.number "grantNumber",
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
  ),
  with_fei_graph AS (
    SELECT
        wfpr.response,
        COUNT(*) AS response_count,
        (COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ())::decimal(5,2) AS percentage
    FROM with_fei_page
    CROSS JOIN UNNEST(wfp.response) wfpr(response)
    GROUP BY 1
  ),
  datasets AS (
    SELECT
    'with_fei_widget' data_set,
    COUNT(*) records,
    JSONB_AGG(JSONB_BUILD_OBJECT(
      '% recipients with fei', "% recipients with fei",
      'recipients with fei', "recipients with fei",
      'total', total
    ))
    FROM with_fei_widget
    UNION
    SELECT
      'with_fei_page' data_set,
      COUNT(*) records,
      JSONB_AGG(JSONB_BUILD_OBJECT(
        'recipientId', "recipientId",
        'recipientName', "recipientName",
        'grantNumber', "grantNumber",
        'goalId', "goalId",
        'createdAt', "createdAt",
        'goalStatus', "goalStatus",
        'rootCause', "rootCause"
      ))
    FROM with_fei_page
    UNION
    SELECT
    'with_fei_graph' data_set,
    COUNT(*) records,
    JSONB_AGG(JSONB_BUILD_OBJECT(
      'rootCause', "response",
      'response_count', "response_count",
      'percentage', "percentage"
    ))
    FROM with_fei_graph
    UNION
    SELECT
      'process_log' data_set,
      COUNT(*) records,
      JSONB_AGG(JSONB_BUILD_OBJECT(
        'action', action,
        'record_cnt', record_cnt
      ))
    FROM process_log
  )
  SELECT *
  FROM datasets;
