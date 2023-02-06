const reports = require('../mocks/approvedReports');

const recipients = [
  {
    id: 9997,
    activityReportId: 9997,
    grantId: 11,
    otherEntityId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 9998,
    activityReportId: 9998,
    grantId: 11,
    otherEntityId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 9999,
    activityReportId: 9999,
    grantId: 11,
    otherEntityId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const approvers = [
  {
    activityReportId: 9997,
    userId: 1,
    status: 'approved',
  },
  {
    activityReportId: 9998,
    userId: 1,
    status: 'approved',
  },
  {
    activityReportId: 9999,
    userId: 1,
    status: 'approved',
  },
];

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('ActivityReports', reports);
    await queryInterface.bulkInsert('ActivityRecipients', recipients);
    await queryInterface.bulkInsert('ActivityReportApprovers', approvers);
    await queryInterface.sequelize.query(`ALTER SEQUENCE "ActivityReports_id_seq" RESTART WITH ${reports[reports.length - 1].id + 1};`);
    await queryInterface.sequelize.query(`ALTER SEQUENCE "ActivityParticipants_id_seq" RESTART WITH ${recipients[recipients.length - 1].id + 1};`);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('ActivityReports', null);
    await queryInterface.bulkDelete('ActivityRecipients', null);
    await queryInterface.bulkDelete('ActivityReportApprovers', null);
  },
};
