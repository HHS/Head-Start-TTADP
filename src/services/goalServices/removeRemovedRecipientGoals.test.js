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

describe('removeRemovedRecipientGoals', () => {
  let multiRecipientReport;
  let grantOne;
  let grantTwo;
  let recipients = [];
  let grants = [];
  let firstGoal;
  let secondGoal;
  let firstObjective;
  let secondObjective;

  beforeAll(async () => {
    const recipientOne = await Recipient.create(
      { id: faker.datatype.number({ min: 90000 }), name: faker.company.companyName() },
    );

    const recipientTwo = await Recipient.create(
      { id: faker.datatype.number({ min: 90000 }), name: faker.company.companyName() },
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
    multiRecipientReport = await ActivityReport.create({
      submissionStatus: REPORT_STATUSES.DRAFT,
      regionId: 1,
      userId: 1,
      activityRecipientType: 'recipient',
    });

    await ActivityRecipient.create({
      activityReportId: multiRecipientReport.id,
      grantId: grantOne.id,
    });

    await ActivityRecipient.create({
      activityReportId: multiRecipientReport.id,
      grantId: grantTwo.id,
    });

    // add goals for all recipients
    // query, check
    // delete recipients
    // go on

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
  });

  afterAll(async () => {
    const arObjectives = await ActivityReportObjective.findAll({
      where: {
        activityReportId: multiRecipientReport.id,
      },
    });

    const objectiveIds = arObjectives.map((aro) => aro.objectiveId);

    await ActivityReportObjective.destroy({
      where: {
        activityReportId: multiRecipientReport.id,
      },
    });

    await Objective.destroy({
      where: {
        id: objectiveIds,
      },
    });

    await ActivityReportGoal.destroy({
      where: {
        activityReportId: multiRecipientReport.id,
      },
    });

    await Goal.destroy({
      where: {
        grantId: [grantOne.id, grantTwo.id],
      },
    });

    await ActivityRecipient.destroy({
      where: {
        activityReportId: multiRecipientReport.id,
      },
    });

    await ActivityReport.destroy({
      where: {
        id: multiRecipientReport.id,
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

    expect(goalsAndObjectives.length).toBe(1);
    const [goal] = goalsAndObjectives;
    expect(goal.goalIds.length).toBe(2);

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
      recipientsWhomHaveGoalsThatShouldBeRemoved: [grantTwo.id],
    };

    await createOrUpdate(newReport, report);

    const [
      , , goalsAndObjectivesAgain,
    ] = await activityReportAndRecipientsById(multiRecipientReport.id);

    expect(goalsAndObjectivesAgain.length).toBe(1);
    const [goalAgain] = goalsAndObjectivesAgain;
    expect(goalAgain.goalIds.length).toBe(1);

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
  });
});
