/* eslint-disable no-console */
/* eslint-disable jest/expect-expect */
/* eslint-disable max-len */
import faker from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import { REPORT_STATUSES } from '@ttahub/common';
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
  GrantRelationshipToActive,
  ActivityReport,
  ActivityReportGoal,
  User,
  GoalStatusChange,
} from '../models';
import { captureSnapshot, rollbackToSnapshot } from '../lib/programmaticTransaction';
import { auditLogger } from '../logger';

jest.mock('../logger');

const mockUser = {
  id: 5874651,
  homeRegionId: 1,
  name: 'user5874665161',
  hsesUsername: 'user5874665161',
  hsesUserId: 'user5874665161',
  lastLogin: new Date(),
};

const draftReport = {
  activityRecipientType: 'recipient',
  submissionStatus: REPORT_STATUSES.DRAFT,
  userId: mockUser.id,
  regionId: 1,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  version: 2,
  language: ['English', 'Spanish'],
};

const approvedReport = {
  activityRecipientType: 'recipient',
  userId: mockUser.id,
  regionId: 1,
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  submissionStatus: REPORT_STATUSES.APPROVED,
  calculatedStatus: REPORT_STATUSES.APPROVED,
  oldApprovingManagerId: 1,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 0,
  endDate: '2020-09-01T12:00:00Z',
  startDate: '2020-09-01T12:00:00Z',
  requester: 'requester',
  targetPopulations: ['pop'],
  participants: ['participants'],
  reason: ['Monitoring | Area of Concern', 'New Director or Management', 'New Program Option'],
  topics: ['Child Screening and Assessment', 'Communication'],
  ttaType: ['type'],
  version: 2,
};

