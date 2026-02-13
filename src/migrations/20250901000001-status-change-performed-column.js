const { prepMigration } = require('../lib/migration')

module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.addColumn('GoalStatusChanges', 'performedAt', { type: Sequelize.DATE, allowNull: true }, { transaction })
      await queryInterface.sequelize.query('UPDATE "GoalStatusChanges" SET "performedAt" = "createdAt";', { transaction })
    }),
  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction((transaction) => queryInterface.removeColumn('GoalStatusChanges', 'performedAt', { transaction }))
  },
}
