import faker from '@faker-js/faker';
import { REPORT_STATUSES } from '@ttahub/common';
import db, {
  Recipient,
  Grant,
  Goal,
  ActivityReportObjective,
  Objective,
} from '../../models';
import { createReport, destroyReport } from '../../testUtils';

import { goalByIdWithActivityReportsAndRegions } from '../goals';

describe('goalByIdWithActivityReportsAndRegions', () => {
  let recipientForFirstGrant;
  let firstGrant;
  let report;
  let goalOnActivityReport;
  let goalOnOneGrant;

  beforeAll(async () => {
    recipientForFirstGrant = await Recipient.create({
      id: faker.datatype.number({ min: 64000 }),
      name: faker.random.alphaNumeric(6),
      uei: faker.datatype.string(12),
    });
    firstGrant = await Grant.create({
      number: recipientForFirstGrant.id,
      recipientId: recipientForFirstGrant.id,
      programSpecialistName: faker.name.firstName(),
      regionId: 1,
      id: faker.datatype.number({ min: 64000 }),
      uei: faker.datatype.string(12),
    });
    goalOnActivityReport = await Goal.create({
      name: 'Goal on activity report',
      status: 'In Progress',
      timeframe: '12 months',
      grantId: firstGrant.id,
      isFromSmartsheetTtaPlan: false,
      id: faker.datatype.number({ min: 64000 }),
    });
    const objective = await Objective.create({
      goalId: goalOnActivityReport.id,
      title: 'objective test',
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
      ttaProvided: 'asdfadf',
      status: objective.status,
    });
    goalOnOneGrant = await Goal.create({
      name: 'Goal on one grant',
      status: 'In Progress',
      timeframe: '12 months',
      grantId: firstGrant.id,
      isFromSmartsheetTtaPlan: false,
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

    await Goal.destroy({
      where: {
        id: [
          goalOnActivityReport.id,
          goalOnOneGrant.id,
        ],
      },
    });

    await Grant.destroy({
      where: {
        id: [firstGrant.id],
      },
    });

    await Recipient.destroy({
      where: {
        id: [recipientForFirstGrant.id],
      },
    });

    await db.sequelize.close();
  });

  it('retrieves a goal', async () => {
    const goal = await goalByIdWithActivityReportsAndRegions(goalOnOneGrant.id);
    expect(goal.name).toBe('Goal on one grant');
    expect(goal.objectives.length).toBe(0);
    expect(goal.grant.regionId).toBe(firstGrant.regionId);
  });

  it('retrieves a goal with associated data', async () => {
    const goal = await goalByIdWithActivityReportsAndRegions(goalOnActivityReport.id);
    expect(goal.name).toBe('Goal on activity report');
    expect(goal.objectives.length).toBe(1);
    expect(goal.objectives[0].activityReports.length).toBe(1);
    expect(goal.grant.regionId).toBe(firstGrant.regionId);
  });
});
