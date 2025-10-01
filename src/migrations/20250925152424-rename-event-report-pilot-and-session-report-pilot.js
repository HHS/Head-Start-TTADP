const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      // Rename main tables
      await queryInterface.renameTable('EventReportPilots', 'TrainingReports', { transaction });
      await queryInterface.renameTable('EventReportPilotNationalCenterUsers', 'TrainingReportNationalCenterUsers', { transaction });
      await queryInterface.renameTable('SessionReportPilots', 'SessionReports', { transaction });
      await queryInterface.renameTable('SessionReportPilotFiles', 'SessionReportFiles', { transaction });
      await queryInterface.renameTable('SessionReportPilotSupportingAttachments', 'SessionReportSupportingAttachments', { transaction });

      // Update foreign key references in SessionReports table
      await queryInterface.sequelize.query(
        `
        ALTER TABLE "SessionReports"
        DROP CONSTRAINT "SessionReportPilots_eventId_fkey"
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        ALTER TABLE "SessionReports"
        ADD CONSTRAINT "SessionReports_eventId_fkey"
        FOREIGN KEY ("eventId") REFERENCES "TrainingReports" (id)
        `,
        { transaction },
      );

      // Update foreign key references in SessionReportFiles table
      await queryInterface.sequelize.query(
        `
        ALTER TABLE "SessionReportFiles"
        DROP CONSTRAINT "SessionReportPilotFiles_sessionReportPilotId_fkey"
        `,
        { transaction },
      );

      await queryInterface.renameColumn('SessionReportFiles', 'sessionReportPilotId', 'sessionReportId', { transaction });

      await queryInterface.sequelize.query(
        `
        ALTER TABLE "SessionReportFiles"
        ADD CONSTRAINT "SessionReportFiles_sessionReportId_fkey"
        FOREIGN KEY ("sessionReportId") REFERENCES "SessionReports" (id)
        `,
        { transaction },
      );

      // Update foreign key references in SessionReportSupportingAttachments table
      await queryInterface.renameColumn('SessionReportSupportingAttachments', 'sessionReportPilotId', 'sessionReportId', { transaction });

      await queryInterface.sequelize.query(
        `
        ALTER TABLE "SessionReportSupportingAttachments"
        ADD CONSTRAINT "SessionReportSupportingAttachments_sessionReportId_fkey"
        FOREIGN KEY ("sessionReportId") REFERENCES "SessionReports" (id)
        `,
        { transaction },
      );

      // Recreate audit triggers for renamed tables
      // The audit system uses specific naming conventions for triggers and functions
      // We need to drop triggers from the renamed tables first, then drop old functions,
      // rename the ZAL tables, and finally recreate triggers with new names
      await queryInterface.sequelize.query(
        `
        -- Drop triggers from renamed tables (they still reference old function names)
        DROP TRIGGER IF EXISTS "ZALTEventReportPilots" ON "TrainingReports";
        DROP TRIGGER IF EXISTS "ZALTruncateTEventReportPilots" ON "TrainingReports";

        DROP TRIGGER IF EXISTS "ZALTEventReportPilotNationalCenterUsers" ON "TrainingReportNationalCenterUsers";
        DROP TRIGGER IF EXISTS "ZALTruncateTEventReportPilotNationalCenterUsers" ON "TrainingReportNationalCenterUsers";

        DROP TRIGGER IF EXISTS "ZALTSessionReportPilots" ON "SessionReports";
        DROP TRIGGER IF EXISTS "ZALTruncateTSessionReportPilots" ON "SessionReports";

        DROP TRIGGER IF EXISTS "ZALTSessionReportPilotFiles" ON "SessionReportFiles";
        DROP TRIGGER IF EXISTS "ZALTruncateTSessionReportPilotFiles" ON "SessionReportFiles";

        DROP TRIGGER IF EXISTS "ZALTSessionReportPilotSupportingAttachments" ON "SessionReportSupportingAttachments";
        DROP TRIGGER IF EXISTS "ZALTruncateTSessionReportPilotSupportingAttachments" ON "SessionReportSupportingAttachments";

        -- Drop old audit functions
        DROP FUNCTION IF EXISTS "ZALFEventReportPilots"();
        DROP FUNCTION IF EXISTS "ZALTruncateFEventReportPilots"();

        DROP FUNCTION IF EXISTS "ZALFEventReportPilotNationalCenterUsers"();
        DROP FUNCTION IF EXISTS "ZALTruncateFEventReportPilotNationalCenterUsers"();

        DROP FUNCTION IF EXISTS "ZALFSessionReportPilots"();
        DROP FUNCTION IF EXISTS "ZALTruncateFSessionReportPilots"();

        DROP FUNCTION IF EXISTS "ZALFSessionReportPilotFiles"();
        DROP FUNCTION IF EXISTS "ZALTruncateFSessionReportPilotFiles"();

        DROP FUNCTION IF EXISTS "ZALFSessionReportPilotSupportingAttachments"();
        DROP FUNCTION IF EXISTS "ZALTruncateFSessionReportPilotSupportingAttachments"();
        `,
        { transaction },
      );

      // Rename audit tables
      await queryInterface.sequelize.query(
        `
        ALTER TABLE "ZALEventReportPilots" RENAME TO "ZALTrainingReports";
        ALTER TABLE "ZALEventReportPilotNationalCenterUsers" RENAME TO "ZALTrainingReportNationalCenterUsers";
        ALTER TABLE "ZALSessionReportPilots" RENAME TO "ZALSessionReports";
        ALTER TABLE "ZALSessionReportPilotFiles" RENAME TO "ZALSessionReportFiles";
        ALTER TABLE "ZALSessionReportPilotSupportingAttachments" RENAME TO "ZALSessionReportSupportingAttachments";
        `,
        { transaction },
      );

      // Create new audit triggers and functions for the renamed tables
      await queryInterface.sequelize.query(
        `
        SELECT "ZAFAddAuditingOnTable"('TrainingReports');
        SELECT "ZAFAddAuditingOnTable"('TrainingReportNationalCenterUsers');
        SELECT "ZAFAddAuditingOnTable"('SessionReports');
        SELECT "ZAFAddAuditingOnTable"('SessionReportFiles');
        SELECT "ZAFAddAuditingOnTable"('SessionReportSupportingAttachments');
        `,
        { transaction },
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      // WARNING! Running this migration needs to be done in conjunction
      // with code changes

      // Rename audit tables back
      await queryInterface.sequelize.query(
        `
        ALTER TABLE "ZALTrainingReports" RENAME TO "ZALEventReportPilots";
        ALTER TABLE "ZALTrainingReportNationalCenterUsers" RENAME TO "ZALEventReportPilotNationalCenterUsers";
        ALTER TABLE "ZALSessionReports" RENAME TO "ZALSessionReportPilots";
        ALTER TABLE "ZALSessionReportFiles" RENAME TO "ZALSessionReportPilotFiles";
        ALTER TABLE "ZALSessionReportSupportingAttachments" RENAME TO "ZALSessionReportPilotSupportingAttachments";
        `,
        { transaction },
      );

      // Revert foreign key references in SessionReportSupportingAttachments table
      await queryInterface.sequelize.query(
        `
        ALTER TABLE "SessionReportSupportingAttachments"
        DROP CONSTRAINT "SessionReportSupportingAttachments_sessionReportId_fkey"
        `,
        { transaction },
      );

      await queryInterface.renameColumn('SessionReportSupportingAttachments', 'sessionReportId', 'sessionReportPilotId', { transaction });

      await queryInterface.sequelize.query(
        `
        ALTER TABLE "SessionReportSupportingAttachments"
        ADD CONSTRAINT "SessionReportPilotSupportingAttachments_sessionReportPilotId_fkey"
        FOREIGN KEY ("sessionReportPilotId") REFERENCES "SessionReportPilots" (id)
        `,
        { transaction },
      );

      // Revert foreign key references in SessionReportFiles table
      await queryInterface.sequelize.query(
        `
        ALTER TABLE "SessionReportFiles"
        DROP CONSTRAINT "SessionReportFiles_sessionReportId_fkey"
        `,
        { transaction },
      );

      await queryInterface.renameColumn('SessionReportFiles', 'sessionReportId', 'sessionReportPilotId', { transaction });

      await queryInterface.sequelize.query(
        `
        ALTER TABLE "SessionReportFiles"
        ADD CONSTRAINT "SessionReportPilotFiles_sessionReportPilotId_fkey"
        FOREIGN KEY ("sessionReportPilotId") REFERENCES "SessionReportPilots" (id)
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        ALTER TABLE "SessionReports"
        DROP CONSTRAINT "SessionReports_eventId_fkey"
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        ALTER TABLE "SessionReports"
        ADD CONSTRAINT "SessionReportPilots_eventId_fkey"
        FOREIGN KEY ("eventId") REFERENCES "EventReportPilots" (id)
        `,
        { transaction },
      );

      // Recreate audit triggers for the old table names (reverse of up migration)
      // Drop triggers from renamed tables first, then drop functions,
      // rename ZAL tables, and recreate triggers
      await queryInterface.sequelize.query(
        `
        -- Drop triggers from renamed tables (they reference new function names)
        DROP TRIGGER IF EXISTS "ZALTTrainingReports" ON "EventReportPilots";
        DROP TRIGGER IF EXISTS "ZALTruncateTTrainingReports" ON "EventReportPilots";

        DROP TRIGGER IF EXISTS "ZALTTrainingReportNationalCenterUsers" ON "EventReportPilotNationalCenterUsers";
        DROP TRIGGER IF EXISTS "ZALTruncateTTrainingReportNationalCenterUsers" ON "EventReportPilotNationalCenterUsers";

        DROP TRIGGER IF EXISTS "ZALTSessionReports" ON "SessionReportPilots";
        DROP TRIGGER IF EXISTS "ZALTruncateTSessionReports" ON "SessionReportPilots";

        DROP TRIGGER IF EXISTS "ZALTSessionReportFiles" ON "SessionReportPilotFiles";
        DROP TRIGGER IF EXISTS "ZALTruncateTSessionReportFiles" ON "SessionReportPilotFiles";

        DROP TRIGGER IF EXISTS "ZALTSessionReportSupportingAttachments" ON "SessionReportPilotSupportingAttachments";
        DROP TRIGGER IF EXISTS "ZALTruncateTSessionReportSupportingAttachments" ON "SessionReportPilotSupportingAttachments";

        -- Drop new audit functions
        DROP FUNCTION IF EXISTS "ZALFTrainingReports"();
        DROP FUNCTION IF EXISTS "ZALTruncateFTrainingReports"();

        DROP FUNCTION IF EXISTS "ZALFTrainingReportNationalCenterUsers"();
        DROP FUNCTION IF EXISTS "ZALTruncateFTrainingReportNationalCenterUsers"();

        DROP FUNCTION IF EXISTS "ZALFSessionReports"();
        DROP FUNCTION IF EXISTS "ZALTruncateFSessionReports"();

        DROP FUNCTION IF EXISTS "ZALFSessionReportFiles"();
        DROP FUNCTION IF EXISTS "ZALTruncateFSessionReportFiles"();

        DROP FUNCTION IF EXISTS "ZALFSessionReportSupportingAttachments"();
        DROP FUNCTION IF EXISTS "ZALTruncateFSessionReportSupportingAttachments"();
        `,
        { transaction },
      );

      // Rename audit tables back
      await queryInterface.sequelize.query(
        `
        ALTER TABLE "ZALTrainingReports" RENAME TO "ZALEventReportPilots";
        ALTER TABLE "ZALTrainingReportNationalCenterUsers" RENAME TO "ZALEventReportPilotNationalCenterUsers";
        ALTER TABLE "ZALSessionReports" RENAME TO "ZALSessionReportPilots";
        ALTER TABLE "ZALSessionReportFiles" RENAME TO "ZALSessionReportPilotFiles";
        ALTER TABLE "ZALSessionReportSupportingAttachments" RENAME TO "ZALSessionReportPilotSupportingAttachments";
        `,
        { transaction },
      );

      // Create audit triggers for the old table names
      await queryInterface.sequelize.query(
        `
        SELECT "ZAFAddAuditingOnTable"('EventReportPilots');
        SELECT "ZAFAddAuditingOnTable"('EventReportPilotNationalCenterUsers');
        SELECT "ZAFAddAuditingOnTable"('SessionReportPilots');
        SELECT "ZAFAddAuditingOnTable"('SessionReportPilotFiles');
        SELECT "ZAFAddAuditingOnTable"('SessionReportPilotSupportingAttachments');
        `,
        { transaction },
      );

      // Rename main tables back
      await queryInterface.renameTable('SessionReportSupportingAttachments', 'SessionReportPilotSupportingAttachments', { transaction });
      await queryInterface.renameTable('SessionReportFiles', 'SessionReportPilotFiles', { transaction });
      await queryInterface.renameTable('SessionReports', 'SessionReportPilots', { transaction });
      await queryInterface.renameTable('TrainingReportNationalCenterUsers', 'EventReportPilotNationalCenterUsers', { transaction });
      await queryInterface.renameTable('TrainingReports', 'EventReportPilots', { transaction });
    });
  },
};
