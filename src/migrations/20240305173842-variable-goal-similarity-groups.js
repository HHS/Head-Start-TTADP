const { SUPPORT_TYPES } = require('@ttahub/common')
const { prepMigration } = require('../lib/migration')

module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)

      await queryInterface.addColumn(
        'GoalSimilarityGroups',
        'version',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction }
      )

      await queryInterface.addColumn(
        'GoalSimilarityGroupGoals',
        'excludedIfNotAdmin',
        {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          defaultValue: false,
        },
        { transaction }
      )
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)

      await queryInterface.removeColumn('GoalSimilarityGroupGoals', 'excludedIfNotAdmin', {
        transaction,
      })
      await queryInterface.removeColumn('GoalSimilarityGroups', 'version', { transaction })
    }),
}
