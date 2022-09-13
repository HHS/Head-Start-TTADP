import faker from '@faker-js/faker';
import db, {
  Goal,
  Grant,
  Recipient,
  Objective,
  ActivityReport,
  ActivityRecipient,
  ActivityReportGoal,
  ActivityReportObjective,
} from '../../models';
import { REPORT_STATUSES } from '../../constants';
import { activityReportAndRecipientsById, createOrUpdate } from '../activityReports';

describe('removeRemovedRecipientsGoals', () => {
  let multiRecipientReport;
  let secondReport;
  let grantOne;
  let grantTwo;
  let recipients = [];
  let grants = [];
  let firstGoal;
  let secondGoal;
  let thirdGoal;
  let fourthGoal;
  let firstObjective;
  let secondObjective;
  let thirdObjective;

  beforeAll(async () => {
    const recipientOne = await Recipient.create(
      {
        id: faker.datatype.number({ min: 90000 }),
        name: faker.company.companyName(),
        uei: faker.datatype.string(12),
      },
    );

    const recipientTwo = await Recipient.create(
      {
        id: faker.datatype.number({ min: 90000 }),
        name: faker.company.companyName(),
        uei: faker.datatype.string(12),
      },
    );

    recipients = [recipientOne, recipientTwo];

    grantOne = await Grant.create(
      {
        id: recipientOne.id,
        number: faker.datatype.number({ min: 90000 }),
        recipientId: recipientOne.id,
      },
    );
    grantTwo = await Grant.create(
      {
        id: recipientTwo.id,
        number: faker.datatype.number({ min: 90000 }),
        recipientId: recipientTwo.id,
      },
    );

    grants = [grantOne, grantTwo];

    // Activity report for multiple recipients
    multiRecipientReport = await createOrUpdate({
      owner: { userId: 1 },
      approval: {
        submissionStatus: REPORT_STATUSES.DRAFT,
        calculatedStatus: REPORT_STATUSES.DRAFT,
      },
      regionId: 1,
      activityRecipientType: 'recipient',
      activityRecipients: [{ grantId: grantOne.id }, { grantId: grantTwo.id }],
    });

    firstGoal = await Goal.create({
      name: 'This is an existing goal',
      status: 'In Progress',
      grantId: grantOne.id,
      previousStatus: 'Not Started',
    });

    firstObjective = await Objective.create({
      goalId: firstGoal.id,
      status: 'In Progress',
      title: 'This is an existing objective',
    });

    await ActivityReportGoal.create({
      goalId: firstGoal.id,
      activityReportId: multiRecipientReport.id,
    });

    await ActivityReportObjective.create({
      objectiveId: firstObjective.id,
      activityReportId: multiRecipientReport.id,
    });

    secondGoal = await Goal.create({
      name: 'This is an existing goal',
      status: 'In Progress',
      grantId: grantTwo.id,
      previousStatus: 'Not Started',
    });

    secondObjective = await Objective.create({
      goalId: secondGoal.id,
      status: 'In Progress',
      title: 'This is an existing objective',
    });

    await ActivityReportGoal.create({
      goalId: secondGoal.id,
      activityReportId: multiRecipientReport.id,
    });

    await ActivityReportObjective.create({
      objectiveId: secondObjective.id,
      activityReportId: multiRecipientReport.id,
    });

    thirdGoal = await Goal.create({
      name: 'This is another existing goal',
      status: 'In Progress',
      grantId: grantOne.id,
      previousStatus: 'Not Started',
    });

    await ActivityReportGoal.create({
      goalId: thirdGoal.id,
      activityReportId: multiRecipientReport.id,
    });

    fourthGoal = await Goal.create({
      name: 'This is another existing goal',
      status: 'In Progress',
      grantId: grantTwo.id,
      previousStatus: 'Not Started',
      onApprovedAR: false,
    });

    await ActivityReportGoal.create({
      goalId: fourthGoal.id,
      activityReportId: multiRecipientReport.id,
    });

    secondReport = await createOrUpdate({
      owner: { userId: 1 },
      approval: {
        submissionStatus: REPORT_STATUSES.DRAFT,
        calculatedStatus: REPORT_STATUSES.DRAFT,
      },
      regionId: 1,
      activityRecipientType: 'recipient',
    });

    await ActivityReportGoal.create({
      goalId: fourthGoal.id,
      activityReportId: secondReport.id,
    });

    thirdObjective = await Objective.create({
      goalId: fourthGoal.id,
      status: 'In Progress',
      title: 'This is an existing objective on an unrelated report',
    });

    await ActivityReportObjective.create({
      activityReportId: secondReport.id,
      objectiveId: thirdObjective.id,
    });
  });

  afterAll(async () => {
    const reportIds = [multiRecipientReport.id, secondReport.id];

    await ActivityReportObjective.destroy({
      where: {
        activityReportId: reportIds,
      },
    });

    await Objective.destroy({
      where: {
        id: [firstObjective.id, secondObjective.id, thirdObjective.id],
      },
    });

    await ActivityReportGoal.destroy({
      where: {
        activityReportId: reportIds,
      },
    });

    await Goal.destroy({
      where: {
        grantId: [grantOne.id, grantTwo.id],
      },
    });

    await ActivityRecipient.destroy({
      where: {
        activityReportId: reportIds,
      },
    });

    await ActivityReport.destroy({
      where: {
        id: reportIds,
      },
    });

    await Promise.all(
      grants.map(async (g) => Grant.destroy({ where: { id: g.id } })),
    );

    await Promise.all(
      recipients.map(async (r) => Recipient.destroy({ where: { id: r.id } })),
    );

    await db.sequelize.close();
  });

  it('removes extra recipients', async () => {
    const [
      report, , goalsAndObjectives,
    ] = await activityReportAndRecipientsById(multiRecipientReport.id);

    expect(goalsAndObjectives.length).toBe(2);
    const [goal, goalNumberTwo] = goalsAndObjectives;
    expect(goal.goalIds.length).toBe(2);
    expect(goalNumberTwo.goalIds.length).toBe(2);

    const currentObjectives = await Objective.findAll({
      include: [
        {
          model: ActivityReportObjective,
          as: 'activityReportObjectives',
          where: {
            activityReportId: multiRecipientReport.id,
          },
          required: true,
        },
      ],
    });

    expect(currentObjectives.length).toBe(2);

    const newReport = {
      recipientsWhoHaveGoalsThatShouldBeRemoved: [grantTwo.id],
    };

    await createOrUpdate(newReport, report);

    const [
      , , goalsAndObjectivesAgain,
    ] = await activityReportAndRecipientsById(multiRecipientReport.id);

    expect(goalsAndObjectivesAgain.length).toBe(2);
    const [goalAgain, secondGoalAgain] = goalsAndObjectivesAgain;
    expect(goalAgain.goalIds.length).toBe(1);
    expect(secondGoalAgain.goalIds.length).toBe(1);

    const updatedObjectives = await Objective.findAll({
      include: [
        {
          model: ActivityReportObjective,
          as: 'activityReportObjectives',
          where: {
            activityReportId: multiRecipientReport.id,
          },
          required: true,
        },
      ],
    });
    expect(updatedObjectives.length).toBe(1);

    // we check to see it doesn't delete goals & objectives that are in use elsewhere
    const checkThisGoal = await Goal.findByPk(fourthGoal.id);
    expect(checkThisGoal).toBeTruthy();

    const checkThisObjective = await Objective.findByPk(thirdObjective.id);
    expect(checkThisObjective).toBeTruthy();

    // lastly, we check to make sure the correct goals are deleted
    const existingGoals = await Goal.findAll({
      attributes: ['id'],
      where: {
        id: [firstGoal.id, secondGoal.id, thirdGoal.id, fourthGoal.id],
      },
    });

    const existingGoalIds = existingGoals.map((g) => g.id);
    expect(existingGoalIds.length).toBe(3);
    expect(existingGoalIds).toContain(firstGoal.id);
    expect(existingGoalIds).toContain(thirdGoal.id);
    expect(existingGoalIds).toContain(fourthGoal.id);
  });
});
