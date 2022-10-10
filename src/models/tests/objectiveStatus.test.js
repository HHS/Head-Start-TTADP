import db, {
  ActivityReport,
  ActivityRecipient,
  ActivityReportGoal,
  ActivityReportObjective,
  Goal,
  Objective,
  User,
  Recipient,
  Grant,
} from '..';
import { REPORT_STATUSES } from '../../constants';
import { auditLogger } from '../../logger';

const mockUser = {
  name: 'Joe Green',
  role: ['TTAC'],
  phoneNumber: '555-555-554',
  hsesUserId: '65536',
  hsesUsername: 'test50@test50.com',
  hsesAuthorities: ['ROLE_FEDERAL'],
  email: 'test50@test50.com',
  homeRegionId: 1,
  lastLogin: new Date('2021-02-09T15:13:00.000Z'),
  permissions: [
    {
      regionId: 1,
      scopeId: 1,
    },
    {
      regionId: 2,
      scopeId: 1,
    },
  ],
  flags: [],
};

const mockGrant = {
  regionId: 2,
  status: 'Active',
  startDate: new Date('2021-02-09T15:13:00.000Z'),
  endDate: new Date('2021-02-09T15:13:00.000Z'),
  cdi: false,
  grantSpecialistName: null,
  grantSpecialistEmail: null,
  stateCode: 'NY',
  annualFundingMonth: 'October',
};

const sampleReport = {
  submissionStatus: REPORT_STATUSES.DRAFT,
  calculatedStatus: REPORT_STATUSES.DRAFT,
  oldApprovingManagerId: 1,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  activityRecipientType: 'test',
  creatorRole: 'COR',
  topics: ['topic'],
  participants: ['test'],
  duration: 0,
  endDate: '2020-01-01T12:00:00Z',
  startDate: '2020-01-01T12:00:00Z',
  requester: 'requester',
  programTypes: ['type'],
  reason: ['reason'],
  ttaType: ['type'],
  regionId: 2,
  targetPopulations: ['target pop'],
  author: {
    fullName: 'Kiwi, GS',
    name: 'Kiwi',
    role: 'Grants Specialist',
    homeRegionId: 1,
  },
};

