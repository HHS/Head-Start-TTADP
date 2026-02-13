const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      return queryInterface.sequelize.query(
        `
        ALTER TABLE "CollabReports"
        ALTER COLUMN "participants" TYPE VARCHAR(255)[] USING ("participants"::text[]);
      `,
        { transaction }
      )
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
        ALTER TABLE "CollabReports"
        ALTER COLUMN "participants" TYPE "enum_CollabReports_participants"[] USING ("participants"::"enum_CollabReports_participants"[]);
      `,
        { transaction }
      )
    })
  },
}
