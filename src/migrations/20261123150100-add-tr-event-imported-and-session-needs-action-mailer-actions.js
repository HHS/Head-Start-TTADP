const { prepMigration } = require('../lib/migration');

// TR-28b (immediate event imported email) and the TR-28c and TR-22 digests
const actions = [
  'emailWhenEventImportedTrainingReport',
  'trainingReportEventImportedDigest',
  'trainingReportSessionNeedsActionDigest',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      for (const action of actions) {
        await queryInterface.sequelize.query(
          `ALTER TYPE "enum_MailerLogs_action" ADD VALUE IF NOT EXISTS '${action}';`,
          { transaction }
        );
      }
    });
  },

  down: async () => {
    // no down migration necessary for enum modifications
    // a new migration should be written instead
  },
};
