const { DataTypes } = require('sequelize');
const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.dropTable('ZALGoalSimilarityGroupGoals', { transaction });
      await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "public"."ZALNoUpdateFGoalSimilarityGroupGoals" ()', { transaction });
      await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "public"."ZALNoTruncateFGoalSimilarityGroupGoals" ()', { transaction });
      await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "public"."ZALNoDeleteFGoalSimilarityGroupGoals" ()', { transaction });

      await queryInterface.dropTable('ZALGoalSimilarityGroups', { transaction });
      await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "public"."ZALNoUpdateFGoalSimilarityGroups" ()', { transaction });
      await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "public"."ZALNoTruncateFGoalSimilarityGroups" ()', { transaction });
      await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "public"."ZALNoDeleteFGoalSimilarityGroups" ()', { transaction });

      await queryInterface.dropTable('ZALSimScoreGoalCaches', { transaction });
      await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "public"."ZALNoUpdateFSimScoreGoalCaches" ()', { transaction });
      await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "public"."ZALNoTruncateFSimScoreGoalCaches" ()', { transaction });
      await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS "public"."ZALNoDeleteFSimScoreGoalCaches" ()', { transaction });

      await queryInterface.dropTable('GoalSimilarityGroupGoals', { transaction });
      await queryInterface.dropTable('GoalSimilarityGroups', { transaction });
      await queryInterface.dropTable('SimScoreGoalCaches', { transaction });
    });
  },

  async down(queryInterface) {
    // no turning back
  },
};
