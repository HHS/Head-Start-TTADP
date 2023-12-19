const {
  prepMigration,
} = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      return queryInterface.addColumn('Goals', 'mapsToParentGoalId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        default: null,
        references: {
          model: {
            tableName: 'Goals',
          },
          key: 'id',
        },
      }, { transaction });
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      return queryInterface.removeColumn('Goals', 'mapsToParentGoalId', { transaction });
    });
  },
};
