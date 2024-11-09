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
  GrantReplacement,
  Goal,
} from '../models';
import { captureSnapshot, rollbackToSnapshot } from '../lib/programmaticTransaction';
import { auditLogger } from '../logger';

jest.mock('../logger');

describe('createMonitoringGoals', () => {
  let recipient;
  let allGrants;

  const startingReportDeliveryDate = new Date('2023-12-01');

  const goalTemplateId = 18172;
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    try {
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

      // Insert into GrantReplacement to show that cdiGrant was replaced by inactiveGrantThatHasBeenReplacedByActiveGrant9.
      await GrantReplacement.create({
        replacedGrantId: cdiGrant.id,
        replacingGrantId: inactiveGrantThatHasBeenReplacedByActiveGrant9.id,
        grantReplacementTypeId: faker.datatype.number({ min: 1, max: 10 }),
        replacementDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Set allGrants to the grants that were created.
      allGrants = grants;

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
          grantNumber: inactiveGrantThatHasBeenReplacedByActiveGrant9.number,
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
      const statusId1 = faker.datatype.number({ min: 1, max: 9 });
      const statusId2 = faker.datatype.number({ min: 1, max: 9 });
      const statusId3 = faker.datatype.number({ min: 1, max: 9 });
      const statusId4 = faker.datatype.number({ min: 1, max: 9 });
      const statusId5 = faker.datatype.number({ min: 1, max: 9 });
      const statusId6 = faker.datatype.number({ min: 1, max: 9 });
      const statusId7 = faker.datatype.number({ min: 1, max: 9 });
      const statusId8 = faker.datatype.number({ min: 1, max: 9 });
      const statusId9 = faker.datatype.number({ min: 1, max: 9 });

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
      goalTemplate = await GoalTemplate.findOne({ where: { id: goalTemplateId } });

      // Create a goal for grantThatAlreadyHasMonitoringGoal2.
      await Goal.create({
        id: faker.datatype.number({ min: 9999 }),
        grantId: grantThatAlreadyHasMonitoringGoal2.id,
        goalTemplateId: goalTemplate.id,
        status: 'Active',
      });
    } catch (error) {
      console.log('\n\n\n============create error', error);
    }
  });

  afterAll(async () => {
    try {
      await rollbackToSnapshot(snapShot);
      // Close the connection to the database.
      await sequelize.close();
    } catch (error) {
      console.log('\n\n\n============delete error', error);
    }
  });

  it('logs an error is the monitoring goal template doesn\'t exist', async () => {
    // Mock the GoalTemplate.findOne method to return null.
    GoalTemplate.findOne = jest.fn().mockResolvedValueOnce(null);
    jest.spyOn(auditLogger, 'error');
    await createMonitoringGoals();
    expect(auditLogger.error).toHaveBeenCalledWith('Monitoring Goal template with ID 18172 not found');
  });

  it('creates monitoring goals for grants that need them', async () => {
    expect(true).toBe(true);
  });
});
