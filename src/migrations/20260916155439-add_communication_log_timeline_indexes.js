const { prepMigration } = require('../lib/migration');

const RECIPIENT_INDEX = 'communication_log_recipients_recipient_log_idx';
const FILE_INDEX = 'communication_log_files_log_idx';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      // Find a recipient's logs before sorting and paging the Timeline index.
      await queryInterface.addIndex(
        'CommunicationLogRecipients',
        ['recipientId', 'communicationLogId'],
        { name: RECIPIENT_INDEX, transaction }
      );
      // Populate attachments for only the communication logs on the current page.
      await queryInterface.addIndex('CommunicationLogFiles', ['communicationLogId'], {
        name: FILE_INDEX,
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await queryInterface.removeIndex('CommunicationLogFiles', FILE_INDEX, { transaction });
      await queryInterface.removeIndex('CommunicationLogRecipients', RECIPIENT_INDEX, {
        transaction,
      });
    });
  },
};
