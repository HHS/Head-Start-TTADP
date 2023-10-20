const {
  prepMigration,
} = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      const oldTopicId = 127;
      const newTopicId = 130;

      await queryInterface.sequelize.query(``, { transaction });
    });
  },

  down: async () => {},
};
