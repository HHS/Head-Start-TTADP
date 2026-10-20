const { prepMigration } = require('../lib/migration');

const digests = [
  'emailWhenCollaboratorReportSubmittedForReview',
  'emailWhenCreatorReportSubmittedForReview',
  'emailWhenCollabReportSubmittedForReview',
  'emailWhenCollaborationReportSubmittedForReview',
  'emailWhenCollaborationReportCollaboratorSubmitted',
  'emailWhenCollaborationChangeRequested',
  'emailWhenCollaborationReportApproved',
  'emailWhenAddedAsCollaborationCollaborator',
  'emailWhenAddedAsTTAStaffCommLog',
  'emailWhenAddedAsRecipientCommLog',
  'emailWhenAddedAsPocTrainingReport',
  'emailWhenAddedAsCollaboratorTrainingReport',
  'emailWhenSessionReviewRequestedTrainingReport',
  'emailWhenSessionChangesRequestedTrainingReport',
  'emailWhenSessionDetails20DaysCreatorCollaborator',
  'emailWhenSessionDetails20DaysPoc',
  'emailWhenNoSessionsCreatorCollaborator',
  'emailWhenNoSessionsPoc',
  'emailWhenEventDetails20DaysCreatorCollaborator',
  'emailWhenEventNotCompleted',
  'emailWhenPlannedOutage',
  'emailWhenUnplannedOutage',
  'emailWhenMonitoringDetailsAdded',
  'emailWhenAddedAsCoOwner',
  'emailWhenSharedMyGroup',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await Promise.all(
        digests.map((key) =>
          queryInterface.sequelize.query(
            `
            ALTER TYPE "enum_MailerLogs_action" ADD VALUE IF NOT EXISTS '${key}Digest';
          `,
            { transaction }
          )
        )
      );
    });
  },

  down: () => {
    // no down migration necessary for enum modifications
    // a new migration should be written instead
  },
};
