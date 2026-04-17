/* eslint-disable max-len */
import faker from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import updateMonitoringFactTables from './updateMonitoringFactTables';
import {
  Recipient,
  Grant,
  GoalTemplate,
  Goal,
  GoalStatusChange,
  MonitoringReviewGrantee,
  MonitoringReview,
  MonitoringReviewStatus,
  MonitoringReviewLink,
  MonitoringReviewStatusLink,
  MonitoringFindingHistory,
  MonitoringFinding,
  MonitoringFindingStatus,
  MonitoringFindingStatusLink,
  MonitoringFindingLink,
  MonitoringFindingGrant,
  MonitoringFindingStandard,
  MonitoringStandard,
  MonitoringStandardLink,
  DeliveredReview,
  Citation,
  DeliveredReviewCitation,
  GrantDeliveredReview,
  GrantCitation,
  GrantRelationshipToActive,
  GrantNumberLink,
  MonitoringGranteeLink,
  MonitoringFindingHistoryStatusLink,
} from '../models';

jest.mock('../logger');

// Shared status IDs (high numbers to avoid seed conflicts)
const REVIEW_STATUS_COMPLETE_ID = 80001;
const FINDING_STATUS_ACTIVE_ID = 80002;
const FINDING_STATUS_CORRECTED_ID = 80003;
const STANDARD_ID_1 = 80001;
const STANDARD_ID_2 = 80002;

