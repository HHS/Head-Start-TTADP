const { prepMigration, removeTables } = require('../lib/migration');

const NOTIFICATION_TYPES = [
  'collaboratorAssigned',
  'changesRequested',
  'approverAssigned',
  'reportApproved',
  'collaboratorDigest',
  'changesRequestedDigest',
  'approverAssignedDigest',
  'reportApprovedDigest',
  'recipientReportApproved',
  'recipientReportApprovedDigest',
  'activityReportResubmitted',
  'activityReportSubmittedToCollaboratorDigest',
  'activityReportCollaboratorSubmittedDigest',
  'collabReportCollaboratorAdded',
  'collabReportSubmitted',
  'collabReportResubmitted',
  'collabReportNeedsAction',
  'collabReportApproved',
  'collabReportSubmittedDigest',
  'collabReportNeedsActionDigest',
  'collabReportApprovedDigest',
  'collabReportCollaboratorDigest',
  'collabReportSubmittedToCollaboratorDigest',
  'collabReportCollaboratorSubmittedDigest',
  'trainingReportPocAdded',
  'trainingReportCollaboratorAdded',
  'trainingReportSessionCreated',
  'trainingReportSessionSubmitted',
  'trainingReportSessionNeedsAction',
  'trainingReportSessionResubmitted',
  'trainingReportEventCompleted',
  'trainingReportTaskDueNotifications',
  'trainingReportEventImported',
  'trainingReportEventInfoMissing',
  'trainingReportEventInfoPastDue',
  'trainingReportSessionInfoMissing',
  'trainingReportSessionInfoPastDue',
  'trainingReportNoSessionsCreated',
  'trainingReportNoSessionsPastDue',
  'trainingReportEventNotCompleted',
  'trainingReportEventNotCompletedPastDue',
  'trainingReportPocAddedDigest',
  'trainingReportCollaboratorAddedDigest',
  'trainingReportSessionSubmittedDigest',
  'trainingReportSessionNeedsActionDigest',
  'trainingReportEventInfoMissingDigest',
  'trainingReportSessionInfoMissingDigest',
  'trainingReportNoSessionsCreatedDigest',
  'trainingReportEventNotCompletedDigest',
  'communicationLogTtaStaffAdded',
  'communicationLogRecipientInGroup',
  'communicationLogTtaStaffAddedDigest',
  'communicationLogRecipientInGroupDigest',
  'monitoringGoalAdded',
  'monitoringDataReceived',
  'groupCoOwnerAdded',
  'groupShared',
  'systemPlannedOutage',
  'systemUnplannedOutage',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.createTable(
        'Notifications',
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'Users',
              key: 'id',
            },
          },
          entityId: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          type: {
            type: Sequelize.ENUM(NOTIFICATION_TYPES),
            allowNull: false,
          },
          link: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          label: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          text: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          archivedAt: {
            type: Sequelize.DATEONLY,
            allowNull: true,
          },
          viewedAt: {
            type: Sequelize.DATEONLY,
            allowNull: true,
          },
          triggeredAt: {
            type: Sequelize.DATEONLY,
            allowNull: true,
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
        },
        { transaction }
      );
    });
  },

  async down(queryInterface, _) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await removeTables(queryInterface, transaction, ['Notifications']);
    });
  },
};
