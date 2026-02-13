const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      await queryInterface.sequelize.query(
        `
        ---------------------------------------------------
        -- NOTE:
        -- Files and Resources are most properly managed by
        -- maintenance jobs, so this and similar migrations
        -- won't delete them directly. Deleting the link
        -- records will give the maintenance job the info
        -- it needs to perform its housekeeping.
        ---------------------------------------------------
        -------- Deleting unwanted ARs --------
        -- Create the AR deletion list
        -- Remove AR link records: -------------
        -- ActivityRecipients
        -- ActivityReportApprovers
        -- ActivityReportCollaborators
        -- ActivityReportFiles (no need to remove Files)
        -- ActivityReportResources (no need to remove Resources)

        -- Create the NextSteps deletion list
        -- Remove NextSteps link records: -------------
        -- NextStepResources
        -- remove NextSteps -------------

        -- Create the ARO deletion list
        -- Remove ARO link records: -------------
        -- ActivityReportObjectiveFiles
        -- ActivityReportObjectiveResources
        -- ActivityReportObjectiveTopics
        -- ActivityReportObjectiveCourses
        -- remove AROs -------------------

        -- Create the orphaned Objective deletion list
        -- Remove Objective link records: -------------
        -- Delete ObjectiveCollaborators
        -- remove Objectives -------------

        -- Create the ARG deletion list
        -- Remove ARG link records: -------------
        -- ActivityReportGoalFieldResponses
        -- ActivityReportGoalResources
        -- remove ARGs -------------------

        -- Create the orphaned Goal deletions list
        -- ( check if isFromSmartsheetTtaPlan, isRttapa)
        -- Remove Goal link records: -------------
        -- EventReportPilotGoals
        -- GoalFieldResponses
        -- GoalResources
        -- remove Goals ------------------

        -- Create the orphaned ObjectiveTemplate deletion list
        -- Create the orphaned GoalTemplate deletion list
        -- Remove GoalTemplate link records: -------------
        -- GoalTemplateObjectiveTemplates
        -- Remove ObjectiveTemplates --------
        -- Remove GoalTemplates -------------

        -- Remove ARs -----------------------

        -- Test query

        -- Correct the onApprovedAR and onAR values for the goals
        -- and objectives that were not deleted

        -------------------------------------------------------------------------------------------------------------------
        -------- Deleting unwanted ARs --------
        -- Create the AR deletion list
        DROP TABLE IF EXISTS ars_to_delete;
        CREATE TEMP TABLE ars_to_delete
        AS
        SELECT id arid
        FROM "ActivityReports"
        WHERE id IN (24998, 24645, 24297, 24122, 27517, 30829, 29864, 6442, 23057, 23718, 25205, 25792, 25577, 25573, 26478, 26210, 27117, 26918, 28451, 28117, 27669, 29542, 29101, 29024, 30137, 29762, 31201)
        AND "regionId" = 10
        ;

        -- Remove AR link records: -------------
        DROP TABLE IF EXISTS deleted_activityrecipients;
        CREATE TEMP TABLE deleted_activityrecipients AS
        WITH deletes AS (
          DELETE FROM "ActivityRecipients"
          USING ars_to_delete
          WHERE "activityReportId" = arid
          RETURNING
          id
        )
        SELECT id FROM deletes
        ;
        DROP TABLE IF EXISTS deleted_activityreportapprovers;
        CREATE TEMP TABLE deleted_activityreportapprovers AS
        WITH deletes AS (
          DELETE FROM "ActivityReportApprovers"
          USING ars_to_delete
          WHERE "activityReportId" = arid
          RETURNING
          id
        )
        SELECT id FROM deletes
        ;
        DROP TABLE IF EXISTS deleted_activityreportcollaborators;
        CREATE TEMP TABLE deleted_activityreportcollaborators AS
        WITH deletes AS (
          DELETE FROM "ActivityReportCollaborators"
          USING ars_to_delete
          WHERE "activityReportId" = arid
          RETURNING
          id
        )
        SELECT id FROM deletes
        ;
        DROP TABLE IF EXISTS deleted_activityreportfiles;
        CREATE TEMP TABLE deleted_activityreportfiles AS
        WITH deletes AS (
          DELETE FROM "ActivityReportFiles"
          USING ars_to_delete
          WHERE "activityReportId" = arid
          RETURNING
          id,
          "fileId" fid
        )
        SELECT id, fid FROM deletes
        ;
        DROP TABLE IF EXISTS deleted_activityreportresources;
        CREATE TEMP TABLE deleted_activityreportresources AS
        WITH deletes AS (
          DELETE FROM "ActivityReportResources"
          USING ars_to_delete
          WHERE "activityReportId" = arid
          RETURNING
          id,
          "resourceId" resourceid
        )
        SELECT id, resourceid FROM deletes
        ;



        -- Create the NextSteps deletion list
        DROP TABLE IF EXISTS nextsteps_to_delete;
        CREATE TEMP TABLE nextsteps_to_delete
        AS
        SELECT
          id nsid
        FROM "NextSteps"
        JOIN ars_to_delete
          ON "activityReportId" = arid
        ;
        -- Remove NextSteps link records: -------------
        DROP TABLE IF EXISTS deleted_nextstepresources;
        CREATE TEMP TABLE deleted_nextstepresources AS
        WITH deletes AS (
          DELETE FROM "NextStepResources"
          USING nextsteps_to_delete
          WHERE "nextStepId" = nsid
          RETURNING
          id,
          "resourceId" resourceid
        )
        SELECT id, resourceid FROM deletes
        ;
        -- remove NextSteps -------------
        DROP TABLE IF EXISTS deleted_nextsteps;
        CREATE TEMP TABLE deleted_nextsteps AS
        WITH deletes AS (
          DELETE FROM "NextSteps"
          USING nextsteps_to_delete
          WHERE id = nsid
          RETURNING
          id
        )
        SELECT id FROM deletes
        ;


        -- Create the ARO deletion list
        DROP TABLE IF EXISTS aros_to_delete;
        CREATE TEMP TABLE aros_to_delete
        AS
        SELECT
          id aroid,
          "objectiveId" oid
        FROM "ActivityReportObjectives"
        JOIN ars_to_delete
          ON "activityReportId" = arid
        ;
        -- Remove ARO link records: -------------
        DROP TABLE IF EXISTS deleted_activityreportobjectivefiles;
        CREATE TEMP TABLE deleted_activityreportobjectivefiles AS
        WITH deletes AS (
          DELETE FROM "ActivityReportObjectiveFiles"
          USING aros_to_delete
          WHERE "activityReportObjectiveId" = aroid
          RETURNING
          id,
          "fileId" fid
        )
        SELECT id, fid FROM deletes
        ;
        DROP TABLE IF EXISTS deleted_activityreportobjectiveresources;
        CREATE TEMP TABLE deleted_activityreportobjectiveresources AS
        WITH deletes AS (
          DELETE FROM "ActivityReportObjectiveResources"
          USING aros_to_delete
          WHERE "activityReportObjectiveId" = aroid
          RETURNING
          id,
          "resourceId" resourceid
        )
        SELECT id, resourceid FROM deletes
        ;
        DROP TABLE IF EXISTS deleted_activityreportobjectivetopics;
        CREATE TEMP TABLE deleted_activityreportobjectivetopics AS
        WITH deletes AS (
          DELETE FROM "ActivityReportObjectiveTopics"
          USING aros_to_delete
          WHERE "activityReportObjectiveId" = aroid
          RETURNING
          id
        )
        SELECT id FROM deletes
        ;
        DROP TABLE IF EXISTS deleted_activityreportobjectivecourses;
        CREATE TEMP TABLE deleted_activityreportobjectivecourses AS
        WITH deletes AS (
          DELETE FROM "ActivityReportObjectiveCourses"
          USING aros_to_delete
          WHERE "activityReportObjectiveId" = aroid
          RETURNING
          id
        )
        SELECT id FROM deletes
        ;
        -- remove AROs -------------------
        DROP TABLE IF EXISTS deleted_aros;
        CREATE TEMP TABLE deleted_aros AS
        WITH deletes AS (
          DELETE FROM "ActivityReportObjectives"
          USING aros_to_delete
          WHERE id = aroid
          RETURNING
          id,
          "objectiveId" oid
        )
        SELECT id, oid FROM deletes
        ;

        -- Create the orphaned Objective deletion list
        DROP TABLE IF EXISTS objectives_to_delete;
        CREATE TEMP TABLE objectives_to_delete
        AS
        SELECT DISTINCT oid
        FROM deleted_aros
        EXCEPT
        SELECT DISTINCT "objectiveId"
        FROM "ActivityReportObjectives"
        ;
        -- Remove Objective link records: -------------
        -- Delete ObjectiveCollaborators
        DROP TABLE IF EXISTS deleted_objectivecollaborators;
        CREATE TEMP TABLE deleted_objectivecollaborators AS
        WITH deletes AS (
          DELETE FROM "ObjectiveCollaborators"
          USING objectives_to_delete
          WHERE "objectiveId" = oid
          RETURNING
          id
        )
        SELECT id FROM deletes
        ;
        
        -- remove Objectives -------------------
        DROP TABLE IF EXISTS deleted_objectives;
        CREATE TEMP TABLE deleted_objectives AS
        WITH deletes AS (
          DELETE FROM "Objectives"
          USING objectives_to_delete
          WHERE id = oid
          RETURNING
          id,
          "goalId" gid,
          "objectiveTemplateId" otid
        )
        SELECT id, gid, otid FROM deletes
        ;

        -- Create the ARG deletion list
        DROP TABLE IF EXISTS args_to_delete;
        CREATE TEMP TABLE args_to_delete
        AS
        SELECT DISTINCT
          id argid,
          "goalId" gid
        FROM "ActivityReportGoals"
        JOIN ars_to_delete
          ON "activityReportId" = arid
        ;
        -- Remove ARG link records: -------------
        DROP TABLE IF EXISTS deleted_activityreportgoalfieldresponses;
        CREATE TEMP TABLE deleted_activityreportgoalfieldresponses AS
        WITH deletes AS (
          DELETE FROM "ActivityReportGoalFieldResponses"
          USING args_to_delete
          WHERE "activityReportGoalId" = argid
          RETURNING
          id
        )
        SELECT id FROM deletes
        ;
        DROP TABLE IF EXISTS deleted_activityreportgoalresources;
        CREATE TEMP TABLE deleted_activityreportgoalresources AS
        WITH deletes AS (
          DELETE FROM "ActivityReportGoalResources"
          USING args_to_delete
          WHERE "activityReportGoalId" = argid
          RETURNING
          id,
          "resourceId" resourceid
        )
        SELECT id, resourceid FROM deletes
        ;
        -- remove ARGs -------------------
        DROP TABLE IF EXISTS deleted_args;
        CREATE TEMP TABLE deleted_args AS
        WITH deletes AS (
          DELETE FROM "ActivityReportGoals"
          USING args_to_delete
          WHERE id = argid
          RETURNING
          id,
          "goalId" gid
        )
        SELECT id, gid FROM deletes
        ;

        -- Create the orphaned Goal deletions list
        DROP TABLE IF EXISTS goals_to_delete;
        CREATE TEMP TABLE goals_to_delete
        AS
        SELECT DISTINCT gid
        FROM deleted_args dargs
        JOIN "Goals" g
          ON gid = g.id
        WHERE (g."isRttapa" IS NULL OR g."isRttapa" != 'Yes')
          AND g."isFromSmartsheetTtaPlan" != TRUE
          AND g."createdVia" != 'merge'
        EXCEPT 
        SELECT gid
        FROM (
          SELECT DISTINCT "goalId" gid
          FROM "ActivityReportGoals"
          UNION
          SELECT DISTINCT "goalId"
          FROM "Objectives"
          UNION
          SELECT DISTINCT "goalId"
          FROM "EventReportPilotGoals"
        ) keepers
        ;
        -- Remove Goal link records: -------------
        DROP TABLE IF EXISTS deleted_goalcollaborators;
        CREATE TEMP TABLE deleted_goalcollaborators AS
        WITH deletes AS (
          DELETE FROM "GoalCollaborators"
          USING goals_to_delete
          WHERE "goalId" = gid
          RETURNING
          id
        )
        SELECT id FROM deletes
        ;
        DROP TABLE IF EXISTS deleted_goalfieldresponses;
        CREATE TEMP TABLE deleted_goalfieldresponses AS
        WITH deletes AS (
          DELETE FROM "GoalFieldResponses"
          USING goals_to_delete
          WHERE "goalId" = gid
          RETURNING
          id
        )
        SELECT id FROM deletes
        ;
        DROP TABLE IF EXISTS deleted_goalresources;
        CREATE TEMP TABLE deleted_goalresources AS
        WITH deletes AS (
          DELETE FROM "GoalResources"
          USING goals_to_delete
          WHERE "goalId" = gid
          RETURNING
          id,
          "resourceId" resourceid
        )
        SELECT id, resourceid FROM deletes
        ;
        DROP TABLE IF EXISTS deleted_goalstatuschanges;
        CREATE TEMP TABLE deleted_goalstatuschanges AS
        WITH deletes AS (
          DELETE FROM "GoalStatusChanges"
          USING goals_to_delete
          WHERE "goalId" = gid
          RETURNING
          id,
          "goalId" gid
        )
        SELECT id, gid FROM deletes
        ;
        -- remove Goals -------------------
        DROP TABLE IF EXISTS deleted_goals;
        CREATE TEMP TABLE deleted_goals AS
        WITH deletes AS (
          DELETE FROM "Goals"
          USING goals_to_delete
          WHERE id = gid
          RETURNING
          id,
          "goalTemplateId" gtid
        )
        SELECT id, gtid FROM deletes
        ;

        -- Create the orphaned ObjectiveTemplate deletion list
        DROP TABLE IF EXISTS ots_to_delete;
        CREATE TEMP TABLE ots_to_delete
        AS
        SELECT DISTINCT otid
        FROM deleted_objectives
        EXCEPT
        SELECT DISTINCT "objectiveTemplateId"
        FROM "Objectives"
        ;

        -- Create the orphaned GoalTemplate deletion list
        DROP TABLE IF EXISTS gts_to_delete;
        CREATE TEMP TABLE gts_to_delete
        AS
        SELECT DISTINCT gtid
        FROM deleted_goals
        EXCEPT
        SELECT DISTINCT "goalTemplateId"
        FROM "Goals"
        ;
        -- Remove GoalTemplate link records: -------------
        DROP TABLE IF EXISTS deleted_goaltemplateobjectivetemplates;
        CREATE TEMP TABLE deleted_goaltemplateobjectivetemplates AS
        WITH unified_deletes AS (
          SELECT DISTINCT id gtotid
          FROM "GoalTemplateObjectiveTemplates"
          JOIN ots_to_delete
            ON otid = "objectiveTemplateId"
          UNION
          SELECT DISTINCT id gtotid
          FROM "GoalTemplateObjectiveTemplates"
          JOIN gts_to_delete
            ON gtid = "goalTemplateId"
        ),
        deletes AS (
          DELETE FROM "GoalTemplateObjectiveTemplates"
          USING unified_deletes
          WHERE id = gtotid
          RETURNING
          id
        )
        SELECT id FROM deletes
        ;
        -- Remove ObjectiveTemplates --------
        DROP TABLE IF EXISTS deleted_objectivetemplates;
        CREATE TEMP TABLE deleted_objectivetemplates AS
        WITH deletes AS (
          DELETE FROM "ObjectiveTemplates"
          USING ots_to_delete
          WHERE id = otid
          RETURNING
          id
        )
        SELECT id FROM deletes
        ;
        -- Remove GoalTemplates -------------
        DROP TABLE IF EXISTS deleted_goaltemplates;
        CREATE TEMP TABLE deleted_goaltemplates AS
        WITH deletes AS (
          DELETE FROM "GoalTemplates"
          USING gts_to_delete
          WHERE id = gtid
          RETURNING
          id
        )
        SELECT id FROM deletes
        ;

        -- Remove ARs -------------
        DROP TABLE IF EXISTS deleted_ars;
        CREATE TEMP TABLE deleted_ars AS
        WITH deletes AS (
          DELETE FROM "ActivityReports"
          USING ars_to_delete
          WHERE id = arid
          RETURNING
          id
        )
        SELECT id FROM deletes
        ;


        -- Stats ----------------------------
        SELECT 1,'ars_to_delete', count(*) FROM ars_to_delete
        UNION
        SELECT 2,'deleted_activityreportapprovers', count(*) FROM deleted_activityreportapprovers
        UNION
        SELECT 3,'deleted_activityreportcollaborators', count(*) FROM deleted_activityreportcollaborators
        UNION
        SELECT 4,'deleted_activityreportfiles', count(*) FROM deleted_activityreportfiles
        UNION
        SELECT 5,'deleted_activityreportresources', count(*) FROM deleted_activityreportresources
        UNION
        SELECT 6,'nextsteps_to_delete', count(*) FROM nextsteps_to_delete
        UNION
        SELECT 7,'deleted_nextstepresources', count(*) FROM deleted_nextstepresources
        UNION
        SELECT 8,'deleted_nextsteps', count(*) FROM deleted_nextsteps
        UNION
        SELECT 9,'aros_to_delete', count(*) FROM aros_to_delete
        UNION
        SELECT 10,'deleted_activityreportobjectivefiles', count(*) FROM deleted_activityreportobjectivefiles
        UNION
        SELECT 11,'deleted_activityreportobjectiveresources', count(*) FROM deleted_activityreportobjectiveresources
        UNION
        SELECT 12,'deleted_activityreportobjectivetopics', count(*) FROM deleted_activityreportobjectivetopics
        UNION
        SELECT 12,'deleted_activityreportobjectivecourses', count(*) FROM deleted_activityreportobjectivetopics
        UNION
        SELECT 13,'deleted_aros', count(*) FROM deleted_aros
        UNION
        SELECT 14,'objectives_to_delete', count(*) FROM objectives_to_delete
        UNION
        SELECT 14,'deleted_objectivecollaborators', count(*) FROM objectives_to_delete
        UNION
        SELECT 15,'deleted_objectives', count(*) FROM deleted_objectives
        UNION
        SELECT 16,'args_to_delete', count(*) FROM args_to_delete
        UNION
        SELECT 17,'deleted_activityreportgoalfieldresponses', count(*) FROM deleted_activityreportgoalfieldresponses
        UNION
        SELECT 18,'deleted_activityreportgoalresources', count(*) FROM deleted_activityreportgoalresources
        UNION
        SELECT 19,'deleted_args', count(*) FROM deleted_args
        UNION
        SELECT 20,'goals_to_delete', count(*) FROM goals_to_delete
        UNION
        SELECT 21,'deleted_goalcollaborators', count(*) FROM deleted_goalcollaborators
        UNION
        SELECT 22,'deleted_goalfieldresponses', count(*) FROM deleted_goalfieldresponses
        UNION
        SELECT 23,'deleted_goalresources', count(*) FROM deleted_goalresources
        UNION
        SELECT 24,'deleted_goalstatuschanges', count(*) FROM deleted_goalstatuschanges
        UNION
        SELECT 25,'deleted_goals', count(*) FROM deleted_goals
        UNION
        SELECT 26,'ots_to_delete', count(*) FROM ots_to_delete
        UNION
        SELECT 27,'gts_to_delete', count(*) FROM gts_to_delete
        UNION
        SELECT 28,'deleted_goaltemplateobjectivetemplates', count(*) FROM deleted_goaltemplateobjectivetemplates
        UNION
        SELECT 29,'deleted_objectivetemplates', count(*) FROM deleted_objectivetemplates
        UNION
        SELECT 30,'deleted_goaltemplates', count(*) FROM deleted_goaltemplates
        UNION
        SELECT 31,'deleted_ars', count(*) FROM deleted_ars
        ORDER BY 1
        ;

        -- Reset the onApprovedAR and onAR values for the goals and objectives that
        -- were not deleted
        --  1. Calculate correct onApprovedAR values for objectives
        DROP TABLE IF EXISTS objectives_on_ars;
        CREATE TEMP TABLE objectives_on_ars
        AS
        WITH objectivelist AS (
        SELECT DISTINCT oid FROM aros_to_delete
        EXCEPT
        SELECT id FROM deleted_objectives
        )
        SELECT
          o.id oid,
          BOOL_OR(ar.id IS NOT NULL AND ar."calculatedStatus" = 'approved') on_approved_ar,
          BOOL_OR(ar.id IS NOT NULL) on_ar
        FROM objectivelist ol
        JOIN "Objectives" o
          ON ol.oid = o.id
        LEFT JOIN "ActivityReportObjectives" aro
          ON o.id = aro."objectiveId"
        LEFT JOIN "ActivityReports" ar
          ON aro."activityReportId" = ar.id
          AND ar."calculatedStatus" != 'deleted'
        GROUP BY 1
        ;
        --  2. Calculate correct onApprovedAR values for goals
        DROP TABLE IF EXISTS goals_on_ars;
        CREATE TEMP TABLE goals_on_ars
        AS
        WITH goallist AS (
        SELECT DISTINCT gid FROM args_to_delete
        EXCEPT
        SELECT id FROM deleted_goals
        )
        SELECT
          g.id gid,
          BOOL_OR(
            (ar.id IS NOT NULL AND ar."calculatedStatus" = 'approved')
            OR
            COALESCE(ooaa.on_approved_ar,FALSE)
          ) on_approved_ar,
          BOOL_OR(ar.id IS NOT NULL OR COALESCE(ooaa.on_ar,FALSE)) on_ar
        FROM goallist gl
        JOIN "Goals" g
          ON g.id = gl.gid
        LEFT JOIN "ActivityReportGoals" arg
          ON g.id = arg."goalId"
        LEFT JOIN "ActivityReports" ar
          ON arg."activityReportId" = ar.id
          AND ar."calculatedStatus" != 'deleted'
        LEFT JOIN "Objectives" o
          ON o."goalId" = g.id
        LEFT JOIN objectives_on_ars ooaa
          ON ooaa.oid = o.id
        GROUP BY 1
        ;
        --  3. Calculate onApprovedAR stats for objectives
        DROP TABLE IF EXISTS initial_obj_approved_ar_stats;
        CREATE TEMP TABLE initial_obj_approved_ar_stats
        AS
        SELECT
          COUNT(*) FILTER (WHERE on_approved_ar = "onApprovedAR"
          ) matching_values,
          COUNT(*) FILTER (WHERE "onApprovedAR" IS NOT NULL AND on_approved_ar != "onApprovedAR"
          ) incorrect_values,
          COUNT(*) FILTER (WHERE on_approved_ar AND (NOT "onApprovedAR" OR "onApprovedAR" IS NULL)
          ) should_be_marked_true_but_isnt,
          COUNT(*) FILTER (WHERE NOT on_approved_ar AND ("onApprovedAR" OR "onApprovedAR" IS NULL)
          ) marked_true_but_shouldnt_be,
          COUNT(*) total_objectives
        FROM "Objectives" o
        JOIN objectives_on_ars
          ON o.id = oid
        ;
        --  4. Calculate onAR stats for objectives
        DROP TABLE IF EXISTS initial_obj_onar_stats;
        CREATE TEMP TABLE initial_obj_onar_stats
        AS
        SELECT
          COUNT(*) FILTER (WHERE on_ar = "onAR"
          ) matching_values,
          COUNT(*) FILTER (WHERE "onAR" IS NOT NULL AND on_ar != "onAR"
          ) incorrect_values,
          COUNT(*) FILTER (WHERE on_ar AND (NOT "onAR" OR "onAR" IS NULL)
          ) should_be_marked_true_but_isnt,
          COUNT(*) FILTER (WHERE NOT on_ar AND ("onAR" OR "onAR" IS NULL)
          ) marked_true_but_shouldnt_be,
          COUNT(*) total_objectives
        FROM "Objectives" o
        JOIN objectives_on_ars
          ON o.id = oid
        ;
        --  5. Calculate onApprovedAR stats for goals
        DROP TABLE IF EXISTS initial_goal_approved_ar_stats;
        CREATE TEMP TABLE initial_goal_approved_ar_stats
        AS
        SELECT
          COUNT(*) FILTER (WHERE on_approved_ar = "onApprovedAR"
          ) matching_values,
          COUNT(*) FILTER (WHERE "onApprovedAR" IS NOT NULL AND on_approved_ar != "onApprovedAR"
          ) incorrect_values,
          COUNT(*) FILTER (WHERE on_approved_ar AND (NOT "onApprovedAR" OR "onApprovedAR" IS NULL)
          ) should_be_marked_true_but_isnt,
          COUNT(*) FILTER (WHERE NOT on_approved_ar AND ("onApprovedAR" OR "onApprovedAR" IS NULL)
          ) marked_true_but_shouldnt_be,
          COUNT(*) total_goals
        FROM "Goals" g
        JOIN goals_on_ars
          ON g.id = gid
        ;
        --  6. Calculate onAR stats for goals
        DROP TABLE IF EXISTS initial_goal_onar_stats;
        CREATE TEMP TABLE initial_goal_onar_stats
        AS
        SELECT
          COUNT(*) FILTER (WHERE on_ar = "onAR"
          ) matching_values,
          COUNT(*) FILTER (WHERE "onAR" IS NOT NULL AND on_ar != "onAR"
          ) incorrect_values,
          COUNT(*) FILTER (WHERE on_ar AND (NOT "onAR" OR "onAR" IS NULL)
          ) should_be_marked_true_but_isnt,
          COUNT(*) FILTER (WHERE NOT on_ar AND ("onAR" OR "onAR" IS NULL)
          ) marked_true_but_shouldnt_be,
          COUNT(*) total_goals
        FROM "Goals" g
        JOIN goals_on_ars
          ON g.id = gid
        ;
        --  7. Update onApprovedAR values for objectives and save the results
        DROP TABLE IF EXISTS corrected_approved_objectives;
        CREATE TEMP TABLE corrected_approved_objectives
        AS
        WITH updater AS (
          UPDATE "Objectives" o
          SET "onApprovedAR" = on_approved_ar
          FROM objectives_on_ars
          WHERE o.id = oid
            AND ("onApprovedAR" != on_approved_ar OR "onApprovedAR" IS NULL)
          RETURNING
            oid,
            on_approved_ar
        ) SELECT * FROM updater
        ;
        --  8. Update onAR values for objectives and save the results
        DROP TABLE IF EXISTS corrected_onar_objectives;
        CREATE TEMP TABLE corrected_onar_objectives
        AS
        WITH updater AS (
          UPDATE "Objectives" o
          SET "onAR" = on_ar
          FROM objectives_on_ars
          WHERE o.id = oid
            AND ("onAR" != on_ar OR "onAR" IS NULL)
          RETURNING
            oid,
            on_ar
        ) SELECT * FROM updater
        ;
        --  9. Update onApprovedAR values for goals and save the results
        DROP TABLE IF EXISTS corrected_approved_goals;
        CREATE TEMP TABLE corrected_approved_goals
        AS
        WITH updater AS (
          UPDATE "Goals" g
          SET "onApprovedAR" = on_approved_ar
          FROM goals_on_ars
          WHERE g.id = gid
            AND ("onApprovedAR" != on_approved_ar OR "onApprovedAR" IS NULL)
          RETURNING
            gid,
            on_approved_ar
        ) SELECT * FROM updater
        ;
        --  10. Update onAR values for goals and save the results
        DROP TABLE IF EXISTS corrected_onar_goals;
        CREATE TEMP TABLE corrected_onar_goals
        AS
        WITH updater AS (
          UPDATE "Goals" g
          SET "onAR" = on_ar
          FROM goals_on_ars
          WHERE g.id = gid
            AND ("onAR" != on_ar OR "onAR" IS NULL)
          RETURNING
            gid,
            on_ar
        ) SELECT * FROM updater
        ;
        -- produce stats on what happened
        --  11. Final onApprovedAR stats for objectives
        DROP TABLE IF EXISTS final_obj_approved_ar_stats;
        CREATE TEMP TABLE final_obj_approved_ar_stats
        AS
        SELECT
          COUNT(*) FILTER (WHERE on_approved_ar = "onApprovedAR"
          ) matching_values,
          COUNT(*) FILTER (WHERE "onApprovedAR" IS NOT NULL AND on_approved_ar != "onApprovedAR"
          ) incorrect_values,
          COUNT(*) FILTER (WHERE on_approved_ar AND (NOT "onApprovedAR" OR "onApprovedAR" IS NULL)
          ) should_be_marked_true_but_isnt,
          COUNT(*) FILTER (WHERE NOT on_approved_ar AND ("onApprovedAR" OR "onApprovedAR" IS NULL)
          ) marked_true_but_shouldnt_be,
          COUNT(*) total_objectives
        FROM "Objectives" o
        JOIN objectives_on_ars
          ON o.id = oid
        ;
        --  12. Final onAR stats for objectives
        DROP TABLE IF EXISTS final_obj_onar_stats;
        CREATE TEMP TABLE final_obj_onar_stats
        AS
        SELECT
          COUNT(*) FILTER (WHERE on_ar = "onAR"
          ) matching_values,
          COUNT(*) FILTER (WHERE "onAR" IS NOT NULL AND on_ar != "onAR"
          ) incorrect_values,
          COUNT(*) FILTER (WHERE on_ar AND (NOT "onAR" OR "onAR" IS NULL)
          ) should_be_marked_true_but_isnt,
          COUNT(*) FILTER (WHERE NOT on_ar AND ("onAR" OR "onAR" IS NULL)
          ) marked_true_but_shouldnt_be,
          COUNT(*) total_objectives
        FROM "Objectives" o
        JOIN objectives_on_ars
          ON o.id = oid
        ;
        --  13. Final onApprovedAR stats for goals
        DROP TABLE IF EXISTS final_goal_approved_ar_stats;
        CREATE TEMP TABLE final_goal_approved_ar_stats
        AS
        SELECT
          COUNT(*) FILTER (WHERE on_approved_ar = "onApprovedAR"
          ) matching_values,
          COUNT(*) FILTER (WHERE "onApprovedAR" IS NOT NULL AND on_approved_ar != "onApprovedAR"
          ) incorrect_values,
          COUNT(*) FILTER (WHERE on_approved_ar AND (NOT "onApprovedAR" OR "onApprovedAR" IS NULL)
          ) should_be_marked_true_but_isnt,
          COUNT(*) FILTER (WHERE NOT on_approved_ar AND ("onApprovedAR" OR "onApprovedAR" IS NULL)
          ) marked_true_but_shouldnt_be,
          COUNT(*) total_goals
        FROM "Goals" g
        JOIN goals_on_ars
          ON g.id = gid
        ;
        --  14. Final onAR stats for goals
        DROP TABLE IF EXISTS final_goal_onar_stats;
        CREATE TEMP TABLE final_goal_onar_stats
        AS
        SELECT
          COUNT(*) FILTER (WHERE on_ar = "onAR"
          ) matching_values,
          COUNT(*) FILTER (WHERE "onAR" IS NOT NULL AND on_ar != "onAR"
          ) incorrect_values,
          COUNT(*) FILTER (WHERE on_ar AND (NOT "onAR" OR "onAR" IS NULL)
          ) should_be_marked_true_but_isnt,
          COUNT(*) FILTER (WHERE NOT on_ar AND ("onAR" OR "onAR" IS NULL)
          ) marked_true_but_shouldnt_be,
          COUNT(*) total_goals
        FROM "Goals" g
        JOIN goals_on_ars
          ON g.id = gid
        ;
        -- make a nice little table to see the math
        SELECT
          1 AS order,
          'objective onApprovedAR starting stats' description,
          matching_values,
          incorrect_values,
          should_be_marked_true_but_isnt,
          marked_true_but_shouldnt_be,
          total_objectives total
        FROM initial_obj_approved_ar_stats
        UNION
        SELECT
          2,
          'objective onApprovedAR values changed',
          NULL,
          NULL,
          SUM(CASE WHEN on_approved_ar THEN 1 ELSE 0 END),
          SUM(CASE WHEN NOT on_approved_ar THEN 1 ELSE 0 END),
          COUNT(*)
        FROM corrected_approved_objectives
        UNION
        SELECT 3,'objective onApprovedAR ending stats', * FROM final_obj_approved_ar_stats
        UNION
        SELECT 4,'objective onAR starting stats', * FROM initial_obj_onar_stats
        UNION
        SELECT
          5,
          'objective onAR values changed',
          NULL,
          NULL,
          SUM(CASE WHEN on_ar THEN 1 ELSE 0 END),
          SUM(CASE WHEN NOT on_ar THEN 1 ELSE 0 END),
          COUNT(*)
        FROM corrected_onar_objectives
        UNION
        SELECT 6,'objective onAR ending stats', * FROM final_obj_onar_stats
        UNION
        SELECT 7,'goal onApprovedAR starting stats', * FROM initial_goal_approved_ar_stats
        UNION
        SELECT
          8,
          'goal onApprovedAR values changed',
          NULL,
          NULL,
          SUM(CASE WHEN on_approved_ar THEN 1 ELSE 0 END),
          SUM(CASE WHEN NOT on_approved_ar THEN 1 ELSE 0 END),
          COUNT(*)
        FROM corrected_approved_goals
        UNION
        SELECT 9,'goal onApprovedAR ending stats', * FROM final_goal_approved_ar_stats
        UNION
        SELECT 10,'goal onAR starting stats', * FROM initial_goal_onar_stats
        UNION
        SELECT
          11,
          'goal onAR values changed',
          NULL,
          NULL,
          SUM(CASE WHEN on_ar THEN 1 ELSE 0 END),
          SUM(CASE WHEN NOT on_ar THEN 1 ELSE 0 END),
          COUNT(*)
        FROM corrected_onar_goals
        UNION
        SELECT 12,'goal onAR ending stats', * FROM final_goal_onar_stats
        ORDER BY 1
        ;

      `,
        { transaction }
      )
    })
  },

  down: async () => {},
}
