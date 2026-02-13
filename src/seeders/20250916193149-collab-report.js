const getReports = (queryInterface) => [
  {
    id: 20001,
    userId: 5,
    lastUpdatedById: 5,
    regionId: 1,
    name: 'Approved Collaboration Report',
    submissionStatus: 'submitted',
    calculatedStatus: 'approved',
    startDate: '2025-01-01',
    endDate: '2025-01-02',
    duration: 120,
    isStateActivity: false,
    conductMethod: 'virtual',
    description: 'This is an approved collaboration report for testing purposes.',
    submittedAt: new Date('2025-01-02'),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 20002,
    userId: 5,
    lastUpdatedById: 5,
    regionId: 1,
    name: 'Submitted Collaboration Report',
    submissionStatus: 'submitted',
    calculatedStatus: 'submitted',
    startDate: '2025-01-03',
    endDate: '2025-01-04',
    duration: 90,
    isStateActivity: false,
    conductMethod: 'in_person',
    description: 'This is a submitted collaboration report for testing purposes.',
    submittedAt: new Date('2025-01-04'),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 20003,
    userId: 5,
    lastUpdatedById: 5,
    regionId: 1,
    name: 'Draft Collaboration Report',
    submissionStatus: 'draft',
    calculatedStatus: 'draft',
    startDate: '2025-01-05',
    endDate: '2025-01-06',
    duration: 60,
    isStateActivity: true,
    conductMethod: 'email',
    description: 'This is a draft collaboration report for testing purposes.',
    otherDataUsed: 'Custom research data',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 20004,
    userId: 1,
    lastUpdatedById: 5,
    regionId: 1,
    name: 'Second Approved Collaboration Report',
    submissionStatus: 'submitted',
    calculatedStatus: 'approved',
    startDate: '2025-01-01',
    endDate: '2025-01-02',
    duration: 120,
    isStateActivity: false,
    conductMethod: 'virtual',
    description: 'This is an approved collaboration report for testing purposes.',
    submittedAt: new Date('2025-01-02'),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 20005,
    userId: 1,
    lastUpdatedById: 5,
    regionId: 2,
    name: 'Region 2 Approved Collaboration Report',
    submissionStatus: 'submitted',
    calculatedStatus: 'approved',
    startDate: '2025-01-01',
    endDate: '2025-01-02',
    duration: 120,
    isStateActivity: false,
    conductMethod: 'virtual',
    description: 'This is an approved collaboration report for testing purposes.',
    submittedAt: new Date('2025-01-02'),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 20006,
    userId: 1,
    lastUpdatedById: 5,
    regionId: 2,
    name: 'Region 2 User 1 Draft',
    submissionStatus: 'draft',
    calculatedStatus: 'draft',
    startDate: '2025-01-01',
    endDate: '2025-01-02',
    duration: 120,
    isStateActivity: false,
    conductMethod: 'virtual',
    description: 'This is a report for testing purposes.',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 20007,
    userId: 1,
    lastUpdatedById: 5,
    regionId: 1,
    name: 'Region 1 User 1 Draft with Cuke as Collaborator',
    submissionStatus: 'draft',
    calculatedStatus: 'draft',
    startDate: '2025-01-01',
    endDate: '2025-01-02',
    duration: 120,
    isStateActivity: false,
    conductMethod: 'virtual',
    description: 'This is a report for testing purposes.',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 20008,
    userId: 1,
    lastUpdatedById: 5,
    regionId: 1,
    name: 'Region 1 User 1 submitted with Cuke as Approver',
    submissionStatus: 'submitted',
    calculatedStatus: 'needs_action',
    startDate: '2025-01-01',
    endDate: '2025-01-02',
    duration: 120,
    isStateActivity: false,
    conductMethod: 'virtual',
    description: 'This is a report for testing purposes.',
    submittedAt: new Date('2025-01-02'),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 20009,
    userId: 1,
    lastUpdatedById: 5,
    regionId: 1,
    name: 'User 1 Submitted Report with Null Approver Status',
    submissionStatus: 'submitted',
    calculatedStatus: 'submitted',
    startDate: '2025-01-07',
    endDate: '2025-01-08',
    duration: 150,
    isStateActivity: false,
    conductMethod: 'phone',
    description: 'This is a submitted collaboration report with null approver status for testing purposes.',
    submittedAt: new Date('2025-01-08'),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const specialists = [
  {
    collabReportId: 20001,
    specialistId: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20002,
    specialistId: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20003,
    specialistId: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20007,
    specialistId: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20007,
    specialistId: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20009,
    specialistId: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const reasons = [
  {
    collabReportId: 20001,
    reasonId: 'participate_work_groups',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20002,
    reasonId: 'support_coordination',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20003,
    reasonId: 'agg_regional_data',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20004,
    reasonId: 'participate_work_groups',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20005,
    reasonId: 'support_coordination',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20009,
    reasonId: 'support_coordination',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const approvers = [
  {
    collabReportId: 20001,
    userId: 5,
    status: 'approved',
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20002,
    userId: 1,
    status: null,
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20004,
    userId: 5,
    status: 'approved',
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20005,
    userId: 5,
    status: 'approved',
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20008,
    userId: 5,
    status: 'needs_action',
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20009,
    userId: 5,
    status: null,
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const activityStates = [
  {
    collabReportId: 20001,
    activityStateCode: 'CA',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20002,
    activityStateCode: 'NY',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20003,
    activityStateCode: 'TX',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20004,
    activityStateCode: 'CA',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20005,
    activityStateCode: 'FL',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20009,
    activityStateCode: 'TX',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const dataUsed = [
  {
    collabReportId: 20001,
    collabReportDatum: 'pir',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20002,
    collabReportDatum: 'census_data',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20003,
    collabReportDatum: 'other',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20004,
    collabReportDatum: 'pir',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20005,
    collabReportDatum: 'census_data',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20009,
    collabReportDatum: 'pir',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const goals = [
  {
    collabReportId: 20001,
    goalTemplateId: 17,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20002,
    goalTemplateId: 19,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20003,
    goalTemplateId: 18,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20004,
    goalTemplateId: 17,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20005,
    goalTemplateId: 19,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20009,
    goalTemplateId: 18,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const steps = [
  {
    collabReportId: 20001,
    collabStepDetail: 'Initial assessment and planning phase',
    collabStepCompleteDate: '2025-01-01',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20001,
    collabStepDetail: 'Implementation and monitoring phase',
    collabStepCompleteDate: '2025-01-02',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20002,
    collabStepDetail: 'Data collection and analysis',
    collabStepCompleteDate: '2025-01-03',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20003,
    collabStepDetail: 'Draft preparation and review',
    collabStepCompleteDate: '2025-01-05',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20004,
    collabStepDetail: 'Initial assessment and planning phase',
    collabStepCompleteDate: '2025-01-01',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20004,
    collabStepDetail: 'Implementation and monitoring phase',
    collabStepCompleteDate: '2025-01-02',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20005,
    collabStepDetail: 'Regional coordination and assessment',
    collabStepCompleteDate: '2025-01-01',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20005,
    collabStepDetail: 'Cross-regional collaboration implementation',
    collabStepCompleteDate: '2025-01-02',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20009,
    collabStepDetail: 'Initial planning and stakeholder engagement',
    collabStepCompleteDate: '2025-01-07',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    collabReportId: 20009,
    collabStepDetail: 'Implementation and evaluation phase',
    collabStepCompleteDate: '2025-01-08',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const reports = getReports(queryInterface)
    await queryInterface.bulkInsert('CollabReports', reports)
    await queryInterface.bulkInsert('CollabReportSpecialists', specialists)
    await queryInterface.bulkInsert('CollabReportReasons', reasons)
    await queryInterface.bulkInsert('CollabReportApprovers', approvers)
    await queryInterface.bulkInsert('CollabReportActivityStates', activityStates)
    await queryInterface.bulkInsert('CollabReportDataUsed', dataUsed)
    await queryInterface.bulkInsert('CollabReportGoals', goals)
    await queryInterface.bulkInsert('CollabReportSteps', steps)
    await queryInterface.sequelize.query(`ALTER SEQUENCE "CollabReports_id_seq" RESTART WITH ${reports[reports.length - 1].id + 1};`)
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('CollabReportSteps', null)
    await queryInterface.bulkDelete('CollabReportGoals', null)
    await queryInterface.bulkDelete('CollabReportDataUsed', null)
    await queryInterface.bulkDelete('CollabReportActivityStates', null)
    await queryInterface.bulkDelete('CollabReportApprovers', null)
    await queryInterface.bulkDelete('CollabReportReasons', null)
    await queryInterface.bulkDelete('CollabReportSpecialists', null)
    await queryInterface.bulkDelete('CollabReports', null)
  },
}
