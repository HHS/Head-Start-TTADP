/* eslint-disable jest/no-disabled-tests */
import faker from '@faker-js/faker';
import { REPORT_STATUSES } from '../constants';
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
  createdAt: '2023-01-01T21:29:31.727Z',
};

// Other user.
const otherMockUser = {
  id: faker.datatype.number(),
  homeRegionId: 1,
  name: 'otherstatisticsuser1234',
  hsesUsername: 'otheruser1134265161',
  hsesUserId: 'otherstatisticsuser1234',
  createdAt: '2023-01-01T21:29:31.727Z',
};

// Extra user.
const extraMockUser = {
  id: faker.datatype.number(),
  homeRegionId: 1,
  name: 'extrastatisticsuser1234',
  hsesUsername: 'extrauser1134265161',
  hsesUserId: 'extrastatisticsuser1234',
  createdAt: '2023-01-01T21:29:31.727Z',
};

// Outside Region user.
const outsideRegionMockUser = {
  id: faker.datatype.number(),
  homeRegionId: 2,
  name: 'outsideRegionstatisticsuser1234',
  hsesUsername: 'outsideRegionuser1134265161',
  hsesUserId: 'outsideRegiontatisticsuser1234',
  createdAt: '2023-01-01T21:29:31.727Z',
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
  let recipientFour;
  let recipientOutsideRegion;
  let otherEntity;
  let grantOne;
  let grantTwo;
  let grantThree;
  let grantFour;
  let grantOutsideRegion;

  // Goals.
  let goal1; // created report1.
  let goal1b; // Same report as goal1.
  let goal2; // Collaborator report.
  let goal3; // Approver report.

  // Objectives.
  let obj1; // Goal 1.
  let obj2; // Goal 1.
  let obj3; // Goal 1b.

  let obj4; // Goal 2.
  let obj5; // Goal 3

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
  let approverReport2;
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
    recipientFour = await Recipient.create({ name: 'recipient stat four', id: faker.datatype.number(), uei: faker.datatype.string(12) });
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

    grantFour = await Grant.create({
      id: faker.datatype.number(),
      number: faker.random.alphaNumeric(5),
      cdi: false,
      regionId: 1,
      recipientId: recipientFour.id,
    });

    grantOutsideRegion = await Grant.create({
      id: faker.datatype.number(),
      number: faker.random.alphaNumeric(5),
      cdi: false,
      regionId: 2,
      recipientId: recipientOutsideRegion.id,
    });

    // Goals.
    goal1 = await Goal.create({
      name: 'Statistics Goal 1',
      status: 'In Progress',
      grantId: grantOne.id,
      previousStatus: 'Not Started',
    });

    goal1b = await Goal.create({
      name: 'Statistics Goal 1b',
      status: 'In Progress',
      grantId: grantOne.id,
      previousStatus: 'Not Started',
    });

    goal2 = await Goal.create({
      name: 'Statistics Goal 2',
      status: 'In Progress',
      grantId: grantTwo.id,
      previousStatus: 'Not Started',
    });

    goal3 = await Goal.create({
      name: 'Statistics Goal 2',
      status: 'In Progress',
      grantId: grantThree.id,
      previousStatus: 'Not Started',
    });

    // Objectives.
    obj1 = await Objective.create(
      {
        title: 'Statistics Goal 1 - Obj 1',
        goalId: goal1.id,
        status: 'Not Started',
      },
    );

    obj2 = await Objective.create(
      {
        title: 'Statistics Goal 1 - Obj 2',
        goalId: goal1.id,
        status: 'Not Started',
      },
    );

    obj3 = await Objective.create(
      {
        title: 'Statistics Goal 1b - Obj 1',
        goalId: goal1b.id,
        status: 'Not Started',
      },
    );

    obj4 = await Objective.create(
      {
        title: 'Statistics Goal 2 - Obj 1',
        goalId: goal2.id,
        status: 'Not Started',
      },
    );

    obj5 = await Objective.create(
      {
        title: 'Statistics Goal 3 - Obj 1',
        goalId: goal3.id,
        status: 'Not Started',
      },
    );

    // Exclude report.
    excludedUserReport = await ActivityReport.create(
      {
        ...report,
        userId: otherUser.id,
        lastUpdatedById: otherUser.id,
        activityRecipients: { activityRecipientId: recipientFour.id },
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

    // Exclude user activity recipient.
    await ActivityRecipient.create({
      activityReportId: excludedUserReport.id,
      grantId: grantFour.id,
    });

    // Exclude region report.
    excludeRegionReport = await ActivityReport.create(
      {
        ...report,
        userId: outsideRegionUser.id,
        regionId: 2,
        duration: 48.5,
        lastUpdatedById: outsideRegionUser.id,
        activityRecipients: { activityRecipientId: recipientOutsideRegion.id },
        activityReportCollaborators: [
          { user: { id: outsideRegionUser.id } },
        ],
      },
    );

    // Exclude region Activity Recipient.
    await ActivityRecipient.create({
      activityReportId: excludeRegionReport.id,
      grantId: grantOutsideRegion.id,
    });

    await ActivityReportCollaborator.create({
      activityReportId: excludeRegionReport.id,
      userId: outsideRegionUser.id,
    });

    // User created approvedReport1.
    approvedReport1 = await ActivityReport.create(
      {
        ...report,
        userId: user.id,
        duration: 22,
        numberOfParticipants: 2,
        lastUpdatedById: user.id,
        activityRecipients: { activityRecipientId: recipientOne.id },
      },
    );

    // Report 1 Activity Recipient.
    await ActivityRecipient.create({
      activityReportId: approvedReport1.id,
      grantId: grantOne.id,
    });

    // Create approvedReport1 goal's.
    await ActivityReportGoal.create({
      activityReportId: approvedReport1.id,
      goalId: goal1.id,
    });

    // Create approvedReport1 ARO's.
    await ActivityReportObjective.create({
      activityReportId: approvedReport1.id,
      objectiveId: obj1.id,
      status: 'In Progress',
    });

    await ActivityReportObjective.create({
      activityReportId: approvedReport1.id,
      objectiveId: obj2.id,
      status: 'In Progress',
    });

    await ActivityReportGoal.create({
      activityReportId: approvedReport1.id,
      goalId: goal1b.id,
    });

    await ActivityReportObjective.create({
      activityReportId: approvedReport1.id,
      objectiveId: obj3.id,
      status: 'In Progress',
    });

    // User created approvedReport2.
    approvedReport2 = await ActivityReport.create(
      {
        ...report,
        userId: user.id,
        lastUpdatedById: user.id,
        duration: 33,
        activityRecipients: { activityRecipientId: recipientTwo.id },
      },
    );

    // Report 2 Activity Recipient.
    await ActivityRecipient.create({
      activityReportId: approvedReport2.id,
      grantId: grantTwo.id,
    });

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

    // Create collaboratorReport1 goal's.
    await ActivityReportGoal.create({
      activityReportId: collaboratorReport1.id,
      goalId: goal2.id,
    });

    // Create collaboratorReport1 goal's.
    await ActivityReportObjective.create({
      activityReportId: collaboratorReport1.id,
      objectiveId: obj4.id,
      status: 'In Progress',
    });

    // Collaborator Activity Recipient.
    await ActivityRecipient.create({
      activityReportId: collaboratorReport1.id,
      grantId: grantThree.id,
    });

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
        userId: user.id, // Test creator and collaborator.
        duration: 2,
        lastUpdatedById: user.id,
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

    // Create approverReport1 goal's.
    await ActivityReportGoal.create({
      activityReportId: approverReport1.id,
      goalId: goal3.id,
    });

    // Create approverReport1 ARO
    await ActivityReportObjective.create({
      activityReportId: approverReport1.id,
      objectiveId: obj5.id,
      status: 'In Progress',
    });

    // Approver Activity Recipient.
    await ActivityRecipient.create({
      activityReportId: approverReport1.id,
      grantId: grantThree.id,
    });

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

    // Approver report 2.
    approverReport2 = await ActivityReport.create(
      {
        ...report,
        userId: user.id, // Cross created with approver.
        lastUpdatedById: user.id,
        activityRecipients: { activityRecipientId: recipientThree.id },
        duration: 1,
      },
    );

    await ActivityReportApprover.create({
      activityReportId: approverReport2.id,
      userId: user.id,
    });

    await ActivityReport.update({
      calculatedStatus: 'approved',
    }, {
      where: {
        id: approverReport2.id,
      },
    });

    // Approver Region report.
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
        activityReportId: [approverReport1.id, approverReport2.id, approverRegionReport1.id],
      },
      force: true,
    });

    // Delete ActivityReportObjectives.
    await ActivityReportObjective.destroy({
      where: {
        activityReportId: [approvedReport1.id, collaboratorReport1.id, approverReport1.id],
      },
    });

    // Delete ActivityReportGoals.
    await ActivityReportGoal.destroy({
      where: {
        activityReportId: [approvedReport1.id, collaboratorReport1.id, approverReport1.id],
      },
    });

    // Delete ActivityRecipient.
    await ActivityRecipient.destroy({
      where: {
        activityReportId:
          [approvedReport1.id,
            approvedReport2.id,
            excludeRegionReport.id,
            collaboratorReport1.id,
            approverReport1.id,
            excludedUserReport.id],
      },
      force: true,
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
          approverReport2.id,
          approverRegionReport1.id,
        ],
      },
    });

    // Delete objectives.
    await Objective.destroy({
      where:
      {
        id: [obj1.id, obj2.id, obj3.id, obj4.id, obj5.id],
      },
    });

    // Delete goals.
    await Goal.destroy({
      where: {
        grantId: [grantOne.id, grantTwo.id, grantThree.id],
      },
    });

    // Delete Grants.
    await Grant.destroy({
      where: {
        id: [grantOne.id, grantTwo.id, grantThree.id, grantFour.id, grantOutsideRegion.id],
      },
    });

    // Delete Recipient.
    await Recipient.destroy({
      where: {
        id: [recipientOne.id,
          recipientTwo.id,
          recipientThree.id,
          recipientFour.id,
          recipientOutsideRegion.id],
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
  - 3 approved reports in region.
  - 4 distinct grants and recipients.
  - 10 participants.
  - 4 Goals.
  - 5 Objectives.
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
    expect(response.arsCreated).toBe(9);

    // Collaborator reports.
    expect(response.arsCollaboratedOn).toBe(0);

    // TTA provided.
    expect(response.ttaProvided).toBe('7 days 2 hrs');

    // Recipients.
    expect(response.recipientsReached).toBe(4);

    // Grants.
    expect(response.grantsServed).toBe(4);

    // Participants.
    expect(response.participantsReached).toBe(10);

    // Goals.
    expect(response.goalsApproved).toBe(4);

    // Objectives.
    expect(response.objectivesApproved).toBe(5);
  });
  /*
  User Statistics:
    - 1 region excluded approved report.
    - 1 globally excluded approved report.
    - 5 created approved reports.
    - 2 collaborator reports.
    - 1 report as approver.
    - 3 distinct grants and recipients.
    - 8 participants.
    - 4 Goals.
    - 5 Objectives.
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
    expect(response.arsCreated).toBe(5);

    // Collaborator reports.
    expect(response.arsCollaboratedOn).toBe(2);

    // TTA provided.
    expect(response.ttaProvided).toBe('3 days 18 hrs');

    // Recipients.
    expect(response.recipientsReached).toBe(3);

    // Grants.
    expect(response.grantsServed).toBe(3);

    // Participants.
    expect(response.participantsReached).toBe(8);

    // Goals.
    expect(response.goalsApproved).toBe(4);

    // Objectives.
    expect(response.objectivesApproved).toBe(5);
  });
});
