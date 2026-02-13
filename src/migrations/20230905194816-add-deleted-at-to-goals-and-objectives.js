const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      await queryInterface.addColumn(
        'Objectives',
        'deletedAt',
        {
          allowNull: true,
          type: Sequelize.DATE,
        },
        { transaction }
      )

      return queryInterface.addColumn(
        'Goals',
        'deletedAt',
        {
          allowNull: true,
          type: Sequelize.DATE,
        },
        { transaction }
      )
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      await queryInterface.removeColumn('Objectives', 'deletedAt', { transaction })

      return queryInterface.removeColumn('Goals', 'deletedAt', { transaction })
    })
  },
}
