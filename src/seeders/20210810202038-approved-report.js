const COLLABORATOR_TYPES = {
  EDITOR: 'editor',
  OWNER: 'owner',
  INSTANTIATOR: 'instantiator',
  APPROVER: 'approver',
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

const APPROVER_STATUSES = {
  NEEDS_ACTION: 'needs_action',
  APPROVED: 'approved',
};

const APPROVAL_RATIO = {
  ANY: 'any',
  MAJORITY: 'majority',
  TWOTHIRDS: 'two_thirds',
  ALL: 'all',
};

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

const reports = [
  {
    id: 9997,
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
    ttaType: ['technical-assistance'],
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
    version: 1,
    topics: ['Fruit', 'Math'],
  },
  {
    id: 9998,
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
    version: 1,
    topics: ['Fruit', 'Math'],
  },
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
    ttaType: ['training,technical-assistance'],
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
    version: 1,
    topics: ['Fruit', 'Math', 'Friendship'],
  },
];

const approvals = [
  {
    activityReportId: 9997,
    ratioRequired: APPROVAL_RATIO.ALL,
    calculatedStatus: ENTITY_STATUSES.APPROVED,
    submissionStatus: ENTITY_STATUSES.SUBMITTED,
  },
  {
    activityReportId: 9998,
    ratioRequired: APPROVAL_RATIO.ALL,
    calculatedStatus: ENTITY_STATUSES.APPROVED,
    submissionStatus: ENTITY_STATUSES.SUBMITTED,
  },
  {
    activityReportId: 9999,
    ratioRequired: APPROVAL_RATIO.ALL,
    calculatedStatus: ENTITY_STATUSES.APPROVED,
    submissionStatus: ENTITY_STATUSES.SUBMITTED,
  },
];

module.exports = {
  up: async (queryInterface) => {
    const collaborators = [
      {
        activityReportId: 9997,
        userId: 1,
        collaboratorTypes: queryInterface.sequelize.literal(`
        ARRAY[
          '${COLLABORATOR_TYPES.INSTANTIATOR}',
          '${COLLABORATOR_TYPES.OWNER}',
          '${COLLABORATOR_TYPES.EDITOR}',
          '${COLLABORATOR_TYPES.APPROVER}'
        ]::"enum_ActivityReportCollaborators_collaboratorTypes"[]`),
        status: APPROVER_STATUSES.APPROVED,
      },
      {
        activityReportId: 9998,
        userId: 1,
        collaboratorTypes: queryInterface.sequelize.literal(`
        ARRAY[
          '${COLLABORATOR_TYPES.INSTANTIATOR}',
          '${COLLABORATOR_TYPES.OWNER}',
          '${COLLABORATOR_TYPES.EDITOR}',
          '${COLLABORATOR_TYPES.APPROVER}'
        ]::"enum_ActivityReportCollaborators_collaboratorTypes"[]`),
        status: APPROVER_STATUSES.APPROVED,
      },
      {
        activityReportId: 9999,
        userId: 1,
        collaboratorTypes: queryInterface.sequelize.literal(`
        ARRAY[
          '${COLLABORATOR_TYPES.INSTANTIATOR}',
          '${COLLABORATOR_TYPES.OWNER}',
          '${COLLABORATOR_TYPES.EDITOR}',
          '${COLLABORATOR_TYPES.APPROVER}'
        ]::"enum_ActivityReportCollaborators_collaboratorTypes"[]`),
        status: APPROVER_STATUSES.APPROVED,
      },
    ];

    await queryInterface.bulkInsert('ActivityReports', reports);
    await queryInterface.bulkInsert('ActivityReportCollaborators', collaborators);
    await queryInterface.bulkInsert('ActivityReportApprovals', approvals);
    await queryInterface.bulkInsert('ActivityRecipients', recipients);
    await queryInterface.sequelize.query(`ALTER SEQUENCE "ActivityReports_id_seq" RESTART WITH ${reports[reports.length - 1].id + 1};`);
    await queryInterface.sequelize.query(`ALTER SEQUENCE "ActivityParticipants_id_seq" RESTART WITH ${recipients[recipients.length - 1].id + 1};`);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('ActivityReports', null);
    await queryInterface.bulkDelete('ActivityReportApprovals', null);
    await queryInterface.bulkDelete('ActivityRecipients', null);
    await queryInterface.bulkDelete('ActivityReportCollaborators', null);
  },
};
