const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      // Add activiyReason to the ActivityReports table.
      await queryInterface.sequelize.query(`
            ALTER TABLE "ActivityReports" ADD COLUMN IF NOT EXISTS "numberOfParticipantsVirtually" INTEGER;
        `, { transaction });

      // Add integer column numberOfParticipantsInPerson to the ActivityReports table.
      await queryInterface.sequelize.query(`
            ALTER TABLE "ActivityReports" ADD COLUMN IF NOT EXISTS "numberOfParticipantsInPerson" INTEGER;
        `, { transaction });
    });
  },

  async down() {
    // no rollbacks.
  },
};
