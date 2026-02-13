const { prepMigration } = require('../lib/migration')

module.exports = {
  up: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)

      await queryInterface.sequelize.query(
        /* sql */ `
        -- This starts by deduping Goal and Objective templates so that re-linking operations
        -- will be deterministic and won't create a greater mess. This involves:
        --   - Collecting the list of templates to merge
        --   - Failing the transaction if any goal templates with question prompts (e.g. root cause)
        --     are slated to be merged away. If those ever appear they need an extra look
        --   - Finding GoalTemplateObjectiveTemplates that would simply create duplicate
        --     obj-template,goal-template pairs and deleting from GoalTemplateObjectiveTemplates
        --     rather than updating those
        --   - Updating GoalTemplateObjectiveTemplates to the new obj templates
        --   - Updating GoalTemplateObjectiveTemplates to the new goal templates
        --   - Redirecting GoalTemplateResources to their new template
        --   - Update any goals or objectives to the merged templates
        --   - Delete the duplicate templates
        -- Many of these steps are empty but all the steps are included in case either something changes
        -- between when this is written and when it's run, or if it gets rerun in the future

        -- THE MAIN WORK:
        -- This finds all objectives that have titles long enough to be meaningful but
        -- are not linked to a matching template and marks whether they're created on an
        -- RTR and what the most advanced status of a connected AR is. Then every
        -- Objective that is on at least one AR that has reached 'submitted' status
        -- is:
        --   - Converted to a template and inserted if there is no matching template
        --   - Updated to point to the new or existing template
        -- A query at the end shows the movement. Note that some "unmatched" numbers will
        -- grow slightly because the template to which they *would* match has been interted
        -- but the objective wasn't associated with any ARs with sufficiently advanced status

        -- Also doing the same for Goals

        -- Deduping templates ------------------------------------------------------------------
        -- Create the mappings
        DROP TABLE IF EXISTS obj_template_mapping;
        CREATE TEMP TABLE obj_template_mapping
        AS
        WITH hash_sets AS (
        SELECT
          hash,
          "regionId" region,
          MIN(id) target_otid,
          MIN("createdAt") hash_created_at,
          MAX("updatedAt") hash_updated_at,
          MAX("lastUsed") hash_last_used,
          COUNT(*)
        FROM "ObjectiveTemplates"
        GROUP BY 1,2
        HAVING COUNT(*) > 1
        )
        SELECT
          id otid,
          target_otid,
          hash_created_at,
          hash_updated_at,
          hash_last_used
        FROM hash_sets hs
        JOIN "ObjectiveTemplates" ot
          ON hs.hash = ot.hash
          AND hs.region = ot."regionId"
        ;

        DROP TABLE IF EXISTS goal_template_mapping;
        CREATE TEMP TABLE goal_template_mapping
        AS
        WITH hash_sets AS (
        SELECT
          hash,
          "regionId" region,
          MIN(id) target_gtid,
          MIN("createdAt") hash_created_at,
          MAX("updatedAt") hash_updated_at,
          MAX("lastUsed") hash_last_used,
          COUNT(*)
        FROM "GoalTemplates"
        GROUP BY 1,2
        HAVING COUNT(*) > 1
        )
        SELECT
          id gtid,
          target_gtid,
          hash_created_at,
          hash_updated_at,
          hash_last_used
        FROM hash_sets hs
        JOIN "GoalTemplates" gt
          ON hs.hash = gt.hash
          AND hs.region = gt."regionId"
        ;

        -- Fail out of the transaction with a divide by zero error if there
        -- are any field prompts for a goal template slated to be merged.
        -- There won't be any now, but this makes sure that if the logic is
        -- ever rerun in the future we won't accidentally make a big mess.
        SELECT 1 /
        (LEAST(COUNT(*),1) - 1)
        FROM goal_template_mapping
        JOIN "GoalTemplateFieldPrompts"
          ON "goalTemplateId" = gtid
        WHERE gtid != target_gtid
        ;

        -- Find GoalTemplateObjectiveTemplates that would just duplicate
        -- if updated. This is also empty so far
        DROP TABLE IF EXISTS gtot_to_be_deleted;
        CREATE TEMP TABLE gtot_to_be_deleted
        AS
        SELECT
          gtot.id target_gtotid,
          gtot2.id gtotid_to_delete
        FROM "GoalTemplateObjectiveTemplates" gtot
        JOIN goal_template_mapping gtm
          ON gtot."goalTemplateId" = gtm.target_gtid
        JOIN obj_template_mapping otm
          ON gtot."objectiveTemplateId" = otm.target_otid
        JOIN "GoalTemplateObjectiveTemplates" gtot2
          ON gtm.gtid = gtot2."goalTemplateId"
          AND otm.otid = gtot2."objectiveTemplateId"
        ;

        
        DELETE FROM "GoalTemplateObjectiveTemplates" gtot
        USING gtot_to_be_deleted 
        WHERE gtot.id = gtotid_to_delete
        ;

        -- Update GoalTemplateObjectiveTemplates to point to the merged records
        -- create a list of goal updates
        DROP TABLE IF EXISTS updated_goal_template_obj_template;
        CREATE TEMP TABLE updated_goal_template_obj_template
        AS
        WITH updater AS (
        UPDATE "GoalTemplateObjectiveTemplates" gtot
        SET "goalTemplateId" = target_gtid
        FROM goal_template_mapping
        WHERE gtot."goalTemplateId" = gtid
        RETURNING
          id gtotid,
          'goal_template' update_type,
          gtid old_value,
          target_gtid new_value
        )
        SELECT * FROM UPDATER
        ;

        -- Add the objective updates to the list
        WITH updater AS (
        UPDATE "GoalTemplateObjectiveTemplates" gtot
        SET "objectiveTemplateId" = target_otid
        FROM obj_template_mapping
        WHERE gtot."objectiveTemplateId" = otid
        RETURNING
          id gtotid,
          'obj_template' update_type,
          otid old_value,
          target_otid new_value
        ),
        insert AS (
        INSERT INTO updated_goal_template_obj_template
        SELECT * FROM updater
        RETURNING *
        )
        SELECT COUNT(*) FROM insert
        ;

        -- Update GoalTemplateResources
        -- The table is currently empty so this doesn't do anything yet
        DROP TABLE IF EXISTS updated_goal_tempalate_resources;
        CREATE TEMP TABLE updated_goal_tempalate_resources
        AS
        WITH updater AS (
        UPDATE "GoalTemplateResources" gtr
        SET "goalTemplateId" = target_gtid
        FROM goal_template_mapping
        WHERE gtr."goalTemplateId" = gtid
        RETURNING gtid
        )
        SELECT * FROM UPDATER
        ;

        -- update Goals to point to the merged template
        DROP TABLE IF EXISTS redirected_goals;
        CREATE TEMP TABLE redirected_goals
        AS
        WITH updater AS (
        UPDATE "Goals" g
        SET "goalTemplateId" = target_gtid
        FROM goal_template_mapping
        WHERE g."goalTemplateId" = gtid
          AND g."goalTemplateId" != target_gtid
        RETURNING
          id gid
        )
        SELECT * FROM UPDATER
        ;

        -- update Objectives to point to the merged template
        DROP TABLE IF EXISTS redirected_objectives;
        CREATE TEMP TABLE redirected_objectives
        AS
        WITH updater AS (
        UPDATE "Objectives" o
        SET "objectiveTemplateId" = target_otid
        FROM obj_template_mapping
        WHERE o."objectiveTemplateId" = otid
          AND o."objectiveTemplateId" != target_otid
        RETURNING
          id oid
        )
        SELECT * FROM UPDATER
        ;

        -- Actually delete duplicate templates
        DROP TABLE IF EXISTS deleted_gt_dupes;
        CREATE TEMP TABLE deleted_gt_dupes
        AS
        WITH updater AS (
        DELETE FROM "GoalTemplates" gt
        USING goal_template_mapping
        WHERE gt.id = gtid
          AND gt.id != target_gtid
        RETURNING
          id gid
        )
        SELECT * FROM UPDATER
        ;

        DROP TABLE IF EXISTS deleted_ot_dupes;
        CREATE TEMP TABLE deleted_ot_dupes
        AS
        WITH updater AS (
        DELETE FROM "ObjectiveTemplates" ot
        USING obj_template_mapping
        WHERE ot.id = otid
          AND ot.id != target_otid
        RETURNING
          id oid
        )
        SELECT * FROM UPDATER
        ;

        -- Connecting to objectives ------------------------------------------------------------------
        DROP TABLE IF EXISTS unconnected_objectives;
        CREATE TEMP TABLE unconnected_objectives
        AS
        WITH stat_progression AS (
        SELECT
          1 statord,
          'deleted'::"enum_ActivityReports_calculatedStatus" statname
        UNION SELECT 2, NULL
        UNION SELECT 3,'draft'
        UNION SELECT 4,'submitted'
        UNION SELECT 5,'needs_action'
        UNION SELECT 6,'approved'
        ),
        titlematch AS (
        SELECT
          o.id oid,
          ot.id otid,
          COALESCE(gr."regionId",ar."regionId") region,
          o."createdVia" = 'rtr' is_rtr,
          MAX(statord) most_advanced_ar,
          MAX(o."createdAt") template_last_used
        FROM "Objectives" o
        LEFT JOIN "Goals" g
          ON o."goalId" = g.id
        LEFT JOIN "Grants" gr
          ON g."grantId" = gr.id
        LEFT JOIN "ObjectiveTemplates" ot
          ON TRIM(o.title) = TRIM(ot."templateTitle")
          AND gr."regionId" = ot."regionId"
        LEFT JOIN "ActivityReportObjectives" aro
          ON o.id = aro."objectiveId"
        LEFT JOIN "ActivityReports" ar
          ON aro."activityReportId" = ar.id
        JOIN stat_progression
          ON (ar."calculatedStatus" IS NULL AND statname IS NULL)
          OR ar."calculatedStatus" = statname
        WHERE o."objectiveTemplateId" IS NULL
          AND LENGTH(o.title) > 9
        GROUP BY 1,2,3,4
        )
        SELECT
          oid,
          otid,
          otid IS NULL template_missing,
          region,
          is_rtr,
          most_advanced_ar,
          statname,
          template_last_used
        FROM titlematch
        JOIN stat_progression
          ON most_advanced_ar = statord
        WHERE region IS NOT NULL
        ;

        DROP TABLE IF EXISTS created_obj_templates;
        CREATE TEMP TABLE created_obj_templates
        AS
        WITH updater AS (
        INSERT INTO "ObjectiveTemplates" (
          hash,
          "templateTitle",
          "regionId",
          "creationMethod",
          "createdAt",
          "updatedAt",
          "lastUsed",
          "templateTitleModifiedAt"
        )
        SELECT
          MD5(o.title),
          o.title,
          uo.region,
          'Automatic'::"enum_ObjectiveTemplates_creationMethod",
          NOW(),
          NOW(),
          MAX(uo.template_last_used),
          NOW()
        FROM unconnected_objectives uo
        JOIN "Objectives" o
          ON o.id = uo.oid
        WHERE uo.otid IS NULL
          AND uo.most_advanced_ar > 3
        GROUP BY 1,2,3,4,5,6,8
        RETURNING
          id new_otid,
          "templateTitle" new_template_title
        )
        SELECT * FROM UPDATER
        ;

        UPDATE unconnected_objectives
        SET otid = new_otid
        FROM "Objectives"
        JOIN created_obj_templates
          ON new_template_title = title
        WHERE oid = id
        ;


        DROP TABLE IF EXISTS updated_objectives;
        CREATE TEMP TABLE updated_objectives
        AS
        WITH updater AS (
        UPDATE "Objectives" o
        SET "objectiveTemplateId" = otid
        FROM unconnected_objectives
        WHERE o.id = oid
          AND most_advanced_ar > 3
          AND "objectiveTemplateId" IS NULL
        RETURNING oid
        )
        SELECT * FROM UPDATER
        ;

        DROP TABLE IF EXISTS unconnected_objectives_after;
        CREATE TEMP TABLE unconnected_objectives_after
        AS
        WITH stat_progression AS (
        SELECT
          1 statord,
          'deleted'::"enum_ActivityReports_calculatedStatus" statname
        UNION SELECT 2, NULL
        UNION SELECT 3,'draft'
        UNION SELECT 4,'submitted'
        UNION SELECT 5,'needs_action'
        UNION SELECT 6,'approved'
        ),
        titlematch AS (
        SELECT
          o.id oid,
          ot.id otid,
          COALESCE(gr."regionId",ar."regionId") region,
          o."createdVia" = 'rtr' is_rtr,
          MAX(statord) most_advanced_ar,
          MAX(o."createdAt") template_last_used
        FROM "Objectives" o
        LEFT JOIN "Goals" g
          ON o."goalId" = g.id
        LEFT JOIN "Grants" gr
          ON g."grantId" = gr.id
        LEFT JOIN "ObjectiveTemplates" ot
          ON TRIM(o.title) = TRIM(ot."templateTitle")
          AND gr."regionId" = ot."regionId"
        LEFT JOIN "ActivityReportObjectives" aro
          ON o.id = aro."objectiveId"
        LEFT JOIN "ActivityReports" ar
          ON aro."activityReportId" = ar.id
        JOIN stat_progression
          ON (ar."calculatedStatus" IS NULL AND statname IS NULL)
          OR ar."calculatedStatus" = statname
        WHERE o."objectiveTemplateId" IS NULL
          AND LENGTH(o.title) > 9
        GROUP BY 1,2,3,4
        )
        SELECT
          oid,
          otid,
          otid IS NULL template_missing,
          region,
          is_rtr,
          most_advanced_ar,
          statname,
          template_last_used
        FROM titlematch
        JOIN stat_progression
          ON most_advanced_ar = statord
        WHERE region IS NOT NULL
        ;

        WITH befores AS (
        SELECT
          is_rtr,
          statname,
          COUNT(*) FILTER (WHERE template_missing) no_templ,
          COUNT(*) cnt,
          'before' beforeafter
        FROM unconnected_objectives
        GROUP BY 1,2,5
        ),
        afters AS (
        SELECT
          is_rtr,
          statname,
          COUNT(*) FILTER (WHERE otid IS NULL) no_templ,
          COUNT(*) cnt,
          'after' beforeafter
        FROM unconnected_objectives_after
        GROUP BY 1,2,5
        )
        SELECT
          b.is_rtr,
          b.statname most_advanced_ar_status,
          b.no_templ no_templ_before,
          COALESCE(a.no_templ,0) no_templ_after,
          b.cnt "before",
          COALESCE(a.cnt,0) "after"
        FROM befores b
        LEFT JOIN afters a
          ON (
              (b.statname IS NULL AND a.statname IS NULL)
              OR b.statname = a.statname
            )
          AND (
              (b.is_rtr IS NULL AND a.is_rtr IS NULL)
              OR b.is_rtr = a.is_rtr
            )
        ORDER BY 2,1
        ;

        -- GOAL SECTION -----------------------------------------------------

        DROP TABLE IF EXISTS unconnected_goals;
        CREATE TEMP TABLE unconnected_goals
        AS
        WITH stat_progression AS (
        SELECT
          1 statord,
          'deleted'::"enum_ActivityReports_calculatedStatus" statname
        UNION SELECT 2, NULL
        UNION SELECT 3,'draft'
        UNION SELECT 4,'submitted'
        UNION SELECT 5,'needs_action'
        UNION SELECT 6,'approved'
        ),
        namematch AS (
        SELECT
          g.id gid,
          gt.id gtid,
          gr."regionId" region,
          g."createdVia" = 'rtr' is_rtr,
          MAX(statord) most_advanced_ar,
          MAX(g."createdAt") template_last_used
        FROM "Goals" g
        JOIN "Grants" gr
          ON g."grantId" = gr.id
        LEFT JOIN "GoalTemplates" gt
          ON TRIM(g.name) = TRIM(gt."templateName")
          AND gr."regionId" = gt."regionId"
        LEFT JOIN "ActivityReportGoals" arg
          ON g.id = arg."goalId"
        LEFT JOIN "ActivityReports" ar
          ON arg."activityReportId" = ar.id
        JOIN stat_progression
          ON (ar."calculatedStatus" IS NULL AND statname IS NULL)
          OR ar."calculatedStatus" = statname
        WHERE g."goalTemplateId" IS NULL
        GROUP BY 1,2,3,4
        )
        SELECT
          gid,
          gtid,
          gtid IS NULL template_missing,
          region,
          is_rtr,
          most_advanced_ar,
          statname,
          template_last_used
        FROM namematch
        JOIN stat_progression
          ON most_advanced_ar = statord
        WHERE region IS NOT NULL
        ;

        DROP TABLE IF EXISTS created_goal_templates;
        CREATE TEMP TABLE created_goal_templates
        AS
        WITH updater AS (
        INSERT INTO "GoalTemplates" (
          hash,
          "templateName",
          "regionId",
          "creationMethod",
          "createdAt",
          "updatedAt",
          "lastUsed",
          "templateNameModifiedAt"
          -- not inserting "source" because that's null for autocreated templates
        )
        SELECT
          MD5(g.name),
          g.name,
          ug.region,
          'Automatic'::"enum_GoalTemplates_creationMethod",
          NOW(),
          NOW(),
          MAX(ug.template_last_used),
          NOW()
        FROM unconnected_goals ug
        JOIN "Goals" g
          ON g.id = ug.gid
        WHERE ug.gtid IS NULL
          AND ug.most_advanced_ar > 3
        GROUP BY 1,2,3,4,5,6,8
        RETURNING
          id new_gtid,
          "templateName" new_template_name
        )
        SELECT * FROM UPDATER
        ;

        UPDATE unconnected_goals
        SET gtid = new_gtid
        FROM "Goals"
        JOIN created_goal_templates
          ON new_template_name = name
        WHERE gid = id
        ;

        DROP TABLE IF EXISTS updated_goals;
        CREATE TEMP TABLE updated_goals
        AS
        WITH updater AS (
        UPDATE "Goals" g
        SET "goalTemplateId" = gtid
        FROM unconnected_goals
        WHERE g.id = gid
          AND most_advanced_ar > 3
          AND "goalTemplateId" IS NULL
        RETURNING gid
        )
        SELECT * FROM UPDATER
        ;

        DROP TABLE IF EXISTS unconnected_goals_after;
        CREATE TEMP TABLE unconnected_goals_after
        AS
        WITH stat_progression AS (
        SELECT
          1 statord,
          'deleted'::"enum_ActivityReports_calculatedStatus" statname
        UNION SELECT 2, NULL
        UNION SELECT 3,'draft'
        UNION SELECT 4,'submitted'
        UNION SELECT 5,'needs_action'
        UNION SELECT 6,'approved'
        ),
        namematch AS (
        SELECT
          g.id gid,
          gt.id gtid,
          gr."regionId" region,
          g."createdVia" = 'rtr' is_rtr,
          MAX(statord) most_advanced_ar,
          MAX(g."createdAt") template_last_used
        FROM "Goals" g
        JOIN "Grants" gr
          ON g."grantId" = gr.id
        LEFT JOIN "GoalTemplates" gt
          ON TRIM(g.name) = TRIM(gt."templateName")
          AND gr."regionId" = gt."regionId"
        LEFT JOIN "ActivityReportGoals" arg
          ON g.id = arg."goalId"
        LEFT JOIN "ActivityReports" ar
          ON arg."activityReportId" = ar.id
        JOIN stat_progression
          ON (ar."calculatedStatus" IS NULL AND statname IS NULL)
          OR ar."calculatedStatus" = statname
        WHERE g."goalTemplateId" IS NULL
        GROUP BY 1,2,3,4
        )
        SELECT
          gid,
          gtid,
          gtid IS NULL template_missing,
          region,
          is_rtr,
          most_advanced_ar,
          statname,
          template_last_used
        FROM namematch
        JOIN stat_progression
          ON most_advanced_ar = statord
        WHERE region IS NOT NULL
        ;

        WITH befores AS (
        SELECT
          is_rtr,
          statname,
          COUNT(*) FILTER (WHERE template_missing) no_templ,
          COUNT(*) cnt,
          'before' beforeafter
        FROM unconnected_goals
        GROUP BY 1,2,5
        ),
        afters AS (
        SELECT
          is_rtr,
          statname,
          COUNT(*) FILTER (WHERE gtid IS NULL) no_templ,
          COUNT(*) cnt,
          'after' beforeafter
        FROM unconnected_goals_after
        GROUP BY 1,2,5
        )
        SELECT
          b.is_rtr,
          b.statname most_advanced_ar_status,
          b.no_templ no_templ_before,
          COALESCE(a.no_templ,0) no_templ_after,
          b.cnt "before",
          COALESCE(a.cnt,0) "after"
        FROM befores b
        LEFT JOIN afters a
          ON (
              (b.statname IS NULL AND a.statname IS NULL)
              OR b.statname = a.statname
            )
          AND (
              (b.is_rtr IS NULL AND a.is_rtr IS NULL)
              OR b.is_rtr = a.is_rtr
            )
        ORDER BY 2,1
        ;
        
        DROP TABLE IF EXISTS obj_template_mapping;
        DROP TABLE IF EXISTS goal_template_mapping;
        DROP TABLE IF EXISTS gtot_to_be_deleted;
        DROP TABLE IF EXISTS updated_goal_template_obj_template;
        DROP TABLE IF EXISTS updated_goal_tempalate_resources;
        DROP TABLE IF EXISTS redirected_goals;
        DROP TABLE IF EXISTS redirected_objectives;
        DROP TABLE IF EXISTS deleted_gt_dupes;
        DROP TABLE IF EXISTS deleted_ot_dupes;

        DROP TABLE IF EXISTS unconnected_objectives;
        DROP TABLE IF EXISTS created_obj_templates;
        DROP TABLE IF EXISTS updated_objectives;
        DROP TABLE IF EXISTS unconnected_objectives_after;

        DROP TABLE IF EXISTS unconnected_goal;
        DROP TABLE IF EXISTS created_goal_templates;
        DROP TABLE IF EXISTS updated_goals;
        DROP TABLE IF EXISTS unconnected_goals_after;

      `,
        { transaction }
      )
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)
    }),
}
