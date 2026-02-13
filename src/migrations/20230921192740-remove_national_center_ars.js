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
        -- remove AROs -------------------

        -- Create the orphaned Objective deletion list
        -- Remove Objective link records: -------------
        -- ObjectiveFiles
        -- ObjectiveResources
        -- ObjectiveTopics
        -- remove Objectives -------------

        -- Create the ARG deletion list
        -- Remove ARG link records: -------------
        -- ActivityReportGoalFieldResponses
        -- ActivityReportGoalResources
        -- remove ARGs -------------------

        -- Create the orphaned Goal deletions list
        -- ( check if isFromSmartsheetTtaPlan, isRttapa)
        -- Remove Goal link records: -------------
        -- GoalFieldResponses
        -- GoalResources
        -- remove Goals ------------------

        -- Create the orphaned ObjectiveTemplate deletion list
        -- Remove ObjectiveTemplate link records: -------------
        -- ObjectiveTemplateFiles
        -- ObjectiveTemplateResources
        -- ObjectiveTemplateTopics

        -- Create the orphaned GoalTemplate deletion list
        -- Remove GoalTemplate link records: -------------
        -- GoalTemplateObjectiveTemplates
        -- Remove ObjectiveTemplates --------
        -- Remove GoalTemplates -------------

        -- Remove ARs -----------------------

        -------------------------------------------------------------------------------------------------------------------
        -------- Deleting unwanted ARs --------
        -- Create the AR deletion list
        DROP TABLE IF EXISTS ars_to_delete;
        CREATE TEMP TABLE ars_to_delete
        AS
        SELECT id arid
        FROM "ActivityReports"
        WHERE id IN (9030, 9119, 9131, 9175, 9204, 9271, 9282, 9290, 9295, 9297, 9326, 9341, 9489, 21462, 21463, 21464, 21507, 21535, 21555, 21563, 21564, 21592, 21631, 21682, 24578, 24633, 24637, 24701, 24732, 24761, 24764, 24765, 24767, 24785, 24790, 24797, 24799, 24800, 24803, 24816, 24840, 24861, 24879, 24889, 24903, 24953, 26246, 26248, 26249, 26252, 26367, 26368, 26390, 26393, 26406, 26421, 26432, 26443, 26911, 29455, 29837, 29957, 30081, 30088, 30089, 30090, 30338, 30391, 30429, 30481, 30504, 30562, 30890)
        AND "regionId" = 2
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
        -- remove AROs -------------------
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
        CREATE TEMP TABLE objectives_to_delete
        AS
        SELECT DISTINCT oid
        FROM deleted_aros
        EXCEPT
        SELECT DISTINCT "objectiveId"
        FROM "ActivityReportObjectives"
        ;
        -- Remove Objective link records: -------------
        CREATE TEMP TABLE deleted_objectivefiles AS
        WITH deletes AS (
          DELETE FROM "ObjectiveFiles"
          USING objectives_to_delete
          WHERE "objectiveId" = oid
          RETURNING
          id,
          "fileId" fid
        )
        SELECT id, fid FROM deletes
        ;
        CREATE TEMP TABLE deleted_objectiveresources AS
        WITH deletes AS (
          DELETE FROM "ObjectiveResources"
          USING objectives_to_delete
          WHERE "objectiveId" = oid
          RETURNING
          id,
          "resourceId" resourceid
        )
        SELECT id, resourceid FROM deletes
        ;
        CREATE TEMP TABLE deleted_objectivetopics AS
        WITH deletes AS (
          DELETE FROM "ObjectiveTopics"
          USING objectives_to_delete
          WHERE "objectiveId" = oid
          RETURNING
          id
        )
        SELECT id FROM deletes
        ;
        -- remove Objectives -------------------
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
        CREATE TEMP TABLE goals_to_delete
        AS
        SELECT DISTINCT gid
        FROM deleted_args dargs
        JOIN "Goals" g
          ON gid = g.id
        WHERE g."isRttapa" != 'Yes'
          AND g."isFromSmartsheetTtaPlan" != TRUE
        EXCEPT 
        SELECT gid
        FROM (
          SELECT DISTINCT "goalId" gid
          FROM "ActivityReportGoals"
          UNION
          SELECT DISTINCT "goalId" gid
          FROM "Objectives"
        ) keepers
        ;
        -- Remove Goal link records: -------------
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
        -- remove Goals -------------------
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
        CREATE TEMP TABLE ots_to_delete
        AS
        SELECT DISTINCT otid
        FROM deleted_objectives
        EXCEPT
        SELECT DISTINCT "objectiveTemplateId"
        FROM "Objectives"
        ;
        -- Remove ObjectiveTemplate link records: -------------
        CREATE TEMP TABLE deleted_objectivetemplatefiles AS
        WITH deletes AS (
          DELETE FROM "ObjectiveTemplateFiles"
          USING ots_to_delete
          WHERE "objectiveTemplateId" = otid
          RETURNING
          id,
          "fileId" fid
        )
        SELECT id, fid FROM deletes
        ;
        CREATE TEMP TABLE deleted_objectivetemplateresources AS
        WITH deletes AS (
          DELETE FROM "ObjectiveTemplateResources"
          USING ots_to_delete
          WHERE "objectiveTemplateId" = otid
          RETURNING
          id,
          "resourceId" resourceid
        )
        SELECT id, resourceid FROM deletes
        ;
        CREATE TEMP TABLE deleted_objectivetemplatetopics AS
        WITH deletes AS (
          DELETE FROM "ObjectiveTemplateTopics"
          USING ots_to_delete
          WHERE "objectiveTemplateId" = otid
          RETURNING
          id
        )
        SELECT id FROM deletes
        ;

        -- Create the orphaned GoalTemplate deletion list
        CREATE TEMP TABLE gts_to_delete
        AS
        SELECT DISTINCT gtid
        FROM deleted_goals
        EXCEPT
        SELECT DISTINCT "goalTemplateId"
        FROM "Goals"
        ;
        -- Remove GoalTemplate link records: -------------
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
        SELECT 13,'deleted_aros', count(*) FROM deleted_aros
        UNION
        SELECT 14,'objectives_to_delete', count(*) FROM objectives_to_delete
        UNION
        SELECT 15,'deleted_objectivefiles', count(*) FROM deleted_objectivefiles
        UNION
        SELECT 16,'deleted_objectiveresources', count(*) FROM deleted_objectiveresources
        UNION
        SELECT 17,'deleted_objectivetopics', count(*) FROM deleted_objectivetopics
        UNION
        SELECT 18,'deleted_objectives', count(*) FROM deleted_objectives
        UNION
        SELECT 19,'args_to_delete', count(*) FROM args_to_delete
        UNION
        SELECT 20,'deleted_activityreportgoalfieldresponses', count(*) FROM deleted_activityreportgoalfieldresponses
        UNION
        SELECT 21,'deleted_activityreportgoalresources', count(*) FROM deleted_activityreportgoalresources
        UNION
        SELECT 22,'deleted_args', count(*) FROM deleted_args
        UNION
        SELECT 23,'goals_to_delete', count(*) FROM goals_to_delete
        UNION
        SELECT 24,'deleted_goalfieldresponses', count(*) FROM deleted_goalfieldresponses
        UNION
        SELECT 25,'deleted_goalresources', count(*) FROM deleted_goalresources
        UNION
        SELECT 26,'deleted_goals', count(*) FROM deleted_goals
        UNION
        SELECT 27,'ots_to_delete', count(*) FROM ots_to_delete
        UNION
        SELECT 28,'deleted_objectivetemplatefiles', count(*) FROM deleted_objectivetemplatefiles
        UNION
        SELECT 29,'deleted_objectivetemplateresources', count(*) FROM deleted_objectivetemplateresources
        UNION
        SELECT 30,'deleted_objectivetemplatetopics', count(*) FROM deleted_objectivetemplatetopics
        UNION
        SELECT 31,'gts_to_delete', count(*) FROM gts_to_delete
        UNION
        SELECT 32,'deleted_goaltemplateobjectivetemplates', count(*) FROM deleted_goaltemplateobjectivetemplates
        UNION
        SELECT 33,'deleted_objectivetemplates', count(*) FROM deleted_objectivetemplates
        UNION
        SELECT 34,'deleted_goaltemplates', count(*) FROM deleted_goaltemplates
        UNION
        SELECT 35,'deleted_ars', count(*) FROM deleted_ars
        ORDER BY 1
        ;

      `,
        { transaction }
      )
    })
  },

  down: async () => {},
}
