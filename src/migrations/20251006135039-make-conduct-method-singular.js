const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      // Drop the old array column
      await queryInterface.removeColumn('CollabReports', 'conductMethod', { transaction })

      // Add the new enum column (not array)
      await queryInterface.addColumn(
        'CollabReports',
        'conductMethod',
        {
          type: Sequelize.ENUM(['email', 'phone', 'in_person', 'virtual']),
          allowNull: true,
        },
        { transaction }
      )
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      // Drop the singular enum column
      await queryInterface.removeColumn('CollabReports', 'conductMethod', { transaction })

      // Restore the array column
      await queryInterface.addColumn(
        'CollabReports',
        'conductMethod',
        {
          type: Sequelize.ARRAY(Sequelize.ENUM(['in_person', 'virtual', 'email', 'phone'])),
          allowNull: false,
        },
        { transaction }
      )
    })
  },
}
