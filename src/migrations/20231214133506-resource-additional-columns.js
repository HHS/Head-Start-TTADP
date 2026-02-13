const { prepMigration } = require('../lib/migration')

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)

      await queryInterface.addColumn(
        'Resources',
        'mimeType',
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      )
      await queryInterface.addColumn(
        'Resources',
        'lastStatusCode',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction }
      )
    })
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)

      // Remove mime type and last status code columns.
      await queryInterface.removeColumn('Resources', 'mimeType', { transaction })
      await queryInterface.removeColumn('Resources', 'lastStatusCode', { transaction })
    })
  },
}
