const { prepMigration } = require('../lib/migration');

const settings = [
  // existing emails settings:
  // 'emailWhenReportSubmittedForReview',
  // 'emailWhenChangeRequested',
  // 'emailWhenReportApproval',
  // 'emailWhenAppointedCollaborator',
  // 'emailWhenRecipientReportApprovedProgramSpecialist'
  {
    className: 'notification',
    key: 'inAppWhenReportSubmittedForReview',
    defaultValue: '"true"',
  },
  {
    className: 'notification',
    key: 'inAppWhenChangeRequested',
    defaultValue: '"true"',
  },
  {
    className: 'notification',
    key: 'inAppWhenReportApproval',
    defaultValue: '"true"',
  },
  {
    className: 'notification',
    key: 'inAppWhenAppointedCollaborator',
    defaultValue: '"true"',
  },
  {
    className: 'notification',
    key: 'inAppWhenRecipientReportApprovedProgramSpecialist',
    defaultValue: '"true"',
  },
  // new notifications (in-app and email)
  // WhenCollaboratorReportSubmittedForReview
  {
    className: 'notification',
    key: 'inAppWhenCollaboratorReportSubmittedForReview',
    defaultValue: '"true"',
  },
  {
    className: 'email',
    key: 'emailWhenCollaboratorReportSubmittedForReview',
    defaultValue: '"never"',
  },
  // WhenCreatorReportSubmittedForReview
  {
    className: 'notification',
    key: 'inAppWhenCreatorReportSubmittedForReview',
    defaultValue: '"true"',
  },
  {
    className: 'email',
    key: 'emailWhenCreatorReportSubmittedForReview',
    defaultValue: '"never"',
  },
  //
  // WhenCollabReportSubmittedForReview
  {
    className: 'notification',
    key: 'inAppWhenCollabReportSubmittedForReview',
    defaultValue: '"true"',
  },
  {
    className: 'email',
    key: 'emailWhenCollabReportSubmittedForReview',
    defaultValue: '"never"',
  },
  // WhenCollaborationReportSubmittedForReview
  {
    className: 'notification',
    key: 'inAppWhenCollaborationReportSubmittedForReview',
    defaultValue: '"true"',
  },
  {
    className: 'email',
    key: 'emailWhenCollaborationReportSubmittedForReview',
    defaultValue: '"never"',
  },
  // WhenCollaborationReportCollaboratorSubmitted
  {
    className: 'notification',
    key: 'inAppWhenCollaborationReportCollaboratorSubmitted',
    defaultValue: '"true"',
  },
  {
    className: 'email',
    key: 'emailWhenCollaborationReportCollaboratorSubmitted',
    defaultValue: '"never"',
  },
  // WhenCollaborationChangeRequested
  {
    className: 'notification',
    key: 'inAppWhenCollaborationChangeRequested',
    defaultValue: '"true"',
  },
  {
    className: 'email',
    key: 'emailWhenCollaborationChangeRequested',
    defaultValue: '"never"',
  },
  // WhenCollaborationReportApproved
  {
    className: 'notification',
    key: 'inAppWhenCollaborationReportApproved',
    defaultValue: '"true"',
  },
  {
    className: 'email',
    key: 'emailWhenCollaborationReportApproved',
    defaultValue: '"never"',
  },
  // WhenAddedAsCollaborationCollaborator
  {
    className: 'notification',
    key: 'inAppWhenAddedAsCollaborationCollaborator',
    defaultValue: '"true"',
  },
  {
    className: 'email',
    key: 'emailWhenAddedAsCollaborationCollaborator',
    defaultValue: '"never"',
  },
  // WhenAddedAsTTAStaffCommLog
  {
    className: 'notification',
    key: 'inAppWhenAddedAsTTAStaffCommLog',
    defaultValue: '"true"',
  },
  {
    className: 'email',
    key: 'emailWhenAddedAsTTAStaffCommLog',
    defaultValue: '"never"',
  },
  // WhenAddedAsRecipientCommLog
  {
    className: 'notification',
    key: 'inAppWhenAddedAsRecipientCommLog',
    defaultValue: '"true"',
  },
  {
    className: 'email',
    key: 'emailWhenAddedAsRecipientCommLog',
    defaultValue: '"never"',
  },
  // WhenAddedAsPocTrainingReport
  {
    className: 'notification',
    key: 'inAppWhenAddedAsPocTrainingReport',
    defaultValue: '"true"',
  },
  {
    className: 'email',
    key: 'emailWhenAddedAsPocTrainingReport',
    defaultValue: '"never"',
  },
  // WhenAddedAsCollaboratorTrainingReport
  {
    className: 'notification',
    key: 'inAppWhenAddedAsCollaboratorTrainingReport',
    defaultValue: '"true"',
  },
  {
    className: 'email',
    key: 'emailWhenAddedAsCollaboratorTrainingReport',
    defaultValue: '"never"',
  },
  // WhenSessionReviewRequestedTrainingReport
  {
    className: 'notification',
    key: 'inAppWhenSessionReviewRequestedTrainingReport',
    defaultValue: '"true"',
  },
  {
    className: 'email',
    key: 'emailWhenSessionReviewRequestedTrainingReport',
    defaultValue: '"never"',
  },
  // WhenSessionChangesRequestedTrainingReport
  {
    className: 'notification',
    key: 'inAppWhenSessionChangesRequestedTrainingReport',
    defaultValue: '"true"',
  },
  {
    className: 'email',
    key: 'emailWhenSessionChangesRequestedTrainingReport',
    defaultValue: '"never"',
  },
  // WhenSessionDetails20DaysCreatorCollaborator
  {
    className: 'notification',
    key: 'inAppWhenSessionDetails20DaysCreatorCollaborator',
    defaultValue: '"true"',
  },
  {
    className: 'email',
    key: 'emailWhenSessionDetails20DaysCreatorCollaborator',
    defaultValue: '"never"',
  },
  // WhenSessionDetails20DaysPoc
  {
    className: 'notification',
    key: 'inAppWhenSessionDetails20DaysPoc',
    defaultValue: '"true"',
  },
  {
    className: 'email',
    key: 'emailWhenSessionDetails20DaysPoc',
    defaultValue: '"never"',
  },
  // WhenNoSessionsCreatorCollaborator
  {
    className: 'notification',
    key: 'inAppWhenNoSessionsCreatorCollaborator',
    defaultValue: '"true"',
  },
  {
    className: 'email',
    key: 'emailWhenNoSessionsCreatorCollaborator',
    defaultValue: '"never"',
  },
  // WhenNoSessionsPoc
  {
    className: 'notification',
    key: 'inAppWhenNoSessionsPoc',
    defaultValue: '"true"',
  },
  {
    className: 'email',
    key: 'emailWhenNoSessionsPoc',
    defaultValue: '"never"',
  },
  // WhenEventDetails20DaysCreatorCollaborator
  {
    className: 'notification',
    key: 'inAppWhenEventDetails20DaysCreatorCollaborator',
    defaultValue: '"true"',
  },
  {
    className: 'email',
    key: 'emailWhenEventDetails20DaysCreatorCollaborator',
    defaultValue: '"never"',
  },
  // WhenEventNotCompleted
  {
    className: 'notification',
    key: 'inAppWhenEventNotCompleted',
    defaultValue: '"true"',
  },
  {
    className: 'email',
    key: 'emailWhenEventNotCompleted',
    defaultValue: '"never"',
  },
  //
  // WhenPlannedOutage
  {
    className: 'notification',
    key: 'inAppWhenPlannedOutage',
    defaultValue: '"true"',
  },
  {
    className: 'email',
    key: 'emailWhenPlannedOutage',
    defaultValue: '"never"',
  },
  // WhenUnplannedOutage (email only)
  {
    className: 'email',
    key: 'emailWhenUnplannedOutage',
    defaultValue: '"never"',
  },
  // WhenMonitoringDetailsAdded
  {
    className: 'notification',
    key: 'inAppWhenMonitoringDetailsAdded',
    defaultValue: '"true"',
  },
  {
    className: 'email',
    key: 'emailWhenMonitoringDetailsAdded',
    defaultValue: '"never"',
  },
  // WhenAddedAsCoOwner
  {
    className: 'notification',
    key: 'inAppWhenAddedAsCoOwner',
    defaultValue: '"true"',
  },
  {
    className: 'email',
    key: 'emailWhenAddedAsCoOwner',
    defaultValue: '"never"',
  },
  // WhenSharedMyGroup
  {
    className: 'notification',
    key: 'inAppWhenSharedMyGroup',
    defaultValue: '"true"',
  },
  {
    className: 'email',
    key: 'emailWhenSharedMyGroup',
    defaultValue: '"never"',
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await Promise.all(
        settings.map(({ key, defaultValue, className }) => {
          return queryInterface.sequelize.query(
            `INSERT INTO "UserSettings" ("class", "key", "default", "createdAt", "updatedAt")
          VALUES (:className, :key, :defaultValue, current_timestamp, current_timestamp)
        `,
            { transaction, replacements: { key, defaultValue, className } }
          );
        })
      );

      await Promise.all(
        settings
          .filter(({ className }) => className === 'email')
          .map(({ key }) =>
            queryInterface.sequelize.query(
              `
            ALTER TYPE "enum_MailerLogs_action" ADD VALUE :key;
          `,
              { transaction, replacements: { key } }
            )
          )
      );
    });
  },

  down: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      // reverting the enum/mailerLogs_action values is not supported by Postgres, so we will just delete the UserSettings rows that were added in the up migration
      await Promise.all(
        settings.map(({ key }) => {
          return queryInterface.sequelize.query(
            `
            DELETE FROM "UserSettings" WHERE "class" = 'email' AND "key" = :key;
          `,
            { transaction, replacements: { key } }
          );
        })
      );
    });
  },
};
