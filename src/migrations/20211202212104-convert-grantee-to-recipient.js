/* eslint-disable max-len */

module.exports = {
  up: async (queryInterface) => {
    // Cannot add and use a new type inside a transaction. The transaction that adds the type must be committed
    // before the new type can be used. Also postgres does not like if you try to add a type that already exists
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE "enum_NextSteps_noteType" ADD VALUE 'RECIPIENT';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    return queryInterface.sequelize.transaction(async (transaction) => {
    /*
      * ActivityRecipient actions:
      * rename column 'nonGranteeId' to 'otherEntityId'
      * update foreign key 'ActivityParticipants_nonGranteeId_fkey' to 'ActivityRecipients_otherEntityId'
      */
      await queryInterface.renameColumn('ActivityRecipients', 'nonGranteeId', 'otherEntityId', { transaction });
      await queryInterface.sequelize.query('ALTER TABLE "ActivityRecipients" RENAME CONSTRAINT "ActivityParticipants_nonGranteeId_fkey" TO "ActivityRecipients_otherEntityId";', { transaction });

      /*
      * Grant actions:
      * rename column 'granteeId' to 'recipientId'
      * update foreign key 'Grants_granteeId_fkey' to 'Grants_recipientId_fkey'
      */
      await queryInterface.renameColumn('Grants', 'granteeId', 'recipientId', { transaction });
      await queryInterface.sequelize.query('ALTER TABLE "Grants" RENAME CONSTRAINT "Grants_granteeId_fkey" TO "Grants_recipientId_fkey";', { transaction });

      /*
      * Next Step actions:
      * add 'RECIPIENT' as an enum value to the datatype for the 'noteType' column
      * update all 'GRANTEE' noteTypes to 'RECIPIENT'
      */

      await queryInterface.sequelize.query('UPDATE "NextSteps" SET "noteType" = \'RECIPIENT\' WHERE "noteType" = \'GRANTEE\';', { transaction });

      /*
      * NonGrantee actions:
      * rename table to 'OtherEntities'
      */
      await queryInterface.renameTable('NonGrantees', 'OtherEntities', { transaction });

      /*
      * Grantee actions:
      * rename table to 'Recipients'
      * rename 'granteeType' to 'recipientType'
      */
      await queryInterface.renameTable('Grantees', 'Recipients', { transaction });
      await queryInterface.renameColumn('Recipients', 'granteeType', 'recipientType', { transaction });

      /*
      * Activity Report actions:
      * update 'activityRecipientType'
      *   'grantee' to 'recipient'
      *   'non-grantee' to 'other-entities'
      *
      * update legacy reports 'activityRecipientType'
      *   'imported' field has 'nonGranteeActivity' value to 'other-entity'
      *   'imported' field has empty 'nonGranteeActivity' to 'recipient'
      *
      * update 'reason' of 'New Grantee' to 'New Recipient'
      *
      * update 'requested by'
      *   'Regional Office' to 'regionalOffice' (legacy reports)
      *   'Grantee' to 'recipient'              (legacy reports)
      *   'grantee' to 'recipient'
      */
      await queryInterface.sequelize.query('UPDATE "ActivityReports" SET "activityRecipientType" = \'recipient\' WHERE "activityRecipientType" = \'grantee\';', { transaction });
      await queryInterface.sequelize.query('UPDATE "ActivityReports" SET "activityRecipientType" = \'other-entity\' WHERE "activityRecipientType" = \'non-grantee\';', { transaction });

      await queryInterface.sequelize.query('UPDATE "ActivityReports" SET "activityRecipientType" = \'recipient\' WHERE "activityRecipientType" = \'nonGrantee\' and imported->>\'nonGranteeActivity\' = \'\';', { transaction });
      await queryInterface.sequelize.query('UPDATE "ActivityReports" SET "activityRecipientType" = \'other-entity\' WHERE "activityRecipientType" = \'nonGrantee\' and imported->>\'nonGranteeActivity\' != \'\';', { transaction });

      await queryInterface.sequelize.query('UPDATE "ActivityReports" SET "reason" = ARRAY_REPLACE("reason", \'New Grantee\', \'New Recipient\');', { transaction });

      await queryInterface.sequelize.query('UPDATE "ActivityReports" SET "requester" = \'regionalOffice\' WHERE "requester" = \'Regional Office\';', { transaction });
      await queryInterface.sequelize.query('UPDATE "ActivityReports" SET "requester" = \'recipient\' WHERE "requester" = \'Grantee\';', { transaction });
      await queryInterface.sequelize.query('UPDATE "ActivityReports" SET "requester" = \'recipient\' WHERE "requester" = \'grantee\';', { transaction });

      /*
      * GrantGoals actions:
      * rename 'granteeId' to 'recipientId'
      * update foreign key 'GrantGoals_granteeId_fkey' to 'GrantGoals_recipientId_fkey'
      */
      await queryInterface.renameColumn('GrantGoals', 'granteeId', 'recipientId', { transaction });
      await queryInterface.sequelize.query('ALTER TABLE "GrantGoals" RENAME CONSTRAINT "GrantGoals_granteeId_fkey" TO "GrantGoals_recipientId_fkey";', { transaction });
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE "enum_NextSteps_noteType" ADD VALUE 'GRANTEE';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    return queryInterface.sequelize.transaction(async (transaction) => {
    /*
      * ActivityRecipient actions:
      * rename column 'otherEntityId' to 'nonGranteeId'
      * update foreign key 'ActivityRecipients_otherEntityId' to 'ActivityParticipants_nonGranteeId_fkey'
      */
      await queryInterface.renameColumn('ActivityRecipients', 'otherEntityId', 'nonGranteeId', { transaction });
      await queryInterface.sequelize.query('ALTER TABLE "ActivityRecipients" RENAME CONSTRAINT "ActivityRecipients_otherEntityId" TO "ActivityParticipants_nonGranteeId_fkey";', { transaction });

      /*
      * Grant actions:
      * rename column 'recipientId' to 'granteeId'
      * update foreign key 'Grants_recipientId_fkey' to 'Grants_granteeId_fkey'
      */
      await queryInterface.renameColumn('Grants', 'recipientId', 'granteeId', { transaction });
      await queryInterface.sequelize.query('ALTER TABLE "Grants" RENAME CONSTRAINT "Grants_recipientId_fkey" TO "Grants_granteeId_fkey";', { transaction });

      /*
      * Next Step actions:
      * add 'GRANTEE' as an enum value to the datatype for the 'noteType' column
      * update all 'RECIPIENT' noteTypes to 'GRANTEE'
      */
      await queryInterface.sequelize.query('UPDATE "NextSteps" SET "noteType" = \'GRANTEE\' WHERE "noteType" = \'RECIPIENT\';', { transaction });

      /*
      * OtherEntity actions:
      * rename table to 'NonGrantees'
      */
      await queryInterface.renameTable('OtherEntities', 'NonGrantees', { transaction });

      /*
      * Recipients actions:
      * rename table to 'Grantees'
      * rename 'recipientType' to 'granteeType'
      */
      await queryInterface.renameTable('Recipients', 'Grantees', { transaction });
      await queryInterface.renameColumn('Grantees', 'recipientType', 'granteeType', { transaction });

      /*
      * Activity Report actions:
      * update 'activityRecipientType'
      *   'recipient' to 'grantee'
      *   'other-entity' to 'non-grantee'
      *
      * update legacy reports 'activityRecipientType'
      * The values the legacy reports had before this migration were wrong, so we don't
      * need to switch them back to bad values here
      *
      * update 'reason' of 'New Recipient' to 'New Grantee'
      *
      * update 'requested by'
      *   'recipient' to 'grantee'
      * Once again we don't need to set legacy reports back to bad values
      */
      await queryInterface.sequelize.query('UPDATE "ActivityReports" SET "activityRecipientType" = \'grantee\' WHERE "activityRecipientType" = \'recipient\';', { transaction });
      await queryInterface.sequelize.query('UPDATE "ActivityReports" SET "activityRecipientType" = \'non-grantee\' WHERE "activityRecipientType" = \'other-entity\';', { transaction });

      await queryInterface.sequelize.query('UPDATE "ActivityReports" SET "reason" = ARRAY_REPLACE("reason", \'New Recipient\', \'New Grantee\');', { transaction });

      await queryInterface.sequelize.query('UPDATE "ActivityReports" SET "requester" = \'grantee\' WHERE "requester" = \'recipient\';', { transaction });

      /*
      * GrantGoals actions:
      * rename 'recipientId' to 'granteeId'
      * update foreign key 'GrantGoals_recipientId_fkey' to 'GrantGoals_granteeId_fkey'
      */
      await queryInterface.renameColumn('GrantGoals', 'recipientId', 'granteeId', { transaction });
      await queryInterface.sequelize.query('ALTER TABLE "GrantGoals" RENAME CONSTRAINT "GrantGoals_recipientId_fkey" TO "GrantGoals_granteeId_fkey";', { transaction });
    });
  },
};
