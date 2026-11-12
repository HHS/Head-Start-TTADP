const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      // Monitoring digest (TTAHUB-6062). The immediate email's action,
      // emailWhenMonitoringDetailsAdded, is already in the enum.
      await queryInterface.sequelize.query(
        `
        ALTER TYPE "enum_MailerLogs_action" ADD VALUE IF NOT EXISTS 'monitoringDetailsAddedDigest';
      `,
        { transaction }
      );
    });
  },

  down: () => {
    // no down migration necessary for enum modifications
    // a new migration should be written instead
  },
};
