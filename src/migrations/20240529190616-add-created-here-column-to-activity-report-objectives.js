const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.addColumn(
        'ActivityReportObjectives',
        'objectiveCreatedHere',
        {
          type: Sequelize.BOOLEAN,
          allowNull: true,
        },
        { transaction }
      )
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      return queryInterface.removeColumn('ActivityReportObjectives', 'objectiveCreatedHere', {
        transaction,
      })
    })
  },
}
