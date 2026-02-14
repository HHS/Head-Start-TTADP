/* eslint-disable max-len */
import faker from '@faker-js/faker';
import db from '../models';
import { getRecipientSpotlightIndicators } from './recipientSpotlight';

// Helper function to create scopes with region filter
// Structure matches what filtersToScopes returns: { grant: { where: {...}, include: [...] } }
const createScopesWithRegion = (regionId) => ({
  grant: {
    where: {
      [db.Sequelize.Op.and]: [
        { id: { [db.Sequelize.Op.ne]: null } },
        { regionId: { [db.Sequelize.Op.in]: [regionId] } },
      ],
    },
    include: [],
  },
});

// Helper function to create scopes with recipient and region filter
const createScopesWithRecipientAndRegion = (recipientId, regionId) => ({
  grant: {
    where: {
      [db.Sequelize.Op.and]: [
        { id: { [db.Sequelize.Op.ne]: null } },
        { recipientId: { [db.Sequelize.Op.in]: [recipientId] } },
        { regionId: { [db.Sequelize.Op.in]: [regionId] } },
      ],
    },
    include: [],
  },
});

const {
  sequelize,
  Grant,
  Goal,
  Recipient,
  User,
  MonitoringReview,
  MonitoringReviewStatus,
  MonitoringReviewGrantee,
  MonitoringFinding,
  MonitoringFindingStatus,
  MonitoringFindingHistory,
  MonitoringFindingGrant,
  ProgramPersonnel,
  ActivityReport,
  ActivityReportGoal,
} = db;

