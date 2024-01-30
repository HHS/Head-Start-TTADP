const { GOAL_SOURCES } = require('@ttahub/common');
const { prepMigration, dropAndRecreateEnum } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await dropAndRecreateEnum(
        queryInterface,
        transaction,
        'enum_Goals_source',
        'Goals',
        'source',
        GOAL_SOURCES,
        'text',
        false,
      );
    });
  },

  async down() {
    // no rollbacks
  },
};
