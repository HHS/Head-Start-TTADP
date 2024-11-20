/* 
JSON: {
  "type": "filters"
  "name": "activity-report",
  "description": {
    "standard": "Generates a temp table of filtered goals.",
    "technical": "Generates a temp table of filtered goals."
  },
  "dependancies": [
    "base",
    "grant",
    "goals"
  ],
  "filters": [
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
      "name": "reportId",
      "type": "string[]",
      "display": "Report Ids",
      "description": "Filter based on the report ids.",
      "supportsExclusion": true,
      "supportsFuzzyMatch": true
    },
    {
      "name": "targetPopulations",
      "type": "string[]",
      "display": "Target populations",
      "description": "Filter based on the selected target populations.",
      "supportsExclusion": true
    },
    {
      "name": "topic",
      "type": "string[]",
      "display": "Topics",
      "description": "Filter based on the selected topics.",
      "supportsExclusion": true
    },
    {
      "name": "ttaType",
      "type": "string[]",
      "display": "TTA type",
      "description": "Filter based on the selected TTA type.",
      "supportsExclusion": true
    },
    {
      "name": "reportText",
      "type": "string[]",
      "display": "Report text",
      "description": "Filter based on any of the free-form text fields on a report.",
      "supportsExclusion": true,
      "supportsFuzzyMatch": true
    },
    {
      "name": "role",
      "type": "string[]",
      "display": "Specialist role",
      "description": "Filter based on the selected Specialist role.",
      "supportsExclusion": true
    },
    {
      "name": "reason",
      "type": "string[]",
      "display": "Reasons",
      "description": "Filter based on the selected reasons.",
      "supportsExclusion": true
    },
    {
      "name": "singleOrMultiRecipients",
      "type": "string[]",
      "display": "Single or multiple recipients",
      "description": "Filter based on the number of recipients."
    }
  ]
}
*/
DO $$
DECLARE
  report_id_filter TEXT := NULLIF(current_setting('ssdi.reportId', true), '');
  start_date_filter TEXT := NULLIF(current_setting('ssdi.startDate', true), '');
  end_date_filter TEXT := NULLIF(current_setting('ssdi.endDate', true), '');
  reason_filter TEXT := NULLIF(current_setting('ssdi.reason', true), '');
  target_populations_filter TEXT := NULLIF(current_setting('ssdi.targetPopulations', true), '');
  tta_type_filter TEXT := NULLIF(current_setting('ssdi.ttaType', true), '');
  report_text_filter TEXT := NULLIF(current_setting('ssdi.reportText', true), '');
  topic_filter TEXT := NULLIF(current_setting('ssdi.topic', true), '');
  recipient_single_or_multi_filter TEXT := NULLIF(current_setting('ssdi.singleOrMultiRecipients', true), '');
  roles_filter TEXT := NULLIF(current_setting('ssdi.role', true), '');

  report_id_not_filter BOOLEAN := COALESCE(current_setting('ssdi.reportId.not', true), 'false') = 'true';
  start_date_not_filter BOOLEAN := COALESCE(current_setting('ssdi.startDate.not', true), 'false') = 'true';
  end_date_not_filter BOOLEAN := COALESCE(current_setting('ssdi.endDate.not', true), 'false') = 'true';
  reason_not_filter BOOLEAN := COALESCE(current_setting('ssdi.reason.not', true), 'false') = 'true';
  target_populations_not_filter BOOLEAN := COALESCE(current_setting('ssdi.targetPopulations.not', true), 'false') = 'true';
  tta_type_not_filter BOOLEAN := COALESCE(current_setting('ssdi.ttaType.not', true), 'false') = 'true';
  report_text_not_filter BOOLEAN := COALESCE(current_setting('ssdi.reportText.not', true), 'false') = 'true';
  topic_not_filter BOOLEAN := COALESCE(current_setting('ssdi.topic.not', true), 'false') = 'true';
  recipient_single_or_multi_not_filter BOOLEAN := COALESCE(current_setting('ssdi.singleOrMultiRecipients.not', true), 'false') = 'true';
  roles_not_filter BOOLEAN := COALESCE(current_setting('ssdi.role.not', true), 'false') = 'true';
