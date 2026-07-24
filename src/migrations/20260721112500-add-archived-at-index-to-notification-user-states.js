const { prepMigration } = require('../lib/migration');

const INDEX_NAME = 'notification_user_states_archived_at_not_null_idx';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.addIndex(
        'NotificationUserStates',
        ['archivedAt', 'notificationId', 'userId'],
        {
          name: INDEX_NAME,
          where: {
            archivedAt: {
              [Sequelize.Op.ne]: null,
            },
          },
          transaction,
        }
      );
    });
  },

  async down(queryInterface, _) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.removeIndex('NotificationUserStates', INDEX_NAME, { transaction });
    });
  },
};
