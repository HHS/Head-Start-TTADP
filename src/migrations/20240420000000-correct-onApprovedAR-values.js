const {
  prepMigration,
} = require('../lib/migration');

module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.sequelize.query(/* sql */`
      --  1. Calculate correct onApprovedAR values for objectives
      DROP TABLE IF EXISTS objectives_on_approved_ars;
      CREATE TEMP TABLE objectives_on_approved_ars
      AS
      SELECT
        o.id oid,
        BOOL_OR(ar.id IS NOT NULL) on_approved_ar
      FROM "Objectives" o
      LEFT JOIN "ActivityReportObjectives" aro
        ON o.id = aro."objectiveId"
      LEFT JOIN "ActivityReports" ar
        ON aro."activityReportId" = ar.id
        AND ar."calculatedStatus" = 'approved'
      GROUP BY 1
      ;
      --  1. Calculate correct onApprovedAR values for goals
      DROP TABLE IF EXISTS goals_on_approved_ars;
      CREATE TEMP TABLE goals_on_approved_ars
      AS
      SELECT
        g.id gid,
        BOOL_OR(ar.id IS NOT NULL OR COALESCE(ooaa.on_approved_ar,FALSE)) on_approved_ar
      FROM "Goals" g
      LEFT JOIN "ActivityReportGoals" arg
        ON g.id = arg."goalId"
      LEFT JOIN "ActivityReports" ar
        ON arg."activityReportId" = ar.id
        AND ar."calculatedStatus" = 'approved'
      LEFT JOIN "Objectives" o
        ON o."goalId" = g.id
      LEFT JOIN objectives_on_approved_ars ooaa
        ON ooaa.oid = o.id
      GROUP BY 1
      ;
      DROP TABLE IF EXISTS initial_objective_stats;
      CREATE TEMP TABLE initial_objective_stats
      AS
      SELECT
        COUNT(*) FILTER (WHERE on_approved_ar = "onApprovedAR"
        ) matching_values_o,
        COUNT(*) FILTER (WHERE "onApprovedAR" IS NOT NULL AND on_approved_ar != "onApprovedAR"
        ) incorrect_values_o,
        COUNT(*) FILTER (WHERE on_approved_ar AND (NOT "onApprovedAR" OR "onApprovedAR" IS NULL)
        ) should_be__marked_approved_but_isnt_o,
        COUNT(*) FILTER (WHERE NOT on_approved_ar AND ("onApprovedAR" OR "onApprovedAR" IS NULL)
        ) marked_approved_but_shouldnt_be_o,
        COUNT(*) total_objectives
      FROM "Objectives" o
      JOIN objectives_on_approved_ars
        ON o.id = oid
      ;
      DROP TABLE IF EXISTS initial_goal_stats;
      CREATE TEMP TABLE initial_goal_stats
      AS
      SELECT
        COUNT(*) FILTER (WHERE on_approved_ar = "onApprovedAR"
        ) matching_values_g,
        COUNT(*) FILTER (WHERE "onApprovedAR" IS NOT NULL AND on_approved_ar != "onApprovedAR"
        ) incorrect_values_g,
        COUNT(*) FILTER (WHERE on_approved_ar AND (NOT "onApprovedAR" OR "onApprovedAR" IS NULL)
        ) should_be__marked_approved_but_isnt_g,
        COUNT(*) FILTER (WHERE NOT on_approved_ar AND ("onApprovedAR" OR "onApprovedAR" IS NULL)
        ) marked_approved_but_shouldnt_be_g,
        COUNT(*) total_goals
      FROM "Goals" g
      JOIN goals_on_approved_ars
        ON g.id = gid
      ;
      DROP TABLE IF EXISTS corrected_objectives;
      CREATE TEMP TABLE corrected_objectives
      AS
      WITH updater AS (
        UPDATE "Objectives" o
        SET "onApprovedAR" = on_approved_ar
        FROM objectives_on_approved_ars
        WHERE o.id = oid
          AND ("onApprovedAR" != on_approved_ar OR "onApprovedAR" IS NULL)
        RETURNING
          oid,
          on_approved_ar
      ) SELECT * FROM updater
      ;
      DROP TABLE IF EXISTS corrected_goals;
      CREATE TEMP TABLE corrected_goals
      AS
      WITH updater AS (
        UPDATE "Goals" g
        SET "onApprovedAR" = on_approved_ar
        FROM goals_on_approved_ars
        WHERE g.id = gid
          AND ("onApprovedAR" != on_approved_ar OR "onApprovedAR" IS NULL)
        RETURNING
          gid,
          on_approved_ar
      ) SELECT * FROM updater
      ;
      -- produce stats on what happened
      DROP TABLE IF EXISTS final_objective_stats;
      CREATE TEMP TABLE final_objective_stats
      AS
      SELECT
        COUNT(*) FILTER (WHERE on_approved_ar = "onApprovedAR"
        ) matching_values_o,
        COUNT(*) FILTER (WHERE "onApprovedAR" IS NOT NULL AND on_approved_ar != "onApprovedAR"
        ) incorrect_values_o,
        COUNT(*) FILTER (WHERE on_approved_ar AND (NOT "onApprovedAR" OR "onApprovedAR" IS NULL)
        ) should_be__marked_approved_but_isnt_o,
        COUNT(*) FILTER (WHERE NOT on_approved_ar AND ("onApprovedAR" OR "onApprovedAR" IS NULL)
        ) marked_approved_but_shouldnt_be_o,
        COUNT(*) total_objectives
      FROM "Objectives" o
      JOIN objectives_on_approved_ars
        ON o.id = oid
      ;
      DROP TABLE IF EXISTS final_goal_stats;
      CREATE TEMP TABLE final_goal_stats
      AS
      SELECT
        COUNT(*) FILTER (WHERE on_approved_ar = "onApprovedAR"
        ) matching_values_g,
        COUNT(*) FILTER (WHERE "onApprovedAR" IS NOT NULL AND on_approved_ar != "onApprovedAR"
        ) incorrect_values_g,
        COUNT(*) FILTER (WHERE on_approved_ar AND (NOT "onApprovedAR" OR "onApprovedAR" IS NULL)
        ) should_be__marked_approved_but_isnt_g,
        COUNT(*) FILTER (WHERE NOT on_approved_ar AND ("onApprovedAR" OR "onApprovedAR" IS NULL)
        ) marked_approved_but_shouldnt_be_g,
        COUNT(*) total_goals
      FROM "Goals" g
      JOIN goals_on_approved_ars
        ON g.id = gid
      ;
      -- make a nice little table to see the math
      SELECT
        1 AS order,
        'objective starting stats' description,
        matching_values_o matching_values,
        incorrect_values_o incorrect_values,
        should_be__marked_approved_but_isnt_o should_be__marked_approved_but_isnt,
        marked_approved_but_shouldnt_be_o marked_approved_but_shouldnt_be,
        total_objectives total
      FROM initial_objective_stats
      UNION
      SELECT
        2,
        'objective values changed',
        NULL,
        NULL,
        SUM(CASE WHEN on_approved_ar THEN 1 ELSE 0 END),
        SUM(CASE WHEN NOT on_approved_ar THEN 1 ELSE 0 END),
        COUNT(*)
      FROM corrected_objectives
      UNION
      SELECT 3,'objective ending stats', * FROM final_objective_stats
      UNION
      SELECT 4,'goal starting stats', * FROM initial_goal_stats
      UNION
      SELECT
        5,
        'goal values changed',
        NULL,
        NULL,
        SUM(CASE WHEN on_approved_ar THEN 1 ELSE 0 END),
        SUM(CASE WHEN NOT on_approved_ar THEN 1 ELSE 0 END),
        COUNT(*)
      FROM corrected_goals
      UNION
      SELECT 6,'goal ending stats', * FROM final_goal_stats
      ORDER BY 1
      ;
      `, { transaction });
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
    },
  ),
};
