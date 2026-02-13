const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      await queryInterface.changeColumn(
        'CollabReportSteps',
        'collabStepCompleteDate',
        {
          type: Sequelize.DATEONLY,
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

      await queryInterface.changeColumn(
        'CollabReportSteps',
        'collabStepCompleteDate',
        {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        { transaction }
      )
    })
  },
}