describe('createMonitoringGoals', () => {
  let recipient;
  let recipientForSplitCase10;
  let recipientForMergeCase11;

  let recipientForCase16;
  let recipientForCase17;

  const startingReportDeliveryDate = new Date('2023-12-01');

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
  // These grants represent a slightly more complex case when a
  // grant that has a monitoring goal is then split into two recipients.
  // We would expect a new monitoring goal to be created for only one of two new recipients.
  let grantBeingMonitoredSplit10A;
  let grantBeingMonitoredSplit10B;
  let grantBeingMonitoredSplit10C;
  // These grants represent a cae when two goals have a monitoring goal
  // but then they are merged into a single grant.
  let grantBeingMerged11A;
  let grantBeingMerged11B;
  let grantBeingMerged11C;
  // Make sure if a monitoring goal is closed but meets the criteria for a finding its re-open'd.
  let grantReopenMonitoringGoal12;
  // Make sure we close a monitoring goal if it has no active citations AND un-approved reports.
  let grantClosedMonitoringGoal13;
  let grantToNotCloseMonitoringGoal14;
  let grantWithApprovedReportsButOpenCitations15;

  // These will have a createdVia = 'activityReport' and should NOT be open or closed via this job.
  let grantWithNonMonitoringGoalToOpen16;
  let grantWithNonMonitoringGoalToClose17;

  const grantThatNeedsMonitoringGoalNumber1 = faker.datatype.string(4);
  const grantThatAlreadyHasMonitoringGoalNumber2 = faker.datatype.string(4);
  const grantThatFallsBeforeStartDateNumber3 = faker.datatype.string(4);
  const grantThatFallsAfterCutOffDateNumber4 = faker.datatype.string(4);
  const grantThatIsInactiveNumber5 = faker.datatype.string(4);
  const grantThatsMonitoringReviewStatusIsNotCompleteNumber6 = faker.datatype.string(4);
  const grantThatsMonitoringFindingStatusIsNotActiveNumber7 = faker.datatype.string(4);
  const grantThatsMonitoringReviewReviewTypeIsNotAllowedNumber8 = faker.datatype.string(4);
  const inactiveGrantThatHasBeenReplacedByActiveGrantNumber9 = faker.datatype.string(4);
  const grantBeingMonitoredSplitNumber10A = uuidv4();
  const grantBeingMonitoredSplitNumber10B = uuidv4();
  const grantBeingMonitoredSplitNumber10C = uuidv4();
  const grantBeingMergedNumber11A = uuidv4();
  const grantBeingMergedNumber11B = uuidv4();
  const grantBeingMergedNumber11C = uuidv4();
  const grantReopenMonitoringGoalNumber12 = uuidv4();
  const grantClosedMonitoringGoalNumber13 = uuidv4();
  const grantToNotCloseMonitoringGoalNumber14 = uuidv4();
  const grantWithApprovedReportsButOpenCitationsNumber15 = uuidv4();

  const grantWithNonMonitoringGoalToOpenNumber16 = uuidv4();
  const grantWithNonMonitoringGoalToCloseNumber17 = uuidv4();

  let goalForReopen12;
  let goalForClose13;

  let nonMonitoringGoalForReopen16;
  let nonMonitoringGoalForClose17;

  let snapShot;

  beforeAll(async () => {
    // Create a snapshot of the database so we can rollback after the tests.
    snapShot = await captureSnapshot();

    // Create user.
    const mockUserDb = await User.create(mockUser, { validate: false }, { individualHooks: false });

    // Recipient.
    recipient = await Recipient.create({
      id: faker.datatype.number({ min: 64000 }),
      name: faker.random.alphaNumeric(6),
    });

    recipientForSplitCase10 = await Recipient.create({
      id: faker.datatype.number({ min: 64000 }),
      name: faker.random.alphaNumeric(6),
    });

    recipientForMergeCase11 = await Recipient.create({
      id: faker.datatype.number({ min: 64000 }),
      name: faker.random.alphaNumeric(6),
    });

    recipientForCase16 = await Recipient.create({
      id: faker.datatype.number({ min: 64000 }),
      name: faker.random.alphaNumeric(6),
    });

    recipientForCase17 = await Recipient.create({
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
      {
        // 10 A
        id: faker.datatype.number({ min: 9999 }),
        number: grantBeingMonitoredSplitNumber10A,
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
      {
        // 10 B
        id: faker.datatype.number({ min: 9999 }),
        number: grantBeingMonitoredSplitNumber10B,
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
      {
        // 10 C
        id: faker.datatype.number({ min: 9999 }),
        number: grantBeingMonitoredSplitNumber10C,
        recipientId: recipientForSplitCase10.id, // Note the different recipient here.
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
      {
        // 11 A
        id: faker.datatype.number({ min: 9999 }),
        number: grantBeingMergedNumber11A,
        recipientId: recipientForMergeCase11.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
      {
        // 11 B
        id: faker.datatype.number({ min: 9999 }),
        number: grantBeingMergedNumber11B,
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
      {
        // 11 C
        id: faker.datatype.number({ min: 9999 }),
        number: grantBeingMergedNumber11C,
        recipientId: recipientForMergeCase11.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
      {
        // 12
        id: faker.datatype.number({ min: 9999 }),
        number: grantReopenMonitoringGoalNumber12,
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
      {
        // 13
        id: faker.datatype.number({ min: 9999 }),
        number: grantClosedMonitoringGoalNumber13,
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
      {
        // 14
        id: faker.datatype.number({ min: 9999 }),
        number: grantToNotCloseMonitoringGoalNumber14,
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
      {
        // 15
        id: faker.datatype.number({ min: 9999 }),
        number: grantWithApprovedReportsButOpenCitationsNumber15,
        recipientId: recipient.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
      {
        // 16
        id: faker.datatype.number({ min: 9999 }),
        number: grantWithNonMonitoringGoalToOpenNumber16,
        recipientId: recipientForCase16.id,
        regionId: 1,
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      },
      {
        // 17
        id: faker.datatype.number({ min: 9999 }),
        number: grantWithNonMonitoringGoalToCloseNumber17,
        recipientId: recipientForCase17.id,
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
      grantBeingMonitoredSplit10A,
      grantBeingMonitoredSplit10B,
      grantBeingMonitoredSplit10C,
      grantBeingMerged11A,
      grantBeingMerged11B,
      grantBeingMerged11C,
      grantReopenMonitoringGoal12,
      grantClosedMonitoringGoal13,
      grantToNotCloseMonitoringGoal14,
      grantWithApprovedReportsButOpenCitations15,
      grantWithNonMonitoringGoalToOpen16,
      grantWithNonMonitoringGoalToClose17,
    ] = grants;

    // Create an activity report that uses grantToNotCloseMonitoringGoal14.
    const dontCloseGoalAr = await ActivityReport.create({
      ...draftReport,
      lastUpdatedById: mockUserDb.id,
      submissionStatus: REPORT_STATUSES.DRAFT,
      calculatedStatus: REPORT_STATUSES.DRAFT,
      userId: mockUserDb.id,
      activityRecipients: [{ activityRecipientId: recipient.id }],
    });

    const dontCloseGoalCitations = await ActivityReport.create({
      ...approvedReport,
      lastUpdatedById: mockUserDb.id,
      submissionStatus: REPORT_STATUSES.APPROVED,
      calculatedStatus: REPORT_STATUSES.APPROVED,
      userId: mockUserDb.id,
      activityRecipients: [{ activityRecipientId: recipient.id }],
    });

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

    // Grant replacement for split case 10.
    // Grant A is replaced by Grant B and Grant C (C uses a different recipient).
    await sequelize.query(`
        INSERT INTO "GrantReplacements" ("replacedGrantId", "replacingGrantId", "grantReplacementTypeId", "replacementDate", "createdAt", "updatedAt")
        VALUES (${grantBeingMonitoredSplit10A.id}, ${grantBeingMonitoredSplit10B.id}, ${grantReplacementType[0].id}, NOW(), NOW(), NOW())
      `);

    await sequelize.query(`
        INSERT INTO "GrantReplacements" ("replacedGrantId", "replacingGrantId", "grantReplacementTypeId", "replacementDate", "createdAt", "updatedAt")
        VALUES (${grantBeingMonitoredSplit10A.id}, ${grantBeingMonitoredSplit10C.id}, ${grantReplacementType[0].id}, NOW(), NOW(), NOW())
      `);

    // Create a grant replacement for merge case 11.
    // Grant A and B are replaced by Grant C.
    await sequelize.query(`
        INSERT INTO "GrantReplacements" ("replacedGrantId", "replacingGrantId", "grantReplacementTypeId", "replacementDate", "createdAt", "updatedAt")
        VALUES (${grantBeingMerged11A.id}, ${grantBeingMerged11C.id}, ${grantReplacementType[0].id}, NOW(), NOW(), NOW())
      `);

    await sequelize.query(`
        INSERT INTO "GrantReplacements" ("replacedGrantId", "replacingGrantId", "grantReplacementTypeId", "replacementDate", "createdAt", "updatedAt")
        VALUES (${grantBeingMerged11A.id}, ${grantBeingMerged11C.id}, ${grantReplacementType[0].id}, NOW(), NOW(), NOW())
      `);

    // We need to call this to ensure the materialized view is updated.
    await GrantRelationshipToActive.refresh();

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
    const grantBeingMonitoredSplitNumberGranteeId10A = uuidv4();
    const grantBeingMonitoredSplitNumberGranteeId10B = uuidv4();
    // Exclude grantBeingMonitoredSplitNumberGranteeId10C from the granteeIds array below.
    const grantBeingMergedNumberGranteeId11A = uuidv4();
    const grantBeingMergedNumberGranteeId11B = uuidv4();
    const grantBeingMergedNumberGranteeId11C = uuidv4();
    const grantReopenMonitoringGoalNumberGranteeId12 = uuidv4();
    const grantClosedMonitoringGoalNumberGranteeId13 = uuidv4();
    const grantToNotCloseMonitoringGoalNumberGranteeId14 = uuidv4();
    const grantWithApprovedReportsButOpenCitationsNumberGranteeId15 = uuidv4();

    const grantWithNonMonitoringGoalToOpenNumberGranteeId16 = uuidv4();
    const grantWithNonMonitoringGoalToCloseNumberGranteeId17 = uuidv4();

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
    const grantBeingMonitoredSplitNumberReviewId10A = uuidv4();
    const grantBeingMonitoredSplitNumberReviewId10B = uuidv4();
    // Exclude grantBeingMonitoredSplitNumberReviewId10C from the reviewIds array below.
    const grantBeingMergedNumberReviewId11A = uuidv4();
    const grantBeingMergedNumberReviewId11B = uuidv4();
    const grantBeingMergedNumberReviewId11C = uuidv4();
    const grantReopenMonitoringGoalNumberReviewId12 = uuidv4();
    const grantClosedMonitoringGoalNumberReviewId13 = uuidv4();
    const grantToNotCloseMonitoringGoalNumberReviewId14 = uuidv4();
    const grantWithApprovedReportsButOpenCitationsNumberReviewId15 = uuidv4();
    const grantWithNonMonitoringGoalToOpenNumberReviewId16 = uuidv4();
    const grantWithNonMonitoringGoalToCloseNumberReviewId17 = uuidv4();

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
      {
        // 10 A
        id: faker.datatype.number({ min: 999999 }),
        grantNumber: grantBeingMonitoredSplitNumber10A,
        reviewId: grantBeingMonitoredSplitNumberReviewId10A,
        granteeId: grantBeingMonitoredSplitNumberGranteeId10A,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Support Team',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 10 B
        id: faker.datatype.number({ min: 999999 }),
        grantNumber: grantBeingMonitoredSplitNumber10B,
        reviewId: grantBeingMonitoredSplitNumberReviewId10B,
        granteeId: grantBeingMonitoredSplitNumberGranteeId10B,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Support Team',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 11 A
        id: faker.datatype.number({ min: 999999 }),
        grantNumber: grantBeingMergedNumber11A,
        reviewId: grantBeingMergedNumberReviewId11A,
        granteeId: grantBeingMergedNumberGranteeId11A,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Support Team',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      // create remaining entries for B and C.
      {
        // 11 B
        id: faker.datatype.number({ min: 999999 }),
        grantNumber: grantBeingMergedNumber11B,
        reviewId: grantBeingMergedNumberReviewId11B,
        granteeId: grantBeingMergedNumberGranteeId11B,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Support Team',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 11 C
        id: faker.datatype.number({ min: 999999 }),
        grantNumber: grantBeingMergedNumber11C,
        reviewId: grantBeingMergedNumberReviewId11C,
        granteeId: grantBeingMergedNumberGranteeId11C,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Support Team',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 12
        id: faker.datatype.number({ min: 999999 }),
        grantNumber: grantReopenMonitoringGoalNumber12,
        reviewId: grantReopenMonitoringGoalNumberReviewId12,
        granteeId: grantReopenMonitoringGoalNumberGranteeId12,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Support Team',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 13
        id: faker.datatype.number({ min: 999999 }),
        grantNumber: grantClosedMonitoringGoalNumber13,
        reviewId: grantClosedMonitoringGoalNumberReviewId13,
        granteeId: grantClosedMonitoringGoalNumberGranteeId13,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Support Team',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 14
        id: faker.datatype.number({ min: 999999 }),
        grantNumber: grantToNotCloseMonitoringGoalNumber14,
        reviewId: grantToNotCloseMonitoringGoalNumberReviewId14,
        granteeId: grantToNotCloseMonitoringGoalNumberGranteeId14,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Support Team',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 15
        id: faker.datatype.number({ min: 999999 }),
        grantNumber: grantWithApprovedReportsButOpenCitationsNumber15,
        reviewId: grantWithApprovedReportsButOpenCitationsNumberReviewId15,
        granteeId: grantWithApprovedReportsButOpenCitationsNumberGranteeId15,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Support Team',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 16
        id: faker.datatype.number({ min: 999999 }),
        grantNumber: grantWithNonMonitoringGoalToOpenNumber16,
        reviewId: grantWithNonMonitoringGoalToOpenNumberReviewId16,
        granteeId: grantWithNonMonitoringGoalToOpenNumberGranteeId16,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Support Team',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 17
        id: faker.datatype.number({ min: 999999 }),
        grantNumber: grantWithNonMonitoringGoalToCloseNumber17,
        reviewId: grantWithNonMonitoringGoalToCloseNumberReviewId17,
        granteeId: grantWithNonMonitoringGoalToCloseNumberGranteeId17,
        createTime: new Date(),
        updateTime: new Date(),
        updateBy: 'Support Team',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
    ], { individualHooks: true });

    // Create 9 statusId variables made up of 6 random numbers and set each one to its corresponding statusId below in MonitoringReview.bulkCreate.
    const statusId1 = 1;
    const statusId2 = 2;
    const statusId3 = 3;
    const statusId4 = 4;
    const statusId5 = 5;
    const statusId6 = 6;
    const statusId7 = 7;
    const statusId8 = 8;
    const statusId9 = 9;
    const status10A = 10;
    const status10B = 11;
    const status11A = 12;
    const status11B = 13;
    const status11C = 14;
    const status12 = 15;
    const status13 = 16;
    const status14 = 17;
    const status15 = 18;
    const status16 = 19;
    const status17 = 20;

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
      {
        // 10 A
        reviewId: grantBeingMonitoredSplitNumberReviewId10A,
        contentId: uuidv4(),
        statusId: status10A,
        name: faker.random.words(3),
        startDate: new Date(),
        endDate: new Date(),
        reviewType: 'RAN',
        reportDeliveryDate: new Date(),
        reportAttachmentId: uuidv4(),
        outcome: faker.random.words(5),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 10 B
        reviewId: grantBeingMonitoredSplitNumberReviewId10B,
        contentId: uuidv4(),
        statusId: status10B,
        name: faker.random.words(3),
        startDate: new Date(),
        endDate: new Date(),
        reviewType: 'RAN',
        reportDeliveryDate: new Date(),
        reportAttachmentId: uuidv4(),
        outcome: faker.random.words(5),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 11 A
        reviewId: grantBeingMergedNumberReviewId11A,
        contentId: uuidv4(),
        statusId: status11A,
        name: faker.random.words(3),
        startDate: new Date(),
        endDate: new Date(),
        reviewType: 'RAN',
        reportDeliveryDate: new Date(),
        reportAttachmentId: uuidv4(),
        outcome: faker.random.words(5),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 11 B
        reviewId: grantBeingMergedNumberReviewId11B,
        contentId: uuidv4(),
        statusId: status11B,
        name: faker.random.words(3),
        startDate: new Date(),
        endDate: new Date(),
        reviewType: 'RAN',
        reportDeliveryDate: new Date(),
        reportAttachmentId: uuidv4(),
        outcome: faker.random.words(5),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 11 B
        reviewId: grantBeingMergedNumberReviewId11C,
        contentId: uuidv4(),
        statusId: status11C,
        name: faker.random.words(3),
        startDate: new Date(),
        endDate: new Date(),
        reviewType: 'RAN',
        reportDeliveryDate: new Date(),
        reportAttachmentId: uuidv4(),
        outcome: faker.random.words(5),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 12
        reviewId: grantReopenMonitoringGoalNumberReviewId12,
        contentId: uuidv4(),
        statusId: status12,
        name: faker.random.words(3),
        startDate: new Date(),
        endDate: new Date(),
        reviewType: 'RAN',
        reportDeliveryDate: new Date(),
        reportAttachmentId: uuidv4(),
        outcome: faker.random.words(5),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 13
        reviewId: grantClosedMonitoringGoalNumberReviewId13,
        contentId: uuidv4(),
        statusId: status13,
        name: faker.random.words(3),
        startDate: new Date(),
        endDate: new Date(),
        reviewType: 'RAN',
        reportDeliveryDate: new Date(),
        reportAttachmentId: uuidv4(),
        outcome: faker.random.words(5),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 14
        reviewId: grantToNotCloseMonitoringGoalNumberReviewId14,
        contentId: uuidv4(),
        statusId: status14,
        name: faker.random.words(3),
        startDate: new Date(),
        endDate: new Date(),
        reviewType: 'RAN',
        reportDeliveryDate: new Date(),
        reportAttachmentId: uuidv4(),
        outcome: faker.random.words(5),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 15
        reviewId: grantWithApprovedReportsButOpenCitationsNumberReviewId15,
        contentId: uuidv4(),
        statusId: status15,
        name: faker.random.words(3),
        startDate: new Date(),
        endDate: new Date(),
        reviewType: 'RAN',
        reportDeliveryDate: new Date(),
        reportAttachmentId: uuidv4(),
        outcome: faker.random.words(5),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 16
        reviewId: grantWithNonMonitoringGoalToOpenNumberReviewId16,
        contentId: uuidv4(),
        statusId: status15,
        name: faker.random.words(3),
        startDate: new Date(),
        endDate: new Date(),
        reviewType: 'RAN',
        reportDeliveryDate: new Date(),
        reportAttachmentId: uuidv4(),
        outcome: faker.random.words(5),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 17
        reviewId: grantWithNonMonitoringGoalToCloseNumberReviewId17,
        contentId: uuidv4(),
        statusId: status15,
        name: faker.random.words(3),
        startDate: new Date(),
        endDate: new Date(),
        reviewType: 'RAN',
        reportDeliveryDate: new Date(),
        reportAttachmentId: uuidv4(),
        outcome: faker.random.words(5),
        hash: uuidv4(),
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
      {
        // 10 A
        statusId: status10A,
        name: 'Complete',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 10 B
        statusId: status10B,
        name: 'Complete',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 11 A
        statusId: status11A,
        name: 'Complete',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 11 B
        statusId: status11B,
        name: 'Complete',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 11 C
        statusId: status11C,
        name: 'Complete',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 12
        statusId: status12,
        name: 'Complete',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 13
        statusId: status13,
        name: 'Complete',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 14
        statusId: status14,
        name: 'Complete',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 15
        statusId: status15,
        name: 'Complete',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 16
        statusId: status16,
        name: 'Complete',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 17
        statusId: status17,
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
    const findingId10A = uuidv4();
    const findingId10B = uuidv4();
    const findingId11A = uuidv4();
    const findingId11B = uuidv4();
    const findingId11C = uuidv4();
    const findingId12 = uuidv4();
    const findingId13 = uuidv4();
    const findingId14 = uuidv4();
    const findingId15 = uuidv4();
    const findingId16 = uuidv4();
    const findingId17 = uuidv4();

    // Exclude findingId10C from the findingIds array below.
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
      {
        // 10 A
        reviewId: grantBeingMonitoredSplitNumberReviewId10A,
        findingHistoryId: uuidv4(),
        findingId: findingId10A,
        statusId: status10A,
        narrative: faker.random.words(10),
        ordinal: faker.datatype.number({ min: 1, max: 10 }),
        determination: faker.random.words(5),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 10 B
        reviewId: grantBeingMonitoredSplitNumberReviewId10B,
        findingHistoryId: uuidv4(),
        findingId: findingId10B,
        statusId: status10B,
        narrative: faker.random.words(10),
        ordinal: faker.datatype.number({ min: 1, max: 10 }),
        determination: faker.random.words(5),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 11 A
        reviewId: grantBeingMergedNumberReviewId11A,
        findingHistoryId: uuidv4(),
        findingId: findingId11A,
        statusId: status11A,
        narrative: faker.random.words(10),
        ordinal: faker.datatype.number({ min: 1, max: 10 }),
        determination: faker.random.words(5),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 11 B
        reviewId: grantBeingMergedNumberReviewId11B,
        findingHistoryId: uuidv4(),
        findingId: findingId11B,
        statusId: status11B,
        narrative: faker.random.words(10),
        ordinal: faker.datatype.number({ min: 1, max: 10 }),
        determination: faker.random.words(5),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 11 C
        reviewId: grantBeingMergedNumberReviewId11C,
        findingHistoryId: uuidv4(),
        findingId: findingId11C,
        statusId: status11C,
        narrative: faker.random.words(10),
        ordinal: faker.datatype.number({ min: 1, max: 10 }),
        determination: faker.random.words(5),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 12
        reviewId: grantReopenMonitoringGoalNumberReviewId12,
        findingHistoryId: uuidv4(),
        findingId: findingId12,
        statusId: status12,
        narrative: faker.random.words(10),
        ordinal: faker.datatype.number({ min: 1, max: 10 }),
        determination: faker.random.words(5),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 13
        reviewId: grantClosedMonitoringGoalNumberReviewId13,
        findingHistoryId: uuidv4(),
        findingId: findingId13,
        statusId: status13,
        narrative: faker.random.words(10),
        ordinal: faker.datatype.number({ min: 1, max: 10 }),
        determination: faker.random.words(5),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 14
        reviewId: grantToNotCloseMonitoringGoalNumberReviewId14,
        findingHistoryId: uuidv4(),
        findingId: findingId14,
        statusId: status14,
        narrative: faker.random.words(10),
        ordinal: faker.datatype.number({ min: 1, max: 10 }),
        determination: faker.random.words(5),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 15
        reviewId: grantWithApprovedReportsButOpenCitationsNumberReviewId15,
        findingHistoryId: uuidv4(),
        findingId: findingId15,
        statusId: status15,
        narrative: faker.random.words(10),
        ordinal: faker.datatype.number({ min: 1, max: 10 }),
        determination: faker.random.words(5),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 16
        reviewId: grantWithNonMonitoringGoalToOpenNumberReviewId16,
        findingHistoryId: uuidv4(),
        findingId: findingId16,
        statusId: status16,
        narrative: faker.random.words(10),
        ordinal: faker.datatype.number({ min: 1, max: 10 }),
        determination: faker.random.words(5),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 17
        reviewId: grantWithNonMonitoringGoalToCloseNumberReviewId17,
        findingHistoryId: uuidv4(),
        findingId: findingId17,
        statusId: status17,
        narrative: faker.random.words(10),
        ordinal: faker.datatype.number({ min: 1, max: 10 }),
        determination: faker.random.words(5),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
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
      {
        // 10 A
        findingId: findingId10A,
        statusId: status10A,
        findingType: faker.random.word(),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 10 B
        findingId: findingId10B,
        statusId: status10B,
        findingType: faker.random.word(),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 11 A
        findingId: findingId11A,
        statusId: status11A,
        findingType: faker.random.word(),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 11 B
        findingId: findingId11B,
        statusId: status11B,
        findingType: faker.random.word(),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 11 C
        findingId: findingId11C,
        statusId: status11C,
        findingType: faker.random.word(),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 12
        findingId: findingId12,
        statusId: status12,
        findingType: faker.random.word(),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 13
        findingId: findingId13,
        statusId: status13,
        findingType: faker.random.word(),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 14
        findingId: findingId14,
        statusId: status14,
        findingType: faker.random.word(),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 15
        findingId: findingId15,
        statusId: status15,
        findingType: faker.random.word(),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 16
        findingId: findingId16,
        statusId: status16,
        findingType: faker.random.word(),
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 17
        findingId: findingId17,
        statusId: status17,
        findingType: faker.random.word(),
        hash: uuidv4(),
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
      {
        // 10 A
        statusId: status10A,
        name: 'Active',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 10 B
        statusId: status10B,
        name: 'Active',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 11 C
        statusId: status11C,
        name: 'Active',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 12
        statusId: status12,
        name: 'Active',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 13
        statusId: status13,
        name: 'Closed',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 14
        statusId: status14,
        name: 'Closed',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 15
        statusId: status15,
        name: 'Active',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 16
        statusId: status16,
        name: 'Active',
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 17
        statusId: status17,
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
      {
        // 10 A
        findingId: findingId10A,
        granteeId: grantBeingMonitoredSplitNumberGranteeId10A,
        statusId: status10A,
        findingType: faker.random.word(),
        source: faker.random.word(),
        correctionDeadLine: new Date(),
        reportedDate: new Date(),
        closedDate: null,
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 10 B
        findingId: findingId10B,
        granteeId: grantBeingMonitoredSplitNumberGranteeId10B,
        statusId: status10B,
        findingType: faker.random.word(),
        source: faker.random.word(),
        correctionDeadLine: new Date(),
        reportedDate: new Date(),
        closedDate: null,
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 11 A
        findingId: findingId11A,
        granteeId: grantBeingMergedNumberGranteeId11A,
        statusId: status11A,
        findingType: faker.random.word(),
        source: faker.random.word(),
        correctionDeadLine: new Date(),
        reportedDate: new Date(),
        closedDate: null,
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 11 B
        findingId: findingId11B,
        granteeId: grantBeingMergedNumberGranteeId11B,
        statusId: status11B,
        findingType: faker.random.word(),
        source: faker.random.word(),
        correctionDeadLine: new Date(),
        reportedDate: new Date(),
        closedDate: null,
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 11 C
        findingId: findingId11C,
        granteeId: grantBeingMergedNumberGranteeId11C,
        statusId: status11C,
        findingType: faker.random.word(),
        source: faker.random.word(),
        correctionDeadLine: new Date(),
        reportedDate: new Date(),
        closedDate: null,
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 12
        findingId: findingId12,
        granteeId: grantReopenMonitoringGoalNumberGranteeId12,
        statusId: status12,
        findingType: faker.random.word(),
        source: faker.random.word(),
        correctionDeadLine: new Date(),
        reportedDate: new Date(),
        closedDate: null,
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 13
        findingId: findingId13,
        granteeId: grantClosedMonitoringGoalNumberGranteeId13,
        statusId: status13,
        findingType: faker.random.word(),
        source: faker.random.word(),
        correctionDeadLine: new Date(),
        reportedDate: new Date(),
        closedDate: null,
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 14
        findingId: findingId14,
        granteeId: grantToNotCloseMonitoringGoalNumberGranteeId14,
        statusId: status14,
        findingType: faker.random.word(),
        source: faker.random.word(),
        correctionDeadLine: new Date(),
        reportedDate: new Date(),
        closedDate: null,
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 15
        findingId: findingId15,
        granteeId: grantWithApprovedReportsButOpenCitationsNumberGranteeId15,
        statusId: status15,
        findingType: faker.random.word(),
        source: faker.random.word(),
        correctionDeadLine: new Date(),
        reportedDate: new Date(),
        closedDate: null,
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 16
        findingId: findingId16,
        granteeId: grantWithNonMonitoringGoalToOpenNumberGranteeId16,
        statusId: status16,
        findingType: faker.random.word(),
        source: faker.random.word(),
        correctionDeadLine: new Date(),
        reportedDate: new Date(),
        closedDate: null,
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
      {
        // 17
        findingId: findingId17,
        granteeId: grantWithNonMonitoringGoalToCloseNumberGranteeId17,
        statusId: status17,
        findingType: faker.random.word(),
        source: faker.random.word(),
        correctionDeadLine: new Date(),
        reportedDate: new Date(),
        closedDate: null,
        hash: uuidv4(),
        sourceCreatedAt: new Date(),
        sourceUpdatedAt: new Date(),
      },
    ], { individualHooks: true });

    // Retrieve the goal template.
    goalTemplate = await GoalTemplate.findOne({ where: { standard: 'Monitoring' }, paranoid: false });

    // Create a goal for grantThatAlreadyHasMonitoringGoal2.
    await Goal.create({
      id: faker.datatype.number({ min: 9999 }),
      name: goalTemplateName,
      grantId: grantThatAlreadyHasMonitoringGoal2.id,
      goalTemplateId: goalTemplate.id,
      status: 'In progress',
      createdVia: 'monitoring',
    });

    // Create a monitoring goal for grantBeingMonitoredSplit10A in case 10 the split.
    await Goal.create({
      id: faker.datatype.number({ min: 9999 }),
      name: goalTemplateName,
      grantId: grantBeingMonitoredSplit10A.id,
      goalTemplateId: goalTemplate.id,
      status: 'Not Started',
      createdVia: 'monitoring',
    });

    // Create a existing monitoring goal for Case 11 on Grant A and B.
    await Goal.create({
      id: faker.datatype.number({ min: 9999 }),
      name: goalTemplateName,
      grantId: grantBeingMerged11A.id,
      goalTemplateId: goalTemplate.id,
      status: 'Not Started',
      createdVia: 'monitoring',
    });

    await Goal.create({
      id: faker.datatype.number({ min: 9999 }),
      name: goalTemplateName,
      grantId: grantBeingMerged11B.id,
      goalTemplateId: goalTemplate.id,
      status: 'Not Started',
      createdVia: 'monitoring',
    });

    // Create a monitoring goal for grantReopenMonitoringGoalNumberReviewId12 in case 12 thats closed and should be set to Not started.
    goalForReopen12 = await Goal.create({
      id: faker.datatype.number({ min: 9999 }),
      name: goalTemplateName,
      grantId: grantReopenMonitoringGoal12.id,
      goalTemplateId: goalTemplate.id,
      status: 'Closed',
      createdVia: 'monitoring',
    });

    // Create a monitoring goal to be closed that no longer has any active citations or un-approved reports.
    goalForClose13 = await Goal.create({
      id: faker.datatype.number({ min: 9999 }),
      name: goalTemplateName,
      grantId: grantClosedMonitoringGoal13.id,
      goalTemplateId: goalTemplate.id,
      status: 'Not started',
      createdVia: 'monitoring',
    });

    // Goals that should NOT be opened or closed.
    nonMonitoringGoalForReopen16 = await Goal.create({
      id: faker.datatype.number({ min: 9999 }),
      name: goalTemplateName,
      grantId: grantWithNonMonitoringGoalToOpen16.id,
      goalTemplateId: goalTemplate.id,
      createdVia: 'activityReport',
      status: 'Closed',
    });

    nonMonitoringGoalForClose17 = await Goal.create({
      id: faker.datatype.number({ min: 9999 }),
      name: goalTemplateName,
      grantId: grantWithNonMonitoringGoalToClose17.id,
      goalTemplateId: goalTemplate.id,
      createdVia: 'activityReport',
      status: 'Not started',
    });

    // Goal with no active citations but has a report.
    const goalWithNoActiveCitationsButReport = await Goal.create({
      id: faker.datatype.number({ min: 9999 }),
      name: goalTemplateName,
      grantId: grantToNotCloseMonitoringGoal14.id,
      goalTemplateId: goalTemplate.id,
      status: 'Not started',
      createdVia: 'monitoring',
    });
      // Create ActivityReportGoal.
    await ActivityReportGoal.create({
      activityReportId: dontCloseGoalAr.id,
      goalId: goalWithNoActiveCitationsButReport.id,
      isActivelyEdited: false,
    });

    // Goal with active citations and an approved report.
    const goalWithActiveCitationsAndApprovedReport = await Goal.create({
      id: faker.datatype.number({ min: 9999 }),
      name: goalTemplateName,
      grantId: grantWithApprovedReportsButOpenCitations15.id,
      goalTemplateId: goalTemplate.id,
      status: 'Not started',
      createdVia: 'monitoring',
    });

    // Create ActivityReportGoal.
    await ActivityReportGoal.create({
      activityReportId: dontCloseGoalCitations.id,
      goalId: goalWithActiveCitationsAndApprovedReport.id,
      isActivelyEdited: false,
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

  const assertMonitoringGoals = async () => {
    // CASE 1: Properly creates the monitoring goal.
    const grant1Goals = await Goal.findAll({ where: { grantId: grantThatNeedsMonitoringGoal1.id } });
    expect(grant1Goals.length).toBe(1);

    // Assert that the goal that was created was the monitoring goal and is using the correct template.
    expect(grant1Goals[0].goalTemplateId).toBe(goalTemplate.id);
    expect(grant1Goals[0].name).toBe(goalTemplateName);
    expect(grant1Goals[0].status).toBe('Not Started');

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
    expect(grant9Goals[0].status).toBe('Not Started');

    // CASE 10: Creates a monitoring goal ONLY for the grant that initially had the monitoring goal and does NOT create one for the split grant..
    const grant10AGoals = await Goal.findAll({ where: { grantId: grantBeingMonitoredSplit10A.id } });
    expect(grant10AGoals.length).toBe(1);
    expect(grant10AGoals[0].goalTemplateId).toBe(goalTemplate.id);

    const grant10CGoals = await Goal.findAll({ where: { grantId: grantBeingMonitoredSplit10B.id } });
    expect(grant10CGoals.length).toBe(1);
    expect(grant10CGoals[0].goalTemplateId).toBe(goalTemplate.id);

    const grant10BGoals = await Goal.findAll({ where: { grantId: grantBeingMonitoredSplit10C.id } });
    expect(grant10BGoals.length).toBe(0);

    // CASE 11: Creates a monitoring goal for the merged grant.
    const grant11AGoals = await Goal.findAll({ where: { grantId: grantBeingMerged11A.id } });
    expect(grant11AGoals.length).toBe(1);
    expect(grant11AGoals[0].goalTemplateId).toBe(goalTemplate.id);

    const grant11BGoals = await Goal.findAll({ where: { grantId: grantBeingMerged11B.id } });
    expect(grant11BGoals.length).toBe(1);
    expect(grant11BGoals[0].goalTemplateId).toBe(goalTemplate.id);

    const grant11CGoals = await Goal.findAll({ where: { grantId: grantBeingMerged11C.id } });
    expect(grant11CGoals.length).toBe(1);
    expect(grant11CGoals[0].goalTemplateId).toBe(goalTemplate.id);

    // CASE 12: Reopen closed monitoring goal if it meets the criteria.
    const grant12Goals = await Goal.findAll({ where: { grantId: grantReopenMonitoringGoal12.id } });
    expect(grant12Goals.length).toBe(1);
    expect(grant12Goals[0].goalTemplateId).toBe(goalTemplate.id);
    expect(grant12Goals[0].status).toBe('Not Started');

    // Ensure the correct GoalChangeStatus has been created.
    const goalChangeStatus12 = await GoalStatusChange.findOne({ where: { goalId: goalForReopen12.id } });
    expect(goalChangeStatus12).not.toBeNull();
    expect(goalChangeStatus12.userId).toBeNull();
    expect(goalChangeStatus12.oldStatus).toBe('Closed');
    expect(goalChangeStatus12.newStatus).toBe('Not Started');
    expect(goalChangeStatus12.userName).toBe('system');
    expect(goalChangeStatus12.reason).toBe('Active monitoring citations');

    // CASE 13: Closes monitoring goal that no longer has any active citations.
    const grant13Goals = await Goal.findAll({ where: { grantId: grantClosedMonitoringGoal13.id } });
    expect(grant13Goals.length).toBe(1);
    expect(grant13Goals[0].goalTemplateId).toBe(goalTemplate.id);
    expect(grant13Goals[0].status).toBe('Closed');

    // Ensure the correct GoalChangeStatus has been created.
    const goalChangeStatus13 = await GoalStatusChange.findOne({ where: { goalId: goalForClose13.id } });
    expect(goalChangeStatus13).not.toBeNull();
    expect(goalChangeStatus13.userId).toBeNull();
    expect(goalChangeStatus13.oldStatus).toBe('Not started');
    expect(goalChangeStatus13.newStatus).toBe('Closed');
    expect(goalChangeStatus13.userName).toBe('system');
    expect(goalChangeStatus13.reason).toBe('No active monitoring citations');

    // CASE 14: Monitoring goal with no active citations but has a unapproved report (don't close).
    const grant14Goals = await Goal.findAll({ where: { grantId: grantToNotCloseMonitoringGoal14.id } });
    expect(grant14Goals.length).toBe(1);
    expect(grant14Goals[0].goalTemplateId).toBe(goalTemplate.id);
    expect(grant14Goals[0].status).toBe('Not started');

    // CASE 15: Monitoring goal with active citations and an approved report (don't close).
    const grant15Goals = await Goal.findAll({ where: { grantId: grantWithApprovedReportsButOpenCitations15.id } });
    expect(grant15Goals.length).toBe(1);
    expect(grant15Goals[0].goalTemplateId).toBe(goalTemplate.id);
    expect(grant15Goals[0].status).toBe('Not started');

    // CASE 16 & 17: We should not open or close goals without createdVia='monitoring'
    const grant16Goals = await Goal.findAll({ where: { grantId: grantWithNonMonitoringGoalToOpen16.id } });
    expect(grant16Goals.length).toBe(1);
    expect(grant16Goals[0].status).toBe('Closed');

    const grant17Goals = await Goal.findAll({ where: { grantId: grantWithNonMonitoringGoalToClose17.id } });
    expect(grant17Goals.length).toBe(1);
    expect(grant17Goals[0].status).toBe('Not started');
  };

  it('creates monitoring goals for grants that need them', async () => {
    // 1st Run of the CRON job.
    await createMonitoringGoals();
    await assertMonitoringGoals();

    // 2nd Run of the CRON job.
    // Run the job again to make sure we don't duplicate goals.
    await createMonitoringGoals();
    await assertMonitoringGoals();
  });

  it('uses auditlogger.error to log an error', async () => {
    // Mock GoalTemplate.findOne to throw an error:
    GoalTemplate.findOne = jest.fn().mockRejectedValueOnce(new Error('Test error'));
    jest.spyOn(auditLogger, 'error');
    await createMonitoringGoals();
    expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error creating monitoring:'));
  });
});
