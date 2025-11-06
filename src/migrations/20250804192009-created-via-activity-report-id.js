const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      // Add activityReason to the ActivityReports table.
      await queryInterface.sequelize.query(`
        ALTER TABLE "Objectives" ADD COLUMN IF NOT EXISTS "createdViaActivityReportId" INTEGER NULL;
      `, { transaction });

      // Add a foreign key constraint that maps the new column to the ActivityReports table.
      await queryInterface.sequelize.query(`
        ALTER TABLE "Objectives"
        ADD CONSTRAINT "Objectives_createdViaActivityReportId_fkey"
        FOREIGN KEY ("createdViaActivityReportId")
        REFERENCES "ActivityReports" ("id");
      `, { transaction });
    });
  },

  async down(queryInterface) {
    // Add a down migration if needed.
    await queryInterface.sequelize.query(`
      ALTER TABLE "Objectives" DROP COLUMN IF EXISTS "createdViaActivityReportId";
    `);
  },
};
