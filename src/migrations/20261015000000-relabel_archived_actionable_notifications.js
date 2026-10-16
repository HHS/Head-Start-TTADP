const { prepMigration } = require('../lib/migration');

// Actionable Activity Report notification types whose CTA was "Take action" / "Take Action".
// Archived notifications now use the type's archive label ("View AR") instead (TTAHUB-5919).
// Values are frozen here rather than read from constants so the migration stays stable.
const NEEDS_ACTION = 'changesRequested'; // ACTIVITY_REPORT_NEEDS_ACTION, label "Take Action"
const ACTIONABLE_TYPES = [
  NEEDS_ACTION,
  'approverAssigned', // ACTIVITY_REPORT_SUBMITTED
  'reportApprovedApprover', // ACTIVITY_REPORT_APPROVED_APPROVER
  'activityReportResubmittedApprover', // ACTIVITY_REPORT_RESUBMITTED_APPROVER
];

// Notifications already archived for their recipient before archiving began relabeling them.
const archivedNotificationsWhere = /* sql */ `
  n.type::text IN (:types)
  AND EXISTS (
    SELECT 1
    FROM "NotificationUserStates" s
    WHERE s."notificationId" = n.id
      AND s."userId" = n."userId"
      AND s."archivedAt" IS NOT NULL
  )
`;

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await queryInterface.sequelize.query(
        /* sql */ `
          UPDATE "Notifications" n
          SET label = 'View AR'
          WHERE ${archivedNotificationsWhere}
            AND n.label IN ('Take action', 'Take Action');
        `,
        { transaction, replacements: { types: ACTIONABLE_TYPES } }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      // Restore each type's original actionable CTA.
      await queryInterface.sequelize.query(
        /* sql */ `
          UPDATE "Notifications" n
          SET label = CASE WHEN n.type::text = :needsAction THEN 'Take Action' ELSE 'Take action' END
          WHERE ${archivedNotificationsWhere}
            AND n.label = 'View AR';
        `,
        { transaction, replacements: { types: ACTIONABLE_TYPES, needsAction: NEEDS_ACTION } }
      );
    });
  },
};