BEGIN
---------------------------------------------------------------------------------------------------
-- Step 3.1: Seed filterd_activity_reports
  DROP TABLE IF EXISTS filtered_activity_reports;
  CREATE TEMP TABLE IF NOT EXISTS filtered_activity_reports (id INT);

  WITH seed_filtered_activity_reports AS (
    INSERT INTO filtered_activity_reports (id)
    SELECT
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
    GROUP BY 1
    ORDER BY 1
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
      report_id_filter IS NOT NULL OR
      start_date_filter IS NOT NULL OR
      end_date_filter IS NOT NULL OR
      reason_filter IS NOT NULL OR
      target_populations_filter IS NOT NULL OR
      tta_type_filter IS NOT NULL
  THEN
    INSERT INTO active_filters (name)
    SELECT
      UNNEST(
        ARRAY_REMOVE(
          ARRAY[
            CASE
              WHEN report_id_filter IS NOT NULL AND report_id_not_filter IS NOT NULL THEN 'reportId.not'
              WHEN report_id_filter IS NOT NULL THEN 'reportId'
            END,
            CASE
              WHEN start_date_filter IS NOT NULL AND start_date_not_filter IS NOT NULL THEN 'startDate.not'
              WHEN start_date_filter IS NOT NULL THEN 'startDate'
            END,
            CASE
              WHEN end_date_filter IS NOT NULL AND end_date_not_filter IS NOT NULL THEN 'endDate.not'
              WHEN end_date_filter IS NOT NULL THEN 'endDate'
            END,
            CASE
              WHEN reason_filter IS NOT NULL AND reason_not_filter IS NOT NULL THEN 'reason.not'
              WHEN reason_filter IS NOT NULL THEN 'reason'
            END,
            CASE
              WHEN target_populations_filter IS NOT NULL AND target_populations_not_filter IS NOT NULL THEN 'targetPopulations.not'
              WHEN target_populations_filter IS NOT NULL THEN 'targetPopulations'
            END,
            CASE
              WHEN tta_type_filter IS NOT NULL AND tta_type_not_filter IS NOT NULL THEN 'ttaType.not'
              WHEN tta_type_filter IS NOT NULL THEN 'ttaType'
            END
          ],
          NULL
        )
      );
    WITH
      applied_filtered_activity_reports AS (
        SELECT
          a.id "activityReportId"
        FROM filtered_activity_reports fa
        JOIN "ActivityReports" a
        ON fa.id = a.id
        WHERE a."calculatedStatus" = 'approved'
        -- Filter for reportId if ssdi.reportId is defined
        AND (
          report_id_filter IS NULL
          OR (
            EXISTS (
              SELECT 1
              FROM json_array_elements_text(COALESCE(report_text_filter, '[]')::json) AS value
              WHERE CONCAT('R', LPAD(a."regionId"::text, 2, '0'), '-AR-', a.id) ~* value::text
              OR COALESCE(a."legacyId",'') ~* value::text
            ) != report_text_not_filter
          )
        )
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
            (a."reason"::TEXT[] && ARRAY(
              SELECT value::text
              FROM json_array_elements_text(COALESCE(reason_filter, '[]')::json)
            )) != reason_not_filter
          )
        )
        -- Filter for targetPopulations if ssdi.targetPopulations is defined, for array columns
        AND (
          target_populations_filter IS NULL
          OR (
            (a."targetPopulations"::TEXT[] && ARRAY(
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
              a."ttaType"::TEXT[] @> ARRAY(
                SELECT value::text
                FROM json_array_elements_text(COALESCE(tta_type_filter, '[]')::json)
              )
              AND a."ttaType"::TEXT[] <@ ARRAY(
                SELECT value::text
                FROM json_array_elements_text(COALESCE(tta_type_filter, '[]')::json)
              )
            ) != tta_type_not_filter
          )
        )
        GROUP BY 1
        ORDER BY 1
      ),
      applied_filtered_out_activity_reports AS (
        SELECT
          fa.id
        FROM filtered_activity_reports fa
        LEFT JOIN applied_filtered_activity_reports afa ON fa.id = afa."activityReportId"
        GROUP BY 1
        HAVING COUNT(afa."activityReportId") = 0
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
        LEFT JOIN "ActivityReportGoals" arg ON fg.id = arg."goalId"
        LEFT JOIN filtered_activity_reports fa ON arg."activityReportId" = fa.id
        GROUP BY 1
        HAVING COUNT(fa.id) = 0
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
    INSERT INTO active_filters (name)
    SELECT
      UNNEST(
        ARRAY_REMOVE(
          ARRAY[
            CASE
              WHEN report_text_filter IS NOT NULL AND report_text_not_filter IS NOT NULL THEN 'reportText.not'
              WHEN report_text_filter IS NOT NULL THEN 'reportText'
            END,
            CASE
              WHEN topic_filter IS NOT NULL AND topic_not_filter IS NOT NULL THEN 'topic.not'
              WHEN topic_filter IS NOT NULL THEN 'topic'
            END
          ],
          NULL
        )
      );
    
    WITH
      applied_filtered_activity_reports AS (
        SELECT
          a.id "activityReportId"
        FROM filtered_activity_reports fa
        JOIN "ActivityReports" a
        ON fa.id = a.id
        JOIN "ActivityReportGoals" arg
        ON a.id = arg."activityReportId"
        JOIN filtered_goals fg
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
        GROUP BY 1
        ORDER BY 1
      ),
      applied_filtered_out_activity_reports AS (
        SELECT
            fa.id
        FROM filtered_activity_reports fa
        LEFT JOIN applied_filtered_activity_reports afa ON fa.id = afa."activityReportId"
        GROUP BY 1
        HAVING COUNT(afa."activityReportId") = 0
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
        LEFT JOIN "ActivityReportGoals" arg ON fg.id = arg."goalId"
        LEFT JOIN filtered_activity_reports fa ON arg."activityReportId" = fa.id
        GROUP BY 1
        HAVING COUNT(fa.id) = 0
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
    INSERT INTO active_filters (name)
    SELECT
      UNNEST(
        ARRAY_REMOVE(
          ARRAY[
            CASE
              WHEN recipient_single_or_multi_filter IS NOT NULL AND recipient_single_or_multi_not_filter IS NOT NULL THEN 'singleOrMultiRecipients.not'
              WHEN recipient_single_or_multi_filter IS NOT NULL THEN 'singleOrMultiRecipients'
            END
          ],
          NULL
        )
      );

    WITH
      applied_filtered_activity_reports AS (
        SELECT
          a.id "activityReportId"
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
        LEFT JOIN applied_filtered_activity_reports afa ON fa.id = afa."activityReportId"
        GROUP BY 1
        HAVING COUNT(afa."activityReportId") = 0
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
        LEFT JOIN "ActivityReportGoals" arg ON fg.id = arg."goalId"
        LEFT JOIN filtered_activity_reports fa ON arg."activityReportId" = fa.id
        GROUP BY 1
        HAVING COUNT(fa.id) = 0
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
    INSERT INTO active_filters (name)
    SELECT
      UNNEST(
        ARRAY_REMOVE(
          ARRAY[
            CASE
              WHEN roles_filter IS NOT NULL AND roles_not_filter IS NOT NULL THEN 'role.not'
              WHEN roles_filter IS NOT NULL THEN 'role'
            END
          ],
          NULL
        )
      );

    WITH
      applied_filtered_activity_reports AS (
        SELECT
          a.id "activityReportId"
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
        ORDER BY 1
      ),
      applied_filtered_out_activity_reports AS (
        SELECT
            fa.id
        FROM filtered_activity_reports fa
        LEFT JOIN applied_filtered_activity_reports afa ON fa.id = afa."activityReportId"
        GROUP BY 1
        HAVING COUNT(afa."activityReportId") = 0
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
        LEFT JOIN "ActivityReportGoals" arg ON fg.id = arg."goalId"
        LEFT JOIN filtered_activity_reports fa ON arg."activityReportId" = fa.id
        GROUP BY 1
        HAVING COUNT(fa.id) = 0
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
END $$;
