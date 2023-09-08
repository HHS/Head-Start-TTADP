const { GOAL_SUSPEND_REASONS: SUSPEND_REASONS } = require('@ttahub/common');

const {
  prepMigration,
} = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.addColumn('Objectives', 'suspendReason', { type: Sequelize.DataTypes.ENUM(SUSPEND_REASONS) }, { transaction });
      return queryInterface.addColumn('Objectives', 'suspendContext', { type: Sequelize.TEXT }, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.removeColumn('Objectives', 'suspendReason', { transaction });
      return queryInterface.removeColumn('Objectives', 'suspendContext', { transaction });
    });
  },
};
