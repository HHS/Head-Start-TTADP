const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.sequelize.query(
        /* sql */ `
      UPDATE "Imports"
      SET schedule = '30 8 * * *'
      WHERE name = 'ITAMS Monitoring Data'
      AND schedule = '0 7 * * *';
      `,
        transaction
      )
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.sequelize.query(
        /* sql */ `
      UPDATE "Imports"
      SET schedule = '0 7 * * *'
      WHERE name = 'ITAMS Monitoring Data'
      AND schedule = '30 8 * * *';
      `,
        transaction
      )
    })
  },
}
