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

      await queryInterface.sequelize.query(
        `
        ALTER TABLE "SessionReportFiles"
        ADD CONSTRAINT "SessionReportFiles_sessionReportId_fkey"
        FOREIGN KEY ("sessionReportPilotId") REFERENCES "SessionReports" (id)
        `,
        { transaction },
      );

      // Update foreign key references in SessionReportSupportingAttachments table
      await queryInterface.sequelize.query(
        `
        ALTER TABLE "SessionReportSupportingAttachments"
        DROP CONSTRAINT "SessionReportPilotSupportingAttachments_sessionReportPilotId_fkey"
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        ALTER TABLE "SessionReportSupportingAttachments"
        ADD CONSTRAINT "SessionReportSupportingAttachments_sessionReportId_fkey"
        FOREIGN KEY ("sessionReportPilotId") REFERENCES "SessionReports" (id)
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

      // Revert foreign key references in SessionReportPilots table
      await queryInterface.sequelize.query(
        `
        ALTER TABLE "SessionReportSupportingAttachments"
        DROP CONSTRAINT "SessionReportSupportingAttachments_sessionReportId_fkey"
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        ALTER TABLE "SessionReportSupportingAttachments"
        ADD CONSTRAINT "SessionReportPilotSupportingAttachments_sessionReportPilotId_fkey"
        FOREIGN KEY ("sessionReportPilotId") REFERENCES "SessionReportPilots" (id)
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        ALTER TABLE "SessionReportFiles"
        DROP CONSTRAINT "SessionReportFiles_sessionReportId_fkey"
        `,
        { transaction },
      );

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

      // Rename main tables back
      await queryInterface.renameTable('SessionReportSupportingAttachments', 'SessionReportPilotSupportingAttachments', { transaction });
      await queryInterface.renameTable('SessionReportFiles', 'SessionReportPilotFiles', { transaction });
      await queryInterface.renameTable('SessionReports', 'SessionReportPilots', { transaction });
      await queryInterface.renameTable('TrainingReportNationalCenterUsers', 'EventReportPilotNationalCenterUsers', { transaction });
      await queryInterface.renameTable('TrainingReports', 'EventReportPilots', { transaction });
    });
  },
};
