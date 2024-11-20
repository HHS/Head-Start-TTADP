/*
JSON: {
  "type": "filters"
  "name": "grant filters",
  "description": {
    "standard": "Generates a temp table of filtered grants.",
    "technical": "Generates a temp table of filtered grants."
  },
  "dependancies": [
    "base"
  ],
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
      "name": "uei",
      "type": "string[]",
      "display": "Recipient UEI",
      "description": "Filter based on the uei of the recipients",
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
    recipient_filter TEXT := NULLIF(current_setting('ssdi.recipient', true), '');
    uei_filter TEXT := NULLIF(current_setting('ssdi.uei', true), '');
    program_type_filter TEXT := NULLIF(current_setting('ssdi.programType', true), '');
    grant_numbers_filter TEXT := NULLIF(current_setting('ssdi.grantNumber', true), '');
    state_code_filter TEXT := NULLIF(current_setting('ssdi.stateCode', true), '');
    region_ids_filter TEXT := NULLIF(current_setting('ssdi.region', true), '');
    group_filter TEXT := NULLIF(current_setting('ssdi.group', true), '');
    current_user_id_filter TEXT := NULLIF(current_setting('ssdi.currentUserId', true), '');
    domain_emotional_support_filter TEXT := NULLIF(current_setting('ssdi.domainEmotionalSupport', true), '');
    domain_classroom_organization_filter TEXT := NULLIF(current_setting('ssdi.domainClassroomOrganization', true), '');
    domain_instructional_support_filter TEXT := NULLIF(current_setting('ssdi.domainInstructionalSupport', true), '');
    
    recipient_not_filter BOOLEAN := COALESCE(current_setting('ssdi.recipient.not', true), 'false') = 'true';
    uei_not_filter BOOLEAN := COALESCE(current_setting('ssdi.uei.not', true), 'false') = 'true';
    program_type_not_filter BOOLEAN := COALESCE(current_setting('ssdi.programType.not', true), 'false') = 'true';
    grant_numbers_not_filter BOOLEAN := COALESCE(current_setting('ssdi.grantNumber.not', true), 'false') = 'true';
    state_code_not_filter BOOLEAN := COALESCE(current_setting('ssdi.stateCode.not', true), 'false') = 'true';
    region_ids_not_filter BOOLEAN := COALESCE(current_setting('ssdi.region.not', true), 'false') = 'true';
    group_not_filter BOOLEAN := COALESCE(current_setting('ssdi.group.not', true), 'false') = 'true';
    current_user_id_not_filter BOOLEAN := COALESCE(current_setting('ssdi.currentUserId.not', true), 'false') = 'true';
    domain_emotional_support_not_filter BOOLEAN := COALESCE(current_setting('ssdi.domainEmotionalSupport.not', true), 'false') = 'true';
    domain_classroom_organization_not_filter BOOLEAN := COALESCE(current_setting('ssdi.domainClassroomOrganization.not', true), 'false') = 'true';
    domain_instructional_support_not_filter BOOLEAN := COALESCE(current_setting('ssdi.domainInstructionalSupport.not', true), 'false') = 'true';
BEGIN
---------------------------------------------------------------------------------------------------
-- Step 1.1: Seed filtered_grants
  DROP TABLE IF EXISTS filtered_grants;
  CREATE TEMP TABLE IF NOT EXISTS filtered_grants (id INT);

  WITH seed_filtered_grants AS (
    INSERT INTO filtered_grants (id)
    SELECT 
      id,
      "regionId",
      "recipientId"
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
    uei_filter IS NOT NULL OR
    program_type_filter IS NOT NULL OR
    grant_numbers_filter IS NOT NULL OR
    state_code_filter IS NOT NULL OR
    region_ids_filter IS NOT NULL
  THEN
    INSERT INTO active_filters (name)
    SELECT
        UNNEST(
            ARRAY_REMOVE(
                ARRAY[
                    CASE
                        WHEN recipient_filter IS NOT NULL AND recipient_not_filter THEN 'recipient.not'
                        WHEN recipient_filter IS NOT NULL THEN 'recipient'
                    END,
                    CASE
                        WHEN uei_filter IS NOT NULL AND uei_not_filterTHEN 'uei.not'
                        WHEN uei_filter IS NOT NULL THEN 'uei'
                    END,
                    CASE
                        WHEN program_type_filter IS NOT NULL AND program_type_not_filter THEN 'programType.not'
                        WHEN program_type_filter IS NOT NULL THEN 'programType'
                    END,
                    CASE
                        WHEN grant_numbers_filter IS NOT NULL AND grant_numbers_not_filter THEN 'grantNumber.not'
                        WHEN grant_numbers_filter IS NOT NULL THEN 'grantNumber'
                    END,
                    CASE
                        WHEN state_code_filter IS NOT NULL AND state_code_not_filter THEN 'stateCode.not'
                        WHEN state_code_filter IS NOT NULL THEN 'stateCode'
                    END,
                    CASE
                        WHEN region_ids_filter IS NOT NULL AND region_ids_not_filter THEN 'region.not'
                        WHEN region_ids_filter IS NOT NULL THEN 'region'
                    END
                ],
                NULL
            )
        );
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
        -- Filter for uei if ssdi.uei is defined
        AND (
          uei_filter IS NULL
          OR (
            EXISTS (
                SELECT 1
                FROM json_array_elements_text(COALESCE(recipient_filter, '[]')::json) AS value
                WHERE r.uei ~* value::text
            ) != uei_not_filter
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
    INSERT INTO active_filters (name)
    SELECT
      UNNEST(
        ARRAY_REMOVE(
          ARRAY[
            CASE
              WHEN group_filter IS NOT NULL AND group_not_filter THEN 'group.not'
              WHEN group_filter IS NOT NULL THEN 'group'
            END,
            CASE
              WHEN current_user_id_filter IS NOT NULL AND current_user_id_not_filter THEN 'currentUserId.not'
              WHEN current_user_id_filter IS NOT NULL THEN 'currentUserId'
            END
          ],
          NULL
        )
      );
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
    INSERT INTO active_filters (name)
    SELECT
      UNNEST(
        ARRAY_REMOVE(
          ARRAY[
            CASE
              WHEN domain_emotional_support_filter IS NOT NULL AND domain_emotional_support_not_filter THEN 'domainEmotionalSupport.not'
              WHEN domain_emotional_support_filter IS NOT NULL THEN 'domainEmotionalSupport'
            END,
            CASE
              WHEN domain_classroom_organization_filter IS NOT NULL AND domain_classroom_organization_not_filter THEN 'domainClassroomOrganization.not'
              WHEN domain_classroom_organization_filter IS NOT NULL THEN 'domainClassroomOrganization'
            END,
            CASE
              WHEN domain_instructional_support_filter IS NOT NULL AND domain_instructional_support_not_filter THEN 'domainInstructionalSupport.not'
              WHEN domain_instructional_support_filter IS NOT NULL THEN 'domainInstructionalSupport'
            END,
          ],
          NULL
        )
      );
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
            ) != domain_emotional_support_not_filter
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
            ) != domain_classroom_organization_not_filter
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
                  -- Get the max reportDeliveryDate for the instructionalSupport domain
                  WHEN (ARRAY_AGG(mcs."instructionalSupport" ORDER BY mcs."reportDeliveryDate" DESC))[1] >= 3 THEN 'Above all thresholds'
                  WHEN (MAX(mcs."reportDeliveryDate") >= '2025-08-01'
                  AND (ARRAY_AGG(mcs."instructionalSupport" ORDER BY mcs."reportDeliveryDate" DESC))[1] < 2.5)
                  THEN 'Below competitive'
                  WHEN (MAX(mcs."reportDeliveryDate") BETWEEN '2020-11-09' AND '2025-07-31'
                  AND (ARRAY_AGG(mcs."instructionalSupport" ORDER BY mcs."reportDeliveryDate" DESC))[1] < 2.3)
                  THEN 'Below competitive'
                  ELSE 'Below quality'
                END
              )
            ) != domain_instructional_support_not_filter
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
END $$;
