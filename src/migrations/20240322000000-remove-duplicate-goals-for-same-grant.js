const {
  prepMigration,
} = require('../lib/migration');

module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.sequelize.query(/* sql */`
      -- 1. Identify the affected reports/grants/goals
      DROP TABLE IF EXISTS tmp_affected_reports_grants_goals;
      CREATE TEMP TABLE tmp_affected_reports_grants_goals
      AS
      SELECT
        arg."activityReportId",
        r.name "Recipeint",
        gr.id "grantId",
        gr."number",
        array_agg(DISTINCT g.id ORDER BY g.id) "goalIds",
        min(arg."createdAt") "earliest createdAt",
        g.name
      FROM "ActivityReportGoals" arg
      JOIN "Goals" g
      ON arg."goalId" = g.id
      JOIN "Grants" gr
      on g."grantId" = gr.id
      JOIN "Recipients" r
      ON gr."recipientId" = r.id
      GROUP BY 1,2,3,4,7
      HAVING COUNT(DISTINCT g.id) > 1
      AND COUNT(DISTINCT g.id) != COUNT(DISTINCT g.name)
      ORDER BY 1 desc,2,3;
      -- x. Identify the affected objectives
      DROP TABLE IF EXISTS tmp_affected_objectives;
      CREATE TEMP TABLE tmp_affected_objectives
      AS
      SELECT
        x."activityReportId",
        x."grantId",
        x."goalIds"[1] "originalGoalId",
        x."goalIds"[2] "extraGoalId",
        array_remove(array_agg(DISTINCT aro."objectiveId" ORDER BY aro."objectiveId") filter (where o."goalId" = x."goalIds"[1]),null) "originalGoalObjectiveIds",
        array_remove(array_agg(DISTINCT aro."objectiveId" ORDER BY aro."objectiveId") filter (where o."goalId" = x."goalIds"[2]),null) "extraGoalObjectiveIds",
        aro.title
      FROM tmp_affected_reports_grants_goals targg
      LEFT JOIN "Objectives" o
      ON o."goalId" = any(targg."goalIds")
      left join "ActivityReportObjectives" aro
      ON o.id = aro."objectiveId"
      AND targg."activityReportId" = aro."activityReportId"
      group by 1,2,3,4,7
      having aro.title is not null;
      -- x. create missing objectives on original goals
      DROP TABLE IF EXISTS tmp_created_missing_objectives;
      CREATE TEMP TABLE tmp_created_missing_objectives
      AS
      WITH created_missing_objectives AS (
        INSERT INTO "Objectives"
        (
          "goalId",
          title,
          status,
          "createdAt",
          "updatedAt",
          "objectiveTemplateId",
          "onApprovedAR",
          "rtrOrder",
          "createdVia",
          "onAR",
          "closedSuspendReason",
          "closedSuspendContext",
          "supportType"
        )
        SELECT
          tao."originalGoalId" "goalId",
          o.title,
          (ARRAY_AGG(DISTINCT o.status))[1] "status",
          MIN(o."createdAt") "createdAt",
          MAX(o."updatedAt") "updatedAt",
          o."objectiveTemplateId",
          bool_or(o."onApprovedAR"),
          MIN(o."rtrOrder") "rtrOrder",
          o."createdVia",
          bool_or(o."onAR"),
          (ARRAY_AGG(DISTINCT o."closedSuspendReason"))[1] "closedSuspendReason",
          (ARRAY_AGG(DISTINCT o."closedSuspendContext"))[1] "closedSuspendContext",
          (ARRAY_AGG(DISTINCT o."supportType"))[1] "supportType"
        FROM "Objectives" o
        JOIN tmp_affected_objectives tao
        ON o.id = ANY(tao."extraGoalObjectiveIds")
        WHERE "originalGoalObjectiveIds" IS NULL
        GROUP BY 1,2
        RETURNING
          id
      )
      SELECT
          tao."activityReportId",
          tao."grantId",
          o."goalId",
          o.id "objectiveId"
      FROM created_missing_objectives cmo
      JOIN "Objectives" o
      ON cmo.id = o.id
      JOIN tmp_affected_objectives tao
      ON o."goalId" = tao."originalGoalId"
      AND o.title = tao.title;
      -- x. add new objectives to reports
      DROP TABLE IF EXISTS tmp_missing_objectives_added_to_reports;
      CREATE TEMP TABLE tmp_missing_objectives_added_to_reports
      AS
      WITH missing_objectives_added_to_reports AS (
        INSERT INTO "ActivityReportObjectives"
        (
          "activityReportId",
          "objctiveId",
          "createdAt",
          "updatedAt",
          "ttaProvided",
          "title",
          "status",
          "arOrder",
          "closedSuspendReason",
          "closedSuspendContext",
          "originalObjectiveId",
          "supportType"
        )
        SELECT
          tcmo."activityReportId",
          tcmo."objectiveId",
          MIN(aro."createdAt") "createdAt",
          MAX(aro."updatedAt") "updatedAt",
          (ARRAY_AGG(DISTINCT aro."ttaProvided"))[1] "ttaProvided",
          o.title,
          (ARRAY_AGG(DISTINCT aro.status))[1] "status",
          MIN(aro."arOrder") "arOrder",
          (ARRAY_AGG(DISTINCT aro."closedSuspendReason"))[1] "closedSuspendReason",
          (ARRAY_AGG(DISTINCT aro."closedSuspendContext"))[1] "closedSuspendContext",
          (ARRAY_AGG(DISTINCT aro."supportType"))[1] "supportType"
        FROM tmp_created_missing_objectives tcmo
        JOIN "Objectives" o
        ON tcmo."objectiveId" = o.id
        JOIN tmp_affected_objectives tao
        ON tcmo."activityReportId" = tao."activityReportId"
        AND tcmo."grantId" = tao."grantId"
        AND tcmo."goalId" = tao."originalGoalId"
        JOIN "ActivityReportObjectives" aro
        ON tcmo."activityReportId" = aro."activityReportId"
        AND aro."objectiveId" = ANY(tao."extraGoalObjectiveIds")
        GROUP BY 1,2,6
        RETURNING
          id
      )
      SELECT
          aro."activityReportId",
          aro."objectiveId",
      FROM missing_objectives_added_to_reports moatr
      JOIN "ActivityReportObjectives" aro
      ON moatr.id = aro.id
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
