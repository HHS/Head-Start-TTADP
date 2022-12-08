// Pulled directly from the migration that originally created this enum.
// Used in the down migration to restore the enum to its original state.
// src/migrations/20220724152116-create-mailer.js
const ACTIONS = [
  'collaboratorAssigned',
  'changesRequested',
  'approverAssigned',
  'reportApproved',
  'collaboratorDigest',
  'changesRequestedDigest',
  'approverAssignedDigest',
  'reportApprovedDigest',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => {
    // insert a new row into the UserSettings table
    await queryInterface.sequelize.query(
      `
        INSERT INTO "UserSettings" ("class", "key", "default", "createdAt", "updatedAt")
        VALUES ('email', 'emailWhenGranteeReportApprovedProgramSpecialist', '"never"', current_timestamp, current_timestamp)
      `,
      { transaction },
    );

    await queryInterface.sequelize.query(
      `
        ALTER TYPE "enum_MailerLogs_action" ADD VALUE 'granteeReportApproved';
        ALTER TYPE "enum_MailerLogs_action" ADD VALUE 'granteeReportApprovedDigest';
      `,
    );
  }),
  down: (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => {
    const [[{ id }]] = await queryInterface.sequelize.query(
      `
        SELECT "id" FROM "UserSettings" WHERE "class" = 'email' AND "key" = 'emailWhenGranteeReportApprovedProgramSpecialist'
      `,
      { transaction },
    );

    await queryInterface.sequelize.query(
      `
        DELETE FROM "UserSettingOverrides" WHERE "userSettingId" = ${id};
        DELETE FROM "UserSettings" WHERE "class" = 'email' AND "key" = 'emailWhenGranteeReportApprovedProgramSpecialist'
      `,
      { transaction },
    );

    await queryInterface.sequelize.query(
      `
        -- remove references to the deprecated value
        DELETE FROM "MailerLogs" WHERE "action" = 'granteeReportApproved';
        DELETE FROM "MailerLogs" WHERE "action" = 'granteeReportApprovedDigest';

        -- rename the existing type
        ALTER TYPE "enum_MailerLogs_action" RENAME TO "enum_MailerLogs_action_old";

        -- create the new type using ACTIONS:
        CREATE TYPE "enum_MailerLogs_action" AS ENUM('${ACTIONS.join('\', \'')}');

        -- update the columns to use the new type
        ALTER TABLE "MailerLogs" ALTER COLUMN "action" TYPE "enum_MailerLogs_action" USING "action"::text::"enum_MailerLogs_action";

        -- remove the old type
        DROP TYPE "enum_MailerLogs_action_old";
      `,
    );
  }),
};
