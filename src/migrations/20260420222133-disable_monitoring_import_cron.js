const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await queryInterface.sequelize.query(
        /* sql */ `
        UPDATE "Imports"
        SET "enabled" = false
        WHERE "name" = 'ITAMS Monitoring Data';
      `,
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await queryInterface.sequelize.query(
        /* sql */ `
        UPDATE "Imports"
        SET "enabled" = true
        WHERE "name" = 'ITAMS Monitoring Data';
      `,
        { transaction }
      );
    });
  },
};
