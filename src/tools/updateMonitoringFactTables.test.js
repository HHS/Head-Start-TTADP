/* eslint-disable max-len */
import faker from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import {
  ActivityReport,
  ActivityReportObjective,
  ActivityReportObjectiveCitation,
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
  Objective,
  Recipient,
  User,
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
  // Scenario F: Excluded finding type (Withdrawn) — must not produce any fact table rows
  // ----------------------------------------------------------
  const recipientIdF = faker.datatype.number({ min: 70000 });
  const grantIdF = faker.datatype.number({ min: 70000 });
  const grantNumberF = `UFT-${uuidv4().slice(0, 8)}`;
  const reviewIdF = uuidv4();
  const granteeIdF = uuidv4();
  const findingIdF = uuidv4();

  // ----------------------------------------------------------
  // Scenario G: last_tta computed from ActivityReport.endDate
  // ----------------------------------------------------------
  const userIdG = faker.datatype.number({ min: 70000 });
  const expectedLastTtaDate = '2026-01-15';

  // ----------------------------------------------------------
  // Scenario H: live-value views pick latest endDate; null & tie
  // ----------------------------------------------------------
  const userIdH = faker.datatype.number({ min: 70000 });

  // ----------------------------------------------------------
  // Scenario H: Elevated Deficiency + Compliant outcome → Corrected
  // ----------------------------------------------------------
  const recipientIdH = faker.datatype.number({ min: 70000 });
  const grantIdH = faker.datatype.number({ min: 70000 });
  const grantNumberH = `UFT-${uuidv4().slice(0, 8)}`;
  const reviewIdH = uuidv4();
  const granteeIdH = uuidv4();
  const findingIdH = uuidv4();

  // ----------------------------------------------------------
  // Scenario I: Elevated Deficiency + Compliant but undelivered → Active
  // ----------------------------------------------------------
  const recipientIdI = faker.datatype.number({ min: 70000 });
  const grantIdI = faker.datatype.number({ min: 70000 });
  const grantNumberI = `UFT-${uuidv4().slice(0, 8)}`;
  const reviewIdI1 = uuidv4();
  const reviewIdI2 = uuidv4();
  const granteeIdI = uuidv4();
  const findingIdI = uuidv4();

  // ----------------------------------------------------------
  // Scenario J: CLASS review delivered before the monitoring cutoff date
  // Must be included because MonitoringClassSummaries scores exist,
  // even though reportDeliveryDate and sourceCreatedAt predate 2025-01-21.
  // ----------------------------------------------------------
  const recipientIdJ = faker.datatype.number({ min: 70000 });
  const grantIdJ = faker.datatype.number({ min: 70000 });
  const grantNumberJ = `UFT-${uuidv4().slice(0, 8)}`;
  const reviewIdJ = uuidv4();
  const granteeIdJ = uuidv4();
  const classEsJ = 5.9688;
  const classCoJ = 5.1875;
  const classIsJ = 2.4167;

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
      { id: recipientIdH, name: `Recipient H ${uuidv4().slice(0, 6)}` },
      { id: recipientIdI, name: `Recipient I ${uuidv4().slice(0, 6)}` },
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
        id: grantIdH,
        number: grantNumberH,
        recipientId: recipientIdH,
        regionId: 8,
        ...grantDefaults,
      },
      {
        id: grantIdI,
        number: grantNumberI,
        recipientId: recipientIdI,
        regionId: 9,
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
      GrantNumberLink.findOrCreate({
        where: { grantNumber: grantNumberF },
        defaults: { grantId: grantIdF },
      }),
      MonitoringGranteeLink.findOrCreate({ where: { granteeId: granteeIdA1 } }),
      MonitoringGranteeLink.findOrCreate({ where: { granteeId: granteeIdA2 } }),
      MonitoringGranteeLink.findOrCreate({ where: { granteeId: granteeIdB } }),
      MonitoringGranteeLink.findOrCreate({ where: { granteeId: granteeIdC } }),
      MonitoringGranteeLink.findOrCreate({ where: { granteeId: granteeIdD } }),
      MonitoringGranteeLink.findOrCreate({ where: { granteeId: granteeIdE } }),
      MonitoringGranteeLink.findOrCreate({ where: { granteeId: granteeIdF } }),
      GrantNumberLink.findOrCreate({
        where: { grantNumber: grantNumberH },
        defaults: { grantId: grantIdH },
      }),
      GrantNumberLink.findOrCreate({
        where: { grantNumber: grantNumberI },
        defaults: { grantId: grantIdI },
      }),
      MonitoringGranteeLink.findOrCreate({ where: { granteeId: granteeIdH } }),
      MonitoringGranteeLink.findOrCreate({ where: { granteeId: granteeIdI } }),
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
    // Scenario F: Excluded finding type (Withdrawn)
    // =====================================================
    await MonitoringReviewLink.findOrCreate({
      where: { reviewId: reviewIdF },
      defaults: linkTimestamps,
    });
    await MonitoringReview.create({
      reviewId: reviewIdF,
      contentId: uuidv4(),
      statusId: REVIEW_STATUS_COMPLETE_ID,
      startDate: '2025-02-01',
      endDate: '2025-02-15',
      reviewType: 'FA-1',
      reportDeliveryDate: '2025-03-01',
      outcome: 'Complete',
      name: 'Review F',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
      sourceCreatedAt: new Date('2025-02-01'),
    });
    await MonitoringReviewGrantee.create(granteeRow(grantNumberF, reviewIdF, granteeIdF));

    await MonitoringFindingLink.findOrCreate({
      where: { findingId: findingIdF },
      defaults: linkTimestamps,
    });
    await MonitoringFinding.create({
      findingId: findingIdF,
      statusId: FINDING_STATUS_ACTIVE_ID,
      findingType: 'Withdrawn',
      source: 'FA-1',
      name: 'Finding F',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
    });
    await MonitoringFindingHistory.create({
      reviewId: reviewIdF,
      findingHistoryId: uuidv4(),
      findingId: findingIdF,
      statusId: FINDING_STATUS_ACTIVE_ID,
      narrative: 'Narrative for withdrawn finding F',
      ordinal: 1,
      determination: 'Withdrawn',
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
      statusId: FINDING_STATUS_ACTIVE_ID,
      findingType: 'Withdrawn',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
    });

    // =====================================================
    // Scenario H: Elevated Deficiency + Compliant delivered → Corrected
    // =====================================================
    await MonitoringReviewLink.findOrCreate({
      where: { reviewId: reviewIdH },
      defaults: linkTimestamps,
    });
    await MonitoringReview.create({
      reviewId: reviewIdH,
      contentId: uuidv4(),
      statusId: REVIEW_STATUS_COMPLETE_ID,
      startDate: '2025-03-01',
      endDate: '2025-03-15',
      reviewType: 'RAN',
      reportDeliveryDate: '2025-04-15',
      outcome: 'Compliant',
      name: 'Review H (Compliant, delivered)',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
      sourceCreatedAt: new Date('2025-03-01'),
    });
    await MonitoringReviewGrantee.create(granteeRow(grantNumberH, reviewIdH, granteeIdH));

    await MonitoringFindingLink.findOrCreate({
      where: { findingId: findingIdH },
      defaults: linkTimestamps,
    });
    await MonitoringFinding.create({
      findingId: findingIdH,
      statusId: FINDING_STATUS_ELEVATED_DEFICIENCY_ID,
      findingType: 'Deficiency',
      source: 'RAN',
      name: 'Finding H',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
    });
    await MonitoringFindingHistory.create({
      reviewId: reviewIdH,
      findingHistoryId: uuidv4(),
      findingId: findingIdH,
      statusId: FINDING_STATUS_ELEVATED_DEFICIENCY_ID,
      narrative: 'Narrative for elevated deficiency H',
      ordinal: 1,
      determination: 'Deficiency',
      name: 'History H',
      ...timestamps,
    });
    await MonitoringFindingStandard.create({
      findingId: findingIdH,
      standardId: STANDARD_ID_1,
      name: 'Standard H',
      ...timestamps,
    });
    await MonitoringFindingGrant.create({
      findingId: findingIdH,
      granteeId: granteeIdH,
      statusId: FINDING_STATUS_ELEVATED_DEFICIENCY_ID,
      findingType: 'Deficiency',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
    });

    // =====================================================
    // Scenario I: Elevated Deficiency + Compliant but undelivered → Active
    // =====================================================
    await MonitoringReviewLink.findOrCreate({
      where: { reviewId: reviewIdI1 },
      defaults: linkTimestamps,
    });
    await MonitoringReview.create({
      reviewId: reviewIdI1,
      contentId: uuidv4(),
      statusId: REVIEW_STATUS_COMPLETE_ID,
      startDate: '2025-02-01',
      endDate: '2025-02-15',
      reviewType: 'RAN',
      reportDeliveryDate: '2025-03-01',
      outcome: 'Complete',
      name: 'Review I1 (delivered)',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
      sourceCreatedAt: new Date('2025-02-01'),
    });
    await MonitoringReviewLink.findOrCreate({
      where: { reviewId: reviewIdI2 },
      defaults: linkTimestamps,
    });
    await MonitoringReview.create({
      reviewId: reviewIdI2,
      contentId: uuidv4(),
      statusId: REVIEW_STATUS_COMPLETE_ID,
      startDate: '2025-04-01',
      endDate: '2025-04-15',
      reviewType: 'Follow-up',
      reportDeliveryDate: null,
      outcome: 'Compliant',
      name: 'Review I2 (Compliant, undelivered)',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
      sourceCreatedAt: new Date('2025-04-01'),
    });
    await MonitoringReviewGrantee.bulkCreate([
      granteeRow(grantNumberI, reviewIdI1, granteeIdI),
      granteeRow(grantNumberI, reviewIdI2, granteeIdI),
    ]);

    await MonitoringFindingLink.findOrCreate({
      where: { findingId: findingIdI },
      defaults: linkTimestamps,
    });
    await MonitoringFinding.create({
      findingId: findingIdI,
      statusId: FINDING_STATUS_ELEVATED_DEFICIENCY_ID,
      findingType: 'Deficiency',
      source: 'RAN',
      name: 'Finding I',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
    });
    await MonitoringFindingHistory.bulkCreate([
      {
        reviewId: reviewIdI1,
        findingHistoryId: uuidv4(),
        findingId: findingIdI,
        statusId: FINDING_STATUS_ELEVATED_DEFICIENCY_ID,
        narrative: 'Narrative for elevated deficiency I (initial)',
        ordinal: 1,
        determination: 'Deficiency',
        name: 'History I1',
        ...timestamps,
      },
      {
        reviewId: reviewIdI2,
        findingHistoryId: uuidv4(),
        findingId: findingIdI,
        statusId: FINDING_STATUS_ELEVATED_DEFICIENCY_ID,
        narrative: 'Narrative for elevated deficiency I (follow-up)',
        ordinal: 2,
        determination: 'Deficiency',
        name: 'History I2',
        ...timestamps,
      },
    ]);
    await MonitoringFindingStandard.create({
      findingId: findingIdI,
      standardId: STANDARD_ID_1,
      name: 'Standard I',
      ...timestamps,
    });
    await MonitoringFindingGrant.create({
      findingId: findingIdI,
      granteeId: granteeIdI,
      statusId: FINDING_STATUS_ELEVATED_DEFICIENCY_ID,
      findingType: 'Deficiency',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
    });

    // =====================================================
    // Scenario J: CLASS review delivered before monitoring cutoff
    // =====================================================
    await Recipient.findOrCreate({
      where: { id: recipientIdJ },
      defaults: { id: recipientIdJ, name: `Recipient J ${recipientIdJ}` },
    });
    await Grant.findOrCreate({
      where: { id: grantIdJ },
      defaults: {
        id: grantIdJ,
        number: grantNumberJ,
        recipientId: recipientIdJ,
        regionId: 5,
        status: 'Active',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2028-12-31'),
        cdi: false,
      },
    });
    await MonitoringReviewLink.findOrCreate({
      where: { reviewId: reviewIdJ },
      defaults: linkTimestamps,
    });
    await MonitoringReview.create({
      reviewId: reviewIdJ,
      contentId: uuidv4(),
      statusId: REVIEW_STATUS_COMPLETE_ID,
      startDate: '2023-09-01',
      endDate: '2023-09-30',
      reviewType: 'CLASS',
      reportDeliveryDate: '2023-10-30',
      outcome: 'Compliant',
      name: 'Review J (CLASS, pre-cutoff)',
      hash: `hash-${uuidv4()}`,
      ...timestamps,
      sourceCreatedAt: new Date('2023-08-23'),
    });
    await MonitoringReviewGrantee.create(granteeRow(grantNumberJ, reviewIdJ, granteeIdJ));
    await MonitoringClassSummary.create({
      reviewId: reviewIdJ,
      grantNumber: grantNumberJ,
      emotionalSupport: classEsJ,
      classroomOrganization: classCoJ,
      instructionalSupport: classIsJ,
      reportDeliveryDate: new Date('2023-10-30'),
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
      findingIdH,
      findingIdI,
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
      reviewIdH,
      reviewIdI1,
      reviewIdI2,
      reviewIdJ,
    ];
    const allGrantIds = [
      grantIdA1,
      grantIdA2,
      grantIdB,
      grantIdC,
      grantIdD,
      grantIdE,
      grantIdF,
      grantIdH,
      grantIdI,
      grantIdJ,
    ];
    const allRecipientIds = [
      recipientIdA,
      recipientIdB,
      recipientIdC,
      recipientIdD,
      recipientIdE,
      recipientIdF,
      recipientIdH,
      recipientIdI,
      recipientIdJ,
    ];
    const allGrantNumbers = [
      grantNumberA1,
      grantNumberA2,
      grantNumberB,
      grantNumberC,
      grantNumberD,
      grantNumberE,
      grantNumberF,
      grantNumberH,
      grantNumberI,
      grantNumberJ,
    ];

    // Monitoring source data (children before parents)
    await MonitoringFindingGrant.destroy({ where: { findingId: allFindingIds }, force: true });
    await MonitoringFindingStandard.destroy({ where: { findingId: allFindingIds }, force: true });
    await MonitoringFindingHistory.destroy({ where: { findingId: allFindingIds }, force: true });
    await MonitoringFinding.destroy({ where: { findingId: allFindingIds }, force: true });
    await MonitoringClassSummary.destroy({
      where: { reviewId: [reviewIdE, reviewIdJ] },
      force: true,
    });
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
  describe('Scenario F: excluded finding type (Withdrawn)', () => {
    it('does not create a Citation for a finding with disallowed calculated_finding_type', async () => {
      const citation = await Citation.findOne({ where: { finding_uuid: findingIdF } });
      expect(citation).toBeNull();
    });

    it('still creates a DeliveredReview for the review (reviews are not filtered)', async () => {
      const review = await DeliveredReview.findOne({ where: { review_uuid: reviewIdF } });
      expect(review).not.toBeNull();
      expect(review.review_type).toBe('FA-1');
    });

    it('does not create any DeliveredReviewCitation for the excluded finding', async () => {
      const review = await DeliveredReview.findOne({ where: { review_uuid: reviewIdF } });
      const drcs = await DeliveredReviewCitation.findAll({
        where: { deliveredReviewId: review.id },
      });
      expect(drcs).toHaveLength(0);
    });

    it('does not create any GrantCitation for the excluded finding', async () => {
      const gcs = await GrantCitation.findAll({ where: { grantId: grantIdF } });
      expect(gcs).toHaveLength(0);
    });
  });

  // =====================
  // Scenario G: last_tta from ActivityReport.endDate
  // =====================
  describe('Scenario G: last_tta computed from approved ActivityReport.endDate', () => {
    let arG;
    let aroG;
    let objectiveG;
    let userG;

    beforeAll(async () => {
      // Scenario A's DeliveredReview and Citation are already created by the outer beforeAll.
      // Retrieve the Citation so we can link an ActivityReportObjectiveCitation to it.
      const reviewA = await DeliveredReview.findOne({ where: { review_uuid: reviewIdA } });
      const drcA = await DeliveredReviewCitation.findOne({
        where: { deliveredReviewId: reviewA.id },
      });

      userG = await User.create({
        id: userIdG,
        homeRegionId: 1,
        hsesUsername: `user-scenG-${uuidv4().slice(0, 8)}`,
        hsesUserId: `user-scenG-${uuidv4().slice(0, 8)}`,
        lastLogin: new Date(),
      });

      arG = await ActivityReport.create({
        userId: userG.id,
        regionId: 1,
        submissionStatus: 'submitted',
        calculatedStatus: 'approved',
        endDate: expectedLastTtaDate,
        startDate: '2026-01-10',
        numberOfParticipants: 1,
        deliveryMethod: 'method',
        duration: 1,
        activityRecipientType: 'recipient',
        requester: 'requester',
        targetPopulations: ['pop'],
        reason: ['reason'],
        participants: ['participants'],
        topics: ['topics'],
        ttaType: ['type'],
        language: ['English'],
        activityReason: 'reason',
        version: 2,
        creatorRole: 'TTAC',
      });

      objectiveG = await Objective.create({
        title: 'Scenario G objective',
        status: 'Not Started',
      });

      aroG = await ActivityReportObjective.create({
        activityReportId: arG.id,
        objectiveId: objectiveG.id,
      });

      await ActivityReportObjectiveCitation.create({
        activityReportObjectiveId: aroG.id,
        citationId: drcA.citationId,
        citation: '1302.47(b)(5)(iv)',
        grantNumber: grantNumberA1,
        findingId: findingIdA,
        grantId: grantIdA1,
        reviewName: 'Review A',
        standardId: STANDARD_ID_1,
        findingType: 'Deficiency',
        findingSource: null,
        acro: 'FA-1',
        name: 'Scenario G test citation',
        severity: 1,
        reportDeliveryDate: '2025-03-01',
        monitoringFindingStatusName: 'Active',
      });
    }, 30000);

    afterAll(async () => {
      await ActivityReportObjectiveCitation.destroy({
        where: { activityReportObjectiveId: aroG.id },
        force: true,
      });
      await ActivityReportObjective.destroy({ where: { id: aroG.id }, force: true });
      await ActivityReport.destroy({
        where: { id: arG.id },
        force: true,
        individualHooks: false,
      });
      await Objective.destroy({
        where: { id: objectiveG.id },
        force: true,
        individualHooks: false,
      });
      await User.unscoped().destroy({ where: { id: userG.id }, force: true });
    });

    it('sets last_tta to the endDate of the linked approved ActivityReport', async () => {
      const review = await DeliveredReview.scope('withLiveValues').findOne({
        where: { review_uuid: reviewIdA },
      });
      expect(review.liveValues).not.toBeNull();
      expect(String(review.liveValues.last_tta).slice(0, 10)).toBe(expectedLastTtaDate);
      expect(review.liveValues.last_ar_id).toBe(arG.id);
    });

    it('does not set last_tta from a draft ActivityReport with a later endDate', async () => {
      // A draft AR linked through the same citation must not influence last_tta.
      const reviewA = await DeliveredReview.findOne({ where: { review_uuid: reviewIdA } });
      const drcA = await DeliveredReviewCitation.findOne({
        where: { deliveredReviewId: reviewA.id },
      });

      const draftAr = await ActivityReport.create({
        userId: userG.id,
        regionId: 1,
        submissionStatus: 'draft',
        calculatedStatus: 'draft',
        endDate: '2030-12-31',
        startDate: '2030-12-01',
        numberOfParticipants: 1,
        deliveryMethod: 'method',
        duration: 1,
        activityRecipientType: 'recipient',
        requester: 'requester',
        targetPopulations: ['pop'],
        reason: ['reason'],
        participants: ['participants'],
        topics: ['topics'],
        ttaType: ['type'],
        language: ['English'],
        activityReason: 'reason',
        version: 2,
        creatorRole: 'TTAC',
      });

      const draftAro = await ActivityReportObjective.create({
        activityReportId: draftAr.id,
        objectiveId: objectiveG.id,
      });

      await ActivityReportObjectiveCitation.create({
        activityReportObjectiveId: draftAro.id,
        citationId: drcA.citationId,
        citation: '1302.47(b)(5)(iv)',
        grantNumber: grantNumberA1,
        findingId: findingIdA,
        grantId: grantIdA1,
        reviewName: 'Review A',
        standardId: STANDARD_ID_1,
        findingType: 'Deficiency',
        findingSource: null,
        acro: 'FA-1',
        name: 'Scenario G draft citation',
        severity: 1,
        reportDeliveryDate: '2025-03-01',
        monitoringFindingStatusName: 'Active',
      });

      try {
        const review = await DeliveredReview.scope('withLiveValues').findOne({
          where: { review_uuid: reviewIdA },
        });
        // last_tta must still reflect the approved AR — not the draft with the later date
        expect(String(review.liveValues.last_tta).slice(0, 10)).toBe(expectedLastTtaDate);
        expect(review.liveValues.last_ar_id).toBe(arG.id);
      } finally {
        await ActivityReportObjectiveCitation.destroy({
          where: { activityReportObjectiveId: draftAro.id },
          force: true,
        });
        await ActivityReportObjective.destroy({ where: { id: draftAro.id }, force: true });
        await ActivityReport.destroy({
          where: { id: draftAr.id },
          force: true,
          individualHooks: false,
        });
      }
    });
  });

  // =====================
  // Scenario H: both live-value views, two approved ARs, null & tie
  // =====================
  describe('Scenario H: live-value views pick latest endDate with null and tie cases', () => {
    let arH1;
    let arH2;
    let aroH1;
    let aroH2;
    let objectiveH;
    let userH;
    let citationIdH;
    let deliveredReviewIdH;

    const endDateEarlier = '2025-08-01';
    const endDateLater = '2025-09-15';

    beforeAll(async () => {
      // Use Scenario B's review/citation (reviewIdB1) — no AR is linked to it yet.
      const reviewB = await DeliveredReview.findOne({ where: { review_uuid: reviewIdB1 } });
      const drcB = await DeliveredReviewCitation.findOne({
        where: { deliveredReviewId: reviewB.id },
      });
      citationIdH = drcB.citationId;
      deliveredReviewIdH = reviewB.id;

      userH = await User.create({
        id: userIdH,
        homeRegionId: 1,
        hsesUsername: `user-scenH-${uuidv4().slice(0, 8)}`,
        hsesUserId: `user-scenH-${uuidv4().slice(0, 8)}`,
        lastLogin: new Date(),
      });

      objectiveH = await Objective.create({
        title: 'Scenario H objective',
        status: 'Not Started',
      });

      // AR with the earlier endDate
      arH1 = await ActivityReport.create({
        userId: userH.id,
        regionId: 1,
        submissionStatus: 'submitted',
        calculatedStatus: 'approved',
        startDate: '2025-07-01',
        endDate: endDateEarlier,
        numberOfParticipants: 1,
        deliveryMethod: 'method',
        duration: 1,
        activityRecipientType: 'recipient',
        requester: 'requester',
        targetPopulations: ['pop'],
        reason: ['reason'],
        participants: ['participants'],
        topics: ['topics'],
        ttaType: ['type'],
        language: ['English'],
        activityReason: 'reason',
        version: 2,
        creatorRole: 'TTAC',
      });

      // AR with the later endDate — should win
      arH2 = await ActivityReport.create({
        userId: userH.id,
        regionId: 1,
        submissionStatus: 'submitted',
        calculatedStatus: 'approved',
        startDate: '2025-09-01',
        endDate: endDateLater,
        numberOfParticipants: 1,
        deliveryMethod: 'method',
        duration: 1,
        activityRecipientType: 'recipient',
        requester: 'requester',
        targetPopulations: ['pop'],
        reason: ['reason'],
        participants: ['participants'],
        topics: ['topics'],
        ttaType: ['type'],
        language: ['English'],
        activityReason: 'reason',
        version: 2,
        creatorRole: 'TTAC',
      });

      aroH1 = await ActivityReportObjective.create({
        activityReportId: arH1.id,
        objectiveId: objectiveH.id,
      });

      aroH2 = await ActivityReportObjective.create({
        activityReportId: arH2.id,
        objectiveId: objectiveH.id,
      });

      // Link both ARs to the same Citation
      await ActivityReportObjectiveCitation.create({
        activityReportObjectiveId: aroH1.id,
        citationId: citationIdH,
        citation: '1302.47(b)(5)(iv)',
        grantNumber: grantNumberB,
        findingId: findingIdB,
        grantId: grantIdB,
        reviewName: 'Review B',
        standardId: STANDARD_ID_2,
        findingType: 'Deficiency',
        findingSource: null,
        acro: 'FB-1',
        name: 'Scenario H earlier citation',
        severity: 1,
        reportDeliveryDate: '2025-03-01',
        monitoringFindingStatusName: 'Active',
      });

      await ActivityReportObjectiveCitation.create({
        activityReportObjectiveId: aroH2.id,
        citationId: citationIdH,
        citation: '1302.47(b)(5)(iv)',
        grantNumber: grantNumberB,
        findingId: findingIdB,
        grantId: grantIdB,
        reviewName: 'Review B',
        standardId: STANDARD_ID_2,
        findingType: 'Deficiency',
        findingSource: null,
        acro: 'FB-1',
        name: 'Scenario H later citation',
        severity: 1,
        reportDeliveryDate: '2025-03-01',
        monitoringFindingStatusName: 'Active',
      });
    }, 30000);

    afterAll(async () => {
      await ActivityReportObjectiveCitation.destroy({
        where: { activityReportObjectiveId: [aroH1.id, aroH2.id] },
        force: true,
      });
      await ActivityReportObjective.destroy({
        where: { id: [aroH1.id, aroH2.id] },
        force: true,
      });
      await ActivityReport.destroy({
        where: { id: [arH1.id, arH2.id] },
        force: true,
        individualHooks: false,
      });
      await Objective.destroy({
        where: { id: objectiveH.id },
        force: true,
        individualHooks: false,
      });
      await User.unscoped().destroy({ where: { id: userH.id }, force: true });
    });

    it('picks the AR with the latest endDate from two approved ARs (both views)', async () => {
      const citation = await Citation.scope('withLiveValues').findOne({
        where: { id: citationIdH },
      });
      expect(citation.liveValues).not.toBeNull();
      expect(String(citation.liveValues.last_tta).slice(0, 10)).toBe(endDateLater);
      expect(citation.liveValues.last_ar_id).toBe(arH2.id);

      const review = await DeliveredReview.scope('withLiveValues').findOne({
        where: { id: deliveredReviewIdH },
      });
      expect(review.liveValues).not.toBeNull();
      expect(String(review.liveValues.last_tta).slice(0, 10)).toBe(endDateLater);
      expect(review.liveValues.last_ar_id).toBe(arH2.id);
    });

    it('does not pick an approved AR with null endDate over one with a real date', async () => {
      const arNull = await ActivityReport.create({
        userId: userH.id,
        regionId: 1,
        submissionStatus: 'submitted',
        calculatedStatus: 'approved',
        startDate: '2030-01-01',
        endDate: null,
        numberOfParticipants: 1,
        deliveryMethod: 'method',
        duration: 1,
        activityRecipientType: 'recipient',
        requester: 'requester',
        targetPopulations: ['pop'],
        reason: ['reason'],
        participants: ['participants'],
        topics: ['topics'],
        ttaType: ['type'],
        language: ['English'],
        activityReason: 'reason',
        version: 2,
        creatorRole: 'TTAC',
      });

      const aroNull = await ActivityReportObjective.create({
        activityReportId: arNull.id,
        objectiveId: objectiveH.id,
      });

      await ActivityReportObjectiveCitation.create({
        activityReportObjectiveId: aroNull.id,
        citationId: citationIdH,
        citation: '1302.47(b)(5)(iv)',
        grantNumber: grantNumberB,
        findingId: findingIdB,
        grantId: grantIdB,
        reviewName: 'Review B',
        standardId: STANDARD_ID_2,
        findingType: 'Deficiency',
        findingSource: null,
        acro: 'FB-1',
        name: 'Scenario H null endDate citation',
        severity: 1,
        reportDeliveryDate: '2025-03-01',
        monitoringFindingStatusName: 'Active',
      });

      try {
        const citation = await Citation.scope('withLiveValues').findOne({
          where: { id: citationIdH },
        });
        expect(citation.liveValues).not.toBeNull();
        expect(String(citation.liveValues.last_tta).slice(0, 10)).toBe(endDateLater);
        expect(citation.liveValues.last_ar_id).toBe(arH2.id);

        const review = await DeliveredReview.scope('withLiveValues').findOne({
          where: { id: deliveredReviewIdH },
        });
        expect(review.liveValues).not.toBeNull();
        expect(String(review.liveValues.last_tta).slice(0, 10)).toBe(endDateLater);
        expect(review.liveValues.last_ar_id).toBe(arH2.id);
      } finally {
        await ActivityReportObjectiveCitation.destroy({
          where: { activityReportObjectiveId: aroNull.id },
          force: true,
        });
        await ActivityReportObjective.destroy({ where: { id: aroNull.id }, force: true });
        await ActivityReport.destroy({
          where: { id: arNull.id },
          force: true,
          individualHooks: false,
        });
      }
    });

    it('returns a valid AR id when two approved ARs tie on endDate', async () => {
      const arTie = await ActivityReport.create({
        userId: userH.id,
        regionId: 1,
        submissionStatus: 'submitted',
        calculatedStatus: 'approved',
        startDate: '2025-08-15',
        endDate: endDateLater,
        numberOfParticipants: 1,
        deliveryMethod: 'method',
        duration: 1,
        activityRecipientType: 'recipient',
        requester: 'requester',
        targetPopulations: ['pop'],
        reason: ['reason'],
        participants: ['participants'],
        topics: ['topics'],
        ttaType: ['type'],
        language: ['English'],
        activityReason: 'reason',
        version: 2,
        creatorRole: 'TTAC',
      });

      const aroTie = await ActivityReportObjective.create({
        activityReportId: arTie.id,
        objectiveId: objectiveH.id,
      });

      await ActivityReportObjectiveCitation.create({
        activityReportObjectiveId: aroTie.id,
        citationId: citationIdH,
        citation: '1302.47(b)(5)(iv)',
        grantNumber: grantNumberB,
        findingId: findingIdB,
        grantId: grantIdB,
        reviewName: 'Review B',
        standardId: STANDARD_ID_2,
        findingType: 'Deficiency',
        findingSource: null,
        acro: 'FB-1',
        name: 'Scenario H tie citation',
        severity: 1,
        reportDeliveryDate: '2025-03-01',
        monitoringFindingStatusName: 'Active',
      });

      try {
        const citation = await Citation.scope('withLiveValues').findOne({
          where: { id: citationIdH },
        });
        expect(citation.liveValues).not.toBeNull();
        expect(String(citation.liveValues.last_tta).slice(0, 10)).toBe(endDateLater);
        expect([arH2.id, arTie.id]).toContain(citation.liveValues.last_ar_id);

        const review = await DeliveredReview.scope('withLiveValues').findOne({
          where: { id: deliveredReviewIdH },
        });
        expect(review.liveValues).not.toBeNull();
        expect(String(review.liveValues.last_tta).slice(0, 10)).toBe(endDateLater);
        expect([arH2.id, arTie.id]).toContain(review.liveValues.last_ar_id);
      } finally {
        await ActivityReportObjectiveCitation.destroy({
          where: { activityReportObjectiveId: aroTie.id },
          force: true,
        });
        await ActivityReportObjective.destroy({ where: { id: aroTie.id }, force: true });
        await ActivityReport.destroy({
          where: { id: arTie.id },
          force: true,
          individualHooks: false,
        });
      }
    });
  });

  // =====================
  // Scenario H
  // =====================
  describe('Scenario H: Elevated Deficiency with Compliant delivered review', () => {
    it('sets calculated_status to Corrected and active to false', async () => {
      const citation = await Citation.findOne({ where: { finding_uuid: findingIdH } });
      expect(citation).not.toBeNull();
      expect(citation.calculated_finding_type).toBe('Deficiency');
      expect(citation.calculated_status).toBe('Corrected');
      expect(citation.active).toBe(false);
      expect(citation.last_review_delivered).toBe(true);
    });

    it('sets active_through to the report delivery date', async () => {
      const citation = await Citation.findOne({ where: { finding_uuid: findingIdH } });
      expect(citation.active_through).toBe('2025-04-15');
    });
  });

  // =====================
  // Scenario I
  // =====================
  describe('Scenario I: Elevated Deficiency with Compliant but undelivered latest review', () => {
    it('keeps calculated_status Active when the latest review has no delivery date', async () => {
      const citation = await Citation.findOne({ where: { finding_uuid: findingIdI } });
      expect(citation).not.toBeNull();
      expect(citation.calculated_finding_type).toBe('Deficiency');
      expect(citation.calculated_status).toBe('Active');
      expect(citation.active).toBe(true);
      expect(citation.last_review_delivered).toBe(false);
    });
  });

  // =====================
  // Scenario J
  // =====================
  describe('Scenario J: CLASS review delivered before the monitoring cutoff date', () => {
    it('creates a DeliveredReview even though both dates predate the cutoff', async () => {
      const review = await DeliveredReview.findOne({ where: { review_uuid: reviewIdJ } });
      expect(review).not.toBeNull();
      expect(review.review_type).toBe('CLASS');
      expect(review.report_delivery_date).toBe('2023-10-30');
    });

    it('populates CLASS scores from MonitoringClassSummaries', async () => {
      const review = await DeliveredReview.findOne({ where: { review_uuid: reviewIdJ } });
      expect(parseFloat(review.class_es)).toBeCloseTo(classEsJ, 4);
      expect(parseFloat(review.class_co)).toBeCloseTo(classCoJ, 4);
      expect(parseFloat(review.class_is)).toBeCloseTo(classIsJ, 4);
    });

    it('creates a GrantDeliveredReview entry', async () => {
      const review = await DeliveredReview.findOne({ where: { review_uuid: reviewIdJ } });
      const junctions = await GrantDeliveredReview.findAll({
        where: { deliveredReviewId: review.id },
      });
      expect(junctions).toHaveLength(1);
      expect(junctions[0].grantId).toBe(grantIdJ);
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
