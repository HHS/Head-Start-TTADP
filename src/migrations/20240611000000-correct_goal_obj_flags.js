const {
  prepMigration,
} = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.sequelize.query(`

      -- Creating functions to run as a maintenance job.
      -- Runs as plpgsql rather than sql because plpgsql allows referencing
      -- tables that haven't been created yet when the function is called.

      CREATE OR REPLACE FUNCTION correct_ar_flags()
      RETURNS VOID LANGUAGE plpgsql AS
      $$
      BEGIN
      --  1. Calculate correct onApprovedAR values for objectives
      --     Exclude Objectives that have been merged away or deleted
      DROP TABLE IF EXISTS objectives_on_ars;
      CREATE TEMP TABLE objectives_on_ars
      AS
      SELECT
        o.id oid,
        BOOL_OR(ar.id IS NOT NULL AND ar."calculatedStatus" = 'approved') on_approved_ar,
        BOOL_OR(ar.id IS NOT NULL) on_ar
      FROM "Objectives" o
      LEFT JOIN "ActivityReportObjectives" aro
        ON o.id = aro."objectiveId"
      LEFT JOIN "ActivityReports" ar
        ON aro."activityReportId" = ar.id
        AND ar."calculatedStatus" != 'deleted'
      WHERE o."mapsToParentObjectiveId" IS NULL
        AND o."deletedAt" IS NULL
      GROUP BY 1
      ;
      --  2. Calculate correct onApprovedAR values for goals
      --     Exclude Goals that have been merged away or deleted
      DROP TABLE IF EXISTS goals_on_ars;
      CREATE TEMP TABLE goals_on_ars
      AS
      SELECT
        g.id gid,
        BOOL_OR(
          (ar.id IS NOT NULL AND ar."calculatedStatus" = 'approved')
          OR
          (srp.id IS NOT NULL AND srp.data->>'status' = 'Complete')
          OR
          COALESCE(ooaa.on_approved_ar,FALSE)
        ) on_approved_ar,
        BOOL_OR(
          ar.id IS NOT NULL
          OR
          srp.id IS NOT NULL
          OR
          COALESCE(ooaa.on_ar,FALSE)
        ) on_ar
      FROM "Goals" g
      LEFT JOIN "ActivityReportGoals" arg
        ON g.id = arg."goalId"
      LEFT JOIN "ActivityReports" ar
        ON arg."activityReportId" = ar.id
        AND ar."calculatedStatus" != 'deleted'
      LEFT JOIN "Objectives" o
        ON o."goalId" = g.id
      LEFT JOIN objectives_on_ars ooaa
        ON ooaa.oid = o.id
      LEFT JOIN "EventReportPilotGoals" erpg
        ON g.id = erpg."goalId"
      LEFT JOIN "SessionReportPilots" srp
        ON erpg."sessionId" = srp.id
      WHERE g."mapsToParentGoalId" IS NULL
        AND g."deletedAt" IS NULL
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

      INSERT INTO "MaintenanceLogs" (
        category,
        type,
        data,
        "isSuccessful",
        "triggeredById",
        "createdAt",
        "updatedAt"
      )
      WITH change_counts AS (
      SELECT
        (SELECT COUNT(*) FROM corrected_approved_objectives) o_approved_cnt,
        (SELECT COUNT(*) FROM corrected_onar_objectives) o_onar_cnt,
        (SELECT COUNT(*) FROM corrected_approved_goals) g_approved_cnt,
        (SELECT COUNT(*) FROM corrected_onar_goals) g_onar_cnt
      )
      SELECT
        'DB',
        'CORRECT AR FLAGS',
        (
          '{"objectives_on_approved_ar_corrections" : "' || o_approved_cnt
          || '","objectives_onar_corrections" : "' || o_onar_cnt
          || '","goals_on_approved_ar_corrections" : "' || g_approved_cnt
          || '","goals_onar_corrections" : "' || g_onar_cnt
          || '"}'
        )::json,
        TRUE,
        NULL,
        NOW(),
        NOW()
      FROM change_counts;

      END
      $$
      ;

      /* FOR MANUAL VALIDATION --------------------------- 
      -- Actually call the function
      SELECT correct_ar_flags();

      -- Create illustrative table
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
      */ -- END VALIDATION SECTION
      `, { transaction });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await await queryInterface.sequelize.query(/* sql */`
      DROP FUNCTION IF EXISTS correct_ar_flags;
      `, { transaction });
    });
  },
};
