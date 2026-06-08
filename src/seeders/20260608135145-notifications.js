const { NOTIFICATION_TYPES } = require('../constants');

const notifications = [
  {
    id: 30001,
    userId: 5,
    entityId: 1,
    type: NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
    link: '/activity-reports/1/review',
    label: 'Activity Report #1',
    text: 'Changes were requested on Activity Report #1.',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 30002,
    userId: 5,
    entityId: 2,
    type: NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
    link: '/activity-reports/2/review',
    label: 'Activity Report #2',
    text: 'Changes were requested on Activity Report #2.',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 30003,
    userId: 5,
    entityId: 3,
    type: NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
    link: '/activity-reports/3/review',
    label: 'Activity Report #3',
    text: 'Changes were requested on Activity Report #3.',
    createdAt: new Date(),
    updatedAt: new Date(),
    triggeredAt: '2025-01-02',
  },
  {
    id: 30004,
    userId: null,
    entityId: null,
    type: NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
    link: '/notifications',
    label: 'System Notice',
    text: 'A system-wide notice for all users.',
    createdAt: new Date(),
    updatedAt: new Date(),
    triggeredAt: null,
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
