const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)
      // Add a index constraint to the Goals table to ensure there is only one combination
      // of "grantId" and "goalTemplateId" where the "status" is not equal to 'Closed'.
      await queryInterface.sequelize.query(
        `
                CREATE UNIQUE INDEX IF NOT EXISTS "unique_grantId_goalTemplateId" ON "Goals" ("grantId", "goalTemplateId")
                WHERE "status" != 'Closed' AND "goalTemplateId" IS NOT NULL AND "deletedAt" IS NULL;
            `,
        { transaction }
      )
    })
  },

  async down(queryInterface) {
    // Remove the unique index constraint from the Goals table.
    await queryInterface.sequelize.query(`
            DROP INDEX IF EXISTS "unique_grantId_goalTemplateId";
        `)
  },
}
