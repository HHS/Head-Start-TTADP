/* eslint-disable max-len */
import faker from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import {
  Citation,
  DeliveredReview,
  DeliveredReviewCitation,
  FindingCategory,
  Goal,
  GoalStatusChange,
  GoalTemplate,
  Grant,
  GrantCitation,
  GrantDeliveredReview,
  GrantNumberLink,
  GrantRelationshipToActive,
  MonitoringClassSummary,
  MonitoringFinding,
  MonitoringFindingGrant,
  MonitoringFindingHistory,
  MonitoringFindingHistoryStatusLink,
  MonitoringFindingLink,
  MonitoringFindingStandard,
  MonitoringFindingStatus,
  MonitoringFindingStatusLink,
  MonitoringGranteeLink,
  MonitoringReview,
  MonitoringReviewGrantee,
  MonitoringReviewLink,
  MonitoringReviewStatus,
  MonitoringReviewStatusLink,
  MonitoringStandard,
  MonitoringStandardLink,
  Recipient,
} from '../models';
import updateMonitoringFactTables from './updateMonitoringFactTables';

jest.mock('../logger');

// Shared status IDs (high numbers to avoid seed conflicts)
const REVIEW_STATUS_COMPLETE_ID = 80001;
const FINDING_STATUS_ACTIVE_ID = 80002;
const FINDING_STATUS_CORRECTED_ID = 80003;
const FINDING_STATUS_ELEVATED_DEFICIENCY_ID = 80004;
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
  // Scenario E: CLASS review with scores, no findings
  // ----------------------------------------------------------
  const recipientIdE = faker.datatype.number({ min: 70000 });
  const grantIdE = faker.datatype.number({ min: 70000 });
  const grantNumberE = `UFT-${uuidv4().slice(0, 8)}`;
  const reviewIdE = uuidv4();
  const granteeIdE = uuidv4();
  const classEs = 5.1234;
  const classCo = 4.5678;
  const classIs = 3.2109;

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

  // ----------------------------------------------------------
  // Scenario F: Elevated Deficiency + Compliant outcome → Corrected
  // ----------------------------------------------------------
  const recipientIdF = faker.datatype.number({ min: 70000 });
  const grantIdF = faker.datatype.number({ min: 70000 });
  const grantNumberF = `UFT-${uuidv4().slice(0, 8)}`;
  const reviewIdF = uuidv4();
  const granteeIdF = uuidv4();
  const findingIdF = uuidv4();

  // ----------------------------------------------------------
  // Scenario G: Elevated Deficiency + Compliant but undelivered → Active
  // ----------------------------------------------------------
  const recipientIdG = faker.datatype.number({ min: 70000 });
  const grantIdG = faker.datatype.number({ min: 70000 });
  const grantNumberG = `UFT-${uuidv4().slice(0, 8)}`;
  const reviewIdG1 = uuidv4();
  const reviewIdG2 = uuidv4();
  const granteeIdG = uuidv4();
  const findingIdG = uuidv4();

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

    await MonitoringFindingStatusLink.findOrCreate({
      where: { statusId: FINDING_STATUS_ELEVATED_DEFICIENCY_ID },
      defaults: linkTimestamps,
    });
    await MonitoringFindingStatus.findOrCreate({
      where: { statusId: FINDING_STATUS_ELEVATED_DEFICIENCY_ID },
      defaults: {
        statusId: FINDING_STATUS_ELEVATED_DEFICIENCY_ID,
        name: 'Elevated Deficiency',
        ...timestamps,
      },
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
      { id: recipientIdE, name: `Recipient E ${uuidv4().slice(0, 6)}` },
      { id: recipientIdF, name: `Recipient F ${uuidv4().slice(0, 6)}` },
      { id: recipientIdG, name: `Recipient G ${uuidv4().slice(0, 6)}` },
    ]);

    // --- Grants ---
    const grantDefaults = {
      status: 'Active',
      startDate: new Date(),
      endDate: new Date('2030-01-01'),
    };
    await Grant.bulkCreate([
      {
        id: grantIdA1,
        number: grantNumberA1,
        recipientId: recipientIdA,
        regionId: 1,
        ...grantDefaults,
      },
      {
        id: grantIdA2,
        number: grantNumberA2,
        recipientId: recipientIdA,
        regionId: 1,
        ...grantDefaults,
      },
      {
        id: grantIdB,
        number: grantNumberB,
        recipientId: recipientIdB,
        regionId: 2,
        ...grantDefaults,
      },
      {
        id: grantIdC,
        number: grantNumberC,
        recipientId: recipientIdC,
        regionId: 3,
        ...grantDefaults,
      },
      {
        id: grantIdD,
        number: grantNumberD,
        recipientId: recipientIdD,
        regionId: 4,
        ...grantDefaults,
      },
      {
        id: grantIdE,
        number: grantNumberE,
        recipientId: recipientIdE,
        regionId: 5,
        ...grantDefaults,
      },
      {
        id: grantIdF,
        number: grantNumberF,
        recipientId: recipientIdF,
        regionId: 6,
        ...grantDefaults,
      },
      {
        id: grantIdG,
        number: grantNumberG,
        recipientId: recipientIdG,
        regionId: 7,
        ...grantDefaults,
      },
    ]);

    // Grant hooks don't fire during bulkCreate, so create link table entries manually.
    // These satisfy FK constraints on MonitoringReviewGrantees, MonitoringFindingGrant, etc.
    await Promise.all([
      GrantNumberLink.findOrCreate({
        where: { grantNumber: grantNumberA1 },
        defaults: { grantId: grantIdA1 },
      }),
      GrantNumberLink.findOrCreate({
        where: { grantNumber: grantNumberA2 },
        defaults: { grantId: grantIdA2 },
      }),
      GrantNumberLink.findOrCreate({
        where: { grantNumber: grantNumberB },
        defaults: { grantId: grantIdB },
      }),
      GrantNumberLink.findOrCreate({
        where: { grantNumber: grantNumberC },
        defaults: { grantId: grantIdC },
      }),
      GrantNumberLink.findOrCreate({
        where: { grantNumber: grantNumberD },
        defaults: { grantId: grantIdD },
      }),
      GrantNumberLink.findOrCreate({
        where: { grantNumber: grantNumberE },
        defaults: { grantId: grantIdE },
      }),
      MonitoringGranteeLink.findOrCreate({ where: { granteeId: granteeIdA1 } }),
      MonitoringGranteeLink.findOrCreate({ where: { granteeId: granteeIdA2 } }),
      MonitoringGranteeLink.findOrCreate({ where: { granteeId: granteeIdB } }),
      MonitoringGranteeLink.findOrCreate({ where: { granteeId: granteeIdC } }),
      MonitoringGranteeLink.findOrCreate({ where: { granteeId: granteeIdD } }),
      MonitoringGranteeLink.findOrCreate({ where: { granteeId: granteeIdE } }),
      GrantNumberLink.findOrCreate({
        where: { grantNumber: grantNumberF },
        defaults: { grantId: grantIdF },
      }),
      GrantNumberLink.findOrCreate({
        where: { grantNumber: grantNumberG },
        defaults: { grantId: grantIdG },
      }),
      MonitoringGranteeLink.findOrCreate({ where: { granteeId: granteeIdF } }),
      MonitoringGranteeLink.findOrCreate({ where: { granteeId: granteeIdG } }),
      MonitoringFindingHistoryStatusLink.findOrCreate({
        where: { statusId: FINDING_STATUS_ACTIVE_ID },
      }),
      MonitoringFindingHistoryStatusLink.findOrCreate({
        where: { statusId: FINDING_STATUS_CORRECTED_ID },
      }),
      MonitoringFindingHistoryStatusLink.findOrCreate({
        where: { statusId: FINDING_STATUS_ELEVATED_DEFICIENCY_ID },
      }),
    ]);

    await GrantRelationshipToActive.refresh();

    // =====================================================
    // Scenario A: Active Deficiency, two grants one review
    // =====================================================
    await MonitoringReviewLink.findOrCreate({
      where: { reviewId: reviewIdA },
      defaults: linkTimestamps,
    });
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

    await MonitoringFindingLink.findOrCreate({
      where: { findingId: findingIdA },
      defaults: linkTimestamps,
    });
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
      findingId: findingIdA,
      standardId: STANDARD_ID_1,
      name: 'Standard A',
      ...timestamps,
    });
    // Link finding to BOTH grants via separate grantee IDs
    await MonitoringFindingGrant.bulkCreate([
      {
        findingId: findingIdA,
        granteeId: granteeIdA1,
        statusId: FINDING_STATUS_ACTIVE_ID,
        findingType: 'Deficiency',
        hash: `hash-${uuidv4()}`,
        ...timestamps,
      },
      {
        findingId: findingIdA,
        granteeId: granteeIdA2,
        statusId: FINDING_STATUS_ACTIVE_ID,
        findingType: 'Deficiency',
        hash: `hash-${uuidv4()}`,
        ...timestamps,
      },
    ]);

    // Source-deleted finding on the same review — must be excluded from Citations
    await MonitoringFindingLink.findOrCreate({
      where: { findingId: findingIdADeleted },
      defaults: linkTimestamps,
    });
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
      findingId: findingIdADeleted,
      standardId: STANDARD_ID_1,
      name: 'Standard A (deleted)',
      ...timestamps,
    });
    await MonitoringFindingGrant.create({
      findingId: findingIdADeleted,
      granteeId: granteeIdA1,
      statusId: FINDING_STATUS_ACTIVE_ID,
      findingType: 'Deficiency',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
    });

    // Finding whose only MonitoringFindingStandard is source-deleted — must be excluded from Citations
    await MonitoringFindingLink.findOrCreate({
      where: { findingId: findingIdADeletedStandard },
      defaults: linkTimestamps,
    });
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
      findingId: findingIdADeletedStandard,
      granteeId: granteeIdA1,
      statusId: FINDING_STATUS_ACTIVE_ID,
      findingType: 'Deficiency',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
    });

    // =====================================================
    // Scenario B: Corrected finding, two delivered reviews
    // =====================================================
    await MonitoringReviewLink.findOrCreate({
      where: { reviewId: reviewIdB1 },
      defaults: linkTimestamps,
    });
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
    await MonitoringReviewLink.findOrCreate({
      where: { reviewId: reviewIdB2 },
      defaults: linkTimestamps,
    });
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

    await MonitoringFindingLink.findOrCreate({
      where: { findingId: findingIdB },
      defaults: linkTimestamps,
    });
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
        reviewId: reviewIdB1,
        findingHistoryId: uuidv4(),
        findingId: findingIdB,
        statusId: FINDING_STATUS_ACTIVE_ID,
        narrative: 'Initial narrative for B',
        ordinal: 1,
        determination: 'Deficiency',
        name: 'History B1',
        ...timestamps,
      },
      {
        reviewId: reviewIdB2,
        findingHistoryId: uuidv4(),
        findingId: findingIdB,
        statusId: FINDING_STATUS_CORRECTED_ID,
        narrative: 'Latest narrative for B',
        ordinal: 2,
        determination: 'Deficiency',
        name: 'History B2',
        ...timestamps,
      },
    ]);
    await MonitoringFindingStandard.create({
      findingId: findingIdB,
      standardId: STANDARD_ID_2,
      name: 'Standard B',
      ...timestamps,
    });
    await MonitoringFindingGrant.create({
      findingId: findingIdB,
      granteeId: granteeIdB,
      statusId: FINDING_STATUS_CORRECTED_ID,
      findingType: 'Deficiency',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
    });

    // =====================================================
    // Scenario C: AOC closed by monitoring goal
    // =====================================================
    await MonitoringReviewLink.findOrCreate({
      where: { reviewId: reviewIdC },
      defaults: linkTimestamps,
    });
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
    await MonitoringReviewGrantee.create(granteeRow(grantNumberC, reviewIdC, granteeIdC));

    await MonitoringFindingLink.findOrCreate({
      where: { findingId: findingIdC },
      defaults: linkTimestamps,
    });
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
      findingId: findingIdC,
      standardId: STANDARD_ID_1,
      name: 'Standard C',
      ...timestamps,
    });
    await MonitoringFindingGrant.create({
      findingId: findingIdC,
      granteeId: granteeIdC,
      statusId: FINDING_STATUS_ACTIVE_ID,
      findingType: 'Area of Concern',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
    });

    // Goal on grant C with Monitoring template, closed after review delivery
    const goalTemplate = await GoalTemplate.findOne({
      where: { standard: 'Monitoring' },
      paranoid: false,
    });
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
    await MonitoringReviewLink.findOrCreate({
      where: { reviewId: reviewIdD1 },
      defaults: linkTimestamps,
    });
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
    await MonitoringReviewLink.findOrCreate({
      where: { reviewId: reviewIdD2 },
      defaults: linkTimestamps,
    });
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

    await MonitoringFindingLink.findOrCreate({
      where: { findingId: findingIdD },
      defaults: linkTimestamps,
    });
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
        reviewId: reviewIdD1,
        findingHistoryId: uuidv4(),
        findingId: findingIdD,
        statusId: FINDING_STATUS_ACTIVE_ID,
        narrative: 'Narrative for finding D initial',
        ordinal: 1,
        determination: 'Deficiency',
        name: 'History D1',
        ...timestamps,
      },
      {
        reviewId: reviewIdD2,
        findingHistoryId: uuidv4(),
        findingId: findingIdD,
        statusId: FINDING_STATUS_CORRECTED_ID,
        narrative: 'Narrative for finding D followup',
        ordinal: 2,
        determination: 'Deficiency',
        name: 'History D2',
        ...timestamps,
      },
    ]);
    await MonitoringFindingStandard.create({
      findingId: findingIdD,
      standardId: STANDARD_ID_1,
      name: 'Standard D',
      ...timestamps,
    });
    await MonitoringFindingGrant.create({
      findingId: findingIdD,
      granteeId: granteeIdD,
      statusId: FINDING_STATUS_CORRECTED_ID,
      findingType: 'Deficiency',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
    });

    // =====================================================
    // Scenario E: CLASS review with scores, no findings
    // =====================================================
    await MonitoringReviewLink.findOrCreate({
      where: { reviewId: reviewIdE },
      defaults: linkTimestamps,
    });
    await MonitoringReview.create({
      reviewId: reviewIdE,
      contentId: uuidv4(),
      statusId: REVIEW_STATUS_COMPLETE_ID,
      startDate: '2025-03-01',
      endDate: '2025-03-05',
      reviewType: 'CLASS',
      reportDeliveryDate: '2025-04-01',
      outcome: 'Complete',
      name: 'Review E (CLASS)',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
      sourceCreatedAt: new Date('2025-03-01'),
    });
    await MonitoringReviewGrantee.create(granteeRow(grantNumberE, reviewIdE, granteeIdE));
    // MonitoringClassSummary beforeCreate hook syncs the link tables, so no manual
    // MonitoringReviewLink/GrantNumberLink setup needed here.
    await MonitoringClassSummary.create({
      reviewId: reviewIdE,
      grantNumber: grantNumberE,
      emotionalSupport: classEs,
      classroomOrganization: classCo,
      instructionalSupport: classIs,
      reportDeliveryDate: new Date('2025-04-01'),
      hash: `hash-${uuidv4()}`,
      ...timestamps,
    });

    // =====================================================
    // Scenario F: Elevated Deficiency + Compliant delivered → Corrected
    // =====================================================
    await MonitoringReviewLink.findOrCreate({
      where: { reviewId: reviewIdF },
      defaults: linkTimestamps,
    });
    await MonitoringReview.create({
      reviewId: reviewIdF,
      contentId: uuidv4(),
      statusId: REVIEW_STATUS_COMPLETE_ID,
      startDate: '2025-03-01',
      endDate: '2025-03-15',
      reviewType: 'RAN',
      reportDeliveryDate: '2025-04-15',
      outcome: 'Compliant',
      name: 'Review F (Compliant, delivered)',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
      sourceCreatedAt: new Date('2025-03-01'),
    });
    await MonitoringReviewGrantee.create(granteeRow(grantNumberF, reviewIdF, granteeIdF));

    await MonitoringFindingLink.findOrCreate({
      where: { findingId: findingIdF },
      defaults: linkTimestamps,
    });
    await MonitoringFinding.create({
      findingId: findingIdF,
      statusId: FINDING_STATUS_ELEVATED_DEFICIENCY_ID,
      findingType: 'Deficiency',
      source: 'RAN',
      name: 'Finding F',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
    });
    await MonitoringFindingHistory.create({
      reviewId: reviewIdF,
      findingHistoryId: uuidv4(),
      findingId: findingIdF,
      statusId: FINDING_STATUS_ELEVATED_DEFICIENCY_ID,
      narrative: 'Narrative for elevated deficiency F',
      ordinal: 1,
      determination: 'Deficiency',
      name: 'History F',
      ...timestamps,
    });
    await MonitoringFindingStandard.create({
      findingId: findingIdF,
      standardId: STANDARD_ID_1,
      name: 'Standard F',
      ...timestamps,
    });
    await MonitoringFindingGrant.create({
      findingId: findingIdF,
      granteeId: granteeIdF,
      statusId: FINDING_STATUS_ELEVATED_DEFICIENCY_ID,
      findingType: 'Deficiency',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
    });

    // =====================================================
    // Scenario G: Elevated Deficiency + Compliant but undelivered → Active
    // =====================================================
    await MonitoringReviewLink.findOrCreate({
      where: { reviewId: reviewIdG1 },
      defaults: linkTimestamps,
    });
    await MonitoringReview.create({
      reviewId: reviewIdG1,
      contentId: uuidv4(),
      statusId: REVIEW_STATUS_COMPLETE_ID,
      startDate: '2025-02-01',
      endDate: '2025-02-15',
      reviewType: 'RAN',
      reportDeliveryDate: '2025-03-01',
      outcome: 'Complete',
      name: 'Review G1 (delivered)',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
      sourceCreatedAt: new Date('2025-02-01'),
    });
    await MonitoringReviewLink.findOrCreate({
      where: { reviewId: reviewIdG2 },
      defaults: linkTimestamps,
    });
    await MonitoringReview.create({
      reviewId: reviewIdG2,
      contentId: uuidv4(),
      statusId: REVIEW_STATUS_COMPLETE_ID,
      startDate: '2025-04-01',
      endDate: '2025-04-15',
      reviewType: 'Follow-up',
      reportDeliveryDate: null,
      outcome: 'Compliant',
      name: 'Review G2 (Compliant, undelivered)',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
      sourceCreatedAt: new Date('2025-04-01'),
    });
    await MonitoringReviewGrantee.bulkCreate([
      granteeRow(grantNumberG, reviewIdG1, granteeIdG),
      granteeRow(grantNumberG, reviewIdG2, granteeIdG),
    ]);

    await MonitoringFindingLink.findOrCreate({
      where: { findingId: findingIdG },
      defaults: linkTimestamps,
    });
    await MonitoringFinding.create({
      findingId: findingIdG,
      statusId: FINDING_STATUS_ELEVATED_DEFICIENCY_ID,
      findingType: 'Deficiency',
      source: 'RAN',
      name: 'Finding G',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
    });
    await MonitoringFindingHistory.bulkCreate([
      {
        reviewId: reviewIdG1,
        findingHistoryId: uuidv4(),
        findingId: findingIdG,
        statusId: FINDING_STATUS_ELEVATED_DEFICIENCY_ID,
        narrative: 'Narrative for elevated deficiency G (initial)',
        ordinal: 1,
        determination: 'Deficiency',
        name: 'History G1',
        ...timestamps,
      },
      {
        reviewId: reviewIdG2,
        findingHistoryId: uuidv4(),
        findingId: findingIdG,
        statusId: FINDING_STATUS_ELEVATED_DEFICIENCY_ID,
        narrative: 'Narrative for elevated deficiency G (follow-up)',
        ordinal: 2,
        determination: 'Deficiency',
        name: 'History G2',
        ...timestamps,
      },
    ]);
    await MonitoringFindingStandard.create({
      findingId: findingIdG,
      standardId: STANDARD_ID_1,
      name: 'Standard G',
      ...timestamps,
    });
    await MonitoringFindingGrant.create({
      findingId: findingIdG,
      granteeId: granteeIdG,
      statusId: FINDING_STATUS_ELEVATED_DEFICIENCY_ID,
      findingType: 'Deficiency',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
    });

    // --- Run the update ---
    await updateMonitoringFactTables();
  }, 60000);

  afterAll(async () => {
    // Clean fact tables (junction tables cascade-delete via FK).
    await Citation.destroy({ where: {}, force: true, individualHooks: false });
    await FindingCategory.destroy({ where: {}, force: true, individualHooks: false });
    await DeliveredReview.destroy({ where: {}, force: true, individualHooks: false });

    const allFindingIds = [
      findingIdA,
      findingIdADeleted,
      findingIdADeletedStandard,
      findingIdB,
      findingIdC,
      findingIdD,
      findingIdF,
      findingIdG,
    ];
    const allReviewIds = [
      reviewIdA,
      reviewIdB1,
      reviewIdB2,
      reviewIdC,
      reviewIdD1,
      reviewIdD2,
      reviewIdE,
      reviewIdF,
      reviewIdG1,
      reviewIdG2,
    ];
    const allGrantIds = [
      grantIdA1,
      grantIdA2,
      grantIdB,
      grantIdC,
      grantIdD,
      grantIdE,
      grantIdF,
      grantIdG,
    ];
    const allRecipientIds = [
      recipientIdA,
      recipientIdB,
      recipientIdC,
      recipientIdD,
      recipientIdE,
      recipientIdF,
      recipientIdG,
    ];
    const allGrantNumbers = [
      grantNumberA1,
      grantNumberA2,
      grantNumberB,
      grantNumberC,
      grantNumberD,
      grantNumberE,
      grantNumberF,
      grantNumberG,
    ];

    // Monitoring source data (children before parents)
    await MonitoringFindingGrant.destroy({ where: { findingId: allFindingIds }, force: true });
    await MonitoringFindingStandard.destroy({ where: { findingId: allFindingIds }, force: true });
    await MonitoringFindingHistory.destroy({ where: { findingId: allFindingIds }, force: true });
    await MonitoringFinding.destroy({ where: { findingId: allFindingIds }, force: true });
    await MonitoringClassSummary.destroy({ where: { reviewId: reviewIdE }, force: true });
    await MonitoringReviewGrantee.destroy({ where: { reviewId: allReviewIds }, force: true });
    await MonitoringReview.destroy({ where: { reviewId: allReviewIds }, force: true });
    await GoalStatusChange.destroy({ where: {}, force: true, individualHooks: false });
    await Goal.destroy({ where: { grantId: allGrantIds }, force: true, individualHooks: false });
    await GrantNumberLink.destroy({ where: { grantNumber: allGrantNumbers }, force: true });
    await Grant.unscoped().destroy({
      where: { id: allGrantIds },
      force: true,
      individualHooks: false,
    });
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

    it('links the Citation to the correct Category row', async () => {
      const citation = await Citation.findOne({ where: { finding_uuid: findingIdA } });
      expect(citation.findingCategoryId).not.toBeNull();

      const category = await FindingCategory.findByPk(citation.findingCategoryId);
      expect(category).not.toBeNull();
      expect(category.name).toBe('Fiscal');
      expect(category.deletedAt).toBeNull();
    });

    it('marks the review as complete but not corrected (finding still active)', async () => {
      const review = await DeliveredReview.findOne({ where: { review_uuid: reviewIdA } });
      expect(review.complete).toBe(true);
      expect(review.corrected).toBe(false);
    });

    it('sets complete_date to the review delivery date even when the finding remains active', async () => {
      // Finding A is still Active after its final delivered review — previously this caused
      // active_through = 9999-12-31, which propagated into complete_date. complete_date should
      // reflect when the chain of reviews finished, not the finding's activity horizon.
      const review = await DeliveredReview.findOne({ where: { review_uuid: reviewIdA } });
      expect(review.complete_date).toBe('2025-03-01');
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
      const citation = await Citation.findOne({
        where: { finding_uuid: findingIdADeletedStandard },
      });
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

    it('links the Citation to a different Category than Scenario A', async () => {
      const citation = await Citation.findOne({ where: { finding_uuid: findingIdB } });
      expect(citation.findingCategoryId).not.toBeNull();

      const category = await FindingCategory.findByPk(citation.findingCategoryId);
      expect(category).not.toBeNull();
      expect(category.name).toBe('Health');

      const citationA = await Citation.findOne({ where: { finding_uuid: findingIdA } });
      expect(citation.findingCategoryId).not.toBe(citationA.findingCategoryId);
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

      expect(reviewB1.complete).toBe(true);
      expect(reviewB1.corrected).toBe(true);
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
      expect(review.complete).toBe(false);
      expect(review.corrected).toBe(false);
    });
  });

  // =====================
  // Scenario E
  // =====================
  describe('Scenario E: CLASS review with scores and no findings', () => {
    it('creates a DeliveredReview with review_type CLASS', async () => {
      const review = await DeliveredReview.findOne({ where: { review_uuid: reviewIdE } });
      expect(review).not.toBeNull();
      expect(review.review_type).toBe('CLASS');
      expect(review.report_delivery_date).toBe('2025-04-01');
    });

    it('populates CLASS scores from MonitoringClassSummaries', async () => {
      const review = await DeliveredReview.findOne({ where: { review_uuid: reviewIdE } });
      expect(parseFloat(review.class_es)).toBeCloseTo(classEs, 4);
      expect(parseFloat(review.class_co)).toBeCloseTo(classCo, 4);
      expect(parseFloat(review.class_is)).toBeCloseTo(classIs, 4);
    });

    it('leaves complete and corrected null (no findings to aggregate)', async () => {
      const review = await DeliveredReview.findOne({ where: { review_uuid: reviewIdE } });
      expect(review.complete).toBeNull();
      expect(review.corrected).toBeNull();
    });

    it('creates a GrantDeliveredReview entry', async () => {
      const review = await DeliveredReview.findOne({ where: { review_uuid: reviewIdE } });
      const junctions = await GrantDeliveredReview.findAll({
        where: { deliveredReviewId: review.id },
      });
      expect(junctions).toHaveLength(1);
      expect(junctions[0].grantId).toBe(grantIdE);
      expect(junctions[0].recipient_id).toBe(recipientIdE);
      expect(junctions[0].region_id).toBe(5);
    });

    it('creates no Citations for the grant', async () => {
      const review = await DeliveredReview.findOne({ where: { review_uuid: reviewIdE } });
      const drcs = await DeliveredReviewCitation.findAll({
        where: { deliveredReviewId: review.id },
      });
      expect(drcs).toHaveLength(0);

      const gcs = await GrantCitation.findAll({ where: { grantId: grantIdE } });
      expect(gcs).toHaveLength(0);
    });
  });

  // =====================
  // Scenario F
  // =====================
  describe('Scenario F: Elevated Deficiency with Compliant delivered review', () => {
    it('sets calculated_status to Corrected and active to false', async () => {
      const citation = await Citation.findOne({ where: { finding_uuid: findingIdF } });
      expect(citation).not.toBeNull();
      expect(citation.calculated_finding_type).toBe('Deficiency');
      expect(citation.calculated_status).toBe('Corrected');
      expect(citation.active).toBe(false);
      expect(citation.last_review_delivered).toBe(true);
    });

    it('sets active_through to the report delivery date', async () => {
      const citation = await Citation.findOne({ where: { finding_uuid: findingIdF } });
      expect(citation.active_through).toBe('2025-04-15');
    });
  });

  // =====================
  // Scenario G
  // =====================
  describe('Scenario G: Elevated Deficiency with Compliant but undelivered latest review', () => {
    it('keeps calculated_status Active when the latest review has no delivery date', async () => {
      const citation = await Citation.findOne({ where: { finding_uuid: findingIdG } });
      expect(citation).not.toBeNull();
      expect(citation.calculated_finding_type).toBe('Deficiency');
      expect(citation.calculated_status).toBe('Active');
      expect(citation.active).toBe(true);
      expect(citation.last_review_delivered).toBe(false);
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
        FindingCategory.count(),
        DeliveredReviewCitation.count(),
        GrantDeliveredReview.count(),
        GrantCitation.count(),
      ]);

      await updateMonitoringFactTables();

      const countsAfter = await Promise.all([
        DeliveredReview.count(),
        Citation.count(),
        FindingCategory.count(),
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
    it('soft-deletes a Category when no non-deleted Citation references its guidance_category', async () => {
      // Scenario B's finding (findingIdB) uses STANDARD_ID_2 → guidance: 'Health'
      // Temporarily source-delete the standard so findingIdB drops out of full_citations
      await MonitoringStandard.update(
        { sourceDeletedAt: new Date() },
        { where: { standardId: STANDARD_ID_2 } }
      );

      await updateMonitoringFactTables();

      const healthCategory = await FindingCategory.findOne({
        where: { name: 'Health' },
        paranoid: false,
      });
      expect(healthCategory).not.toBeNull();
      expect(healthCategory.deletedAt).not.toBeNull();

      // Restore the standard so subsequent tests aren't affected
      await MonitoringStandard.update(
        { sourceDeletedAt: null },
        { where: { standardId: STANDARD_ID_2 } }
      );
      await updateMonitoringFactTables();

      const healthCategoryRestored = await FindingCategory.findOne({ where: { name: 'Health' } });
      expect(healthCategoryRestored).not.toBeNull();
      expect(healthCategoryRestored.deletedAt).toBeNull();
    }, 60000);

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
