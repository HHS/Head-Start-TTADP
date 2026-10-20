const { prepMigration } = require('../lib/migration');

const INDEX_NAME = 'goals_closed_timeline_lookup_idx';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      // Supports PRIOR_CLOSED_GOAL_PREDICATE in recipientTimelineSources.ts:
      // match the grant/template first, then seek earlier goals by creation time and id.
      await queryInterface.addIndex(
        'Goals',
        ['grantId', 'goalTemplateId', 'prestandard', 'createdAt', 'id'],
        {
          name: INDEX_NAME,
          where: {
            status: 'Closed',
            deletedAt: null,
            mapsToParentGoalId: null,
          },
          transaction,
        }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await queryInterface.removeIndex('Goals', INDEX_NAME, { transaction });
    });
  },
};
