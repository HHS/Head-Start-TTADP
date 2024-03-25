const {
  prepMigration,
} = require('../lib/migration');

module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.sequelize.query(/* sql */`
      -- 1. Identify the affected reports/grants/goals
      -- x. Sets of Grant may/may not have matching objectives
      -- x. When not matching objectives are found, clone objective and aro to first goal
      -- x. Remove second goals objectives from AR
      DROP TABLE IF EXISTS tmp_delete_objective_from_report;
      CREATE TEMP TABLE tmp_delete_objective_from_report
      AS
      WITH delete_activity_report_objectives AS (
        DELETE FROM "ActivityReportObjectives" aro
        USING tmp_unlinked_objectives tuo
        WHERE aro."objectiveId" = tug."objectiveId"
        RETURNING
          aro.id "activityReportObjectiveId",
          aro."activityReportId",
          aro."objectiveId"
      )
      SELECT
        "activityReportObjectiveId",
        "activityReportId",
        "objectiveId"
      FROM delete_activity_report_objectives;

      -- x. Update onAR and onApprovedAR for unlinked objective
      DROP TABLE IF EXISTS tmp_flags_update_for_unlinked_objectives;
      CREATE TEMP TABLE tmp_flags_update_for_unlinked_objectives
      AS
      WITH objective_flags AS (
        SELECT
          tdofr."objectiveId",
          count(arg.id) FILTER (WHERE arg.id IS NOT NULL) > 0 "onAR",
          COUNT(ar.id) FILTER (WHERE ar.id IS NOT NULL) > 0 "onApprovedAR"
        FROM tmp_delete_objective_from_report tdofr
        LEFT JOIN "ActivityReportObjectives" aro
        ON tdofr."objectiveId" = aro."objectiveId"
        LEFT JOIN "ActivityReports" ar
        ON aro."activityReportId" = ar.id
        AND ar."calculatedStatus"::text = 'approved'
        GROUP BY 1
      ),
      flags_update_for_unlinked_objectives AS (
        UPDATE "Objectives" g
        SET
          "onAR" = f."onAR",
          "onApprovedAR" = f."onApprovedAR"
        FROM objective_flags f
        WHERE o.id = f."objectiveId"
        AND (
          o."onAR" != f."onAR"
          OR o."onApprovedAR" != f."onApprovedAR"
        )
        RETURNING
          o.id "objectiveId"
      )
      SELECT
        "objectiveId",
        "onAR",
        "onApprovedAR"
      FROM flags_update_for_unlinked_objectives;

      -- x. If unlinked objective onAR is false, delete objective
      DROP TABLE IF EXISTS tmp_deleted_objectives;
      CREATE TEMP TABLE tmp_deleted_objectives
      AS
      WITH deleted_objectives AS (
        UPDATE "Objectives" o
        SET "deletedAt" = now()
        FROM tmp_unlinked_objectives tuo
        WHERE o.id = tuo."objectiveId"
        AND o."onAR" = false
        RETURNING
          o.id "objectiveId"
      )
      SELECT
        "objectiveId"
      FROM deleted_objectives;

      -- x. Remove second goal from AR
      DROP TABLE IF EXISTS tmp_delete_goal_from_report;
      CREATE TEMP TABLE tmp_delete_goal_from_report
      AS
      WITH delete_activity_report_goals AS (
        DELETE FROM "ActivityReportGoals" arg
        USING tmp_unlinked_goals tug
        WHERE arg."goalId" = tug."goalId"
        RETURNING
          arg.id "activityReportGoalId",
          arg."activityReportId",
          arg."goalId"
      )
      SELECT
        "activityReportGoalId",
        "activityReportId",
        "goalId"
      FROM delete_activity_report_goals;

      -- x. Update onAR and onApprovedAR for unlinked goal
      DROP TABLE IF EXISTS tmp_flags_update_for_unlinked_goals;
      CREATE TEMP TABLE tmp_flags_update_for_unlinked_goals
      AS
      WITH goal_flags AS (
        SELECT
          tdgfr."goalId",
          count(arg.id) FILTER (WHERE arg.id IS NOT NULL) > 0 "onAR",
          COUNT(ar.id) FILTER (WHERE ar.id IS NOT NULL) > 0 "onApprovedAR"
        FROM tmp_delete_goal_from_report tdgfr
        LEFT JOIN "ActivityReportGoals" arg
        ON tdgfr."goalId" = arg."goalId"
        LEFT JOIN "ActivityReports" ar
        ON arg."activityReportId" = ar.id
        AND ar."calculatedStatus"::text = 'approved'
        GROUP BY 1
      ),
      flags_update_for_unlinked_goals AS (
        UPDATE "Goals" g
        SET
          "onAR" = gf."onAR",
          "onApprovedAR" = gf."onApprovedAR"
        FROM goal_flags gf
        WHERE g.id = gf."goalId"
        AND (
          g."onAR" != gf."onAR"
          OR g."onApprovedAR" != gf."onApprovedAR"
        )
        RETURNING
          g.id "goalId"
      )
      SELECT
        "goalId",
        "onAR",
        "onApprovedAR"
      FROM flags_update_for_unlinked_goals;

      --
      `, { transaction });
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
    },
  ),
};
