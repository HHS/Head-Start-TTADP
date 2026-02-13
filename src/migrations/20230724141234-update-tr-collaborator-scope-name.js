const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)

      await queryInterface.sequelize.query(
        `
      UPDATE "Scopes" 
        SET "name" = 'POC_TRAINING_REPORTS', "description" = 'Can create training reports in the region' 
      WHERE "id" = 9;
      `,
        { transaction }
      )
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)

      await queryInterface.sequelize.query(
        `
      UPDATE "Scopes" 
        SET "name" = 'COLLABORATOR_TRAINING_REPORTS', "description" = 'Can collaborate on training reports in the region' 
      WHERE "id" = 9;
      `,
        { transaction }
      )
    })
  },
}
