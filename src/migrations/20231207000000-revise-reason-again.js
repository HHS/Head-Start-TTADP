const { prepMigration, replaceValueInArray, replaceValueInJSONBArray } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await replaceValueInArray(
        queryInterface,
        transaction,
        'ActivityReports',
        'reason',
        'Planning/Coordination (also TTA Plan Agreement)',
        'Planning/Coordination'
      )
      await replaceValueInJSONBArray(
        queryInterface,
        transaction,
        'EventReportPilots',
        'data',
        'reasons',
        'Planning/Coordination (also TTA Plan Agreement)',
        'Planning/Coordination'
      )
    })
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await replaceValueInArray(
        queryInterface,
        transaction,
        'ActivityReports',
        'reason',
        'Planning/Coordination',
        'Planning/Coordination (also TTA Plan Agreement)'
      )
      await replaceValueInJSONBArray(
        queryInterface,
        transaction,
        'EventReportPilots',
        'data',
        'reasons',
        'Planning/Coordination',
        'Planning/Coordination (also TTA Plan Agreement)'
      )
    })
  },
}