const timestamps = {
  sourceCreatedAt: new Date(),
  sourceUpdatedAt: new Date(),
  sourceDeletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const linkTimestamps = {
  createdAt: new Date(),
  updatedAt: new Date(),
};

const granteeRow = (grantNumber, reviewId, granteeId) => ({
  id: faker.datatype.number({ min: 9999 }),
  grantNumber,
  reviewId,
  granteeId,
  createTime: new Date(),
  updateTime: new Date(),
  updateBy: 'Test',
  sourceCreatedAt: new Date(),
  sourceUpdatedAt: new Date(),
});

describe('updateMonitoringFactTables', () => {
  // ----------------------------------------------------------
  // Scenario A: Active deficiency, TWO grants on same review
  // ----------------------------------------------------------
  const recipientIdA = faker.datatype.number({ min: 70000 });
  const grantIdA1 = faker.datatype.number({ min: 70000 });
  const grantIdA2 = faker.datatype.number({ min: 70000 });
  const grantNumberA1 = `UFT-${uuidv4().slice(0, 8)}`;
  const grantNumberA2 = `UFT-${uuidv4().slice(0, 8)}`;
  const reviewIdA = uuidv4();
  const granteeIdA1 = uuidv4();
  const granteeIdA2 = uuidv4();
  const findingIdA = uuidv4();
  const findingIdADeleted = uuidv4(); // Active-status finding with sourceDeletedAt — must not produce a Citation
  const findingIdADeletedStandard = uuidv4(); // Finding whose only MonitoringFindingStandard is source-deleted — must not produce a Citation

  // ----------------------------------------------------------
  // Scenario B: Corrected finding across two delivered reviews
  // ----------------------------------------------------------
  const recipientIdB = faker.datatype.number({ min: 70000 });
  const grantIdB = faker.datatype.number({ min: 70000 });
  const grantNumberB = `UFT-${uuidv4().slice(0, 8)}`;
  const reviewIdB1 = uuidv4();
  const reviewIdB2 = uuidv4();
  const granteeIdB = uuidv4();
  const findingIdB = uuidv4();

  // ----------------------------------------------------------
  // Scenario C: AOC closed by monitoring goal
  // ----------------------------------------------------------
  const recipientIdC = faker.datatype.number({ min: 70000 });
  const grantIdC = faker.datatype.number({ min: 70000 });
  const grantNumberC = `UFT-${uuidv4().slice(0, 8)}`;
  const reviewIdC = uuidv4();
  const granteeIdC = uuidv4();
  const findingIdC = uuidv4();
  const goalClosureDate = new Date('2025-05-01T12:00:00Z');

  // ----------------------------------------------------------
  // Scenario D: Undelivered current review forces Active
  // ----------------------------------------------------------
  const recipientIdD = faker.datatype.number({ min: 70000 });
  const grantIdD = faker.datatype.number({ min: 70000 });
  const grantNumberD = `UFT-${uuidv4().slice(0, 8)}`;
  const reviewIdD1 = uuidv4();
  const reviewIdD2 = uuidv4();
  const granteeIdD = uuidv4();
  const findingIdD = uuidv4();

  beforeAll(async () => {
    // --- Shared statuses ---
    await MonitoringReviewStatusLink.findOrCreate({
      where: { statusId: REVIEW_STATUS_COMPLETE_ID },
      defaults: linkTimestamps,
    });
    await MonitoringReviewStatus.findOrCreate({
      where: { statusId: REVIEW_STATUS_COMPLETE_ID },
      defaults: { statusId: REVIEW_STATUS_COMPLETE_ID, name: 'Complete', ...timestamps },
    });

    await MonitoringFindingStatusLink.findOrCreate({
      where: { statusId: FINDING_STATUS_ACTIVE_ID },
      defaults: linkTimestamps,
    });
    await MonitoringFindingStatus.findOrCreate({
      where: { statusId: FINDING_STATUS_ACTIVE_ID },
      defaults: { statusId: FINDING_STATUS_ACTIVE_ID, name: 'Active', ...timestamps },
    });

    await MonitoringFindingStatusLink.findOrCreate({
      where: { statusId: FINDING_STATUS_CORRECTED_ID },
      defaults: linkTimestamps,
    });
    await MonitoringFindingStatus.findOrCreate({
      where: { statusId: FINDING_STATUS_CORRECTED_ID },
      defaults: { statusId: FINDING_STATUS_CORRECTED_ID, name: 'Corrected', ...timestamps },
    });

    // Shared standards
    await MonitoringStandardLink.findOrCreate({
      where: { standardId: STANDARD_ID_1 },
      defaults: linkTimestamps,
    });
    await MonitoringStandard.findOrCreate({
      where: { standardId: STANDARD_ID_1 },
      defaults: {
        standardId: STANDARD_ID_1,
        contentId: `content-${uuidv4()}`,
        citation: '1302.47(b)(5)(iv)',
        text: 'Standard text for testing',
        guidance: 'Fiscal',
        citable: 1,
        hash: `hash-${uuidv4()}`,
        ...timestamps,
      },
    });
    await MonitoringStandardLink.findOrCreate({
      where: { standardId: STANDARD_ID_2 },
      defaults: linkTimestamps,
    });
    await MonitoringStandard.findOrCreate({
      where: { standardId: STANDARD_ID_2 },
      defaults: {
        standardId: STANDARD_ID_2,
        contentId: `content-${uuidv4()}`,
        citation: '1302.90(c)(1)',
        text: 'Another standard text',
        guidance: 'Health',
        citable: 1,
        hash: `hash-${uuidv4()}`,
        ...timestamps,
      },
    });

    // --- Recipients ---
    await Recipient.bulkCreate([
      { id: recipientIdA, name: `Recipient A ${uuidv4().slice(0, 6)}` },
      { id: recipientIdB, name: `Recipient B ${uuidv4().slice(0, 6)}` },
      { id: recipientIdC, name: `Recipient C ${uuidv4().slice(0, 6)}` },
      { id: recipientIdD, name: `Recipient D ${uuidv4().slice(0, 6)}` },
    ]);

    // --- Grants ---
    const grantDefaults = { status: 'Active', startDate: new Date(), endDate: new Date('2030-01-01') };
    await Grant.bulkCreate([
      {
        id: grantIdA1, number: grantNumberA1, recipientId: recipientIdA, regionId: 1, ...grantDefaults,
      },
      {
        id: grantIdA2, number: grantNumberA2, recipientId: recipientIdA, regionId: 1, ...grantDefaults,
      },
      {
        id: grantIdB, number: grantNumberB, recipientId: recipientIdB, regionId: 2, ...grantDefaults,
      },
      {
        id: grantIdC, number: grantNumberC, recipientId: recipientIdC, regionId: 3, ...grantDefaults,
      },
      {
        id: grantIdD, number: grantNumberD, recipientId: recipientIdD, regionId: 4, ...grantDefaults,
      },
    ]);

    // Grant hooks don't fire during bulkCreate, so create link table entries manually.
    // These satisfy FK constraints on MonitoringReviewGrantees, MonitoringFindingGrant, etc.
    await Promise.all([
      GrantNumberLink.findOrCreate({ where: { grantNumber: grantNumberA1 }, defaults: { grantId: grantIdA1 } }),
      GrantNumberLink.findOrCreate({ where: { grantNumber: grantNumberA2 }, defaults: { grantId: grantIdA2 } }),
      GrantNumberLink.findOrCreate({ where: { grantNumber: grantNumberB }, defaults: { grantId: grantIdB } }),
      GrantNumberLink.findOrCreate({ where: { grantNumber: grantNumberC }, defaults: { grantId: grantIdC } }),
      GrantNumberLink.findOrCreate({ where: { grantNumber: grantNumberD }, defaults: { grantId: grantIdD } }),
      MonitoringGranteeLink.findOrCreate({ where: { granteeId: granteeIdA1 } }),
      MonitoringGranteeLink.findOrCreate({ where: { granteeId: granteeIdA2 } }),
      MonitoringGranteeLink.findOrCreate({ where: { granteeId: granteeIdB } }),
      MonitoringGranteeLink.findOrCreate({ where: { granteeId: granteeIdC } }),
      MonitoringGranteeLink.findOrCreate({ where: { granteeId: granteeIdD } }),
      MonitoringFindingHistoryStatusLink.findOrCreate({ where: { statusId: FINDING_STATUS_ACTIVE_ID } }),
      MonitoringFindingHistoryStatusLink.findOrCreate({ where: { statusId: FINDING_STATUS_CORRECTED_ID } }),
    ]);

    await GrantRelationshipToActive.refresh();

    // =====================================================
    // Scenario A: Active Deficiency, two grants one review
    // =====================================================
    await MonitoringReviewLink.findOrCreate({ where: { reviewId: reviewIdA }, defaults: linkTimestamps });
    await MonitoringReview.create({
      reviewId: reviewIdA,
      contentId: uuidv4(),
      statusId: REVIEW_STATUS_COMPLETE_ID,
      startDate: '2025-02-01',
      endDate: '2025-02-15',
      reviewType: 'FA-1',
      reportDeliveryDate: '2025-03-01',
      outcome: 'Complete',
      name: 'Review A',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
      sourceCreatedAt: new Date('2025-02-01'),
    });
    await MonitoringReviewGrantee.bulkCreate([
      granteeRow(grantNumberA1, reviewIdA, granteeIdA1),
      granteeRow(grantNumberA2, reviewIdA, granteeIdA2),
    ]);

    await MonitoringFindingLink.findOrCreate({ where: { findingId: findingIdA }, defaults: linkTimestamps });
    await MonitoringFinding.create({
      findingId: findingIdA,
      statusId: FINDING_STATUS_ACTIVE_ID,
      findingType: 'Deficiency',
      source: 'FA-1',
      name: 'Finding A',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
    });
    await MonitoringFindingHistory.create({
      reviewId: reviewIdA,
      findingHistoryId: uuidv4(),
      findingId: findingIdA,
      statusId: FINDING_STATUS_ACTIVE_ID,
      narrative: 'Narrative for finding A',
      ordinal: 1,
      determination: 'Deficiency',
      name: 'History A',
      ...timestamps,
    });
    await MonitoringFindingStandard.create({
      findingId: findingIdA, standardId: STANDARD_ID_1, name: 'Standard A', ...timestamps,
    });
    // Link finding to BOTH grants via separate grantee IDs
    await MonitoringFindingGrant.bulkCreate([
      {
        findingId: findingIdA, granteeId: granteeIdA1, statusId: FINDING_STATUS_ACTIVE_ID, findingType: 'Deficiency', hash: `hash-${uuidv4()}`, ...timestamps,
      },
      {
        findingId: findingIdA, granteeId: granteeIdA2, statusId: FINDING_STATUS_ACTIVE_ID, findingType: 'Deficiency', hash: `hash-${uuidv4()}`, ...timestamps,
      },
    ]);

    // Source-deleted finding on the same review — must be excluded from Citations
    await MonitoringFindingLink.findOrCreate({ where: { findingId: findingIdADeleted }, defaults: linkTimestamps });
    await MonitoringFinding.create({
      findingId: findingIdADeleted,
      statusId: FINDING_STATUS_ACTIVE_ID,
      findingType: 'Deficiency',
      source: 'FA-1',
      name: 'Finding A (deleted)',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
      sourceDeletedAt: new Date(),
    });
    await MonitoringFindingHistory.create({
      reviewId: reviewIdA,
      findingHistoryId: uuidv4(),
      findingId: findingIdADeleted,
      statusId: FINDING_STATUS_ACTIVE_ID,
      narrative: 'Narrative for source-deleted finding A',
      ordinal: 2,
      determination: 'Deficiency',
      name: 'History A (deleted)',
      ...timestamps,
    });
    await MonitoringFindingStandard.create({
      findingId: findingIdADeleted, standardId: STANDARD_ID_1, name: 'Standard A (deleted)', ...timestamps,
    });
    await MonitoringFindingGrant.create({
      findingId: findingIdADeleted, granteeId: granteeIdA1, statusId: FINDING_STATUS_ACTIVE_ID, findingType: 'Deficiency', hash: `hash-${uuidv4()}`, ...timestamps,
    });

    // Finding whose only MonitoringFindingStandard is source-deleted — must be excluded from Citations
    await MonitoringFindingLink.findOrCreate({ where: { findingId: findingIdADeletedStandard }, defaults: linkTimestamps });
    await MonitoringFinding.create({
      findingId: findingIdADeletedStandard,
      statusId: FINDING_STATUS_ACTIVE_ID,
      findingType: 'Deficiency',
      source: 'FA-1',
      name: 'Finding A (deleted standard)',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
    });
    await MonitoringFindingHistory.create({
      reviewId: reviewIdA,
      findingHistoryId: uuidv4(),
      findingId: findingIdADeletedStandard,
      statusId: FINDING_STATUS_ACTIVE_ID,
      narrative: 'Narrative for finding with deleted standard',
      ordinal: 3,
      determination: 'Deficiency',
      name: 'History A (deleted standard)',
      ...timestamps,
    });
    await MonitoringFindingStandard.create({
      findingId: findingIdADeletedStandard,
      standardId: STANDARD_ID_1,
      name: 'Standard A (deleted standard)',
      ...timestamps,
      sourceDeletedAt: new Date(),
    });
    await MonitoringFindingGrant.create({
      findingId: findingIdADeletedStandard, granteeId: granteeIdA1, statusId: FINDING_STATUS_ACTIVE_ID, findingType: 'Deficiency', hash: `hash-${uuidv4()}`, ...timestamps,
    });

    // =====================================================
    // Scenario B: Corrected finding, two delivered reviews
    // =====================================================
    await MonitoringReviewLink.findOrCreate({ where: { reviewId: reviewIdB1 }, defaults: linkTimestamps });
    await MonitoringReview.create({
      reviewId: reviewIdB1,
      contentId: uuidv4(),
      statusId: REVIEW_STATUS_COMPLETE_ID,
      startDate: '2025-02-01',
      endDate: '2025-02-10',
      reviewType: 'FA-1',
      reportDeliveryDate: '2025-02-15',
      outcome: 'Complete',
      name: 'Review B1 (initial)',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
      sourceCreatedAt: new Date('2025-02-01'),
    });
    await MonitoringReviewLink.findOrCreate({ where: { reviewId: reviewIdB2 }, defaults: linkTimestamps });
    await MonitoringReview.create({
      reviewId: reviewIdB2,
      contentId: uuidv4(),
      statusId: REVIEW_STATUS_COMPLETE_ID,
      startDate: '2025-03-15',
      endDate: '2025-03-20',
      reviewType: 'Follow-up',
      reportDeliveryDate: '2025-04-01',
      outcome: 'Complete',
      name: 'Review B2 (latest)',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
      sourceCreatedAt: new Date('2025-03-15'),
    });
    await MonitoringReviewGrantee.bulkCreate([
      granteeRow(grantNumberB, reviewIdB1, granteeIdB),
      granteeRow(grantNumberB, reviewIdB2, granteeIdB),
    ]);

    await MonitoringFindingLink.findOrCreate({ where: { findingId: findingIdB }, defaults: linkTimestamps });
    await MonitoringFinding.create({
      findingId: findingIdB,
      statusId: FINDING_STATUS_CORRECTED_ID,
      findingType: 'Deficiency',
      source: 'FA-1',
      name: 'Finding B',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
    });
    await MonitoringFindingHistory.bulkCreate([
      {
        reviewId: reviewIdB1, findingHistoryId: uuidv4(), findingId: findingIdB, statusId: FINDING_STATUS_ACTIVE_ID, narrative: 'Initial narrative for B', ordinal: 1, determination: 'Deficiency', name: 'History B1', ...timestamps,
      },
      {
        reviewId: reviewIdB2, findingHistoryId: uuidv4(), findingId: findingIdB, statusId: FINDING_STATUS_CORRECTED_ID, narrative: 'Latest narrative for B', ordinal: 2, determination: 'Deficiency', name: 'History B2', ...timestamps,
      },
    ]);
    await MonitoringFindingStandard.create({
      findingId: findingIdB, standardId: STANDARD_ID_2, name: 'Standard B', ...timestamps,
    });
    await MonitoringFindingGrant.create({
      findingId: findingIdB, granteeId: granteeIdB, statusId: FINDING_STATUS_CORRECTED_ID, findingType: 'Deficiency', hash: `hash-${uuidv4()}`, ...timestamps,
    });

    // =====================================================
    // Scenario C: AOC closed by monitoring goal
    // =====================================================
    await MonitoringReviewLink.findOrCreate({ where: { reviewId: reviewIdC }, defaults: linkTimestamps });
    await MonitoringReview.create({
      reviewId: reviewIdC,
      contentId: uuidv4(),
      statusId: REVIEW_STATUS_COMPLETE_ID,
      startDate: '2025-02-01',
      endDate: '2025-02-15',
      reviewType: 'FA-2',
      reportDeliveryDate: '2025-03-15',
      outcome: 'Complete',
      name: 'Review C',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
      sourceCreatedAt: new Date('2025-02-01'),
    });
    await MonitoringReviewGrantee.create(
      granteeRow(grantNumberC, reviewIdC, granteeIdC),
    );

    await MonitoringFindingLink.findOrCreate({ where: { findingId: findingIdC }, defaults: linkTimestamps });
    await MonitoringFinding.create({
      findingId: findingIdC,
      statusId: FINDING_STATUS_ACTIVE_ID,
      findingType: 'Area of Concern',
      source: 'FA-2',
      name: 'Finding C',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
    });
    await MonitoringFindingHistory.create({
      reviewId: reviewIdC,
      findingHistoryId: uuidv4(),
      findingId: findingIdC,
      statusId: FINDING_STATUS_ACTIVE_ID,
      narrative: 'Narrative for AOC finding C',
      ordinal: 1,
      determination: 'Concern', // mapped to 'Area of Concern' by the SQL
      name: 'History C',
      ...timestamps,
    });
    await MonitoringFindingStandard.create({
      findingId: findingIdC, standardId: STANDARD_ID_1, name: 'Standard C', ...timestamps,
    });
    await MonitoringFindingGrant.create({
      findingId: findingIdC, granteeId: granteeIdC, statusId: FINDING_STATUS_ACTIVE_ID, findingType: 'Area of Concern', hash: `hash-${uuidv4()}`, ...timestamps,
    });

    // Goal on grant C with Monitoring template, closed after review delivery
    const goalTemplate = await GoalTemplate.findOne({ where: { standard: 'Monitoring' }, paranoid: false });
    const goalC = await Goal.create({
      id: faker.datatype.number({ min: 90000 }),
      name: goalTemplate.templateName,
      grantId: grantIdC,
      goalTemplateId: goalTemplate.id,
      status: 'Not Started',
    });
    await GoalStatusChange.create({
      goalId: goalC.id,
      oldStatus: 'Not Started',
      newStatus: 'Closed',
      reason: 'Test: goal closed after review delivery',
      context: 'Test',
      performedAt: goalClosureDate,
    });

    // =====================================================
    // Scenario D: Undelivered current review forces Active
    // =====================================================
    await MonitoringReviewLink.findOrCreate({ where: { reviewId: reviewIdD1 }, defaults: linkTimestamps });
    await MonitoringReview.create({
      reviewId: reviewIdD1,
      contentId: uuidv4(),
      statusId: REVIEW_STATUS_COMPLETE_ID,
      startDate: '2025-02-01',
      endDate: '2025-02-10',
      reviewType: 'FA-1',
      reportDeliveryDate: '2025-03-01',
      outcome: 'Complete',
      name: 'Review D1 (delivered)',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
      sourceCreatedAt: new Date('2025-02-01'),
    });
    await MonitoringReviewLink.findOrCreate({ where: { reviewId: reviewIdD2 }, defaults: linkTimestamps });
    await MonitoringReview.create({
      reviewId: reviewIdD2,
      contentId: uuidv4(),
      statusId: REVIEW_STATUS_COMPLETE_ID,
      startDate: '2025-04-01',
      endDate: '2025-04-10',
      reviewType: 'Follow-up',
      reportDeliveryDate: null,
      outcome: null,
      name: 'Review D2 (undelivered)',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
      sourceCreatedAt: new Date('2025-04-01'),
    });
    await MonitoringReviewGrantee.bulkCreate([
      granteeRow(grantNumberD, reviewIdD1, granteeIdD),
      granteeRow(grantNumberD, reviewIdD2, granteeIdD),
    ]);

    await MonitoringFindingLink.findOrCreate({ where: { findingId: findingIdD }, defaults: linkTimestamps });
    await MonitoringFinding.create({
      findingId: findingIdD,
      statusId: FINDING_STATUS_CORRECTED_ID,
      findingType: 'Deficiency',
      source: 'FA-1',
      name: 'Finding D',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
    });
    await MonitoringFindingHistory.bulkCreate([
      {
        reviewId: reviewIdD1, findingHistoryId: uuidv4(), findingId: findingIdD, statusId: FINDING_STATUS_ACTIVE_ID, narrative: 'Narrative for finding D initial', ordinal: 1, determination: 'Deficiency', name: 'History D1', ...timestamps,
      },
      {
        reviewId: reviewIdD2, findingHistoryId: uuidv4(), findingId: findingIdD, statusId: FINDING_STATUS_CORRECTED_ID, narrative: 'Narrative for finding D followup', ordinal: 2, determination: 'Deficiency', name: 'History D2', ...timestamps,
      },
    ]);
    await MonitoringFindingStandard.create({
      findingId: findingIdD, standardId: STANDARD_ID_1, name: 'Standard D', ...timestamps,
    });
    await MonitoringFindingGrant.create({
      findingId: findingIdD, granteeId: granteeIdD, statusId: FINDING_STATUS_CORRECTED_ID, findingType: 'Deficiency', hash: `hash-${uuidv4()}`, ...timestamps,
    });

    // --- Run the update ---
    await updateMonitoringFactTables();
  }, 60000);

  afterAll(async () => {
    // Clean fact tables (junction tables cascade-delete via FK).
    await Citation.destroy({ where: {}, force: true, individualHooks: false });
    await DeliveredReview.destroy({ where: {}, force: true, individualHooks: false });

    const allFindingIds = [findingIdA, findingIdADeleted, findingIdADeletedStandard, findingIdB, findingIdC, findingIdD];
    const allReviewIds = [reviewIdA, reviewIdB1, reviewIdB2, reviewIdC, reviewIdD1, reviewIdD2];
    const allGrantIds = [grantIdA1, grantIdA2, grantIdB, grantIdC, grantIdD];
    const allRecipientIds = [recipientIdA, recipientIdB, recipientIdC, recipientIdD];
    const allGrantNumbers = [grantNumberA1, grantNumberA2, grantNumberB, grantNumberC, grantNumberD];

    // Monitoring source data (children before parents)
    await MonitoringFindingGrant.destroy({ where: { findingId: allFindingIds }, force: true });
    await MonitoringFindingStandard.destroy({ where: { findingId: allFindingIds }, force: true });
    await MonitoringFindingHistory.destroy({ where: { findingId: allFindingIds }, force: true });
    await MonitoringFinding.destroy({ where: { findingId: allFindingIds }, force: true });
    await MonitoringReviewGrantee.destroy({ where: { reviewId: allReviewIds }, force: true });
    await MonitoringReview.destroy({ where: { reviewId: allReviewIds }, force: true });
    await GoalStatusChange.destroy({ where: {}, force: true, individualHooks: false });
    await Goal.destroy({ where: { grantId: allGrantIds }, force: true, individualHooks: false });
    await GrantNumberLink.destroy({ where: { grantNumber: allGrantNumbers }, force: true });
    await Grant.unscoped().destroy({ where: { id: allGrantIds }, force: true, individualHooks: false });
    await Recipient.unscoped().destroy({ where: { id: allRecipientIds }, force: true });
  });

  // =====================
  // Scenario A
  // =====================
  describe('Scenario A: active deficiency with two grants', () => {
    it('creates exactly one DeliveredReview (no duplication across grants)', async () => {
      const reviews = await DeliveredReview.findAll({ where: { review_uuid: reviewIdA } });
      expect(reviews).toHaveLength(1);

      const review = reviews[0];
      expect(review.review_type).toBe('FA-1');
      expect(review.review_status).toBe('Complete');
      expect(review.report_delivery_date).toBe('2025-03-01');
      expect(review.report_end_date).toBe('2025-02-15');
      expect(review.outcome).toBe('Complete');
    });

    it('creates exactly one Citation (no duplication across grants)', async () => {
      const citations = await Citation.findAll({ where: { finding_uuid: findingIdA } });
      expect(citations).toHaveLength(1);

      const citation = citations[0];
      expect(citation.raw_status).toBe('Active');
      expect(citation.calculated_status).toBe('Active');
      expect(citation.active).toBe(true);
      expect(citation.last_review_delivered).toBe(true);
      expect(citation.raw_finding_type).toBe('Deficiency');
      expect(citation.calculated_finding_type).toBe('Deficiency');
      expect(citation.citation).toBe('1302.47(b)(5)(iv)');
      expect(citation.standard_text).toBe('Standard text for testing');
      expect(citation.guidance_category).toBe('Fiscal');
      expect(citation.source_category).toBe('FA-1');
    });

    it('marks the review as complete but not corrected (finding still active)', async () => {
      const review = await DeliveredReview.findOne({ where: { review_uuid: reviewIdA } });
      expect(review.complete).toBe(true);
      expect(review.corrected).toBe(false);
    });

    it('creates two GrantDeliveredReview entries with recipient/region data', async () => {
      const review = await DeliveredReview.findOne({ where: { review_uuid: reviewIdA } });
      const junctions = await GrantDeliveredReview.findAll({
        where: { deliveredReviewId: review.id },
      });
      expect(junctions).toHaveLength(2);
      const grantIds = junctions.map((j) => j.grantId).sort();
      expect(grantIds).toEqual([grantIdA1, grantIdA2].sort());
      junctions.forEach((j) => {
        expect(j.recipient_id).toBe(recipientIdA);
        expect(j.recipient_name).toMatch(/^Recipient A /);
        expect(j.region_id).toBe(1);
      });
    });

    it('creates one DeliveredReviewCitation entry', async () => {
      const review = await DeliveredReview.findOne({ where: { review_uuid: reviewIdA } });
      const citation = await Citation.findOne({ where: { finding_uuid: findingIdA } });
      const junctions = await DeliveredReviewCitation.findAll({
        where: { deliveredReviewId: review.id, citationId: citation.id },
      });
      expect(junctions).toHaveLength(1);
    });

    it('creates two GrantCitation entries with recipient/region data', async () => {
      const citation = await Citation.findOne({ where: { finding_uuid: findingIdA } });
      const junctions = await GrantCitation.findAll({
        where: { citationId: citation.id },
      });
      expect(junctions).toHaveLength(2);
      const grantIds = junctions.map((j) => j.grantId).sort();
      expect(grantIds).toEqual([grantIdA1, grantIdA2].sort());
      junctions.forEach((j) => {
        expect(j.recipient_id).toBe(recipientIdA);
        expect(j.recipient_name).toMatch(/^Recipient A /);
        expect(j.region_id).toBe(1);
      });
    });

    it('excludes source-deleted findings from Citations', async () => {
      const citation = await Citation.findOne({ where: { finding_uuid: findingIdADeleted } });
      expect(citation).toBeNull();
    });

    it('excludes findings whose only MonitoringFindingStandard is source-deleted', async () => {
      const citation = await Citation.findOne({ where: { finding_uuid: findingIdADeletedStandard } });
      expect(citation).toBeNull();
    });
  });

  // =====================
  // Scenario B
  // =====================
  describe('Scenario B: corrected finding with two reviews', () => {
    it('creates a Citation with corrected status', async () => {
      const citation = await Citation.findOne({ where: { finding_uuid: findingIdB } });
      expect(citation).not.toBeNull();
      expect(citation.raw_status).toBe('Corrected');
      expect(citation.calculated_status).toBe('Corrected');
      expect(citation.active).toBe(false);
      expect(citation.last_review_delivered).toBe(true);
      expect(citation.citation).toBe('1302.90(c)(1)');
    });

    it('distinguishes initial and latest review', async () => {
      const citation = await Citation.findOne({ where: { finding_uuid: findingIdB } });
      expect(citation.initial_review_uuid).toBe(reviewIdB1);
      expect(citation.initial_narrative).toBe('Initial narrative for B');
      expect(citation.initial_report_delivery_date).toBe('2025-02-15');
      expect(citation.latest_review_uuid).toBe(reviewIdB2);
      expect(citation.latest_narrative).toBe('Latest narrative for B');
      expect(citation.latest_report_delivery_date).toBe('2025-04-01');
    });

    it('marks both reviews as complete and corrected', async () => {
      const reviewB1 = await DeliveredReview.findOne({ where: { review_uuid: reviewIdB1 } });
      const reviewB2 = await DeliveredReview.findOne({ where: { review_uuid: reviewIdB2 } });

      expect(reviewB1.report_end_date).toBe('2025-02-10');
      expect(reviewB1.outcome).toBe('Complete');
      expect(reviewB1.complete).toBe(true);
      expect(reviewB1.corrected).toBe(true);
      expect(reviewB2.report_end_date).toBe('2025-03-20');
      expect(reviewB2.outcome).toBe('Complete');
      expect(reviewB2.complete).toBe(true);
      expect(reviewB2.corrected).toBe(true);
    });

    it('sets active_through to latest report delivery date', async () => {
      const citation = await Citation.findOne({ where: { finding_uuid: findingIdB } });
      expect(citation.active_through).toBe('2025-04-01');
    });

    it('creates two DeliveredReviewCitation entries (one per review)', async () => {
      const citation = await Citation.findOne({ where: { finding_uuid: findingIdB } });
      const junctions = await DeliveredReviewCitation.findAll({
        where: { citationId: citation.id },
      });
      expect(junctions).toHaveLength(2);
    });

    it('creates two GrantDeliveredReview entries (one grant × two reviews)', async () => {
      const reviewB1 = await DeliveredReview.findOne({ where: { review_uuid: reviewIdB1 } });
      const reviewB2 = await DeliveredReview.findOne({ where: { review_uuid: reviewIdB2 } });
      const junctions = await GrantDeliveredReview.findAll({
        where: { grantId: grantIdB },
      });
      expect(junctions).toHaveLength(2);
      const drIds = junctions.map((j) => j.deliveredReviewId).sort();
      expect(drIds).toEqual([reviewB1.id, reviewB2.id].sort());
    });

    it('creates one GrantCitation entry (one grant × one citation)', async () => {
      const citation = await Citation.findOne({ where: { finding_uuid: findingIdB } });
      const junctions = await GrantCitation.findAll({
        where: { grantId: grantIdB, citationId: citation.id },
      });
      expect(junctions).toHaveLength(1);
    });
  });

  // =====================
  // Scenario C
  // =====================
  describe('Scenario C: AOC closed by monitoring goal', () => {
    it('sets calculated_status to Closed and calculated_finding_type to Area of Concern', async () => {
      const citation = await Citation.findOne({ where: { finding_uuid: findingIdC } });
      expect(citation).not.toBeNull();
      expect(citation.calculated_finding_type).toBe('Area of Concern');
      expect(citation.calculated_status).toBe('Closed');
      expect(citation.active).toBe(false);
    });

    it('sets active_through to goal closure date', async () => {
      const citation = await Citation.findOne({ where: { finding_uuid: findingIdC } });
      // goalClosureDate is 2025-05-01T12:00:00Z → 2025-05-01 in Eastern time
      expect(citation.active_through).toBe('2025-05-01');
    });
  });

  // =====================
  // Scenario D
  // =====================
  describe('Scenario D: undelivered current review', () => {
    it('overrides calculated_status to Active despite Corrected raw status', async () => {
      const citation = await Citation.findOne({ where: { finding_uuid: findingIdD } });
      expect(citation).not.toBeNull();
      expect(citation.raw_status).toBe('Corrected');
      expect(citation.calculated_status).toBe('Active');
      expect(citation.active).toBe(true);
      expect(citation.last_review_delivered).toBe(false);
    });

    it('only includes the delivered review in DeliveredReviews', async () => {
      const deliveredD1 = await DeliveredReview.findOne({ where: { review_uuid: reviewIdD1 } });
      const deliveredD2 = await DeliveredReview.findOne({ where: { review_uuid: reviewIdD2 } });

      expect(deliveredD1).not.toBeNull();
      expect(deliveredD2).toBeNull();
    });

    it('marks the delivered review as incomplete (finding has undelivered followup)', async () => {
      const review = await DeliveredReview.findOne({ where: { review_uuid: reviewIdD1 } });
      expect(review.report_end_date).toBe('2025-02-10');
      expect(review.outcome).toBe('Complete');
      expect(review.complete).toBe(false);
      expect(review.corrected).toBe(false);
    });
  });

  // =====================
  // Idempotency
  // =====================
  describe('idempotency', () => {
    it('produces the same results on a second run', async () => {
      const countsBefore = await Promise.all([
        DeliveredReview.count(),
        Citation.count(),
        DeliveredReviewCitation.count(),
        GrantDeliveredReview.count(),
        GrantCitation.count(),
      ]);

      await updateMonitoringFactTables();

      const countsAfter = await Promise.all([
        DeliveredReview.count(),
        Citation.count(),
        DeliveredReviewCitation.count(),
        GrantDeliveredReview.count(),
        GrantCitation.count(),
      ]);

      expect(countsAfter).toEqual(countsBefore);
    }, 30000);
  });

  // =====================
  // Soft delete
  // =====================
  describe('soft delete', () => {
    it('soft-deletes a DeliveredReview when source data is removed', async () => {
      const reviewBefore = await DeliveredReview.findOne({ where: { review_uuid: reviewIdA } });
      expect(reviewBefore).not.toBeNull();
      expect(reviewBefore.deletedAt).toBeNull();

      // Remove the source MonitoringReview
      await MonitoringReview.destroy({ where: { reviewId: reviewIdA }, force: true });

      await updateMonitoringFactTables();

      // The fact table row should now be soft-deleted
      const reviewAfter = await DeliveredReview.findOne({
        where: { review_uuid: reviewIdA },
        paranoid: false,
      });
      expect(reviewAfter).not.toBeNull();
      expect(reviewAfter.deletedAt).not.toBeNull();
    }, 30000);
  });
});
