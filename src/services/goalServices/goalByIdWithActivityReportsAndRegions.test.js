import faker from '@faker-js/faker';
import db, {
  Recipient,
  Grant,
  GrantGoal,
  Goal,
  ActivityReportObjective,
  Objective,
} from '../../models';
import { createReport, destroyReport } from '../../testUtils';

import { goalByIdWithActivityReportsAndRegions } from '../goals';
import { REPORT_STATUSES } from '../../constants';

describe('goalByIdWithActivityReportsAndRegions', () => {
  let recipientForFirstGrant;
  let recipientForSecondGrant;
  let firstGrant;
  let secondGrant;
  let report;
  let goalOnActivityReport;
  let goalOnOneGrant;
  let goalOnTwoGrants;

  beforeAll(async () => {
    recipientForFirstGrant = await Recipient.create({
      id: faker.datatype.number({ min: 64000 }), name: faker.random.alphaNumeric(6),
    });

    recipientForSecondGrant = await Recipient.create({
      id: faker.datatype.number({ min: 64000 }), name: faker.random.alphaNumeric(6),
    });

    firstGrant = await Grant.create({
      number: recipientForFirstGrant.id,
      recipientId: recipientForFirstGrant.id,
      programSpecialistName: faker.name.firstName(),
      regionId: 1,
      id: faker.datatype.number({ min: 64000 }),
    });

    secondGrant = await Grant.create({
      number: recipientForSecondGrant.id,
      recipientId: recipientForSecondGrant.id,
      programSpecialistName: faker.name.firstName(),
      regionId: 2,
      id: faker.datatype.number({ min: 64000 }),
    });

    goalOnActivityReport = await Goal.create({
      name: 'Goal on activity report',
      status: 'In progress',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      id: faker.datatype.number({ min: 64000 }),
    });

    await GrantGoal.create({
      goalId: goalOnActivityReport.id,
      grantId: firstGrant.id,
      recipientId: recipientForFirstGrant.id,
    });

    const objective = await Objective.create({
      goalId: goalOnActivityReport.id,
      title: 'objective test',
      ttaProvided: 'asdfadf',
      status: 'Not Started',
    });

    report = await createReport({
      regionId: 1,
      activityRecipients: [
        { grantId: firstGrant.id },
      ],
      calculatedStatus: REPORT_STATUSES.APPROVED,
    });

    await ActivityReportObjective.create({
      activityReportId: report.id,
      objectiveId: objective.id,
    });

    goalOnOneGrant = await Goal.create({
      name: 'Goal on one grant',
      status: 'In progress',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
    });

    await GrantGoal.create({
      goalId: goalOnOneGrant.id,
      grantId: firstGrant.id,
      recipientId: recipientForFirstGrant.id,
    });

    goalOnTwoGrants = await Goal.create({
      name: 'Goal on two grants',
      status: 'In progress',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
    });

    await GrantGoal.create({
      goalId: goalOnTwoGrants.id,
      grantId: firstGrant.id,
      recipientId: recipientForFirstGrant.id,
    });

    await GrantGoal.create({
      goalId: goalOnTwoGrants.id,
      grantId: secondGrant.id,
      recipientId: recipientForSecondGrant.id,
    });
  });

  afterAll(async () => {
    await ActivityReportObjective.destroy({
      where: {
        activityReportId: report.id,
      },
    });

    await Objective.destroy({
      where: {
        goalId: goalOnActivityReport.id,
      },
    });

    await destroyReport(report);

    await GrantGoal.destroy({
      where: {
        goalId: [goalOnOneGrant.id, goalOnTwoGrants.id, goalOnActivityReport.id],
      },
    });

    await Goal.destroy({
      where: {
        id: [
          goalOnActivityReport.id,
          goalOnOneGrant.id,
          goalOnTwoGrants.id,
        ],
      },
    });

    await Grant.destroy({
      where: {
        id: [firstGrant.id, secondGrant.id],
      },
    });

    await Recipient.destroy({
      where: {
        id: [recipientForFirstGrant.id, recipientForSecondGrant.id],
      },
    });

    await db.sequelize.close();
  });

  it('retrieves a goal', async () => {
    const goal = await goalByIdWithActivityReportsAndRegions(goalOnOneGrant.id);
    expect(goal.name).toBe('Goal on one grant');
    expect(goal.objectives.length).toBe(0);
    expect(goal.grants.length).toBe(1);
    expect(goal.grants[0].regionId).toBe(firstGrant.regionId);
  });
  it('retrieves a goal with two regions', async () => {
    const goal = await goalByIdWithActivityReportsAndRegions(goalOnTwoGrants.id);
    expect(goal.name).toBe('Goal on two grants');
    expect(goal.objectives.length).toBe(0);
    expect(goal.grants.length).toBe(2);
    expect(goal.grants[0].regionId).toBe(firstGrant.regionId);
    expect(goal.grants[1].regionId).toBe(secondGrant.regionId);
  });

  it('retrieves a goal with associated data', async () => {
    const goal = await goalByIdWithActivityReportsAndRegions(goalOnActivityReport.id);
    expect(goal.name).toBe('Goal on activity report');
    expect(goal.objectives.length).toBe(1);
    expect(goal.objectives[0].activityReports.length).toBe(1);
    expect(goal.grants.length).toBe(1);
    expect(goal.grants[0].regionId).toBe(firstGrant.regionId);
  });
});
