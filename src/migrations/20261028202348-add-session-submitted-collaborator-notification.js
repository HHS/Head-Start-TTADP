const { prepMigration } = require('../lib/migration');

// TR-3c: event collaborators are notified when the creator submits a session for approval
const settings = [
  {
    className: 'notification',
    key: 'inAppWhenSessionSubmittedCollaboratorTrainingReport',
    defaultValue: 'true',
  },
  {
    className: 'email',
    key: 'emailWhenSessionSubmittedCollaboratorTrainingReport',
    defaultValue: '"never"',
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.sequelize.query(
        `
        ALTER TYPE "enum_Notifications_type" ADD VALUE IF NOT EXISTS 'trainingReportSessionSubmittedCollaborator';
        ALTER TYPE "enum_MailerLogs_action" ADD VALUE IF NOT EXISTS 'emailWhenSessionSubmittedCollaboratorTrainingReport';
        ALTER TYPE "enum_MailerLogs_action" ADD VALUE IF NOT EXISTS 'emailWhenSessionSubmittedCollaboratorTrainingReportDigest';
      `,
        { transaction }
      );

      await Promise.all(
        settings.map(({ key, defaultValue, className }) =>
          queryInterface.sequelize.query(
            `INSERT INTO "UserSettings" ("class", "key", "default", "createdAt", "updatedAt")
            VALUES (:className, :key, CAST(:defaultValue AS jsonb), current_timestamp, current_timestamp)
          `,
            { transaction, replacements: { key, defaultValue, className } }
          )
        )
      );
    });
  },

  down: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      // reverting enum values is not supported by Postgres, so only the UserSettings rows are removed
      await Promise.all(
        settings.map(({ className, key }) =>
          queryInterface.sequelize.query(
            `
            DELETE FROM "UserSettings" WHERE "class" = :className AND "key" = :key;
          `,
            { transaction, replacements: { className, key } }
          )
        )
      );
    });
  },
};
