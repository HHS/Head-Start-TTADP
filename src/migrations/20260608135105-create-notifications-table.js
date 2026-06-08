const { prepMigration, removeTables, updateUsersFlagsEnum } = require('../lib/migration');

const NOTIFICATION_TYPES = [
  'collaboratorAssigned',
  'changesRequested',
  'approverAssigned',
  'reportApproved',
  'recipientReportApproved',
  'activityReportResubmitted',
  'collabReportCollaboratorAdded',
  'collabReportSubmitted',
  'collabReportResubmitted',
  'collabReportNeedsAction',
  'collabReportApproved',
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
  'communicationLogTtaStaffAdded',
  'communicationLogRecipientInGroup',
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
          displayId: {
            type: Sequelize.STRING,
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

      await queryInterface.createTable(
        'NotificationUserStates',
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
          },
          notificationId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'Notifications',
              key: 'id',
            },
            onDelete: 'CASCADE',
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'Users',
              key: 'id',
            },
            onDelete: 'CASCADE',
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          archivedAt: {
            type: Sequelize.DATEONLY,
            allowNull: true,
          },
          viewedAt: {
            type: Sequelize.DATEONLY,
            allowNull: true,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('NotificationUserStates', ['notificationId', 'userId'], {
        unique: true,
        transaction,
      });

      await updateUsersFlagsEnum(
        queryInterface,
        transaction,
        [],
        ['quality_assurance_dashboard', 'monitoring-regional-dashboard', 'actionable_notifications']
      );
    });
  },

  async down(queryInterface, _) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await removeTables(queryInterface, transaction, ['NotificationUserStates']);
      await removeTables(queryInterface, transaction, ['Notifications']);

      // no simple way to remove enum from feature flag; write a new migration for that
    });
  },
};
