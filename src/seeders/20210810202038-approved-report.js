const recipients = [
  {
    id: 9998,
    activityReportId: 9999,
    grantId: 11,
    otherEntityId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const reports = [
  {
    id: 9999,
    additionalNotes: '',
    numberOfParticipants: 1,
    deliveryMethod: 'virtual',
    duration: 99,
    endDate: new Date('1971/01/01'),
    startDate: new Date('1970/01/01'),
    activityRecipientType: 'recipient',
    requester: 'recipient',
    reason: ['Child Incidents'],
    targetPopulations: ['Children with disabilities'],
    participants: ['Regional Head Start Association'],
    ttaType: ['training'],
    pageState: JSON.stringify({
      1: 'Complete', 2: 'Complete', 3: 'Complete', 4: 'Complete',
    }),
    lastUpdatedById: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    context: '',
    regionId: 1,
    nonECLKCResourcesUsed: ['http://www.website.com'],
    ECLKCResourcesUsed: ['https://www.website.com'],
    virtualDeliveryType: 'video',
    legacyId: null,
    imported: null,
  },
];

const approvals = [
  {
    id: 1,
    entityType: 'report',
    entityId: 9999,
    tier: 0,
    calculatedStatus: 'approved',
    submissionStatus: 'submitted',
  },
  {
    id: 2,
    entityType: 'report',
    entityId: 9999,
    tier: 1,
    calculatedStatus: 'approved',
    submissionStatus: 'submitted',
  },
];

const collaborators = [{
  id: 1,
  entityType: 'report',
  entityId: 9999,
  userId: 1,
  collaboratorTypes: ['Instantiator', 'Owner', 'Editor', 'Ratifier'],
  tier: 1,
  status: 'approved',
}];

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('ActivityReports', reports);
    await queryInterface.bulkUpdate('Approvals', approvals);
    await queryInterface.bulkInsert('ActivityRecipients', recipients);
    await queryInterface.bulkInsert('Collaborators', collaborators);
    await queryInterface.sequelize.query(`ALTER SEQUENCE "ActivityReports_id_seq" RESTART WITH ${reports[reports.length - 1].id + 1};`);
    await queryInterface.sequelize.query(`ALTER SEQUENCE "ActivityParticipants_id_seq" RESTART WITH ${recipients[recipients.length - 1].id + 1};`);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('ActivityReports', null);
    await queryInterface.bulkDelete('Approvals', null);
    await queryInterface.bulkDelete('ActivityRecipients', null);
    await queryInterface.bulkDelete('Collaborators', null);
  },
};
