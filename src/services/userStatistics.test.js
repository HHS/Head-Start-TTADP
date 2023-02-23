/* eslint-disable jest/no-disabled-tests */
import faker from '@faker-js/faker';
import { REPORT_STATUSES } from '../constants';
import { createOrUpdateGoalsForActivityReport } from './goals';
import { saveObjectivesForReport, getObjectivesByReportId } from './objectives';
import db, {
  Goal,
  Grant,
  Recipient,
  Objective,
  ActivityReport,
  ActivityReportGoal,
  ActivityReportObjective,
  User,
  OtherEntity,
  ActivityRecipient,
  ActivityReportCollaborator,
  ActivityReportApprover,
} from '../models';
import { statisticsByUser } from './users';

jest.mock('bull');

// User with Statistics.
const mockUser = {
  id: faker.datatype.number(),
  homeRegionId: 1,
  name: 'statisticsuser1234',
  hsesUsername: 'user1134265161',
  hsesUserId: 'statisticsuser1234',
  createdAt: '2023-01-01T21:29:31.727Z'
};

// Other user.
const otherMockUser = {
  id: faker.datatype.number(),
  homeRegionId: 1,
  name: 'otherstatisticsuser1234',
  hsesUsername: 'otheruser1134265161',
  hsesUserId: 'otherstatisticsuser1234',
  createdAt: '2023-01-01T21:29:31.727Z'
};

// Extra user.
const extraMockUser = {
  id: faker.datatype.number(),
  homeRegionId: 1,
  name: 'extrastatisticsuser1234',
  hsesUsername: 'extrauser1134265161',
  hsesUserId: 'extrastatisticsuser1234',
  createdAt: '2023-01-01T21:29:31.727Z'
};

// Outside Region user.
const outsideRegionMockUser = {
  id: faker.datatype.number(),
  homeRegionId: 2,
  name: 'outsideRegionstatisticsuser1234',
  hsesUsername: 'outsideRegionuser1134265161',
  hsesUserId: 'outsideRegiontatisticsuser1234',
  createdAt: '2023-01-01T21:29:31.727Z'
};

const report = {
  regionId: 1,
  activityRecipientType: 'recipient',
  submissionStatus: REPORT_STATUSES.SUBMITTED,
  calculatedStatus: REPORT_STATUSES.APPROVED,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 0,
  endDate: '2022-09-01T12:00:00Z',
  startDate: '2022-09-01T12:00:00Z',
  requester: 'requester',
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
  lastUpdatedById: mockUser.id,
  ECLKCResourcesUsed: ['test'],
  objectivesWithoutGoals: [],
  goals: [],
};