describe('Objective status update hook', () => {
  let user;

  let recipientOne;
  let recipientTwo;
  let recipientThree;
  let recipientFour;

  let grantOne;
  let grantTwo;
  let grantThree;
  let grantFour;

  let reportOne;
  let reportTwo;
  let reportThree;
  let reportOnlyUsingObjective;

  let goal;
  let goalTwo;
  let objective;
  let objectiveTwo;
  let objectiveTwoB;

  beforeAll(async () => {
    try {
      // User.
      user = await User.create({ ...mockUser });
      // Recipients.
      recipientOne = await Recipient.create({
        id: 234235,
        uei: 'NNA5N2KHMGM2',
        name: 'Mock Objective Status Recipient 1',
        recipientType: 'Mock Objective Status Recipient 1',
      });
      recipientTwo = await Recipient.create({
        id: 234236,
        uei: 'NNA5N2KHMGM3',
        name: 'Mock Objective Status Recipient 2',
        recipientType: 'Mock Objective Status Recipient 2',
      });
      recipientThree = await Recipient.create({
        id: 234237,
        uei: 'NNA5N2KHMGM4',
        name: 'Mock Objective Status Recipient 3',
        recipientType: 'Mock Objective Status Recipient 3',
      });
      recipientFour = await Recipient.create({
        id: 234258,
        uei: 'NNA5N2KHMGM4',
        name: 'Mock Objective Status Recipient 4',
        recipientType: 'Mock Objective Status Recipient 4',
      });
      // Grants.
      await Grant.create({
        ...mockGrant,
        id: 476467,
        number: '58947D89',
        recipientId: recipientOne.id,
        programSpecialistName: user.name,
        programSpecialistEmail: user.email,
      });
      grantOne = await Grant.findOne({ where: { id: 476467 } });

      await Grant.create({
        ...mockGrant,
        id: 476468,
        number: '58947D82',
        recipientId: recipientTwo.id,
        programSpecialistName: user.name,
        programSpecialistEmail: user.email,
      });
      grantTwo = await Grant.findOne({ where: { id: 476468 } });

      await Grant.create({
        ...mockGrant,
        id: 476469,
        number: '58947D83',
        recipientId: recipientThree.id,
        programSpecialistName: user.name,
        programSpecialistEmail: user.email,
      });
      grantThree = await Grant.findOne({ where: { id: 476469 } });

      await Grant.create({
        ...mockGrant,
        id: 476470,
        number: '58947D84',
        recipientId: recipientFour.id,
        programSpecialistName: user.name,
        programSpecialistEmail: user.email,
      });
      grantFour = await Grant.findOne({ where: { id: 476470 } });

      // Reports.
      reportOne = await ActivityReport.create({ ...sampleReport, endDate: '2022-09-30T12:00:00Z' });
      reportTwo = await ActivityReport.create({
        ...sampleReport,
        submissionStatus: REPORT_STATUSES.SUBMITTED,
        calculatedStatus: REPORT_STATUSES.APPROVED,
        endDate: '2022-09-29T12:00:00Z',
      });
      reportThree = await ActivityReport.create({ ...sampleReport });

      reportOnlyUsingObjective = await ActivityReport.create({ ...sampleReport, endDate: '2022-09-30T12:00:00Z' });

      // Activity Recipients.
      await ActivityRecipient.create(
        { activityReportId: reportOne.id, grantId: grantOne.id },
      );
      await ActivityRecipient.create(
        { activityReportId: reportTwo.id, grantId: grantTwo.id },
      );
      await ActivityRecipient.create(
        { activityReportId: reportThree.id, grantId: grantThree.id },
      );
      await ActivityRecipient.create(
        { activityReportId: reportOnlyUsingObjective.id, grantId: grantFour.id },
      );
      // Goals.
      goal = await Goal.create(
        {
          name: 'goal 1',
          grantId: grantOne.id,
        },
      );
      goalTwo = await Goal.create(
        {
          name: 'goal 2',
          grantId: grantTwo.id,
        },
      );

      // Objectives.
      objective = await Objective.create(
        {
          title: 'Objective Used on Reports',
          goalId: goal.id,
          status: 'Not Started',
        },
      );
      objectiveTwo = await Objective.create(
        {
          title: 'Objective Used on Reports Two',
          goalId: goalTwo.id,
          status: 'Not Started',
        },
      );
      objectiveTwoB = await Objective.create(
        {
          title: 'Objective Used on Reports Two B',
          goalId: goalTwo.id,
          status: 'In Progress',
        },
      );

      // ARO's
      ActivityReportObjective.create({
        activityReportId: reportOne.id,
        objectiveId: objective.id,
        status: 'Complete',
      });

      ActivityReportObjective.create({
        activityReportId: reportTwo.id,
        objectiveId: objective.id,
        status: 'In Progress',
      });

      ActivityReportObjective.create({
        activityReportId: reportThree.id,
        objectiveId: objective.id,
        status: 'Suspended',
      });

      ActivityReportObjective.create({
        activityReportId: reportOnlyUsingObjective.id,
        objectiveId: objectiveTwo.id,
        status: 'Complete',
      });

      ActivityReportObjective.create({
        activityReportId: reportOnlyUsingObjective.id,
        objectiveId: objectiveTwoB.id,
        status: 'Complete',
      });
    } catch (e) {
      auditLogger.error(JSON.stringify(e));
      throw e;
    }
  });
  afterAll(async () => {
    await ActivityRecipient.destroy({
      where: {
        activityReportId: [
          reportOne.id,
          reportTwo.id,
          reportThree.id,
          reportOnlyUsingObjective.id,
        ],
      },
    });
    await ActivityReportObjective.destroy({
      where:
      {
        activityReportId: [
          reportOne.id,
          reportTwo.id,
          reportThree.id,
          reportOnlyUsingObjective.id],
      },
    });
    await ActivityReportGoal.destroy({
      where:
      {
        activityReportId: [
          reportOne.id,
          reportTwo.id,
          reportThree.id,
          reportOnlyUsingObjective.id,
        ],
      },
    });
    await ActivityReport.destroy({
      where: {
        id: [
          reportOne.id,
          reportTwo.id,
          reportThree.id,
          reportOnlyUsingObjective.id],
      },
    });
    await Objective.destroy({ where: { id: [objective.id, objectiveTwo.id, objectiveTwoB.id] } });
    await Goal.destroy({ where: { id: [goal.id, goalTwo.id] } });
    await Grant.destroy({ where: { id: [grantOne.id, grantTwo.id, grantThree.id, grantFour.id] } });
    await Recipient.destroy({
      where:
      { id: [recipientOne.id, recipientTwo.id, recipientThree.id, recipientFour.id] },
    });
    await User.destroy({ where: { id: user.id } });
    await db.sequelize.close();
  });
  it('correct objective status moving to approved and from approved', async () => {
    // Get report to approve.
    const preReport = await ActivityReport.findOne(
      { where: { id: reportOne.id }, individualHooks: true },
    );
    // Approve report.
    await preReport.update(
      { calculatedStatus: REPORT_STATUSES.APPROVED, submissionStatus: REPORT_STATUSES.SUBMITTED },
    );
    // Assert correct status.
    const objectivesUpdated = await Objective.findAll({
      where: { id: objective.id },
    });
    expect(objectivesUpdated.length).toBe(1);
    expect(objectivesUpdated[0].status).toBe('Complete');

    // UnApprove report.
    await preReport.update(
      { calculatedStatus: REPORT_STATUSES.DRAFT, submissionStatus: REPORT_STATUSES.DRAFT },
    );
  });

  it('correct objective status with only one report using the objective', async () => {
    // Get report to approve.
    const preReport = await ActivityReport.findOne(
      { where: { id: reportOnlyUsingObjective.id }, individualHooks: true },
    );
    // Approve report.
    await preReport.update(
      { calculatedStatus: REPORT_STATUSES.APPROVED, submissionStatus: REPORT_STATUSES.SUBMITTED },
    );
    // Assert correct status.
    let objectivesUpdated = await Objective.findAll({
      where: { id: [objectiveTwo.id, objectiveTwoB.id] },
    });
    expect(objectivesUpdated.length).toBe(2);
    expect(objectivesUpdated[0].status).toBe('Complete');
    expect(objectivesUpdated[1].status).toBe('Complete');

    // UnApprove report.
    await preReport.update(
      { calculatedStatus: REPORT_STATUSES.DRAFT, submissionStatus: REPORT_STATUSES.DRAFT },
    );

    // Assert correct status.
    // For now don't roll objective status back.
    objectivesUpdated = await Objective.findAll({
      where: { id: [objectiveTwo.id, objectiveTwoB.id] },
    });
    expect(objectivesUpdated.length).toBe(2);
    expect(objectivesUpdated[0].status).toBe('Complete');
    expect(objectivesUpdated[1].status).toBe('Complete');
  });
});
