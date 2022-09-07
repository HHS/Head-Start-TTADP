const COLLABORATOR_TYPES = {
  EDITOR: 'editor',
  OWNER: 'owner',
  INSTANTIATOR: 'instantiator',
  RATIFIER: 'ratifier',
};

const ENTITY_TYPES = {
  REPORT: 'report',
  REPORTGOAL: 'report_goal',
  REPORTOBJECTIVE: 'report_objective',
  GOAL: 'goal',
  GOALTEMPLATE: 'goal_template',
  OBJECTIVE: 'objective',
  OBJECTIVETEMPLATE: 'objectiveTemplate',
};

const ENTITY_STATUSES = {
  DRAFT: 'draft',
  DELETED: 'deleted',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  NEEDS_ACTION: 'needs_action',
};

const RATIFIER_STATUSES = {
  NEEDS_ACTION: 'needs_action',
  RATIFIED: 'ratified',
};

const APPROVAL_RATIO = {
  ANY: 'any',
  MAJORITY: 'majority',
  TWOTHIRDS: 'two_thirds',
  ALL: 'all',
};

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
    entityType: ENTITY_TYPES.REPORT,
    entityId: 9999,
    tier: 0,
    ratioRequired: APPROVAL_RATIO.ALL,
    calculatedStatus: ENTITY_STATUSES.APPROVED,
    submissionStatus: ENTITY_STATUSES.SUBMITTED,
  },
  {
    entityType: ENTITY_TYPES.REPORT,
    entityId: 9999,
    tier: 1,
    ratioRequired: APPROVAL_RATIO.ALL,
    calculatedStatus: ENTITY_STATUSES.APPROVED,
    submissionStatus: ENTITY_STATUSES.SUBMITTED,
  },
];

module.exports = {
  up: async (queryInterface) => {
    const collaborators = [{
      entityType: ENTITY_TYPES.REPORT,
      entityId: 9999,
      userId: 1,
      collaboratorTypes: queryInterface.sequelize.literal(`ARRAY['${COLLABORATOR_TYPES.INSTANTIATOR}', '${COLLABORATOR_TYPES.OWNER}', '${COLLABORATOR_TYPES.EDITOR}', '${COLLABORATOR_TYPES.RATIFIER}']::"enum_Collaborators_collaboratorTypes"[]`),
      tier: 1,
      status: RATIFIER_STATUSES.RATIFIED,
    }];

    await queryInterface.bulkInsert('ActivityReports', reports);
    await queryInterface.bulkInsert('Approvals', approvals);
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
