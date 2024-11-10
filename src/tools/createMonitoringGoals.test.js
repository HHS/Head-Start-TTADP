/* eslint-disable max-len */
import faker from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import createMonitoringGoals from './createMonitoringGoals';
import {
  sequelize,
  GoalTemplate,
  Recipient,
  Grant,
  MonitoringReviewGrantee,
  MonitoringReview,
  MonitoringReviewStatus,
  MonitoringFindingHistory,
  MonitoringFinding,
  MonitoringFindingStatus,
  MonitoringFindingGrant,
  Goal,
} from '../models';
import { captureSnapshot, rollbackToSnapshot } from '../lib/programmaticTransaction';
import { auditLogger } from '../logger';

jest.mock('../logger');

describe('createMonitoringGoals', () => {
  let recipient;
  const startingReportDeliveryDate = new Date('2023-12-01');

  // const goalTemplateId = 18172;
  const goalTemplateName = '(Monitoring) The recipient will develop and implement a QIP/CAP to address monitoring findings.';
  let goalTemplate;

  let grantThatNeedsMonitoringGoal1;
  let grantThatAlreadyHasMonitoringGoal2;
  let grantThatFallsBeforeStartDate3;
  let grantThatFallsAfterCutOffDate4;
  let grantThatIsInactive5;
  let grantThatsMonitoringReviewStatusIsNotComplete6;
  let grantThatsMonitoringFindingStatusIsNotActive7;
  let grantThatsMonitoringReviewReviewTypeIsNotAllowed8;
  let inactiveGrantThatHasBeenReplacedByActiveGrant9;

  const grantThatNeedsMonitoringGoalNumber1 = faker.datatype.string(4);
  const grantThatAlreadyHasMonitoringGoalNumber2 = faker.datatype.string(4);
  const grantThatFallsBeforeStartDateNumber3 = faker.datatype.string(4);
  const grantThatFallsAfterCutOffDateNumber4 = faker.datatype.string(4);
  const grantThatIsInactiveNumber5 = faker.datatype.string(4);
  const grantThatsMonitoringReviewStatusIsNotCompleteNumber6 = faker.datatype.string(4);
  const grantThatsMonitoringFindingStatusIsNotActiveNumber7 = faker.datatype.string(4);
  const grantThatsMonitoringReviewReviewTypeIsNotAllowedNumber8 = faker.datatype.string(4);
  const inactiveGrantThatHasBeenReplacedByActiveGrantNumber9 = faker.datatype.string(4);

  let snapShot;

  beforeAll(async () => {
    // Create a snapshot of the database so we can rollback after the tests.
    snapShot = await captureSnapshot();
    // Recipient.
    recipient = await Recipient.create({
      id: faker.datatype.number({ min: 64000 }),
      name: faker.random.alphaNumeric(6),
    });

    // Grants.
    const grants = await Grant.bulkCreate([
      {
        // 1
        id: faker.datatype.number({ min: 9999 }),
        number: grantThatNeedsMonitoringGoalNumber1,
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
      {
        // 2
        id: faker.datatype.number({ min: 9999 }),
        number: grantThatAlreadyHasMonitoringGoalNumber2,
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
      {
        // 3
        id: faker.datatype.number({ min: 9999 }),
        number: grantThatFallsBeforeStartDateNumber3,
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date('2021-01-01'),
        endDate: new Date('2021-12-31'),
        status: 'Active',
      },
      {
        // 4
        id: faker.datatype.number({ min: 9999 }),
        number: grantThatFallsAfterCutOffDateNumber4,
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date('2023-12-02'),
        endDate: new Date('2024-12-01'),
        status: 'Active',
      },
      {
        // 5
        id: faker.datatype.number({ min: 9999 }),
        number: grantThatIsInactiveNumber5,
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Inactive',
      },
      {
        // 6
        id: faker.datatype.number({ min: 9999 }),
        number: grantThatsMonitoringReviewStatusIsNotCompleteNumber6,
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
      {
        // 7
        id: faker.datatype.number({ min: 9999 }),
        number: grantThatsMonitoringFindingStatusIsNotActiveNumber7,
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
      {
        // 8
        id: faker.datatype.number({ min: 9999 }),
        number: grantThatsMonitoringReviewReviewTypeIsNotAllowedNumber8,
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
      {
        // 9
        id: faker.datatype.number({ min: 9999 }),
        number: inactiveGrantThatHasBeenReplacedByActiveGrantNumber9,
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
    ]);

    [
      grantThatNeedsMonitoringGoal1,
      grantThatAlreadyHasMonitoringGoal2,
      grantThatFallsBeforeStartDate3,
      grantThatFallsAfterCutOffDate4,
      grantThatIsInactive5,
      grantThatsMonitoringReviewStatusIsNotComplete6,
      grantThatsMonitoringFindingStatusIsNotActive7,
      grantThatsMonitoringReviewReviewTypeIsNotAllowed8,
      inactiveGrantThatHasBeenReplacedByActiveGrant9,
    ] = grants;

    // Create an inactive grant that has 'cdi' true that points to inactiveGrantThatHasBeenReplacedByActiveGrant9.
    const cdiGrant = await Grant.create({
      id: faker.datatype.number({ min: 9999 }),
      number: faker.datatype.string(4),
      recipientId: recipient.id,
      regionId: 1,
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Set to yesterday's date
      endDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Set to yesterday's date
      status: 'Inactive',
      cdi: true,
    });

    // Create a grant replacement type.
    await sequelize.query(`
      INSERT INTO "GrantReplacementTypes" ("name", "createdAt", "updatedAt", "deletedAt", "mapsTo")
      VALUES ('Replace CDI Grant', NOW(), NOW(), NULL, NULL)
    `);

    // Get the Grant Replacement Type where the name = 'Replace CDI Grant'.
    const grantReplacementType = await sequelize.query(`
      SELECT id FROM "GrantReplacementTypes" WHERE name = 'Replace CDI Grant'
    `, { type: sequelize.QueryTypes.SELECT });

    // Create a fake grant replacement.
    await sequelize.query(`
      INSERT INTO "GrantReplacements" ("replacedGrantId", "replacingGrantId", "grantReplacementTypeId", "replacementDate", "createdAt", "updatedAt")
      VALUES (${cdiGrant.id}, ${inactiveGrantThatHasBeenReplacedByActiveGrant9.id}, ${grantReplacementType[0].id}, NOW(), NOW(), NOW())
    `);

    // granteeId GUID.
    const grantThatNeedsMonitoringGoalNumberGranteeId1 = uuidv4();
    const grantThatAlreadyHasMonitoringGoalNumberGranteeId2 = uuidv4();
    const grantThatFallsBeforeStartDateNumberGranteeId3 = uuidv4();
    const grantThatFallsAfterCutOffDateNumberGranteeId4 = uuidv4();
    const grantThatIsInactiveNumberGranteeId5 = uuidv4();
    const grantThatsMonitoringReviewStatusIsNotCompleteNumberGranteeId6 = uuidv4();
    const grantThatsMonitoringFindingStatusIsNotActiveNumberGranteeId7 = uuidv4();
    const grantThatsMonitoringReviewReviewTypeIsNotAllowedNumberGranteeId8 = uuidv4();
    const inactiveGrantThatHasBeenReplacedByActiveGrantNumberGranteeId9 = uuidv4();

    // reviewId GUID.
    const grantThatNeedsMonitoringGoalNumberReviewId1 = uuidv4();
    const grantThatAlreadyHasMonitoringGoalNumberReviewId2 = uuidv4();
    const grantThatFallsBeforeStartDateNumberReviewId3 = uuidv4();
    const grantThatFallsAfterCutOffDateNumberReviewId4 = uuidv4();
    const grantThatIsInactiveNumberReviewId5 = uuidv4();
    const grantThatsMonitoringReviewStatusIsNotCompleteNumberReviewId6 = uuidv4();
    const grantThatsMonitoringFindingStatusIsNotActiveNumberReviewId7 = uuidv4();
    const grantThatsMonitoringReviewReviewTypeIsNotAllowedNumberReviewId8 = uuidv4();
    const inactiveGrantThatHasBeenReplacedByActiveGrantNumberReviewId9 = uuidv4();

    // MonitoringReviewGrantee.
    await MonitoringReviewGrantee.bulkCreate([
      {
        // 1
        id: faker.datatype.number({ min: 9999 }),
        grantNumber: grantThatNeedsMonitoringGoalNumber1,
        reviewId: grantThatNeedsMonitoringGoalNumberReviewId1,
        granteeId: grantThatNeedsMonitoringGoalNumberGranteeId1,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Support Team',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 2
        id: faker.datatype.number({ min: 9999 }),
        grantNumber: grantThatAlreadyHasMonitoringGoalNumber2,
        reviewId: grantThatAlreadyHasMonitoringGoalNumberReviewId2,
        granteeId: grantThatAlreadyHasMonitoringGoalNumberGranteeId2,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Support Team',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 3
        id: faker.datatype.number({ min: 9999 }),
        grantNumber: grantThatFallsBeforeStartDateNumber3,
        reviewId: grantThatFallsBeforeStartDateNumberReviewId3,
        granteeId: grantThatFallsBeforeStartDateNumberGranteeId3,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Support Team',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 4
        id: faker.datatype.number({ min: 9999 }),
        grantNumber: grantThatFallsAfterCutOffDateNumber4,
        reviewId: grantThatFallsAfterCutOffDateNumberReviewId4,
        granteeId: grantThatFallsAfterCutOffDateNumberGranteeId4,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Support Team',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 5
        id: faker.datatype.number({ min: 9999 }),
        grantNumber: grantThatIsInactiveNumber5,
        reviewId: grantThatIsInactiveNumberReviewId5,
        granteeId: grantThatIsInactiveNumberGranteeId5,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Support Team',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 6
        id: faker.datatype.number({ min: 9999 }),
        grantNumber: grantThatsMonitoringReviewStatusIsNotCompleteNumber6,
        reviewId: grantThatsMonitoringReviewStatusIsNotCompleteNumberReviewId6,
        granteeId: grantThatsMonitoringReviewStatusIsNotCompleteNumberGranteeId6,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Support Team',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 7
        id: faker.datatype.number({ min: 9999 }),
        grantNumber: grantThatsMonitoringFindingStatusIsNotActiveNumber7,
        reviewId: grantThatsMonitoringFindingStatusIsNotActiveNumberReviewId7,
        granteeId: grantThatsMonitoringFindingStatusIsNotActiveNumberGranteeId7,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Support Team',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 8
        id: faker.datatype.number({ min: 9999 }),
        grantNumber: grantThatsMonitoringReviewReviewTypeIsNotAllowedNumber8,
        reviewId: grantThatsMonitoringReviewReviewTypeIsNotAllowedNumberReviewId8,
        granteeId: grantThatsMonitoringReviewReviewTypeIsNotAllowedNumberGranteeId8,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Support Team',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 9
        id: faker.datatype.number({ min: 9999 }),
        grantNumber: inactiveGrantThatHasBeenReplacedByActiveGrantNumber9,
        reviewId: inactiveGrantThatHasBeenReplacedByActiveGrantNumberReviewId9,
        granteeId: inactiveGrantThatHasBeenReplacedByActiveGrantNumberGranteeId9,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Support Team',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
    ], { individualHooks: true });

    // Create 9 statusId variables made up of 6 random numbers and set each one to its corresponding statusId below in MonitoringReview.bulkCreate.
    const statusIds = new Set();
    while (statusIds.size < 9) {
      statusIds.add(faker.datatype.number({ min: 1, max: 9 }));
    }
    const [statusId1, statusId2, statusId3, statusId4, statusId5, statusId6, statusId7, statusId8, statusId9] = [...statusIds];

    // MonitoringReview.

    // Allowed review types:
    /*
      'AIAN-DEF',
      'RAN',
      'Follow-up',
      'FA-1', 'FA1-FR',
      'FA-2', 'FA2-CR',
      'Special'
      */
    await MonitoringReview.bulkCreate([
      {
        // 1
        reviewId: grantThatNeedsMonitoringGoalNumberReviewId1,
        contentId: faker.datatype.uuid(),
        statusId: statusId1,
        name: faker.random.words(3),
        startDate: new Date(),
        endDate: new Date(),
        reviewType: 'AIAN-DEF',
        reportDeliveryDate: new Date(),
        reportAttachmentId: faker.datatype.uuid(),
        outcome: faker.random.words(5),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 2
        reviewId: grantThatAlreadyHasMonitoringGoalNumberReviewId2,
        contentId: faker.datatype.uuid(),
        statusId: statusId2,
        name: faker.random.words(3),
        startDate: new Date(),
        endDate: new Date(),
        reviewType: 'Follow-up',
        reportDeliveryDate: new Date(),
        reportAttachmentId: faker.datatype.uuid(),
        outcome: faker.random.words(5),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 3
        reviewId: grantThatFallsBeforeStartDateNumberReviewId3,
        contentId: faker.datatype.uuid(),
        statusId: statusId3,
        name: faker.random.words(3),
        startDate: new Date(),
        endDate: new Date(),
        reviewType: 'FA-1',
        // This should test the case of the reportDeliveryDate being before the official start date.
        reportDeliveryDate: new Date(startingReportDeliveryDate.getTime() - 24 * 60 * 60 * 1000),
        reportAttachmentId: faker.datatype.uuid(),
        outcome: faker.random.words(5),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 4
        reviewId: grantThatFallsAfterCutOffDateNumberReviewId4,
        contentId: faker.datatype.uuid(),
        statusId: statusId4,
        name: faker.random.words(3),
        startDate: new Date(),
        endDate: new Date(),
        reviewType: 'FA1-FR',
        // This should test the case of the reportDeliveryDate being after the cut off date.
        reportDeliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Set to tomorrow's date
        reportAttachmentId: faker.datatype.uuid(),
        outcome: faker.random.words(5),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 5
        reviewId: grantThatIsInactiveNumberReviewId5,
        contentId: faker.datatype.uuid(),
        statusId: statusId5,
        name: faker.random.words(3),
        startDate: new Date(),
        endDate: new Date(),
        reviewType: 'FA1-FR',
        reportDeliveryDate: new Date(),
        reportAttachmentId: faker.datatype.uuid(),
        outcome: faker.random.words(5),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 6
        reviewId: grantThatsMonitoringReviewStatusIsNotCompleteNumberReviewId6,
        contentId: faker.datatype.uuid(),
        statusId: statusId6,
        name: faker.random.words(3),
        startDate: new Date(),
        endDate: new Date(),
        reviewType: 'FA-2',
        reportDeliveryDate: new Date(),
        reportAttachmentId: faker.datatype.uuid(),
        outcome: faker.random.words(5),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 7
        reviewId: grantThatsMonitoringFindingStatusIsNotActiveNumberReviewId7,
        contentId: faker.datatype.uuid(),
        statusId: statusId7,
        name: faker.random.words(3),
        startDate: new Date(),
        endDate: new Date(),
        reviewType: 'FA2-CR',
        reportDeliveryDate: new Date(),
        reportAttachmentId: faker.datatype.uuid(),
        outcome: faker.random.words(5),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 8 - This test exclusion of invalid review types.
        reviewId: grantThatsMonitoringReviewReviewTypeIsNotAllowedNumberReviewId8,
        contentId: faker.datatype.uuid(),
        statusId: statusId8,
        name: faker.random.words(3),
        startDate: new Date(),
        endDate: new Date(),
        reviewType: 'Invalid Review Type',
        reportDeliveryDate: new Date(),
        reportAttachmentId: faker.datatype.uuid(),
        outcome: faker.random.words(5),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 9
        reviewId: inactiveGrantThatHasBeenReplacedByActiveGrantNumberReviewId9,
        contentId: faker.datatype.uuid(),
        statusId: statusId9,
        name: faker.random.words(3),
        startDate: new Date(),
        endDate: new Date(),
        reviewType: 'Special',
        reportDeliveryDate: new Date(),
        reportAttachmentId: faker.datatype.uuid(),
        outcome: faker.random.words(5),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
    ], { individualHooks: true });

    // MonitoringReviewStatus.
    await MonitoringReviewStatus.bulkCreate([
      {
        // 1
        statusId: statusId1,
        name: 'Complete',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 2
        statusId: statusId2,
        name: 'Complete',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 3
        statusId: statusId3,
        name: 'Complete',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 4
        statusId: statusId4,
        name: 'Complete',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 5
        statusId: statusId5,
        name: 'Complete',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 6  - This test exclusion of invalid review status.
        statusId: statusId6,
        name: 'Not Complete',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 7
        statusId: statusId7,
        name: 'Complete',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 8
        statusId: statusId8,
        name: 'Complete',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 9
        statusId: statusId9,
        name: 'Complete',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
    ], { individualHooks: true });

    // MonitoringFindingHistory.
    const findingId1 = uuidv4();
    const findingId2 = uuidv4();
    const findingId3 = uuidv4();
    const findingId4 = uuidv4();
    const findingId5 = uuidv4();
    const findingId6 = uuidv4();
    const findingId7 = uuidv4();
    const findingId8 = uuidv4();
    const findingId9 = uuidv4();
    await MonitoringFindingHistory.bulkCreate([
      {
        // 1
        reviewId: grantThatNeedsMonitoringGoalNumberReviewId1,
        findingHistoryId: uuidv4(),
        findingId: findingId1,
        statusId: statusId1,
        narrative: faker.random.words(10),
        ordinal: faker.datatype.number({ min: 1, max: 10 }),
        determination: faker.random.words(5),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      },
      {
        // 2
        reviewId: grantThatAlreadyHasMonitoringGoalNumberReviewId2,
        findingHistoryId: uuidv4(),
        findingId: findingId2,
        statusId: statusId2,
        narrative: faker.random.words(10),
        ordinal: faker.datatype.number({ min: 1, max: 10 }),
        determination: faker.random.words(5),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      },
      {
        // 3
        reviewId: grantThatFallsBeforeStartDateNumberReviewId3,
        findingHistoryId: uuidv4(),
        findingId: findingId3,
        statusId: statusId3,
        narrative: faker.random.words(10),
        ordinal: faker.datatype.number({ min: 1, max: 10 }),
        determination: faker.random.words(5),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      },
      {
        // 4
        reviewId: grantThatFallsAfterCutOffDateNumberReviewId4,
        findingHistoryId: uuidv4(),
        findingId: findingId4,
        statusId: statusId4,
        narrative: faker.random.words(10),
        ordinal: faker.datatype.number({ min: 1, max: 10 }),
        determination: faker.random.words(5),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      },
      {
        // 5
        reviewId: grantThatIsInactiveNumberReviewId5,
        findingHistoryId: uuidv4(),
        findingId: findingId5,
        statusId: statusId5,
        narrative: faker.random.words(10),
        ordinal: faker.datatype.number({ min: 1, max: 10 }),
        determination: faker.random.words(5),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      },
      {
        // 6
        reviewId: grantThatsMonitoringReviewStatusIsNotCompleteNumberReviewId6,
        findingHistoryId: uuidv4(),
        findingId: findingId6,
        statusId: statusId6,
        narrative: faker.random.words(10),
        ordinal: faker.datatype.number({ min: 1, max: 10 }),
        determination: faker.random.words(5),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      },
      {
        // 7
        reviewId: grantThatsMonitoringFindingStatusIsNotActiveNumberReviewId7,
        findingHistoryId: uuidv4(),
        findingId: findingId7,
        statusId: statusId7,
        narrative: faker.random.words(10),
        ordinal: faker.datatype.number({ min: 1, max: 10 }),
        determination: faker.random.words(5),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      },
      {
        // 8
        reviewId: grantThatsMonitoringReviewReviewTypeIsNotAllowedNumberReviewId8,
        findingHistoryId: uuidv4(),
        findingId: findingId8,
        statusId: statusId8,
        narrative: faker.random.words(10),
        ordinal: faker.datatype.number({ min: 1, max: 10 }),
        determination: faker.random.words(5),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      },
      {
        // 9
        reviewId: inactiveGrantThatHasBeenReplacedByActiveGrantNumberReviewId9,
        findingHistoryId: uuidv4(),
        findingId: findingId9,
        statusId: statusId9,
        narrative: faker.random.words(10),
        ordinal: faker.datatype.number({ min: 1, max: 10 }),
        determination: faker.random.words(5),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      },
    ], { individualHooks: true });

    // MonitoringFinding.
    await MonitoringFinding.bulkCreate([
      {
        // 1
        findingId: findingId1,
        statusId: statusId1,
        findingType: faker.random.word(),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 2
        findingId: findingId2,
        statusId: statusId2,
        findingType: faker.random.word(),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 3
        findingId: findingId3,
        statusId: statusId3,
        findingType: faker.random.word(),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 4
        findingId: findingId4,
        statusId: statusId4,
        findingType: faker.random.word(),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 5
        findingId: findingId5,
        statusId: statusId5,
        findingType: faker.random.word(),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 6
        findingId: findingId6,
        statusId: statusId6,
        findingType: faker.random.word(),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 7
        findingId: findingId7,
        statusId: statusId7,
        findingType: faker.random.word(),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 8
        findingId: findingId8,
        statusId: statusId8,
        findingType: faker.random.word(),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 9
        findingId: findingId9,
        statusId: statusId9,
        findingType: faker.random.word(),
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
    ], { individualHooks: true });

    // MonitoringFindingStatus.
    await MonitoringFindingStatus.bulkCreate([
      {
        // 1
        statusId: statusId1,
        name: 'Active',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 2
        statusId: statusId2,
        name: 'Active',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 3
        statusId: statusId3,
        name: 'Active',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 4
        statusId: statusId4,
        name: 'Active',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 5
        statusId: statusId5,
        name: 'Active',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 6
        statusId: statusId6,
        name: 'Active',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 7 - This test exclusion of inactive status.
        statusId: statusId7,
        name: 'Not Active',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 8
        statusId: statusId8,
        name: 'Active',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 9
        statusId: statusId9,
        name: 'Active',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
    ], { individualHooks: true });

    // MonitoringFindingGrant.
    await MonitoringFindingGrant.bulkCreate([
      {
        // 1
        findingId: findingId1,
        granteeId: grantThatNeedsMonitoringGoalNumberGranteeId1,
        statusId: statusId1,
        findingType: faker.random.word(),
        source: faker.random.word(),
        correctionDeadLine: new Date(),
        reportedDate: new Date(),
        closedDate: null,
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      },
      {
        // 2
        findingId: findingId2,
        granteeId: grantThatAlreadyHasMonitoringGoalNumberGranteeId2,
        statusId: statusId2,
        findingType: faker.random.word(),
        source: faker.random.word(),
        correctionDeadLine: new Date(),
        reportedDate: new Date(),
        closedDate: null,
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      },
      {
        // 3
        findingId: findingId3,
        granteeId: grantThatFallsBeforeStartDateNumberGranteeId3,
        statusId: statusId3,
        findingType: faker.random.word(),
        source: faker.random.word(),
        correctionDeadLine: new Date(),
        reportedDate: new Date(),
        closedDate: null,
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      },
      {
        // 4
        findingId: findingId4,
        granteeId: grantThatFallsAfterCutOffDateNumberGranteeId4,
        statusId: statusId4,
        findingType: faker.random.word(),
        source: faker.random.word(),
        correctionDeadLine: new Date(),
        reportedDate: new Date(),
        closedDate: null,
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      },
      {
        // 5
        findingId: findingId5,
        granteeId: grantThatIsInactiveNumberGranteeId5,
        statusId: statusId5,
        findingType: faker.random.word(),
        source: faker.random.word(),
        correctionDeadLine: new Date(),
        reportedDate: new Date(),
        closedDate: null,
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      },
      {
        // 6
        findingId: findingId6,
        granteeId: grantThatsMonitoringReviewStatusIsNotCompleteNumberGranteeId6,
        statusId: statusId6,
        findingType: faker.random.word(),
        source: faker.random.word(),
        correctionDeadLine: new Date(),
        reportedDate: new Date(),
        closedDate: null,
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      },
      {
        // 7
        findingId: findingId7,
        granteeId: grantThatsMonitoringFindingStatusIsNotActiveNumberGranteeId7,
        statusId: statusId7,
        findingType: faker.random.word(),
        source: faker.random.word(),
        correctionDeadLine: new Date(),
        reportedDate: new Date(),
        closedDate: null,
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      },
      {
        // 8
        findingId: findingId8,
        granteeId: grantThatsMonitoringReviewReviewTypeIsNotAllowedNumberGranteeId8,
        statusId: statusId8,
        findingType: faker.random.word(),
        source: faker.random.word(),
        correctionDeadLine: new Date(),
        reportedDate: new Date(),
        closedDate: null,
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      },
      {
        // 9
        findingId: findingId9,
        granteeId: inactiveGrantThatHasBeenReplacedByActiveGrantNumberGranteeId9,
        statusId: statusId9,
        findingType: faker.random.word(),
        source: faker.random.word(),
        correctionDeadLine: new Date(),
        reportedDate: new Date(),
        closedDate: null,
        hash: faker.datatype.uuid(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
        sourceDeletedAt: null,
      },
    ], { individualHooks: true });

    // Retrieve the goal template.
    goalTemplate = await GoalTemplate.findOne({ where: { templateName: goalTemplateName } });

    // Create a goal for grantThatAlreadyHasMonitoringGoal2.
    await Goal.create({
      id: faker.datatype.number({ min: 9999 }),
      name: goalTemplateName,
      grantId: grantThatAlreadyHasMonitoringGoal2.id,
      goalTemplateId: goalTemplate.id,
      status: 'In progress',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await rollbackToSnapshot(snapShot);
    // Close the connection to the database.
    await sequelize.close();
  });

  it('logs an error is the monitoring goal template doesn\'t exist', async () => {
    // Get the current function for the GoalTemplate.findOne method and but it back later.
    const originalFindOne = GoalTemplate.findOne;
    // Mock the GoalTemplate.findOne method to return null.
    GoalTemplate.findOne = jest.fn().mockResolvedValueOnce(null);
    jest.spyOn(auditLogger, 'error');
    await createMonitoringGoals();
    expect(auditLogger.error).toHaveBeenCalledWith('Monitoring Goal template not found');
    // Put the original function back.
    GoalTemplate.findOne = originalFindOne;
  });

  it('creates monitoring goals for grants that need them', async () => {
    // Run the CRON job.
    await createMonitoringGoals();

    // CASE 1: Properly creates the monitoring goal.
    const grant1Goals = await Goal.findAll({ where: { grantId: grantThatNeedsMonitoringGoal1.id } });
    expect(grant1Goals.length).toBe(1);

    // Assert that the goal that was created was the monitoring goal and is using the correct template.
    expect(grant1Goals[0].goalTemplateId).toBe(goalTemplate.id);
    expect(grant1Goals[0].name).toBe(goalTemplateName);
    expect(grant1Goals[0].status).toBe('Not started');

    // CASE 2: Does not create a monitoring goal for a grant that already has one.
    const grant2Goals = await Goal.findAll({ where: { grantId: grantThatAlreadyHasMonitoringGoal2.id } });
    expect(grant2Goals.length).toBe(1);
    expect(grant2Goals[0].goalTemplateId).toBe(goalTemplate.id);
    expect(grant2Goals[0].name).toBe(goalTemplateName);
    expect(grant2Goals[0].status).toBe('In progress');

    // CASE 3: Does not create a monitoring goal for a grant that falls before the start date.
    const grant3Goals = await Goal.findAll({ where: { grantId: grantThatFallsBeforeStartDate3.id } });
    expect(grant3Goals.length).toBe(0);

    // CASE 4: Does not create a monitoring goal for a grant that falls after the cut off date.
    const grant4Goals = await Goal.findAll({ where: { grantId: grantThatFallsAfterCutOffDate4.id } });
    expect(grant4Goals.length).toBe(0);

    // CASE 5: Does not create a monitoring goal for an inactive grant.
    const grant5Goals = await Goal.findAll({ where: { grantId: grantThatIsInactive5.id } });
    expect(grant5Goals.length).toBe(0);

    // CASE 6: Does not create a monitoring goal for a grant that has a monitoring review with a status that is not complete.
    const grant6Goals = await Goal.findAll({ where: { grantId: grantThatsMonitoringReviewStatusIsNotComplete6.id } });
    expect(grant6Goals.length).toBe(0);

    // CASE 7: Does not create a monitoring goal for a grant that has a monitoring finding with a status that is not active.
    const grant7Goals = await Goal.findAll({ where: { grantId: grantThatsMonitoringFindingStatusIsNotActive7.id } });
    expect(grant7Goals.length).toBe(0);

    // CASE 8: Does not create a monitoring goal for a grant that has a monitoring review with a review type that is not allowed.
    const grant8Goals = await Goal.findAll({ where: { grantId: grantThatsMonitoringReviewReviewTypeIsNotAllowed8.id } });
    expect(grant8Goals.length).toBe(0);

    // CASE 9: Does not create a monitoring goal for an inactive grant that has been replaced by an active grant.
    const grant9Goals = await Goal.findAll({ where: { grantId: inactiveGrantThatHasBeenReplacedByActiveGrant9.id } });
    expect(grant9Goals.length).toBe(1);
    expect(grant9Goals[0].goalTemplateId).toBe(goalTemplate.id);
    expect(grant9Goals[0].name).toBe(goalTemplateName);
    expect(grant9Goals[0].status).toBe('Not started');
  });
});
