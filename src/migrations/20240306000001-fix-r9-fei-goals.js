const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.sequelize.query(
        `
        -- Unlike most goal merging, this is for changing both the ongoing and historical text of goals
        -- I.e. both the goal text and the text cached to link records are all changed

        -- We also do a before_count and after count that can be compared and should go from 5 to 1 for eac

        DROP TABLE IF EXISTS goals_to_update;
        CREATE TEMP TABLE goals_to_update
        AS
        SELECT * FROM (
          VALUES -- sorted and deduped
          (61498, 19017),
          (61519, 19017),
          (61520, 19017),
          (61523, 19017),
          (64323, 19017),
          (64331, 19017)
        ) AS data(gid, correct_template)
        ;
        
        -- GoalTemplates should be empty or the transaction will fail and rollback. They're empty now but this
        -- guards against attempting to reuse the logic as-is in a future scenario that's more complicated.
        SELECT 1/(LEAST(COUNT(*),1) - 1)
        FROM "Goals" g
        JOIN goals_to_update
          ON g.id = gid
        JOIN "GoalTemplates" gt
          ON g."goalTemplateId" = gt.id;

        -- Guards against there already being goals for the same grant with the correct template already on these ARs.
        WITH affected_ars AS (
        SELECT DISTINCT
          "activityReportId" arid,
          gid source_gid
        FROM "ActivityReportGoals" arg
        JOIN goals_to_update
          ON arg."goalId" = gid
        ),
        relevant_goals AS (
        SELECT DISTINCT
          arid,
          source_gid,
          "goalId" all_gid,
          "goalTemplateId" all_gtid,
          "grantId" all_grid
        FROM affected_ars
        JOIN "ActivityReportGoals" arg
          ON arid = arg."activityReportId"
        JOIN "Goals" g
          ON arg."goalId" = g.id
        )
        SELECT 1/(LEAST(COUNT(*),1) - 1)
        FROM goals_to_update gtu
        JOIN "Goals" g
          ON gid = g.id
        JOIN relevant_goals rg
          ON gid = source_gid
          AND all_gtid = correct_template
          AND all_grid = g."grantId";

        -- before counts
        DROP TABLE IF EXISTS before_count;
        CREATE TEMP TABLE before_count
        AS
        SELECT
          'Goals' source_table,
          COUNT(DISTINCT name) unique_goal_texts
        FROM "Goals" g
        JOIN goals_to_update
          ON gid = g.id
        GROUP BY 1
        UNION
        SELECT
          'ActivityReportGoals' source_table,
          COUNT(DISTINCT name) unique_goal_texts
        FROM "ActivityReportGoals" arg
        JOIN goals_to_update
          ON gid = arg."goalId"
        GROUP BY 1;

        UPDATE "Goals" g
        SET
          "goalTemplateId" = correct_template,
          name = gt."templateName"
        FROM goals_to_update
        JOIN "GoalTemplates" gt
          ON  gt.id = correct_template
        WHERE g.id = gid;

        UPDATE "ActivityReportGoals" arg
        SET name = gt."templateName"
        FROM goals_to_update
        JOIN "GoalTemplates" gt
          ON gt.id = correct_template
        WHERE arg."goalId" = gid;

        -- after counts
        DROP TABLE IF EXISTS after_count;
        CREATE TEMP TABLE after_count
        AS
        SELECT
          'Goals' source_table,
          COUNT(DISTINCT name) unique_goal_texts
        FROM "Goals" g
        JOIN goals_to_update
          ON gid = g.id
        GROUP BY 1
        UNION
        SELECT
          'ActivityReportGoals' source_table,
          COUNT(DISTINCT name) unique_goal_texts
        FROM "ActivityReportGoals" arg
        JOIN goals_to_update
          ON gid = arg."goalId"
        GROUP BY 1;
        `,
        { transaction }
      )
    })
  },

  down: async () => {},
}
