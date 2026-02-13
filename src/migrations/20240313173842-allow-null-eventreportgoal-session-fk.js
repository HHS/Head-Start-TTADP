const { SUPPORT_TYPES } = require('@ttahub/common')
const { prepMigration } = require('../lib/migration')

module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)

      await queryInterface.changeColumn(
        'EventReportPilotGoals',
        'sessionId',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction }
      )
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)
    }),
}
