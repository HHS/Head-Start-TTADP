const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.sequelize.query(
        `
          UPDATE "ActivityReports"
          SET "submissionStatus" = 'draft',
              "calculatedStatus" = 'draft'
          WHERE id = 63912;
        `,
        { transaction }
      );
    });
  },

  async down() {
    // no rollback
  },
};
