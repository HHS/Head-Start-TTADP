const { prepMigration } = require('../lib/migration');

// TR-1b (immediate POC email) and the TR-19/20/21 digests
const actions = [
  'trainingReportPocAdded',
  'trainingReportPocAddedDigest',
  'trainingReportCollaboratorAddedDigest',
  'trainingReportSessionSubmittedDigest',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      for (const action of actions) {
        await queryInterface.sequelize.query(
          `ALTER TYPE "enum_MailerLogs_action" ADD VALUE IF NOT EXISTS '${action}';`,
          { transaction }
        );
      }
    });
  },

  down: () => {
    // no down migration necessary for enum modifications
    // a new migration should be written instead
  },
};
