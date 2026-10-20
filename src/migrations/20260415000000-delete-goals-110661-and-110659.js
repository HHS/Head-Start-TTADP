const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.sequelize.query(
        `
        UPDATE "Goals"
        SET "deletedAt" = NOW()
        WHERE "id" IN (110661, 110659)
          AND "deletedAt" IS NULL;
      `,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    // no rollback - restore via audit log if needed
  },
};