describe('statisticsByUser', () => {
  afterEach(async () => {
    jest.clearAllMocks();
  });
  let user;
  let otherUser;
  let extraUser;
  let outsideRegionUser;
  let recipientOne;
  let recipientTwo;
  let recipientThree;
  let recipientOutsideRegion;
  let otherEntity;
  let grantOne;
  let grantTwo;
  let grantThree;
  let grantOutsideRegion;

  // Excluded Report.
  let excludedUserReport;
  let excludeRegionReport;

  // Created Reports.
  let approvedReport1;
  let approvedReport2;
  let otherEntityApprovedReport;

  // Collaborator Report.
  let collaboratorReport1;
  let collaboratorReport2;

  // Approver On Report.
  let approverReport1;
  let approverRegionReport1;

  beforeAll(async () => {
    // Create user with statistics.
    user = await User.create(mockUser);

    // Create other user.
    otherUser = await User.create(otherMockUser);

    // Outside region user (region 2).
    outsideRegionUser = await User.create(outsideRegionMockUser);

    // Create extra user (approver, collaborator, etc.).
    extraUser = await User.create(extraMockUser);

    // Recipients.
    recipientOne = await Recipient.create({ name: 'recipient stat one', id: faker.datatype.number(), uei: faker.datatype.string(12) });
    recipientTwo = await Recipient.create({ name: 'recipient stat two', id: faker.datatype.number(), uei: faker.datatype.string(12) });
    recipientThree = await Recipient.create({ name: 'recipient stat three', id: faker.datatype.number(), uei: faker.datatype.string(12) });
    recipientOutsideRegion = await Recipient.create({ name: 'recipient stat outside region', id: faker.datatype.number(), uei: faker.datatype.string(12) });

    // Other entity.
    otherEntity = await OtherEntity.create({ name: 'Statistics Other Entity' });

    // Grants.
    grantOne = await Grant.create({
      id: faker.datatype.number(),
      number: faker.random.alphaNumeric(5),
      cdi: false,
      regionId: 1,
      recipientId: recipientOne.id,
    });
    grantTwo = await Grant.create({
      id: faker.datatype.number(),
      number: faker.random.alphaNumeric(5),
      cdi: false,
      regionId: 1,
      recipientId: recipientTwo.id,
    });
    grantThree = await Grant.create({
      id: faker.datatype.number(),
      number: faker.random.alphaNumeric(5),
      cdi: false,
      regionId: 1,
      recipientId: recipientThree.id,
    });

    grantOutsideRegion = await Grant.create({
      id: faker.datatype.number(),
      number: faker.random.alphaNumeric(5),
      cdi: false,
      regionId: 2,
      recipientId: recipientOutsideRegion.id,
    });

    // Exclude report.
    excludedUserReport = await ActivityReport.create(
      {
        ...report,
        userId: otherUser.id,
        lastUpdatedById: otherUser.id,
        activityRecipients: { activityRecipientId: recipientOne.id },
        duration: 80,
        activityReportCollaborators: [
          { user: { id: extraUser.id } },
        ],
      },
    );

    await ActivityReportCollaborator.create({
      activityReportId: excludedUserReport.id,
      userId: extraUser.id,
    });

    // Exclude region report.
    excludeRegionReport = await ActivityReport.create(
      {
        ...report,
        userId: outsideRegionUser.id,
        regionId: 2,
        duration: 48.5,
        lastUpdatedById: outsideRegionUser.id,
        activityRecipients: { activityRecipientId: outsideRegionUser.id },
        activityReportCollaborators: [
          { user: { id: outsideRegionUser.id } },
        ],
      },
    );

    await ActivityReportCollaborator.create({
      activityReportId: excludeRegionReport.id,
      userId: outsideRegionUser.id,
    });

    // User created reports.
    approvedReport1 = await ActivityReport.create(
      {
        ...report,
        userId: user.id,
        duration: 22,
        lastUpdatedById: user.id,
        activityRecipients: { activityRecipientId: recipientOne.id },
      },
    );

    approvedReport2 = await ActivityReport.create(
      {
        ...report,
        userId: user.id,
        lastUpdatedById: user.id,
        duration: 33,
        activityRecipients: { activityRecipientId: recipientTwo.id },
      },
    );

    otherEntityApprovedReport = await ActivityReport.create(
      {
        ...report,
        activityRecipientType: 'other-entity',
        userId: user.id,
        lastUpdatedById: user.id,
        duration: 12,
        activityRecipients: [],
      },
    );

    // Collaborator reports.
    collaboratorReport1 = await ActivityReport.create(
      {
        ...report,
        userId: otherUser.id,
        lastUpdatedById: otherUser.id,
        duration: 18,
        activityRecipients: { activityRecipientId: recipientThree.id },
        activityReportCollaborators: [
          { user: { id: extraUser.id } },
          { user: { id: user.id } },
        ],
      },
    );

    await ActivityReportCollaborator.create({
      activityReportId: collaboratorReport1.id,
      userId: extraUser.id,
    });

    await ActivityReportCollaborator.create({
      activityReportId: collaboratorReport1.id,
      userId: user.id,
    });

    collaboratorReport2 = await ActivityReport.create(
      {
        ...report,
        userId: otherUser.id,
        duration: 2,
        lastUpdatedById: otherUser.id,
        activityRecipients: { activityRecipientId: recipientThree.id },
        activityReportCollaborators: [
          { user: { id: user.id } },
        ],
      },
    );

    await ActivityReportCollaborator.create({
      activityReportId: collaboratorReport2.id,
      userId: user.id,
    });

    // Approver on Reports.
    approverReport1 = await ActivityReport.create(
      {
        ...report,
        userId: otherUser.id,
        lastUpdatedById: otherUser.id,
        activityRecipients: { activityRecipientId: recipientThree.id },
        duration: 2,
      },
    );

    await ActivityReportApprover.create({
      activityReportId: approverReport1.id,
      userId: user.id,
    });

    await ActivityReport.update({
      calculatedStatus: 'approved',
    }, {
      where: {
        id: approverReport1.id,
      },
    });

    approverRegionReport1 = await ActivityReport.create(
      {
        ...report,
        userId: otherUser.id,
        lastUpdatedById: otherUser.id,
        activityRecipients: { activityRecipientId: recipientThree.id },
      },
    );
    await ActivityReportApprover.create({
      activityReportId: approverRegionReport1.id,
      userId: otherUser.id,
    });

    await ActivityReport.update({
      calculatedStatus: 'approved',
    }, {
      where: {
        id: approverRegionReport1.id,
      },
    });
  });

  afterAll(async () => {

    // Delete collaborators.
    await ActivityReportCollaborator.destroy({
      where: {
        userId: [user.id, otherUser.id, extraUser.id, outsideRegionUser.id],
      },
    });


    // Delete Approvers.
    await ActivityReportApprover.destroy({
      where: {
        activityReportId: [approverReport1.id, approverRegionReport1.id]
      }, force: true
    });

    // Delete reports.
    await ActivityReport.destroy({
      where: {
        id: [
          excludedUserReport.id,
          excludeRegionReport.id,
          otherEntityApprovedReport.id,
          approvedReport1.id,
          approvedReport2.id,
          collaboratorReport1.id,
          collaboratorReport2.id,
          approverReport1.id,
          approverRegionReport1.id,
        ]
      }
    });

    // Delete Grants.
    await Grant.destroy({
      where: {
        id: [grantOne.id, grantTwo.id, grantThree.id, grantOutsideRegion.id],
      },
    });

    // Delete Recipient.
    await Recipient.destroy({
      where: {
        id: [recipientOne.id, recipientTwo.id, recipientThree.id, recipientOutsideRegion.id],
      },
    });

    // Delete Other Entity.
    await OtherEntity.destroy({
      where: {
        id: otherEntity.id,
      },
    });

    // Delete users.
    await User.destroy({
      where: {
        id: [user.id, otherUser.id, extraUser.id, outsideRegionUser.id],
      },
    });

    // Close Conn.
    await db.sequelize.close();
  });

  /*
  Region Statistics (readonly users):
  - 1 region excluded approved report.
  - 6 region approved reports.
  - 3 collaborator reports.
  - 2 approved reports in region.
  */
  it('gets region statistics', async () => {

    // Get statistics.
    const response = await statisticsByUser(user, [1], true);

    // Days since joined.
    const todaysDate = new Date();
    const createdDate = new Date(user.createdAt);
    const totalHours = Math.abs(todaysDate - createdDate) / 36e5;
    const totalDaysSinceJoined = Math.floor(totalHours / 24);
    expect(response.daysSinceJoined).toBe(totalDaysSinceJoined);

    // Created reports.
    expect(response.arsCreated).toBe(8);

    // Collaborator reports.
    expect(response.arsCollaboratedOn).toBe(3);

    // TTA provided.
    expect(response.ttaProvided).toBe('7 days 1 hrs');
  });
  /*
  User Statistics:
    - 1 region excluded approved report.
    - 1 globally excluded approved report.
    - 3 created approved reports.
    - 2 collaborator reports.
    - 1 report as approver.
    */
  it('gets user statistics', async () => {

    // Get statistics.
    const response = await statisticsByUser(user, [1]);

    // Days since joined.
    const todaysDate = new Date();
    const createdDate = new Date(user.createdAt);
    const totalHours = Math.abs(todaysDate - createdDate) / 36e5;
    const totalDaysSinceJoined = Math.floor(totalHours / 24);
    expect(response.daysSinceJoined).toBe(totalDaysSinceJoined);

    // Created reports.
    expect(response.arsCreated).toBe(3);

    // Collaborator reports.
    expect(response.arsCollaboratedOn).toBe(2);

    // TTA provided.
    expect(response.ttaProvided).toBe('3 days 17 hrs');
  });
});
