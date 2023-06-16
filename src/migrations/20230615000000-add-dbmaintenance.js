const {
  prepMigration,
  removeTables,
} = require('../lib/migration');
const { DB_MAINTENANCE_TYPE } = require('../constants');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await queryInterface.createTable('DBMaintenanceLogs', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        type: {
          allowNull: false,
          type: Sequelize.DataTypes.ENUM(Object.values(DB_MAINTENANCE_TYPE)),
        },
        data: {
          allowNull: false,
          type: Sequelize.JSON,
        },
        isSuccessful: {
          type: Sequelize.Boolean,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, { transaction });
    });
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await removeTables(queryInterface, transaction, ['DBMaintenanceLogs']);
    });
  },
};
