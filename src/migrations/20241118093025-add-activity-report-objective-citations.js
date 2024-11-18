const { prepMigration } = require('../lib/migration');

module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      // Create GrantReplacementTypes table
      await queryInterface.createTable('ActivityReportObjectiveCitations', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        activityReportObjectiveId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'ActivityReportObjectives',
            },
          },
        },
        citationId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'MonitoringStandards',
            },
          },
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
      }, { transaction });
    },
  ),

  down: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.dropTable('ZALActivityReportObjectiveCitations', { transaction });
      await queryInterface.dropTable('ActivityReportObjectiveCitations', { transaction });
    },
  ),
};
