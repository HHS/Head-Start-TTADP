const {
  prepMigration,
} = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.sequelize.query(/* sql */
        `UPDATE "Resources"
            SET "metadata" = null
        WHERE "metadata"->'0' IS NOT null`,
        { transaction },
      );
    });
  },

  down: async () => {},
};
