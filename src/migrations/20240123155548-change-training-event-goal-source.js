const { GOAL_SOURCES } = require('@ttahub/common');
const { prepMigration, dropAndRecreateEnum } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      // Remove existing columns and enum.
      await queryInterface.removeColumn('Goals', 'source');
      await queryInterface.removeColumn('ActivityReportGoals', 'source');
      await queryInterface.sequelize.query('DROP TYPE public."enum_Goals_source";');
      await queryInterface.sequelize.query('DROP TYPE public."enum_ActivityReportGoals_source";');

      // Goals.
      await queryInterface.addColumn(
        'Goals',
        'source',
        { type: Sequelize.DataTypes.ENUM(GOAL_SOURCES) },
        { transaction },
      );

      // ActivityReportGoals.
      await queryInterface.addColumn(
        'ActivityReportGoals',
        'source',
        { type: Sequelize.DataTypes.ENUM(GOAL_SOURCES) },
        { transaction },
      );
    });
  },

  async down() {
    // no rollbacks
  },
};
