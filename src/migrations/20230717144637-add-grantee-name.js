const { prepMigration } = require('../lib/migration')

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)

      // Add a grantee name field to grants.
      await queryInterface.addColumn('Grants', 'granteeName', { type: Sequelize.STRING }, { transaction })
    })
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)

      // Remove grantee name field to grants.
      await queryInterface.removeColumn('Grants', 'granteeName', { transaction })
    })
  },
}
