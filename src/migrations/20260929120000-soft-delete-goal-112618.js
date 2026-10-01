const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.sequelize.query(
        /* sql */ `
        UPDATE "Goals"
        SET "deletedAt" = NOW()
        WHERE id = 112618
          AND "deletedAt" IS NULL;
        `,
        { transaction }
      );
    });
  },

  async down() {
    // No rollback; restore via the audit log if needed.
  },
};
