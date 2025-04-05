const { DataTypes } = require('sequelize');
const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.dropTable('GoalSimilarityGroupGoals', { transaction });
      await queryInterface.dropTable('GoalSimilarityGroups', { transaction });
      await queryInterface.dropTable('SimScoreGoalCaches', { transaction });
    });
  },

  async down(queryInterface) {
    // no turning back
  },
};
