const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      return queryInterface.sequelize.query(`
         ALTER TYPE "enum_Users_flags" ADD VALUE IF NOT EXISTS 'collaboration_report';
      `);
    });
  },

  async down() {
    // no rollbacks
  },
};
