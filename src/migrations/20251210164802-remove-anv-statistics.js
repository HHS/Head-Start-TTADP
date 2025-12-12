const { prepMigration, updateUsersFlagsEnum } = require('../lib/migration');

const FEATURE_FLAGS = [
  'quality_assurance_dashboard',
  'collaboration_report',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await updateUsersFlagsEnum(
        queryInterface,
        transaction,
        ['anv_statistics'],
        FEATURE_FLAGS,
      );
    });
  },

  async down() {
    // no rollbacks on enum mods, create a new migration to do that
  },
};
