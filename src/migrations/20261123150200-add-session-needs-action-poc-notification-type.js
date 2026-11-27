const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      // TR-4e: approver requested changes to a session, sent to the Regional point of contact
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_Notifications_type" ADD VALUE IF NOT EXISTS 'trainingReportSessionNeedsActionPoc';`,
        { transaction }
      );
    });
  },

  async down() {
    // Keep the additive enum value on rollback, as in other notification enum migrations.
    // Removing it would require replacing the enum and could invalidate stored notifications.
  },
};
