const { SUPPORT_TYPES } = require('@ttahub/common')
const { prepMigration } = require('../lib/migration')

module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)

      await queryInterface.addColumn(
        'Objectives',
        'supportType',
        {
          type: Sequelize.ENUM(SUPPORT_TYPES),
          allowNull: true,
        },
        { transaction }
      )

      await queryInterface.addColumn(
        'ActivityReportObjectives',
        'supportType',
        {
          type: Sequelize.ENUM(SUPPORT_TYPES),
          allowNull: true,
        },
        { transaction }
      )
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)

      await queryInterface.removeColumn('Objectives', 'supportType', { transaction })
      await queryInterface.removeColumn('ActivityReportObjectives', 'supportType', { transaction })
    }),
}
