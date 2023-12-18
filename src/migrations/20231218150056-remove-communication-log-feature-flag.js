const { prepMigration, updateUsersFlagsEnum } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      return updateUsersFlagsEnum(queryInterface, transaction, ['communication_log']);
    });
  },

  async down() {
    // no rollbacks on enum mods, create a new migration to do that
  },
};
