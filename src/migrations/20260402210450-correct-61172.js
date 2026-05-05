const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.sequelize.query(
        `
          UPDATE "ActivityReportApprovers" SET "deletedAt" = null WHERE "ActivityReportApprovers".id = 231554;
          UPDATE "ActivityReports" SET "calculatedStatus" = 'needs_action' WHERE "ActivityReports".id = 61172;
        `,
        { transaction }
      );
    });
  },

  async down() {
    // no rollback
  },
};
