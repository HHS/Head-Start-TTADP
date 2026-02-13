const { prepMigration } = require('../lib/migration')

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)

      await queryInterface.addColumn(
        'ActivityReports',
        'language',
        {
          type: Sequelize.ARRAY(Sequelize.STRING),
          allowNull: true,
        },
        { transaction }
      )
    })
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)
      await queryInterface.removeColumn('ActivityReports', 'language', { transaction })
    })
  },
}
