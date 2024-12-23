/*
JSON: {
  "name": "QA Dashboard: CLASS",
  "description": {
    "standard": "Filterable aggrigrated class data for QA Dashboard",
    "technical": "Filterable aggrigrated class data for QA Dashboard for CLASS widget and CLASS details page."
  },
  "output": {
    "defaultName": "qa_class",
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
        "description": "An array of the active filters used"
      }
    ],
    "multipleDataSets": [
      {
        "name": "with_class_widget",
        "defaultName": "CLASS Widget",
        "description": "Summary of CLASS data with the percentage of recipients with a CLASS review.",
        "schema": [
          {
            "columnName": "% recipients with class",
            "type": "decimal",
            "nullable": false,
            "description": "Percentage of recipients with a CLASS review."
          },
          {
            "columnName": "recipients with class",
            "type": "number",
            "nullable": false,
            "description": "Number of recipients with a CLASS review."
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
        "name": "with_class_page",
        "defaultName": "Detailed CLASS Data",
        "description": "Detailed data for recipients with CLASS reviews and their associated grants, goals, and activity reports.",
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
            "columnName": "goalCreatedAt",
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
            "columnName": "lastARStartDate",
            "type": "date",
            "nullable": true,
            "description": "The start date of the last associated activity report."
          },
          {
            "columnName": "emotionalSupport",
            "type": "number",
            "nullable": true,
            "description": "Score for emotional support in the CLASS review."
          },
          {
            "columnName": "classroomOrganization",
            "type": "number",
            "nullable": true,
            "description": "Score for classroom organization in the CLASS review."
          },
          {
            "columnName": "instructionalSupport",
            "type": "number",
            "nullable": true,
            "description": "Score for instructional support in the CLASS review."
          },
          {
            "columnName": "reportDeliveryDate",
            "type": "date",
            "nullable": true,
            "description": "Date when the monitoring report was delivered."
          },
          {
            "columnName": "creator",
            "type": "string",
            "nullable": true,
            "description": "User who created the goal"
          },
          {
            "columnName": "colaborators",
            "type": "string[]",
            "nullable": true,
            "description": "Users who collaborated on the goal"
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
      "name": "domainEmotionalSupport",
      "type": "string[]",
      "display": "Emotional Support Domain",
      "description": "Filter based on emotional support domain scores",
      "options": {
        "staticValues": [
          "Above all thresholds",
          "Below quality",
          "Below competitive"
        ]
      }
    },
    {
      "name": "domainClassroomOrganization",
      "type": "string[]",
      "display": "Classroom Organization Domain",
      "description": "Filter based on classroom organization domain scores",
      "options": {
        "staticValues": [
          "Above all thresholds",
          "Below quality",
          "Below competitive"
        ]
      }
    },
    {
      "name": "domainInstructionalSupport",
      "type": "string[]",
      "display": "Instructional Support Domain",
      "description": "Filter based on instructional support domain scores",
      "options": {
        "staticValues": [
          "Above all thresholds",
          "Below quality",
          "Below competitive"
        ]
      }
    },
    {
      "name": "createDate",
      "type": "date[]",
      "display": "Creation Date",
      "description": "Filter based on the date range of creation",
      "supportsExclusion": true
    },
    {
      "name": "status",
      "type": "string[]",
      "display": "Goal Status",
      "description": "Filter based on goal status",
      "supportsExclusion": true
    },
    {
      "name": "group",
      "type": "integer[]",
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
    domain_emotional_support_filter TEXT := NULLIF(current_setting('ssdi.domainEmotionalSupport', true), '');
    domain_classroom_organization_filter TEXT := NULLIF(current_setting('ssdi.domainClassroomOrganization', true), '');
    domain_instructional_support_filter TEXT := NULLIF(current_setting('ssdi.domainInstructionalSupport', true), '');
    create_date_filter TEXT := NULLIF(current_setting('ssdi.createDate', true), '');
    goal_status_filter TEXT := NULLIF(current_setting('ssdi.status', true), '');

    -- Declare `.not` variables
    recipient_not_filter BOOLEAN := COALESCE(current_setting('ssdi.recipient.not', true), 'false') = 'true';
    program_type_not_filter BOOLEAN := COALESCE(current_setting('ssdi.programType.not', true), 'false') = 'true';
    grant_numbers_not_filter BOOLEAN := COALESCE(current_setting('ssdi.grantNumber.not', true), 'false') = 'true';
    state_code_not_filter BOOLEAN := COALESCE(current_setting('ssdi.stateCode.not', true), 'false') = 'true';
    region_ids_not_filter BOOLEAN := COALESCE(current_setting('ssdi.region.not', true), 'false') = 'true';
    group_not_filter BOOLEAN := COALESCE(current_setting('ssdi.group.not', true), 'false') = 'true';
    current_user_id_not_filter BOOLEAN := COALESCE(current_setting('ssdi.currentUserId.not', true), 'false') = 'true';
    domain_emotional_support_not_filter BOOLEAN := COALESCE(current_setting('ssdi.domainEmotionalSupport.not', true), 'false') = 'true';
    domain_classroom_organization_not_filter BOOLEAN := COALESCE(current_setting('ssdi.domainClassroomOrganization.not', true), 'false') = 'true';
    domain_instructional_support_not_filter BOOLEAN := COALESCE(current_setting('ssdi.domainInstructionalSupport.not', true), 'false') = 'true';
    create_date_not_filter BOOLEAN := COALESCE(current_setting('ssdi.createDate.not', true), 'false') = 'true';
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
            COALESCE(group_filter, '[]')::jsonb @> to_jsonb(g.id::text) != group_not_filter
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
-- Step 1.4: If grant filters active, delete from filtered_grants any grarnts filtered grants
  IF
    domain_emotional_support_filter IS NOT NULL OR
    domain_classroom_organization_filter IS NOT NULL OR
    domain_instructional_support_filter IS NOT NULL
  THEN
    RAISE WARNING 'domain_classroom_organization_filter: %', domain_classroom_organization_filter;
    WITH
      applied_filtered_grants AS (
        SELECT
          gr.id
        FROM filtered_grants fgr
        JOIN "Grants" gr
        ON fgr.id = gr.id
        LEFT JOIN "MonitoringClassSummaries" mcs
        ON gr.number = mcs."grantNumber"
        LEFT JOIN "MonitoringReviews" mr
        ON mcs."reviewId" = mr."reviewId"
        LEFT JOIN "MonitoringReviewStatuses" mrs
        ON mr."statusId" = mrs."statusId"
        AND mrs."name" = 'Complete'
        GROUP BY 1
        HAVING 1 = 1
        -- Conditional logic for domain support filters and mrs.id requirement
        AND (
          -- If any of the domain filters have a value, then mrs.id must not be NULL
          (
          COALESCE(
            domain_emotional_support_filter,
            domain_classroom_organization_filter,
            domain_instructional_support_filter
          ) IS NOT NULL
          AND (ARRAY_AGG(DISTINCT mrs.id))[1] IS NOT NULL
          )
          -- If all domain filters are NULL, then mrs.id can be anything
          OR (
          COALESCE(
            domain_emotional_support_filter,
            domain_classroom_organization_filter,
            domain_instructional_support_filter
          ) IS NULL
          )
        )
        -- Filter for domainEmotionalSupport if ssdi.domainEmotionalSupport is defined
        AND (
          domain_emotional_support_filter IS NULL
          OR (
          EXISTS (
            SELECT 1
            FROM json_array_elements_text(
            COALESCE(domain_emotional_support_filter, '[]')::json
            ) AS json_values
            WHERE json_values.value = (
            CASE
              WHEN (ARRAY_AGG(mcs."emotionalSupport" ORDER BY mcs."reportDeliveryDate" DESC))[1] >= 6 THEN 'Above all thresholds'
              WHEN (ARRAY_AGG(mcs."emotionalSupport" ORDER BY mcs."reportDeliveryDate" DESC))[1] < 5 THEN 'Below competitive'
              ELSE 'Below quality'
            END
            )
          )
          != domain_emotional_support_not_filter
          )
        )
        -- Filter for domainClassroomOrganization if ssdi.domainClassroomOrganization is defined
        AND (
          domain_classroom_organization_filter IS NULL
          OR (
          EXISTS (
            SELECT 1
            FROM json_array_elements_text(
            COALESCE(domain_classroom_organization_filter, '[]')::json
            ) AS json_values
            WHERE json_values.value = (
            CASE
              WHEN (ARRAY_AGG(mcs."classroomOrganization" ORDER BY mcs."reportDeliveryDate" DESC))[1] >= 6 THEN 'Above all thresholds'
              WHEN (ARRAY_AGG(mcs."classroomOrganization" ORDER BY mcs."reportDeliveryDate" DESC))[1] < 5 THEN 'Below competitive'
              ELSE 'Below quality'
            END
            )
          )
          != domain_classroom_organization_not_filter
          )
        )
        -- Filter for domainInstructionalSupport if ssdi.domainInstructionalSupport is defined
        AND (
          domain_instructional_support_filter IS NULL
          OR (
          EXISTS (
            SELECT 1
            FROM json_array_elements_text(
            COALESCE(domain_instructional_support_filter, '[]')::json
            ) AS json_values
            WHERE json_values.value = (
            CASE
              -- Get the max reportDeliveryDate for the instructionalSupport domain to apply the correct threshold logic
              -- These dates are set by OHS policy and were delayed by two years in July 2024:
              -- Final Rule to Delay Effective Date for Increasing the CLASS Instructional Support Domain Competitive Threshold
              -- https://eclkc.ohs.acf.hhs.gov/policy/pi/acf-ohs-pi-24-07
              WHEN (ARRAY_AGG(mcs."instructionalSupport" ORDER BY mcs."reportDeliveryDate" DESC))[1] >= 3 THEN 'Above all thresholds'
              WHEN (MAX(mcs."reportDeliveryDate") >= '2027-08-01'
              AND (ARRAY_AGG(mcs."instructionalSupport" ORDER BY mcs."reportDeliveryDate" DESC))[1] < 2.5)
              THEN 'Below competitive'
              WHEN (MAX(mcs."reportDeliveryDate") BETWEEN '2020-11-09' AND '2027-07-31'
              AND (ARRAY_AGG(mcs."instructionalSupport" ORDER BY mcs."reportDeliveryDate" DESC))[1] < 2.3)
              THEN 'Below competitive'
              ELSE 'Below quality'
            END
            )
          )
          != domain_instructional_support_not_filter
          )
        )
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
  with_class AS (
    SELECT
      r.id,
      COUNT(DISTINCT fg.id) FILTER (WHERE COALESCE(g."goalTemplateId",0) = 18172) > 0 has_class,
      COUNT(DISTINCT mcs.id) > 0 has_scores,
      COUNT(DISTINCT gr.id) FILTER (WHERE COALESCE(g."goalTemplateId",0) = 18172 AND fg.id IS NOT NULL AND mcs.id IS NOT NULL) grant_count
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
    LEFT JOIN "MonitoringReviewGrantees" mrg
    ON gr.number = mrg."grantNumber"
    LEFT JOIN "MonitoringReviews" mr
    ON mrg."reviewId" = mr."reviewId"
    AND mr."reviewType" in ('CLASS', 'PR-CLASS', 'AIAN CLASS Self-Observations', 'AIAN-CLASS', 'VP-CLASS', 'CLASS-Video')
    LEFT JOIN "MonitoringReviewStatuses" mrs
    ON mr."statusId" = mrs."statusId"
    LEFT JOIN "MonitoringClassSummaries" mcs
    ON mr."reviewId" = mcs."reviewId"
    WHERE hcg.has_current_active_grant
    AND g."deletedAt" IS NULL
    AND (mrs.id IS NULL OR mrs.name = 'Complete')
    AND g."mapsToParentGoalId" IS NULL
    GROUP BY 1
  ),
  with_class_widget AS (
    SELECT
      (COALESCE(COUNT(DISTINCT wc.id) FILTER (WHERE wc.has_class AND wc.has_scores)::decimal/
      NULLIF(COUNT(DISTINCT wc.id), 0), 0)*100)::decimal(5,2) "% recipients with class",
      COUNT(DISTINCT wc.id) FILTER (WHERE wc.has_class AND wc.has_scores) "recipients with class",
      COUNT(DISTINCT wc.id) total,
      SUM(grant_count) "grants with class"
    FROM with_class wc
  ),
  with_class_page AS (
    SELECT
        r.id "recipientId",
        r.name "recipientName",
        gr.number "grantNumber",
        gr."regionId",
        (ARRAY_AGG(g.id ORDER BY g.id DESC) FILTER (WHERE fg.id IS NOT NULL))[1] "goalId",
        (ARRAY_AGG(g."createdAt" ORDER BY g.id DESC) FILTER (WHERE fg.id IS NOT NULL))[1] "goalCreatedAt",
        (ARRAY_AGG(g.status ORDER BY g.id DESC) FILTER (WHERE fg.id IS NOT NULL))[1] "goalStatus",
        (ARRAY_AGG(a."startDate" ORDER BY a."startDate" DESC) FILTER (WHERE fg.id IS NOT NULL))[1] "lastARStartDate",
        (ARRAY_AGG(mcs."emotionalSupport" ORDER BY mr."reportDeliveryDate" DESC) FILTER (WHERE mr.id IS NOT NULL AND fg.id IS NOT NULL))[1] "emotionalSupport",
        (ARRAY_AGG(mcs."classroomOrganization" ORDER BY mr."reportDeliveryDate" DESC) FILTER (WHERE mr.id IS NOT NULL AND fg.id IS NOT NULL))[1] "classroomOrganization",
        (ARRAY_AGG(mcs."instructionalSupport" ORDER BY mr."reportDeliveryDate" DESC) FILTER (WHERE mr.id IS NOT NULL AND fg.id IS NOT NULL))[1] "instructionalSupport",
        (ARRAY_AGG(mr."reportDeliveryDate" ORDER BY mr."reportDeliveryDate" DESC) FILTER (WHERE mr.id IS NOT NULL AND fg.id IS NOT NULL))[1] "reportDeliveryDate",
        (ARRAY_AGG(DISTINCT u.name || ', ' || COALESCE(ur.agg_roles, 'No Roles')) FILTER (WHERE ct.name = 'Creator' AND fg.id IS NOT NULL))[1] "creator",
        (ARRAY_AGG(DISTINCT u.name || ', ' || COALESCE(ur.agg_roles, 'No Roles')) FILTER (WHERE ct.name = 'Collaborator' AND fg.id IS NOT NULL)) "collaborators"
    FROM with_class wc
    JOIN "Recipients" r
    JOIN has_current_grant hcg
    ON r.id = hcg.rid
    ON wc.id = r.id
    AND (has_class OR has_scores)
    JOIN "Grants" gr
    ON r.id = gr."recipientId"
    JOIN filtered_grants fgr
    ON gr.id = fgr.id
    LEFT JOIN "Goals" g
    ON gr.id = g."grantId"
    AND has_class
    AND g."goalTemplateId" = 18172
    LEFT JOIN filtered_goals fg
    ON g.id = fg.id
    LEFT JOIN "GoalCollaborators" gc
    ON g.id = gc."goalId"
    LEFT JOIN "CollaboratorTypes" ct
    ON gc."collaboratorTypeId" = ct.id
    AND ct.name IN ('Creator', 'Collaborator')
    LEFT JOIN "ValidFor" vf
    ON ct."validForId" = vf.id
    AND vf.name = 'Goals'
    LEFT JOIN "Users" u
    ON gc."userId" = u.id
    LEFT JOIN LATERAL (
        SELECT ur."userId", STRING_AGG(r.name, ', ') AS agg_roles
        FROM "UserRoles" ur
        JOIN "Roles" r ON ur."roleId" = r.id
        WHERE ur."userId" = u.id
        GROUP BY ur."userId"
    ) ur ON u.id = ur."userId"
    LEFT JOIN "ActivityReportGoals" arg
    ON g.id = arg."goalId"
    LEFT JOIN "ActivityReports" a
    ON arg."activityReportId" = a.id
    AND a."calculatedStatus" = 'approved'
    LEFT JOIN "MonitoringReviewGrantees" mrg
    ON gr.number = mrg."grantNumber"
    LEFT JOIN "MonitoringReviews" mr
    ON mrg."reviewId" = mr."reviewId"
    AND mr."reviewType" in ('CLASS', 'PR-CLASS', 'AIAN CLASS Self-Observations', 'AIAN-CLASS', 'VP-CLASS', 'CLASS-Video')
    LEFT JOIN "MonitoringReviewStatuses" mrs
    ON mr."statusId" = mrs."statusId"
    LEFT JOIN "MonitoringClassSummaries" mcs
    ON mr."reviewId" = mcs."reviewId"
    WHERE hcg.has_current_active_grant
    AND (has_class OR has_scores)
    AND (g.id IS NOT NULL OR mcs.id IS NOT NULL)
    AND (mrs.id IS NULL OR mrs.name = 'Complete')
    AND (mcs.id IS NOT NULL)
    AND g."deletedAt" IS NULL
    AND g."mapsToParentGoalId" IS NULL
    GROUP BY 1, 2, 3, 4
    HAVING (ARRAY_AGG(mcs."emotionalSupport" ORDER BY mr."reportDeliveryDate" DESC) FILTER (WHERE mr.id IS NOT NULL AND fg.id IS NOT NULL))[1] IS NOT NULL
    ORDER BY 1, 3
  ),
  
  -- CTE for fetching active filters using NULLIF() to handle empty strings
  active_filters_array AS (
    SELECT ARRAY_REMOVE(ARRAY[
      CASE WHEN NULLIF(current_setting('ssdi.recipients', true), '') IS NOT NULL THEN 'recipients' END,
      CASE WHEN NULLIF(current_setting('ssdi.grantNumbers', true), '') IS NOT NULL THEN 'grantNumbers' END,
      CASE WHEN NULLIF(current_setting('ssdi.stateCode', true), '') IS NOT NULL THEN 'stateCode' END,
      CASE WHEN NULLIF(current_setting('ssdi.region', true), '') IS NOT NULL THEN 'region' END,
      CASE WHEN NULLIF(current_setting('ssdi.group', true), '') IS NOT NULL THEN 'group' END,
      CASE WHEN NULLIF(current_setting('ssdi.currentUserId', true), '') IS NOT NULL THEN 'currentUserId' END,
      CASE WHEN NULLIF(current_setting('ssdi.domainEmotionalSupport', true), '') IS NOT NULL THEN 'domainEmotionalSupport' END,
      CASE WHEN NULLIF(current_setting('ssdi.domainClassroomOrganization', true), '') IS NOT NULL THEN 'domainClassroomOrganization' END,
      CASE WHEN NULLIF(current_setting('ssdi.domainInstructionalSupport', true), '') IS NOT NULL THEN 'domainInstructionalSupport' END,
      CASE WHEN NULLIF(current_setting('ssdi.createDate', true), '') IS NOT NULL THEN 'createDate' END,
      CASE WHEN NULLIF(current_setting('ssdi.status', true), '') IS NOT NULL THEN 'status' END
    ], NULL) AS active_filters
  ),
  
  datasets AS (
    SELECT
        'with_class_widget' data_set,
        COUNT(*) records,
        JSONB_AGG(JSONB_BUILD_OBJECT(
        '% recipients with class', "% recipients with class",
        'recipients with class', "recipients with class",
        'total', total,
        'grants with class', "grants with class"
        )) AS data,
        af.active_filters  -- Use precomputed active_filters
    FROM with_class_widget
    CROSS JOIN active_filters_array af
    GROUP BY af.active_filters
    
    UNION

    SELECT
      'with_class_page' data_set,
      COUNT(*) records,
      JSONB_AGG(JSONB_BUILD_OBJECT(
        'recipientId', "recipientId",
        'recipientName', "recipientName",
        'grantNumber', "grantNumber",
        'region id', "regionId",
        'goalId', "goalId",
        'goalCreatedAt', "goalCreatedAt",
        'goalStatus', "goalStatus",
        'lastARStartDate', "lastARStartDate",
        'emotionalSupport', "emotionalSupport",
        'classroomOrganization', "classroomOrganization",
        'instructionalSupport', "instructionalSupport",
        'reportDeliveryDate', "reportDeliveryDate",
        'creator', "creator",
        'collaborators', "collaborators"
      )) AS data,
      af.active_filters  -- Use precomputed active_filters
    FROM with_class_page
    CROSS JOIN active_filters_array af
    GROUP BY af.active_filters
    
    UNION

    SELECT
      'with_class_page' data_set,
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
