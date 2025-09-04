const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      // Add activityReason to the ActivityReports table.
      await queryInterface.sequelize.query(`
            ALTER TABLE "ActivityReports" ADD COLUMN IF NOT EXISTS "activityReason" VARCHAR(255);
        `, { transaction });
    });
  },

  async down() {
    // no rollbacks.
  },
};
