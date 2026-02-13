const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.sequelize.query(
        /* sql */ `
        -- Add revision column to ActivityReports table to track changes
        ALTER TABLE "ActivityReports"
        ADD COLUMN IF NOT EXISTS "revision" INTEGER NOT NULL DEFAULT 0;
      `,
        { transaction }
      )
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      await queryInterface.sequelize.query(
        /* sql */ `
        -- Remove revision column from ActivityReports table
        ALTER TABLE "ActivityReports" DROP COLUMN IF EXISTS "revision";
      `,
        { transaction }
      )
    })
  },
}
