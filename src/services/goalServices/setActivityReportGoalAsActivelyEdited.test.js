import faker from '@faker-js/faker';
import {
  setActivityReportGoalAsActivelyEdited,
  getGoalsForReport,
} from '../goals';
import {
  Goal,
  ActivityReport,
  ActivityReportGoal,
  User,
  sequelize,
} from '../../models';
import { REPORT_STATUSES } from '../../constants';

describe('setActivityReportGoalAsActivelyEdited', () => {
  let goal;
  let report;
  let user;

  beforeAll(async () => {
    // Create User.

    const userName = faker.random.word();

    user = await User.create({
      id: faker.datatype.number({ min: 1000 }),
      homeRegionId: 1,
      name: userName,
      hsesUsername: userName,
      hsesUserId: userName,
    });

    // Create Goal.
    goal = await Goal.create({
      name: 'goal to be edited',
      status: 'Not Started',
      timeframe: '12 months',
      isFromSmartsheetTtaPlan: false,
      createdAt: new Date('2021-01-02'),
      grantId: 1,
    });

    // create report
    report = await ActivityReport.create({
      activityRecipientType: 'recipient',
      submissionStatus: REPORT_STATUSES.DRAFT,
      userId: user.id,
      regionId: 1,
      lastUpdatedById: user.id,
      ECLKCResourcesUsed: ['test'],
      activityRecipients: [{ activityRecipientId: 30 }],
    });

    // create activity report goal
    await ActivityReportGoal.create({
      activityReportId: report.id,
      goalId: goal.id,
      isActivelyEdited: false,
    });
  });
  afterAll(async () => {
    await ActivityReportGoal.destroy({
      where: {
        activityReportId: report.id,
      },
    });

    await Goal.destroy({
      where: {
        id: goal.id,
      },
    });

    await ActivityReport.destroy({
      where: {
        id: report.id,
      },
    });

    await sequelize.close();
  });
  it('sets goal as edited via the ARG table', async () => {
    await setActivityReportGoalAsActivelyEdited(`${goal.id}`, report.id);
    const [goalForReport] = await getGoalsForReport(report.id);
    const [arg] = goalForReport.activityReportGoals;
    expect(arg.isActivelyEdited).toBe(true);
  });
});
