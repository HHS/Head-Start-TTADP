const {
  prepMigration,
} = require('../lib/migration');

module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.sequelize.query(/* sql */`
            -- 1. Get all the TR goals that are not part of a final goal (not merged yet).
            DROP TABLE IF EXISTS sim_goals_to_clean_up;
            CREATE TEMP TABLE sim_goals_to_clean_up
            AS
                SELECT
                gsgg.id AS gsggid,
                gsg.id AS gsgid,
                g.id AS goalid,
                g."createdVia",
                gsg."finalGoalId"
            FROM "GoalSimilarityGroupGoals" gsgg
            JOIN "GoalSimilarityGroups" gsg
                ON gsgg."goalSimilarityGroupId" = gsg.id
            JOIN "Goals" g
                ON gsgg."goalId" = g.id
            WHERE g."createdVia" = 'tr' AND gsg."finalGoalId" IS NULL;

            -- 2. Delete the goals and their associations.
            DELETE FROM "GoalSimilarityGroupGoals" WHERE id IN (
                SELECT gsggid FROM sim_goals_to_clean_up
            );

            -- 3. Delete the goal similarity groups that are now empty.
            DELETE FROM "GoalSimilarityGroups" WHERE id IN (
                SELECT gsgid FROM sim_goals_to_clean_up
            );

            -- 4. Return the results of what was deleted.
            SELECT * FROM sim_goals_to_clean_up;

            -- 5. Clean up the temp table.
            DROP TABLE IF EXISTS sim_goals_to_clean_up;
                    `, { transaction });
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      // Currently we don't merge TR goals.
    },
  ),
};