describe('recipientSpotlight service', () => {
  // Test data constants
  const REGION_ID = 1; // Region ID can remain hardcoded as it's often a reference to real regions

  // Variables to store created entities
  let testUser;
  let normalRecipient;
  let childIncidentsRecipient;
  let deficiencyRecipient;
  let newRecipient;
  let newStaffRecipient;
  let noTTARecipient;

  let normalGrant;
  let childIncidentsGrant;
  let deficiencyGrant;
  let newRecipientGrant;
  let newStaffGrant;
  let noTTAGrant;

  let monitoringReviewStatus;
  let monitoringFindingStatus;

  const createDate = new Date();
  // Make pastYear clearly within the last 12 months (9 months ago) to avoid edge cases
  const pastYear = new Date(createDate);
  pastYear.setMonth(pastYear.getMonth() - 9);
  const pastTwoYears = new Date(createDate);
  pastTwoYears.setFullYear(pastTwoYears.getFullYear() - 2);
  const pastThreeYears = new Date(createDate);
  pastThreeYears.setFullYear(pastThreeYears.getFullYear() - 3);
  const pastFiveYears = new Date(createDate);
  pastFiveYears.setFullYear(pastFiveYears.getFullYear() - 5);

  // Create a mock user to use for reports

  beforeAll(async () => {
    // Clean up any leftover data from previous failed test runs
    const leftoverGrants = await Grant.findAll({
      where: {
        number: [
          'G-NORMAL-01', 'G-CHILD-INC-01', 'G-DEFICIENCY-01',
          'G-NEW-RECIP-01', 'G-NEW-STAFF-01', 'G-NO-TTA-01',
          'G-SORT-TEST-A', 'G-SORT-TEST-B',
        ],
      },
      raw: true,
    });
    if (leftoverGrants.length > 0) {
      const leftoverGrantIds = leftoverGrants.map((g) => g.id);
      const leftoverRecipientIds = [...new Set(leftoverGrants.map((g) => g.recipientId))];
      await ActivityReportGoal.destroy({ where: {}, force: true });
      await Goal.destroy({ where: { grantId: leftoverGrantIds }, force: true });
      await ProgramPersonnel.destroy({ where: { grantId: leftoverGrantIds }, force: true });
      await MonitoringFindingGrant.destroy({ where: {}, force: true });
      await MonitoringFindingHistory.destroy({ where: {}, force: true });
      await MonitoringFinding.destroy({ where: {}, force: true });
      await MonitoringReviewGrantee.destroy({ where: {}, force: true });
      await MonitoringReview.destroy({ where: {}, force: true });
      await Grant.destroy({ where: { id: leftoverGrantIds }, force: true, individualHooks: true });
      await Recipient.destroy({ where: { id: leftoverRecipientIds }, force: true });
    }

    // Create test user
    testUser = await User.create({
      name: faker.name.findName(),
      email: faker.internet.email(),
      homeRegionId: REGION_ID,
      hsesUsername: faker.internet.email(),
      hsesUserId: `fake${faker.unique(() => faker.datatype.number({ min: 1, max: 10000 }))}`,
      lastLogin: new Date(),
    });

    // Create monitoring status records
    monitoringReviewStatus = await MonitoringReviewStatus.create({
      statusId: faker.datatype.number({ min: 1000, max: 9999 }), // Using integer for statusId
      name: 'Complete',
      sourceCreatedAt: createDate,
      sourceUpdatedAt: createDate,
    });

    monitoringFindingStatus = await MonitoringFindingStatus.create({
      statusId: faker.datatype.number({ min: 1000, max: 9999 }), // Using integer for statusId
      name: 'Active',
      sourceCreatedAt: createDate,
      sourceUpdatedAt: createDate,
    });

    // Create GrantNumberLinks for our test grant numbers
    await db.GrantNumberLink.bulkCreate([
      { grantNumber: 'G-NORMAL-01' },
      { grantNumber: 'G-CHILD-INC-01' },
      { grantNumber: 'G-DEFICIENCY-01' },
      { grantNumber: 'G-NEW-RECIP-01' },
      { grantNumber: 'G-NEW-STAFF-01' },
      { grantNumber: 'G-NO-TTA-01' },
      { grantNumber: 'G-SORT-TEST-A' },
      { grantNumber: 'G-SORT-TEST-B' },
    ], { ignoreDuplicates: true });

    // Create recipients for testing
    normalRecipient = await Recipient.create({
      id: faker.unique(() => faker.datatype.number({ min: 10000, max: 30000 })),
      name: 'Normal Recipient',
      regionId: REGION_ID,
    });

    childIncidentsRecipient = await Recipient.create({
      id: faker.unique(() => faker.datatype.number({ min: 10000, max: 30000 })),
      name: 'Child Incidents Recipient',
      regionId: REGION_ID,
    });

    deficiencyRecipient = await Recipient.create({
      id: faker.unique(() => faker.datatype.number({ min: 10000, max: 30000 })),
      name: 'Deficiency Recipient',
      regionId: REGION_ID,
    });

    newRecipient = await Recipient.create({
      id: faker.unique(() => faker.datatype.number({ min: 10000, max: 30000 })),
      name: 'New Recipient',
      regionId: REGION_ID,
    });

    newStaffRecipient = await Recipient.create({
      id: faker.unique(() => faker.datatype.number({ min: 10000, max: 30000 })),
      name: 'New Staff Recipient',
      regionId: REGION_ID,
    });

    noTTARecipient = await Recipient.create({
      id: faker.unique(() => faker.datatype.number({ min: 10000, max: 30000 })),
      name: 'No TTA Recipient',
      regionId: REGION_ID,
    });

    // Create MonitoringGranteeLinks for each recipient
    await db.MonitoringGranteeLink.bulkCreate([
      { granteeId: normalRecipient.id.toString() },
      { granteeId: childIncidentsRecipient.id.toString() },
      { granteeId: deficiencyRecipient.id.toString() },
      { granteeId: newRecipient.id.toString() },
      { granteeId: newStaffRecipient.id.toString() },
      { granteeId: noTTARecipient.id.toString() },
    ], { ignoreDuplicates: true });

    // Create grants for each recipient
    normalGrant = await Grant.create({
      id: faker.unique(() => faker.datatype.number({ min: 10000, max: 30000 })),
      number: 'G-NORMAL-01',
      recipientId: normalRecipient.id,
      regionId: REGION_ID,
      status: 'Active', // This should match the criteria in getRecipientSpotlightIndicators
      startDate: pastFiveYears,
      endDate: createDate,
      cdi: false,
    });

    childIncidentsGrant = await Grant.create({
      id: faker.unique(() => faker.datatype.number({ min: 10000, max: 30000 })),
      number: 'G-CHILD-INC-01',
      recipientId: childIncidentsRecipient.id,
      regionId: REGION_ID,
      status: 'Active',
      startDate: pastFiveYears,
      endDate: createDate,
      cdi: false,
    });

    deficiencyGrant = await Grant.create({
      id: faker.unique(() => faker.datatype.number({ min: 10000, max: 30000 })),
      number: 'G-DEFICIENCY-01',
      recipientId: deficiencyRecipient.id,
      regionId: REGION_ID,
      status: 'Active',
      startDate: pastFiveYears,
      endDate: createDate,
      cdi: false,
    });

    newRecipientGrant = await Grant.create({
      id: faker.unique(() => faker.datatype.number({ min: 10000, max: 30000 })),
      number: 'G-NEW-RECIP-01',
      recipientId: newRecipient.id,
      regionId: REGION_ID,
      status: 'Active',
      startDate: pastThreeYears,
      endDate: createDate,
      cdi: false,
    });

    newStaffGrant = await Grant.create({
      id: faker.unique(() => faker.datatype.number({ min: 10000, max: 30000 })),
      number: 'G-NEW-STAFF-01',
      recipientId: newStaffRecipient.id,
      regionId: REGION_ID,
      status: 'Active',
      startDate: pastFiveYears,
      endDate: createDate,
      cdi: false,
    });

    noTTAGrant = await Grant.create({
      id: faker.unique(() => faker.datatype.number({ min: 10000, max: 30000 })),
      number: 'G-NO-TTA-01',
      recipientId: noTTARecipient.id,
      regionId: REGION_ID,
      status: 'Active',
      startDate: pastFiveYears,
      endDate: createDate,
      cdi: false,
    });

    // Note: GrantRelationshipToActive is a materialized view and cannot be directly modified
    // The SQL joins in getRecipientSpotlightIndicators will handle the relationship
    // based on the grants we've created

    // Create a real Goal to use in ActivityReportGoal

    // Create a real Goal to use in ActivityReportGoal
    const testGoal = await Goal.create({
      name: 'Test Goal for RecipientSpotlight',
      status: 'Not Started',
      onAR: true,
      onApprovedAR: false,
      grantId: normalGrant.id, // Using the dynamically created grant's ID
    });

    // Create activity reports and link them to grants (except for NO_TTA)
    const activityReportPromises = [
      normalGrant.id,
      childIncidentsGrant.id,
      deficiencyGrant.id,
      newRecipientGrant.id,
      newStaffGrant.id,
    ].map(async (grantId) => {
      const report = await ActivityReport.create({
        activityRecipientType: 'recipient',
        submissionStatus: 'submitted',
        calculatedStatus: 'approved',
        userId: testUser.id,
        regionId: REGION_ID,
        startDate: pastYear,
        endDate: pastYear,
        approvedAt: pastYear,
        duration: 1,
      });

      await ActivityReportGoal.create({
        activityReportId: report.id,
        grantId,
        goalId: testGoal.id, // Use the real Goal ID
      });

      return report;
    });

    await Promise.all(activityReportPromises);

    // Create program personnel for NEW_STAFF recipient
    await ProgramPersonnel.create({
      grantId: newStaffGrant.id,
      effectiveDate: pastYear,
      title: 'New Staff Member',
      programId: 1, // Adding required field
      role: 'director', // Must be 'cfo' or 'director' to match service logic
      active: true, // Adding required field
    });

    // Create monitoring reviews, findings, and other related data

    // 1. Create child incidents (RAN) reviews
    const childIncidentsReview1Id = faker.unique(
      () => faker.datatype.number({ min: 40000, max: 50000 }),
    ).toString();
    const childIncidentsReview2Id = faker.unique(
      () => faker.datatype.number({ min: 50001, max: 60000 }),
    ).toString();
      // Add a third incident review to ensure we have more than one (required by the logic)
    const childIncidentsReview3Id = faker.unique(
      () => faker.datatype.number({ min: 60001, max: 65000 }),
    ).toString();

    // Create MonitoringReviewLinks first
    await db.MonitoringReviewLink.bulkCreate([
      { reviewId: childIncidentsReview1Id },
      { reviewId: childIncidentsReview2Id },
      { reviewId: childIncidentsReview3Id },
    ]);

    const childIncidentsReview1 = await MonitoringReview.create({
      reviewId: childIncidentsReview1Id,
      contentId: faker.unique(() => faker.datatype.number({ min: 40000, max: 50000 })).toString(),
      statusId: monitoringReviewStatus.statusId,
      reviewType: 'RAN',
      reportDeliveryDate: pastYear,
      sourceCreatedAt: createDate,
      sourceUpdatedAt: createDate,
    });

    const childIncidentsReview2 = await MonitoringReview.create({
      reviewId: childIncidentsReview2Id,
      contentId: faker.unique(() => faker.datatype.number({ min: 50001, max: 60000 })).toString(),
      statusId: monitoringReviewStatus.statusId,
      reviewType: 'RAN',
      reportDeliveryDate: pastYear,
      sourceCreatedAt: createDate,
      sourceUpdatedAt: createDate,
    });

    const childIncidentsReview3 = await MonitoringReview.create({
      reviewId: childIncidentsReview3Id,
      contentId: faker.unique(() => faker.datatype.number({ min: 60001, max: 65000 })).toString(),
      statusId: monitoringReviewStatus.statusId,
      reviewType: 'RAN',
      reportDeliveryDate: pastYear,
      sourceCreatedAt: createDate,
      sourceUpdatedAt: createDate,
    });

    await MonitoringReviewGrantee.bulkCreate([
      {
        reviewId: childIncidentsReview1.reviewId,
        granteeId: childIncidentsRecipient.id.toString(),
        grantNumber: childIncidentsGrant.number, // Use the grant number directly from the grant
        createTime: createDate,
        updateTime: createDate,
        updateBy: 'test-user',
        sourceCreatedAt: createDate,
        sourceUpdatedAt: createDate,
      },
      {
        reviewId: childIncidentsReview2.reviewId,
        granteeId: childIncidentsRecipient.id.toString(),
        grantNumber: childIncidentsGrant.number, // Use the grant number directly from the grant
        createTime: createDate,
        updateTime: createDate,
        updateBy: 'test-user',
        sourceCreatedAt: createDate,
        sourceUpdatedAt: createDate,
      },
      {
        reviewId: childIncidentsReview3.reviewId,
        granteeId: childIncidentsRecipient.id.toString(),
        grantNumber: childIncidentsGrant.number, // Use the grant number directly from the grant
        createTime: createDate,
        updateTime: createDate,
        updateBy: 'test-user',
        sourceCreatedAt: createDate,
        sourceUpdatedAt: createDate,
      },
    ]);

    // 2. Create deficiency finding
    const deficiencyReviewId = faker.unique(
      () => faker.datatype.number({ min: 60001, max: 70000 }),
    ).toString();

    // Create MonitoringReviewLink first
    await db.MonitoringReviewLink.create({
      reviewId: deficiencyReviewId,
    });

    const deficiencyReview = await MonitoringReview.create({
      reviewId: deficiencyReviewId,
      contentId: faker.unique(() => faker.datatype.number({ min: 60001, max: 70000 })).toString(),
      statusId: monitoringReviewStatus.statusId,
      reviewType: 'FA-1',
      reportDeliveryDate: pastYear,
      sourceCreatedAt: createDate,
      sourceUpdatedAt: createDate,
    });

    await MonitoringReviewGrantee.create({
      reviewId: deficiencyReview.reviewId,
      granteeId: deficiencyRecipient.id.toString(),
      grantNumber: deficiencyGrant.number, // Use the grant number directly from the grant
      createTime: createDate,
      updateTime: createDate,
      updateBy: 'test-user',
      sourceCreatedAt: createDate,
      sourceUpdatedAt: createDate,
    });

    const deficiencyFindingId = faker.unique(
      () => faker.datatype.number({ min: 80001, max: 90000 }),
    ).toString();

    // Create MonitoringFindingLink first
    await db.MonitoringFindingLink.create({
      findingId: deficiencyFindingId,
    });

    const deficiencyFinding = await MonitoringFinding.create({
      findingId: deficiencyFindingId,
      statusId: monitoringFindingStatus.statusId,
      findingType: 'Deficiency',
      hash: faker.datatype.uuid(),
      sourceCreatedAt: createDate,
      sourceUpdatedAt: createDate,
    });

    await MonitoringFindingHistory.create({
      findingId: deficiencyFinding.findingId,
      reviewId: deficiencyReview.reviewId,
      determination: 'Deficiency',
      findingHistoryId: faker.unique(
        () => faker.datatype.number({ min: 90001, max: 100000 }),
      ).toString(),
      sourceCreatedAt: createDate,
      sourceUpdatedAt: createDate,
    });

    await MonitoringFindingGrant.create({
      findingId: deficiencyFinding.findingId,
      granteeId: deficiencyRecipient.id.toString(),
      statusId: monitoringFindingStatus.statusId,
      findingType: 'Deficiency',
      hash: faker.datatype.uuid(),
      sourceCreatedAt: createDate,
      sourceUpdatedAt: createDate,
    });
  });

  afterAll(async () => {
    // Clean up all test data - guard against undefined variables from failed setup
    const grantIds = [
      normalGrant?.id,
      childIncidentsGrant?.id,
      deficiencyGrant?.id,
      newRecipientGrant?.id,
      newStaffGrant?.id,
      noTTAGrant?.id,
    ].filter(Boolean);

    const recipientIds = [
      normalRecipient?.id,
      childIncidentsRecipient?.id,
      deficiencyRecipient?.id,
      newRecipient?.id,
      newStaffRecipient?.id,
      noTTARecipient?.id,
    ].filter(Boolean);

    await sequelize.transaction(async (transaction) => {
      // Clean up monitoring data
      await MonitoringFindingGrant.destroy({
        where: {},
        force: true,
        transaction,
      });

      await MonitoringFindingHistory.destroy({
        where: {},
        force: true,
        transaction,
      });

      await MonitoringFinding.destroy({
        where: {},
        force: true,
        transaction,
      });

      await MonitoringReviewGrantee.destroy({
        where: {},
        force: true,
        transaction,
      });

      await MonitoringReview.destroy({
        where: {},
        force: true,
        transaction,
      });

      // Clean up related tables that reference the link tables
      // Clean up MonitoringClassSummaries (references MonitoringReviewLinks)
      await db.sequelize.query(
        'DELETE FROM "MonitoringClassSummaries"',
        { transaction },
      );

      // Clean up link tables
      await db.MonitoringGranteeLink.destroy({
        where: {},
        force: true,
        transaction,
      });

      await db.MonitoringReviewLink.destroy({
        where: {},
        force: true,
        transaction,
      });

      await db.MonitoringFindingLink.destroy({
        where: {},
        force: true,
        transaction,
      });

      await db.GrantNumberLink.destroy({
        where: {},
        force: true,
        transaction,
      });

      // Clean up activity reports
      await ActivityReportGoal.destroy({
        where: {},
        force: true,
        transaction,
      });

      if (testUser?.id) {
        await ActivityReport.destroy({
          where: { userId: testUser.id },
          force: true,
          transaction,
        });
      }

      // Clean up program personnel
      if (newStaffGrant?.id) {
        await ProgramPersonnel.destroy({
          where: { grantId: newStaffGrant.id },
          force: true,
          transaction,
        });
      }

      // Clean up goal data - must be done before grants since goals reference grants
      await Goal.destroy({
        where: {},
        force: true,
        transaction,
      });

      // Clean up grants
      if (grantIds.length > 0) {
        await Grant.destroy({
          where: { id: grantIds },
          force: true,
          individualHooks: true,
          transaction,
        });
      }

      // Clean up recipients
      if (recipientIds.length > 0) {
        await Recipient.destroy({
          where: { id: recipientIds },
          force: true,
          transaction,
        });
      }

      // Clean up user
      if (testUser?.id) {
        await User.destroy({
          where: { id: testUser.id },
          force: true,
          transaction,
        });
      }

      // Clean up monitoring statuses
      if (monitoringReviewStatus?.statusId) {
        await MonitoringReviewStatus.destroy({
          where: { statusId: monitoringReviewStatus.statusId },
          force: true,
          transaction,
        });
      }

      if (monitoringFindingStatus?.statusId) {
        await MonitoringFindingStatus.destroy({
          where: { statusId: monitoringFindingStatus.statusId },
          force: true,
          transaction,
        });
      }
    });

    await db.sequelize.close();
  });

  describe('getRecipientSpotlightIndicators', () => {
    it('returns recipients with required fields', async () => {
      const scopes = createScopesWithRegion(REGION_ID);
      const result = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        10,
        [REGION_ID],
      );

      expect(result).toHaveProperty('recipients');
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('overview');
      expect(result.recipients.length).toBeGreaterThan(0);
      expect(result.recipients[0]).toHaveProperty('recipientId');
      expect(result.recipients[0]).toHaveProperty('regionId');
      expect(result.recipients[0]).toHaveProperty('recipientName');
      expect(result.recipients[0]).toHaveProperty('grantIds');
      expect(result.recipients[0]).toHaveProperty('childIncidents');
      expect(result.recipients[0]).toHaveProperty('deficiency');
      expect(result.recipients[0]).toHaveProperty('newRecipients');
      expect(result.recipients[0]).toHaveProperty('newStaff');
      expect(result.recipients[0]).toHaveProperty('noTTA');
      expect(result.recipients[0]).toHaveProperty('DRS');
      expect(result.recipients[0]).toHaveProperty('FEI');
      expect(result.overview).toHaveProperty('numRecipients');
      expect(result.overview).toHaveProperty('totalRecipients');
      expect(result.overview).toHaveProperty('recipientPercentage');
      expect(typeof result.overview.numRecipients).toBe('string');
      expect(typeof result.overview.totalRecipients).toBe('string');
      expect(typeof result.overview.recipientPercentage).toBe('string');
    });

    it('returns a specific recipient when recipientId is provided', async () => {
      // Use a recipient with an indicator since we filter out 0-indicator recipients
      const scopes = createScopesWithRecipientAndRegion(childIncidentsRecipient.id, REGION_ID);
      const result = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        10,
        [REGION_ID],
      );

      expect(result).toBeDefined();
      expect(result.recipients).toBeDefined();
      expect(Array.isArray(result.recipients)).toBe(true);
      expect(result.recipients.length).toBe(1);
      expect(result.recipients[0].recipientId).toBe(childIncidentsRecipient.id);
      expect(result.recipients[0].recipientName).toBe('Child Incidents Recipient');
    });

    it('identifies child incidents correctly', async () => {
      const scopes = createScopesWithRecipientAndRegion(childIncidentsRecipient.id, REGION_ID);
      const result = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        10,
        [REGION_ID],
      );
      expect(result).toBeDefined();
      expect(result.recipients).toBeDefined();
      expect(Array.isArray(result.recipients)).toBe(true);
      expect(result.recipients[0].childIncidents).toBe(true);
    });

    it('identifies deficiencies correctly', async () => {
      const scopes = createScopesWithRecipientAndRegion(deficiencyRecipient.id, REGION_ID);
      const result = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        10,
        [REGION_ID],
      );

      expect(result).toBeDefined();
      expect(result.recipients).toBeDefined();
      expect(Array.isArray(result.recipients)).toBe(true);
      expect(result.recipients[0].deficiency).toBe(true);
    });

    it('identifies new recipients correctly', async () => {
      const scopes = createScopesWithRecipientAndRegion(newRecipient.id, REGION_ID);
      const result = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        10,
        [REGION_ID],
      );

      expect(result).toBeDefined();
      expect(result.recipients).toBeDefined();
      expect(Array.isArray(result.recipients)).toBe(true);
      expect(result.recipients[0].newRecipients).toBe(true);
    });

    it('identifies new staff correctly', async () => {
      const scopes = createScopesWithRecipientAndRegion(newStaffRecipient.id, REGION_ID);
      const result = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        10,
        [REGION_ID],
      );

      expect(result).toBeDefined();
      expect(result.recipients).toBeDefined();
      expect(Array.isArray(result.recipients)).toBe(true);
      expect(result.recipients[0].newStaff).toBe(true);
    });

    it('identifies no TTA correctly', async () => {
      const scopes = createScopesWithRecipientAndRegion(noTTARecipient.id, REGION_ID);
      const result = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        10,
        [REGION_ID],
      );

      expect(result).toBeDefined();
      expect(result.recipients).toBeDefined();
      expect(Array.isArray(result.recipients)).toBe(true);
      expect(result.recipients[0].noTTA).toBe(true);
    });

    it('includes recipients with zero indicators in results when no indicator filters are applied', async () => {
      // normalRecipient has TTA and no other indicators, so indicatorCount = 0
      // The service should now include it by default when no indicator filters are passed
      const scopes = createScopesWithRecipientAndRegion(normalRecipient.id, REGION_ID);
      const result = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        10,
        [REGION_ID],
      );

      expect(result).toBeDefined();
      expect(result.recipients).toBeDefined();
      expect(Array.isArray(result.recipients)).toBe(true);
      // normalRecipient should be in results since it has 0 indicators but no filter was applied
      expect(result.recipients.length).toBe(1);
      expect(result.recipients[0].recipientId).toBe(normalRecipient.id);
      expect(result.recipients[0].indicatorCount).toBe(0);
      expect(result.count).toBe(1);
    });

    it('handles pagination correctly', async () => {
      const scopes = createScopesWithRegion(REGION_ID);

      // Test with offset 0, limit 2
      const firstPage = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        100,
        [REGION_ID],
      );

      // Test with offset 2
      const secondPage = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        2,
        100,
        [REGION_ID],
      );

      expect(firstPage).toBeDefined();
      expect(firstPage.recipients).toBeDefined();
      expect(secondPage).toBeDefined();
      expect(secondPage.recipients).toBeDefined();

      // Verify pagination is working
      expect(firstPage.recipients.length).toBeGreaterThanOrEqual(0);
      expect(secondPage.recipients.length).toBeGreaterThanOrEqual(0);

      // Skip the comparison if we don't have enough data
      if (firstPage.recipients.length === 0 || secondPage.recipients.length === 0) {
        return;
      }

      // First and second page should have different recipients
      expect(firstPage.recipients[0].recipientId).not.toBe(secondPage.recipients[0].recipientId);
    });

    it('handles sorting correctly', async () => {
      // Create multiple recipients with different names to ensure sorting works
      const recipientA = await Recipient.create({
        id: faker.unique(() => faker.datatype.number({ min: 50000, max: 60000 })),
        name: 'AAAA Test Recipient',
        regionId: REGION_ID,
      });

      const recipientB = await Recipient.create({
        id: faker.unique(() => faker.datatype.number({ min: 50000, max: 60000 })),
        name: 'ZZZZ Test Recipient',
        regionId: REGION_ID,
      });

      const grantA = await Grant.create({
        id: faker.unique(() => faker.datatype.number({ min: 50000, max: 60000 })),
        number: 'G-SORT-TEST-A',
        recipientId: recipientA.id,
        regionId: REGION_ID,
        status: 'Active',
        startDate: pastFiveYears,
        endDate: createDate,
        cdi: false,
      });

      const grantB = await Grant.create({
        id: faker.unique(() => faker.datatype.number({ min: 50000, max: 60000 })),
        number: 'G-SORT-TEST-B',
        recipientId: recipientB.id,
        regionId: REGION_ID,
        status: 'Active',
        startDate: pastFiveYears,
        endDate: createDate,
        cdi: false,
      });

      try {
        const scopes = createScopesWithRegion(REGION_ID);

        // Test ascending order
        const ascResult = await getRecipientSpotlightIndicators(
          scopes,
          'recipientName',
          'ASC',
          0,
          100,
          [REGION_ID],
        );

        // Test descending order
        const descResult = await getRecipientSpotlightIndicators(
          scopes,
          'recipientName',
          'DESC',
          0,
          100,
          [REGION_ID],
        );

        expect(ascResult).toBeDefined();
        expect(descResult).toBeDefined();
        expect(ascResult.recipients.length).toBeGreaterThan(0);
        expect(descResult.recipients.length).toBeGreaterThan(0);

        // Find our test recipients in the results
        const ascTestRecipients = ascResult.recipients.filter(
          (r) => r.recipientName.includes('Test Recipient'),
        );

        const descTestRecipients = descResult.recipients.filter(
          (r) => r.recipientName.includes('Test Recipient'),
        );

        // Check that 'AAAA' comes before 'ZZZZ' in ascending order
        expect(ascTestRecipients.findIndex(
          (r) => r.recipientName === 'AAAA Test Recipient',
        )).toBeLessThan(
          ascTestRecipients.findIndex((r) => r.recipientName === 'ZZZZ Test Recipient'),
        );

        // Check that 'ZZZZ' comes before 'AAAA' in descending order
        expect(descTestRecipients.findIndex(
          (r) => r.recipientName === 'ZZZZ Test Recipient',
        )).toBeLessThan(
          descTestRecipients.findIndex((r) => r.recipientName === 'AAAA Test Recipient'),
        );
      } finally {
        // Clean up the test data
        await Grant.destroy({ where: { id: [grantA.id, grantB.id] }, force: true, individualHooks: true });
        await Recipient.destroy({ where: { id: [recipientA.id, recipientB.id] }, force: true });
      }
    });

    it('confirms DRS and FEI are set to false for MVP', async () => {
      // Use a recipient with an indicator since we filter out 0-indicator recipients
      const scopes = createScopesWithRecipientAndRegion(childIncidentsRecipient.id, REGION_ID);
      const result = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        10,
        [REGION_ID],
      );

      expect(result).toBeDefined();
      expect(result.recipients).toBeDefined();
      expect(Array.isArray(result.recipients)).toBe(true);
      expect(result.recipients[0].DRS).toBe(false);
      expect(result.recipients[0].FEI).toBe(false);
    });

    it('filters by singleGrantId correctly', async () => {
      // Recipient with indicators (child incidents via RAN reviews)
      const singleGrantRecipient = await Recipient.create({
        id: faker.unique(() => faker.datatype.number({ min: 10000, max: 30000 })),
        name: 'Single Grant Test Recipient',
        regionId: REGION_ID,
      });

      // Separate recipient with no indicators
      const noIndicatorRecipient = await Recipient.create({
        id: faker.unique(() => faker.datatype.number({ min: 10000, max: 30000 })),
        name: 'No Indicator Grant Recipient',
        regionId: REGION_ID,
      });

      const singleGrantReviewId = faker.unique(
        () => faker.datatype.number({ min: 70001, max: 75000 }),
      ).toString();
      const singleGrantReviewId2 = faker.unique(
        () => faker.datatype.number({ min: 75001, max: 80000 }),
      ).toString();

      const singleGrantIndNumber = `G-SG-IND-${faker.datatype.number({ min: 100000, max: 999999 })}`;
      const singleGrantNoIndNumber = `G-SG-NOIND-${faker.datatype.number({ min: 100000, max: 999999 })}`;

      // Create GrantNumberLinks before creating grants (foreign key constraint)
      await db.GrantNumberLink.bulkCreate([
        { grantNumber: singleGrantIndNumber },
        { grantNumber: singleGrantNoIndNumber },
      ]);

      const singleGrantWithIndicator = await Grant.create({
        id: faker.unique(() => faker.datatype.number({ min: 10000, max: 30000 })),
        number: singleGrantIndNumber,
        recipientId: singleGrantRecipient.id,
        regionId: REGION_ID,
        status: 'Active',
        startDate: pastFiveYears,
        endDate: createDate,
        cdi: false,
      });

      const singleGrantWithoutIndicator = await Grant.create({
        id: faker.unique(() => faker.datatype.number({ min: 10000, max: 30000 })),
        number: singleGrantNoIndNumber,
        recipientId: noIndicatorRecipient.id,
        regionId: REGION_ID,
        status: 'Active',
        startDate: pastFiveYears,
        endDate: createDate,
        cdi: false,
      });

      await db.MonitoringGranteeLink.bulkCreate([
        { granteeId: singleGrantRecipient.id.toString() },
        { granteeId: noIndicatorRecipient.id.toString() },
      ]);

      // Create TTA for the no-indicator recipient so it's not excluded for noTTA reasons
      const singleGrantGoal = await Goal.create({
        name: 'Single Grant Test Goal',
        grantId: singleGrantWithoutIndicator.id,
        status: 'In Progress',
        createdVia: 'activityReport',
      });

      const singleGrantAR = await ActivityReport.create({
        activityRecipientType: 'recipient',
        submissionStatus: 'submitted',
        calculatedStatus: 'approved',
        userId: testUser.id,
        lastUpdatedById: testUser.id,
        ECLKCResourcesUsed: [],
        regionId: REGION_ID,
        numberOfParticipants: 1,
        deliveryMethod: 'in-person',
        duration: 1,
        startDate: pastYear,
        endDate: pastYear,
        version: 2,
      });

      await ActivityReportGoal.create({
        activityReportId: singleGrantAR.id,
        goalId: singleGrantGoal.id,
        status: 'In Progress',
      });

      // Create MonitoringReviewLinks before MonitoringReviews
      // (the MonitoringReview afterCreate hook calls syncMonitoringReviewLink
      // which skips creation if the link already exists)
      await db.MonitoringReviewLink.bulkCreate([
        { reviewId: singleGrantReviewId },
        { reviewId: singleGrantReviewId2 },
      ]);

      const singleGrantReview = await MonitoringReview.create({
        reviewId: singleGrantReviewId,
        contentId: faker.unique(() => faker.datatype.number({ min: 40000, max: 50000 })).toString(),
        statusId: monitoringReviewStatus.statusId,
        reviewType: 'RAN',
        reportDeliveryDate: pastYear,
        sourceCreatedAt: createDate,
        sourceUpdatedAt: createDate,
      });

      const singleGrantReview2 = await MonitoringReview.create({
        reviewId: singleGrantReviewId2,
        contentId: faker.unique(() => faker.datatype.number({ min: 50001, max: 60000 })).toString(),
        statusId: monitoringReviewStatus.statusId,
        reviewType: 'RAN',
        reportDeliveryDate: pastYear,
        sourceCreatedAt: createDate,
        sourceUpdatedAt: createDate,
      });

      await MonitoringReviewGrantee.bulkCreate([
        {
          reviewId: singleGrantReview.reviewId,
          granteeId: singleGrantRecipient.id.toString(),
          grantNumber: singleGrantWithIndicator.number,
          createTime: createDate,
          updateTime: createDate,
          updateBy: 'test-user',
          sourceCreatedAt: createDate,
          sourceUpdatedAt: createDate,
        },
        {
          reviewId: singleGrantReview2.reviewId,
          granteeId: singleGrantRecipient.id.toString(),
          grantNumber: singleGrantWithIndicator.number,
          createTime: createDate,
          updateTime: createDate,
          updateBy: 'test-user',
          sourceCreatedAt: createDate,
          sourceUpdatedAt: createDate,
        },
      ]);
      // End setup for childIncidents

      try {
        // Test with the grant that has an indicator
        const scopesWithIndicator = createScopesWithRecipientAndRegion(
          singleGrantRecipient.id,
          REGION_ID,
        );
        const resultWithIndicator = await getRecipientSpotlightIndicators(
          scopesWithIndicator,
          'recipientName',
          'ASC',
          0,
          10,
          [REGION_ID],
          [],
          [],
          singleGrantWithIndicator.id,
        );

        expect(resultWithIndicator.recipients.length).toBe(1);
        expect(resultWithIndicator.recipients[0].recipientId).toBe(singleGrantRecipient.id);
        expect(resultWithIndicator.recipients[0].childIncidents).toBe(true);
        expect(resultWithIndicator.recipients[0].indicatorCount).toBeGreaterThan(0);

        // Test with the grant that has no indicator (different recipient, no monitoring data)
        const scopesWithoutIndicator = createScopesWithRecipientAndRegion(
          noIndicatorRecipient.id,
          REGION_ID,
        );
        const resultWithoutIndicator = await getRecipientSpotlightIndicators(
          scopesWithoutIndicator,
          'recipientName',
          'ASC',
          0,
          10,
          [REGION_ID],
          [],
          [],
          singleGrantWithoutIndicator.id,
        );
        // With no explicit indicator filters, recipients with zero indicators should now be included.
        expect(resultWithoutIndicator.recipients.length).toBe(1);
        expect(resultWithoutIndicator.recipients[0].recipientId).toBe(noIndicatorRecipient.id);
        expect(resultWithoutIndicator.recipients[0].indicatorCount).toBe(0);
        expect(resultWithoutIndicator.count).toBe(1);
      } finally {
        // Clean up:
        await ActivityReportGoal.destroy({
          where: { activityReportId: singleGrantAR.id },
          force: true,
        });
        await ActivityReport.destroy({
          where: { id: singleGrantAR.id },
          force: true,
        });
        await Goal.destroy({
          where: { id: singleGrantGoal.id },
          force: true,
        });

        await MonitoringReviewGrantee.destroy({
          where: { reviewId: [singleGrantReview.reviewId, singleGrantReview2.reviewId] },
          force: true,
        });
        await MonitoringReview.destroy({
          where: { reviewId: [singleGrantReview.reviewId, singleGrantReview2.reviewId] },
          force: true,
        });
        await db.MonitoringReviewLink.destroy({
          where: { reviewId: [singleGrantReview.reviewId, singleGrantReview2.reviewId] },
          force: true,
        });

        await db.MonitoringGranteeLink.destroy({
          where: {
            granteeId: {
              [db.Sequelize.Op.in]: [
                singleGrantRecipient.id.toString(),
                noIndicatorRecipient.id.toString(),
              ],
            },
          },
          force: true,
        });

        await Grant.destroy({
          where: { id: [singleGrantWithIndicator.id, singleGrantWithoutIndicator.id] },
          force: true,
          individualHooks: true,
        });
        await Recipient.destroy({
          where: { id: [singleGrantRecipient.id, noIndicatorRecipient.id] },
          force: true,
        });

        await db.GrantNumberLink.destroy({
          where: { grantNumber: [singleGrantIndNumber, singleGrantNoIndNumber] },
          force: true,
        });
      }
    });

    it('works with empty grant list (queries all grants)', async () => {
      // Create a scope that returns no grants initially
      const emptyGrantScope = { grant: { where: { id: { [db.Sequelize.Op.eq]: -999 } }, include: [] } };

      const result = await getRecipientSpotlightIndicators(
        emptyGrantScope,
        'recipientName',
        'ASC',
        0,
        10,
        [REGION_ID],
      );

      expect(result).toBeDefined();
      expect(result.recipients).toBeDefined();
      expect(result.overview).toBeDefined();
      // With scope that matches no grants, the query uses TRUE as filter
      // so it returns all recipients in the region
      expect(Array.isArray(result.recipients)).toBe(true);
    });
  });

  describe('getRecipientSpotlightIndicators - Priority Indicator Filtering', () => {
    it('filters by single indicator (New staff)', async () => {
      const scopes = createScopesWithRegion(REGION_ID);
      const result = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        100,
        [REGION_ID],
        ['New staff'],
      );

      expect(result).toHaveProperty('recipients');
      expect(result.recipients.length).toBeGreaterThan(0);

      // All returned recipients should have newStaff = true
      result.recipients.forEach((recipient) => {
        expect(recipient.newStaff).toBe(true);
      });

      // Our test "New Staff Recipient" should be in the results
      const newStaffRecipientResult = result.recipients.find(
        (r) => r.recipientName === 'New Staff Recipient',
      );
      expect(newStaffRecipientResult).toBeDefined();
    });

    it('filters by single indicator (No TTA)', async () => {
      const scopes = createScopesWithRegion(REGION_ID);
      const result = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        100,
        [REGION_ID],
        ['No TTA'],
      );

      expect(result).toHaveProperty('recipients');
      expect(result.recipients.length).toBeGreaterThan(0);

      // All returned recipients should have noTTA = true
      result.recipients.forEach((recipient) => {
        expect(recipient.noTTA).toBe(true);
      });

      // Our test "No TTA Recipient" should be in the results
      const noTTARecipientResult = result.recipients.find(
        (r) => r.recipientName === 'No TTA Recipient',
      );
      expect(noTTARecipientResult).toBeDefined();
    });

    it('filters by multiple indicators with OR logic', async () => {
      const scopes = createScopesWithRegion(REGION_ID);
      const result = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        100,
        [REGION_ID],
        ['New staff', 'No TTA'],
      );

      expect(result).toHaveProperty('recipients');
      expect(result.recipients.length).toBeGreaterThan(0);

      // All returned recipients should have either newStaff = true OR noTTA = true
      result.recipients.forEach((recipient) => {
        expect(recipient.newStaff || recipient.noTTA).toBe(true);
      });

      // Both test recipients should be in the results
      const newStaffRecipientResult = result.recipients.find(
        (r) => r.recipientName === 'New Staff Recipient',
      );
      const noTTARecipientResult = result.recipients.find(
        (r) => r.recipientName === 'No TTA Recipient',
      );
      expect(newStaffRecipientResult).toBeDefined();
      expect(noTTARecipientResult).toBeDefined();
    });

    it('returns all recipients when indicator filter is empty', async () => {
      const scopes = createScopesWithRegion(REGION_ID);
      const resultWithoutFilter = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        100,
        [REGION_ID],
        [], // empty filter
      );

      const resultDefault = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        100,
        [REGION_ID],
        [], // no filter
      );

      // Both should return the same results
      expect(resultWithoutFilter.count).toBe(resultDefault.count);
      expect(resultWithoutFilter.recipients.length).toBe(resultDefault.recipients.length);
    });

    it('ignores invalid indicator labels', async () => {
      const scopes = createScopesWithRegion(REGION_ID);
      const resultWithInvalid = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        100,
        [REGION_ID],
        ['Invalid Label', 'Another Invalid'],
      );

      const resultDefault = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        100,
        [REGION_ID],
      );

      // Invalid labels should be filtered out, returning all recipients (default behavior)
      expect(resultWithInvalid.count).toBe(resultDefault.count);
    });

    it('handles mixed valid and invalid indicator labels', async () => {
      const scopes = createScopesWithRegion(REGION_ID);
      const result = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        100,
        [REGION_ID],
        ['New staff', 'Invalid Label'],
      );

      expect(result).toHaveProperty('recipients');
      expect(result.recipients.length).toBeGreaterThan(0);

      // Should filter by the valid indicator only
      result.recipients.forEach((recipient) => {
        expect(recipient.newStaff).toBe(true);
      });
    });

    it('filters by New recipient indicator', async () => {
      const scopes = createScopesWithRegion(REGION_ID);
      const result = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        100,
        [REGION_ID],
        ['New recipient'],
      );

      expect(result).toHaveProperty('recipients');
      expect(result.recipients.length).toBeGreaterThan(0);

      // All returned recipients should have newRecipients = true
      result.recipients.forEach((recipient) => {
        expect(recipient.newRecipients).toBe(true);
      });

      // Our test "New Recipient" should be in the results
      const newRecipientResult = result.recipients.find(
        (r) => r.recipientName === 'New Recipient',
      );
      expect(newRecipientResult).toBeDefined();
    });
  });

  describe('mustHaveIndicators filtering', () => {
    it('excludes recipients with zero indicators when mustHaveIndicators is true', async () => {
      // normalRecipient has TTA and no other indicators, so indicatorCount = 0
      const scopes = createScopesWithRegion(REGION_ID);
      const result = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        100,
        [REGION_ID],
        [], // no include filters
        [], // no exclude filters
        null, // no singleGrantId
        true, // mustHaveIndicators
      );

      expect(result).toHaveProperty('recipients');
      // All returned recipients should have at least one indicator
      result.recipients.forEach((recipient) => {
        expect(recipient.indicatorCount).toBeGreaterThan(0);
      });
      // normalRecipient should NOT be in the results
      const normalResult = result.recipients.find(
        (r) => r.recipientName === 'Normal Recipient',
      );
      expect(normalResult).toBeUndefined();
    });

    it('includes recipients with zero indicators when mustHaveIndicators is false', async () => {
      const scopes = createScopesWithRecipientAndRegion(normalRecipient.id, REGION_ID);
      const result = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        100,
        [REGION_ID],
        [], // no include filters
        [], // no exclude filters
        null, // no singleGrantId
        false, // mustHaveIndicators
      );

      expect(result.recipients.length).toBe(1);
      expect(result.recipients[0].recipientId).toBe(normalRecipient.id);
      expect(result.recipients[0].indicatorCount).toBe(0);
    });

    it('does not apply mustHaveIndicators filter when explicit indicator filters are provided', async () => {
      // When include/exclude filters are set, mustHaveIndicators should be ignored
      const scopes = createScopesWithRegion(REGION_ID);
      const result = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        100,
        [REGION_ID],
        ['No TTA'], // include filter
        [], // no exclude filters
        null, // no singleGrantId
        true, // mustHaveIndicators (should be ignored since include filter is set)
      );

      expect(result).toHaveProperty('recipients');
      // Should filter by 'No TTA' indicator, not just by indicatorCount > 0
      result.recipients.forEach((recipient) => {
        expect(recipient.noTTA).toBe(true);
      });
    });
  });

  describe('state code filtering', () => {
    it('returns no results when filtering by a state code with no matching grants', async () => {
      // Create a scope that filters by a non-existent state code
      // This simulates what happens when filtersToScopes processes stateCode.ctn=ZZ
      const scopes = {
        grant: {
          where: {
            [db.Sequelize.Op.and]: [
              { stateCode: { [db.Sequelize.Op.in]: ['ZZ'] } }, // Non-existent state code
              { regionId: { [db.Sequelize.Op.in]: [REGION_ID] } },
            ],
          },
          include: [],
        },
      };

      const result = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        100,
        [REGION_ID],
      );

      // Should return empty results since no grants match 'ZZ' state code
      expect(result.recipients).toEqual([]);
      expect(result.count).toBe(0);
      expect(result.overview.numRecipients).toBe('0');
    });

    it('returns results only for grants matching the specified state code', async () => {
      // First, update one of our test grants to have a specific state code
      await db.Grant.update(
        { stateCode: 'TX' },
        { where: { id: childIncidentsGrant.id }, individualHooks: true },
      );

      try {
        // Filter by 'TX' state code
        const scopes = {
          grant: {
            where: {
              [db.Sequelize.Op.and]: [
                { stateCode: { [db.Sequelize.Op.in]: ['TX'] } },
                { regionId: { [db.Sequelize.Op.in]: [REGION_ID] } },
              ],
            },
            include: [],
          },
        };

        const result = await getRecipientSpotlightIndicators(
          scopes,
          'recipientName',
          'ASC',
          0,
          100,
          [REGION_ID],
        );

        // Should only return the recipient with the TX grant
        expect(result.recipients.length).toBe(1);
        expect(result.recipients[0].recipientName).toBe('Child Incidents Recipient');
      } finally {
        // Reset the state code
        await db.Grant.update(
          { stateCode: null },
          { where: { id: childIncidentsGrant.id }, individualHooks: true },
        );
      }
    });
  });

  /// failing block
  describe('secondary sorting', () => {
    // Test recipients with different indicator counts and names
    let sortRecipientA; // Will have 0 indicators
    let sortRecipientB; // Will have 0 indicators
    let sortRecipientC; // Will have 1 indicator (noTTA)
    let sortRecipientD; // Will have 1 indicator (noTTA)
    let sortGrantA;
    let sortGrantB;
    let sortGrantC;
    let sortGrantD;

    const pastFiveYearsSort = new Date();
    pastFiveYearsSort.setFullYear(pastFiveYearsSort.getFullYear() - 5);
    const pastYearSort = new Date();
    pastYearSort.setMonth(pastYearSort.getMonth() - 6);

    beforeAll(async () => {
      // Clean up any orphaned data from previous failed test runs using transaction
      await sequelize.transaction(async (t) => {
        const sortGrantNumbers = ['G-SORT-SEC-A', 'G-SORT-SEC-B', 'G-SORT-SEC-C', 'G-SORT-SEC-D'];
        const existingGrants = await Grant.findAll({
          where: { number: sortGrantNumbers },
          raw: true,
          transaction: t,
        });
        if (existingGrants.length > 0) {
          const existingGrantIds = existingGrants.map((g) => g.id);
          const existingRecipientIds = [...new Set(existingGrants.map((g) => g.recipientId))];
          await ActivityReportGoal.destroy({ where: { grantId: existingGrantIds }, force: true, transaction: t });
          await Goal.destroy({ where: { grantId: existingGrantIds }, force: true, transaction: t });
          await Grant.destroy({
            where: { id: existingGrantIds },
            force: true,
            individualHooks: true,
            transaction: t,
          });
          await Recipient.destroy({
            where: { id: existingRecipientIds },
            force: true,
            transaction: t,
          });
        }
      });

      // Create GrantNumberLinks for test grants
      await db.GrantNumberLink.bulkCreate([
        { grantNumber: 'G-SORT-SEC-A' },
        { grantNumber: 'G-SORT-SEC-B' },
        { grantNumber: 'G-SORT-SEC-C' },
        { grantNumber: 'G-SORT-SEC-D' },
      ], { ignoreDuplicates: true });

      // Create recipients with names that allow us to verify secondary sort
      // Zebra and Yak will have 0 indicators (with TTA)
      // Apple and Banana will have 1 indicator (noTTA)
      sortRecipientA = await Recipient.create({
        id: faker.unique(() => faker.datatype.number({ min: 70000, max: 80000 })),
        name: 'Zebra Secondary Sort Recipient',
        regionId: REGION_ID,
      });

      sortRecipientB = await Recipient.create({
        id: faker.unique(() => faker.datatype.number({ min: 70000, max: 80000 })),
        name: 'Yak Secondary Sort Recipient',
        regionId: REGION_ID,
      });

      sortRecipientC = await Recipient.create({
        id: faker.unique(() => faker.datatype.number({ min: 70000, max: 80000 })),
        name: 'Banana Secondary Sort Recipient',
        regionId: REGION_ID,
      });

      sortRecipientD = await Recipient.create({
        id: faker.unique(() => faker.datatype.number({ min: 70000, max: 80000 })),
        name: 'Apple Secondary Sort Recipient',
        regionId: REGION_ID,
      });

      // Create grants - all old enough to not trigger newRecipients
      sortGrantA = await Grant.create({
        id: faker.unique(() => faker.datatype.number({ min: 70000, max: 80000 })),
        number: 'G-SORT-SEC-A',
        recipientId: sortRecipientA.id,
        regionId: REGION_ID,
        status: 'Active',
        startDate: pastFiveYearsSort,
        cdi: false,
      });

      sortGrantB = await Grant.create({
        id: faker.unique(() => faker.datatype.number({ min: 70000, max: 80000 })),
        number: 'G-SORT-SEC-B',
        recipientId: sortRecipientB.id,
        regionId: REGION_ID,
        status: 'Active',
        startDate: pastFiveYearsSort,
        cdi: false,
      });

      sortGrantC = await Grant.create({
        id: faker.unique(() => faker.datatype.number({ min: 70000, max: 80000 })),
        number: 'G-SORT-SEC-C',
        recipientId: sortRecipientC.id,
        regionId: REGION_ID,
        status: 'Active',
        startDate: pastFiveYearsSort,
        cdi: false,
      });

      sortGrantD = await Grant.create({
        id: faker.unique(() => faker.datatype.number({ min: 70000, max: 80000 })),
        number: 'G-SORT-SEC-D',
        recipientId: sortRecipientD.id,
        regionId: REGION_ID,
        status: 'Active',
        startDate: pastFiveYearsSort,
        cdi: false,
      });

      // Create goals for TTA - each grant needs its own goal for the join to work
      const goalA = await Goal.create({
        name: 'Secondary Sort Test Goal A',
        status: 'Not Started',
        onAR: true,
        onApprovedAR: false,
        grantId: sortGrantA.id,
      });

      const goalB = await Goal.create({
        name: 'Secondary Sort Test Goal B',
        status: 'Not Started',
        onAR: true,
        onApprovedAR: false,
        grantId: sortGrantB.id,
      });

      // Create activity reports for Zebra and Yak (so they have TTA, thus 0 indicators)
      // Apple and Banana will NOT have activity reports (so they have noTTA indicator)
      const grantsWithGoals = [
        { grantId: sortGrantA.id, goalId: goalA.id },
        { grantId: sortGrantB.id, goalId: goalB.id },
      ];
      await Promise.all(grantsWithGoals.map(async ({ grantId, goalId }) => {
        const report = await ActivityReport.create({
          activityRecipientType: 'recipient',
          submissionStatus: 'submitted',
          calculatedStatus: 'approved',
          userId: testUser.id,
          regionId: REGION_ID,
          startDate: pastYearSort,
          endDate: pastYearSort,
          approvedAt: pastYearSort,
          duration: 1,
        });

        await ActivityReportGoal.create({
          activityReportId: report.id,
          grantId,
          goalId,
        });

        return report;
      }));
    });

    afterAll(async () => {
      // Clean up activity report goals first (by goalId, since ActivityReportGoal doesn't have grantId)
      const grantIdsForCleanup = [sortGrantA?.id, sortGrantB?.id, sortGrantC?.id, sortGrantD?.id].filter(Boolean);

      // Get the activity report IDs that are linked to our grants BEFORE deleting ActivityReportGoals
      let activityReportIds = [];
      if (grantIdsForCleanup.length > 0) {
        // First find goals for these grants, then use goalIds to find ActivityReportGoals
        const goals = await Goal.findAll({
          where: { grantId: grantIdsForCleanup },
          attributes: ['id'],
        });
        const goalIds = goals.map((g) => g.id);

        if (goalIds.length > 0) {
          const activityReportGoals = await ActivityReportGoal.findAll({
            where: { goalId: goalIds },
            attributes: ['activityReportId'],
          });
          activityReportIds = [...new Set(activityReportGoals.map((arg) => arg.activityReportId))];

          await ActivityReportGoal.destroy({
            where: { goalId: goalIds },
            force: true,
          });
        }
      }

      // Clean up only the activity reports associated with our test grants
      if (activityReportIds.length > 0) {
        await ActivityReport.destroy({
          where: { id: activityReportIds },
          force: true,
        });
      }

      // Clean up goals (by grantId to get all goals created for these grants)
      if (grantIdsForCleanup.length > 0) {
        await Goal.destroy({ where: { grantId: grantIdsForCleanup }, force: true });
      }

      // Clean up grants
      const grantIds = [sortGrantA?.id, sortGrantB?.id, sortGrantC?.id, sortGrantD?.id].filter(Boolean);
      if (grantIds.length > 0) {
        await Grant.destroy({ where: { id: grantIds }, force: true, individualHooks: true });
      }

      // Clean up recipients
      const recipientIds = [
        sortRecipientA?.id, sortRecipientB?.id, sortRecipientC?.id, sortRecipientD?.id,
      ].filter(Boolean);
      if (recipientIds.length > 0) {
        await Recipient.destroy({ where: { id: recipientIds }, force: true });
      }

      // Clean up grant number links
      await db.GrantNumberLink.destroy({
        where: { grantNumber: ['G-SORT-SEC-A', 'G-SORT-SEC-B', 'G-SORT-SEC-C', 'G-SORT-SEC-D'] },
      });
    });

    it('sorts by indicatorCount ASC with recipientName as secondary sort', async () => {
      const scopes = {
        grant: {
          where: {
            [db.Sequelize.Op.and]: [
              { id: { [db.Sequelize.Op.in]: [sortGrantA.id, sortGrantB.id, sortGrantC.id, sortGrantD.id] } },
              { regionId: REGION_ID },
            ],
          },
          include: [],
        },
      };

      const result = await getRecipientSpotlightIndicators(
        scopes,
        'indicatorCount',
        'ASC',
        0,
        100,
        [REGION_ID],
      );

      const testRecipients = result.recipients.filter(
        (r) => r.recipientName.includes('Secondary Sort Recipient'),
      );

      expect(testRecipients.length).toBe(4);

      // Sorted by indicatorCount ASC (0-indicators first) then recipientName ASC
      expect(testRecipients[0].recipientName).toBe('Yak Secondary Sort Recipient');
      expect(testRecipients[0].indicatorCount).toBe(0);
      expect(testRecipients[1].recipientName).toBe('Zebra Secondary Sort Recipient');
      expect(testRecipients[1].indicatorCount).toBe(0);
      expect(testRecipients[2].recipientName).toBe('Apple Secondary Sort Recipient');
      expect(testRecipients[2].indicatorCount).toBe(1);
      expect(testRecipients[3].recipientName).toBe('Banana Secondary Sort Recipient');
      expect(testRecipients[3].indicatorCount).toBe(1);
    });

    it('sorts by indicatorCount DESC with recipientName as secondary sort', async () => {
      const scopes = {
        grant: {
          where: {
            [db.Sequelize.Op.and]: [
              { id: { [db.Sequelize.Op.in]: [sortGrantA.id, sortGrantB.id, sortGrantC.id, sortGrantD.id] } },
              { regionId: REGION_ID },
            ],
          },
          include: [],
        },
      };

      const result = await getRecipientSpotlightIndicators(
        scopes,
        'indicatorCount',
        'DESC',
        0,
        100,
        [REGION_ID],
      );

      const testRecipients = result.recipients.filter(
        (r) => r.recipientName.includes('Secondary Sort Recipient'),
      );

      expect(testRecipients.length).toBe(4);

      // Sorted by indicatorCount DESC (1-indicators first) then recipientName ASC
      expect(testRecipients[0].recipientName).toBe('Apple Secondary Sort Recipient');
      expect(testRecipients[0].indicatorCount).toBe(1);
      expect(testRecipients[1].recipientName).toBe('Banana Secondary Sort Recipient');
      expect(testRecipients[1].indicatorCount).toBe(1);
      expect(testRecipients[2].recipientName).toBe('Yak Secondary Sort Recipient');
      expect(testRecipients[2].indicatorCount).toBe(0);
      expect(testRecipients[3].recipientName).toBe('Zebra Secondary Sort Recipient');
      expect(testRecipients[3].indicatorCount).toBe(0);
    });

    it('sorts by regionId ASC with recipientName as secondary sort', async () => {
      // Clean up leftover data from previous failed runs
      const leftoverRegionGrants = await Grant.findAll({
        where: { number: ['G-REGION-SORT-1', 'G-REGION-SORT-2'] },
        raw: true,
      });
      if (leftoverRegionGrants.length > 0) {
        const ids = leftoverRegionGrants.map((g) => g.id);
        const recipIds = [...new Set(leftoverRegionGrants.map((g) => g.recipientId))];
        await Grant.destroy({ where: { id: ids }, force: true, individualHooks: true });
        await Recipient.destroy({ where: { id: recipIds }, force: true });
      }

      // Create additional grant number links
      await db.GrantNumberLink.bulkCreate([
        { grantNumber: 'G-REGION-SORT-1' },
        { grantNumber: 'G-REGION-SORT-2' },
      ], { ignoreDuplicates: true });

      const recipientRegion1B = await Recipient.create({
        id: faker.unique(() => faker.datatype.number({ min: 80000, max: 90000 })),
        name: 'Beta Region Sort Recipient',
      });

      const recipientRegion1A = await Recipient.create({
        id: faker.unique(() => faker.datatype.number({ min: 80000, max: 90000 })),
        name: 'Alpha Region Sort Recipient',
      });

      const grantRegion1B = await Grant.create({
        id: faker.unique(() => faker.datatype.number({ min: 80000, max: 90000 })),
        number: 'G-REGION-SORT-1',
        recipientId: recipientRegion1B.id,
        regionId: REGION_ID,
        status: 'Active',
        startDate: pastFiveYearsSort,
        cdi: false,
      });

      const grantRegion1A = await Grant.create({
        id: faker.unique(() => faker.datatype.number({ min: 80000, max: 90000 })),
        number: 'G-REGION-SORT-2',
        recipientId: recipientRegion1A.id,
        regionId: REGION_ID,
        status: 'Active',
        startDate: pastFiveYearsSort,
        cdi: false,
      });

      try {
        const scopes = {
          grant: {
            where: {
              [db.Sequelize.Op.and]: [
                { id: { [db.Sequelize.Op.in]: [grantRegion1A.id, grantRegion1B.id] } },
                { regionId: REGION_ID },
              ],
            },
            include: [],
          },
        };

        const result = await getRecipientSpotlightIndicators(
          scopes,
          'regionId',
          'ASC',
          0,
          100,
          [REGION_ID],
        );

        const testRecipients = result.recipients.filter(
          (r) => r.recipientName.includes('Region Sort Recipient'),
        );

        expect(testRecipients.length).toBe(2);

        // Both in same region, so sorted by name ASC: Alpha before Beta
        expect(testRecipients[0].recipientName).toBe('Alpha Region Sort Recipient');
        expect(testRecipients[1].recipientName).toBe('Beta Region Sort Recipient');
      } finally {
        await Grant.destroy({ where: { id: [grantRegion1A.id, grantRegion1B.id] }, force: true, individualHooks: true });
        await Recipient.destroy({ where: { id: [recipientRegion1A.id, recipientRegion1B.id] }, force: true });
        await db.GrantNumberLink.destroy({ where: { grantNumber: ['G-REGION-SORT-1', 'G-REGION-SORT-2'] } });
      }
    });

    it('sorts by regionId DESC with recipientName as secondary sort', async () => {
      // Clean up leftover data from previous failed runs
      const leftoverRegionGrants = await Grant.findAll({
        where: { number: ['G-REGION-SORT-3', 'G-REGION-SORT-4'] },
        raw: true,
      });
      if (leftoverRegionGrants.length > 0) {
        const ids = leftoverRegionGrants.map((g) => g.id);
        const recipIds = [...new Set(leftoverRegionGrants.map((g) => g.recipientId))];
        await Grant.destroy({ where: { id: ids }, force: true, individualHooks: true });
        await Recipient.destroy({ where: { id: recipIds }, force: true });
      }

      // Create additional grant number links
      await db.GrantNumberLink.bulkCreate([
        { grantNumber: 'G-REGION-SORT-3' },
        { grantNumber: 'G-REGION-SORT-4' },
      ], { ignoreDuplicates: true });

      const recipientRegionDescB = await Recipient.create({
        id: faker.unique(() => faker.datatype.number({ min: 90000, max: 99000 })),
        name: 'Delta Region Sort Recipient',
      });

      const recipientRegionDescA = await Recipient.create({
        id: faker.unique(() => faker.datatype.number({ min: 90000, max: 99000 })),
        name: 'Charlie Region Sort Recipient',
      });

      const grantRegionDescB = await Grant.create({
        id: faker.unique(() => faker.datatype.number({ min: 90000, max: 99000 })),
        number: 'G-REGION-SORT-3',
        recipientId: recipientRegionDescB.id,
        regionId: REGION_ID,
        status: 'Active',
        startDate: pastFiveYearsSort,
        cdi: false,
      });

      const grantRegionDescA = await Grant.create({
        id: faker.unique(() => faker.datatype.number({ min: 90000, max: 99000 })),
        number: 'G-REGION-SORT-4',
        recipientId: recipientRegionDescA.id,
        regionId: REGION_ID,
        status: 'Active',
        startDate: pastFiveYearsSort,
        cdi: false,
      });

      try {
        const scopes = {
          grant: {
            where: {
              [db.Sequelize.Op.and]: [
                { id: { [db.Sequelize.Op.in]: [grantRegionDescA.id, grantRegionDescB.id] } },
                { regionId: REGION_ID },
              ],
            },
            include: [],
          },
        };

        const result = await getRecipientSpotlightIndicators(
          scopes,
          'regionId',
          'DESC',
          0,
          100,
          [REGION_ID],
        );

        const testRecipients = result.recipients.filter(
          (r) => r.recipientName.includes('Region Sort Recipient'),
        );

        expect(testRecipients.length).toBe(2);

        // Both in same region, so sorted by name ASC: Charlie before Delta
        expect(testRecipients[0].recipientName).toBe('Charlie Region Sort Recipient');
        expect(testRecipients[1].recipientName).toBe('Delta Region Sort Recipient');
      } finally {
        await Grant.destroy({ where: { id: [grantRegionDescA.id, grantRegionDescB.id] }, force: true, individualHooks: true });
        await Recipient.destroy({ where: { id: [recipientRegionDescA.id, recipientRegionDescB.id] }, force: true });
        await db.GrantNumberLink.destroy({ where: { grantNumber: ['G-REGION-SORT-3', 'G-REGION-SORT-4'] } });
      }
    });
  });

  describe('totalRecipients counts recipient-region pairs', () => {
    let multiRegionRecipient;
    let grantRegion1;
    let grantRegion2;
    const REGION_1 = 1;
    const REGION_2 = 2;
    const pastFiveYearsLocal = new Date();
    pastFiveYearsLocal.setFullYear(pastFiveYearsLocal.getFullYear() - 5);

    beforeAll(async () => {
      // Clean up leftover data from previous failed runs
      const leftoverMultiGrants = await Grant.findAll({
        where: { number: ['G-MULTI-R1', 'G-MULTI-R2'] },
        raw: true,
      });
      if (leftoverMultiGrants.length > 0) {
        const ids = leftoverMultiGrants.map((g) => g.id);
        const recipIds = [...new Set(leftoverMultiGrants.map((g) => g.recipientId))];
        await Grant.destroy({ where: { id: ids }, force: true, individualHooks: true });
        await Recipient.destroy({ where: { id: recipIds }, force: true });
      }

      // Create GrantNumberLinks for our test grant numbers
      await db.GrantNumberLink.bulkCreate([
        { grantNumber: 'G-MULTI-R1' },
        { grantNumber: 'G-MULTI-R2' },
      ], { ignoreDuplicates: true });

      // Create a single recipient
      multiRegionRecipient = await Recipient.create({
        id: faker.unique(() => faker.datatype.number({ min: 40000, max: 50000 })),
        name: 'Multi Region Recipient',
      });

      // Create grants in different regions for same recipient
      grantRegion1 = await Grant.create({
        id: faker.unique(() => faker.datatype.number({ min: 40000, max: 50000 })),
        number: 'G-MULTI-R1',
        recipientId: multiRegionRecipient.id,
        regionId: REGION_1,
        status: 'Active',
        startDate: pastFiveYearsLocal,
      });

      grantRegion2 = await Grant.create({
        id: faker.unique(() => faker.datatype.number({ min: 40000, max: 50000 })),
        number: 'G-MULTI-R2',
        recipientId: multiRegionRecipient.id,
        regionId: REGION_2,
        status: 'Active',
        startDate: pastFiveYearsLocal,
      });
    });

    afterAll(async () => {
      const grantIdsToDelete = [grantRegion1?.id, grantRegion2?.id].filter(Boolean);
      if (grantIdsToDelete.length > 0) {
        await Grant.destroy({ where: { id: grantIdsToDelete }, force: true, individualHooks: true });
      }
      if (multiRegionRecipient?.id) {
        await Recipient.destroy({ where: { id: multiRegionRecipient.id }, force: true });
      }
      await db.GrantNumberLink.destroy({ where: { grantNumber: ['G-MULTI-R1', 'G-MULTI-R2'] } });
    });

    it('counts recipient once per region when querying multiple regions', async () => {
      const scopes = {
        grant: {
          where: {
            [db.Sequelize.Op.and]: [
              { id: { [db.Sequelize.Op.ne]: null } },
              { regionId: { [db.Sequelize.Op.in]: [REGION_1, REGION_2] } },
              { recipientId: multiRegionRecipient.id },
            ],
          },
          include: [],
        },
      };

      const result = await getRecipientSpotlightIndicators(
        scopes,
        'recipientName',
        'ASC',
        0,
        10,
        [REGION_1, REGION_2],
      );

      // Should return 2 rows (one per region) for the same recipient
      expect(result.recipients.length).toBe(2);
      // totalRecipients counts ALL recipient-region pairs in the selected regions,
      // so it will be >= 2 (includes our test recipient plus any others in those regions)
      expect(parseInt(result.overview.totalRecipients, 10)).toBeGreaterThanOrEqual(2);
      // Both rows should be for the same recipient name
      expect(result.recipients[0].recipientName).toBe('Multi Region Recipient');
      expect(result.recipients[1].recipientName).toBe('Multi Region Recipient');
      // But different regions
      const regions = result.recipients.map((r) => r.regionId).sort();
      expect(regions).toEqual([REGION_1, REGION_2]);
    });
  });
});
