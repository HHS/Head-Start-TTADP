const { prepMigration } = require('../lib/migration');

// TR-28a/b/c: a Training Report is imported into the TTA Hub where the user is the Event Creator.
// The import email (tr_event_imported) used to go to every Event Creator unconditionally. Email
// notifications are opt-in, even ones users were already receiving, so the email setting defaults
// to "never" like every other email setting; the in-app alert defaults to on.
const settings = [
  {
    className: 'notification',
    key: 'inAppWhenEventImportedTrainingReport',
    defaultValue: 'true',
  },
  {
    className: 'email',
    key: 'emailWhenEventImportedTrainingReport',
    defaultValue: '"never"',
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      for (const { className, key, defaultValue } of settings) {
        await queryInterface.sequelize.query(
          `INSERT INTO "UserSettings" ("class", "key", "default", "createdAt", "updatedAt")
          SELECT :className, :key, CAST(:defaultValue AS jsonb), current_timestamp, current_timestamp
          WHERE NOT EXISTS (SELECT 1 FROM "UserSettings" WHERE "class" = :className AND "key" = :key)`,
          { transaction, replacements: { className, key, defaultValue } }
        );
      }
    });
  },

  down: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      const keys = settings.map(({ key }) => key);

      // user overrides reference the setting, so remove them first
      await queryInterface.sequelize.query(
        `DELETE FROM "UserSettingOverrides"
        WHERE "userSettingId" IN (SELECT id FROM "UserSettings" WHERE "key" IN (:keys))`,
        { transaction, replacements: { keys } }
      );
      await queryInterface.sequelize.query(`DELETE FROM "UserSettings" WHERE "key" IN (:keys)`, {
        transaction,
        replacements: { keys },
      });
    });
  },
};
