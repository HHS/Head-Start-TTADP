const { NOTIFICATION_TYPES } = require('../constants');

const notifications = [
  {
    id: 30001,
    userId: 1,
    entityId: 1,
    type: NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
    link: '/activity-reports/1/review',
    label: 'Take action',
    text: '[Approver 1 name] has requested changes to your Activity Report for [Recipient name].',
    createdAt: new Date(),
    updatedAt: new Date(),
    displayId: 'R01-AR-0001',
    actionable: true,
  },
  {
    id: 30002,
    userId: 1,
    entityId: 2,
    type: NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
    link: '/activity-reports/2/review',
    label: 'Take action',
    text: '[Approver 2 name] has requested changes to your Activity Report for [Recipient name].',
    createdAt: new Date(),
    updatedAt: new Date(),
    displayId: 'R01-AR-0002',
    actionable: true,
  },
  {
    id: 30003,
    userId: 1,
    entityId: 3,
    type: NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
    link: '/activity-reports/3/review',
    label: 'Take action',
    text: '[Approver 3 name] has requested changes to your Activity Report for [Recipient name].',
    createdAt: new Date(),
    updatedAt: new Date(),
    triggeredAt: '2025-01-02',
    displayId: 'R01-AR-0003',
    actionable: true,
  },
  {
    id: 30004,
    userId: null,
    entityId: null,
    type: NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
    link: '',
    label: '',
    text: 'A system-wide notice for all users.',
    createdAt: new Date(),
    updatedAt: new Date(),
    triggeredAt: null,
    actionable: false,
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('Notifications', notifications);
    await queryInterface.sequelize.query(
      `ALTER SEQUENCE "Notifications_id_seq" RESTART WITH ${notifications[notifications.length - 1].id + 1};`
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Notifications', null);
  },
};
