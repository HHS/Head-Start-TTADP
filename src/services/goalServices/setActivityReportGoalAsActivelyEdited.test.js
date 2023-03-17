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
  let goal2;
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

    // Create Goal.
    goal2 = await Goal.create({
      name: 'goal that was edited',
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

    await ActivityReportGoal.create({
      activityReportId: report.id,
      goalId: goal2.id,
      isActivelyEdited: true,
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
        id: [goal.id, goal2.id],
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
    const goalsForReport = await getGoalsForReport(report.id);
    expect(goalsForReport).toHaveLength(2);

    const goalNotEdited = goalsForReport.find((g) => g.id === goal2.id);
    const [goalNotEditedArGoal] = goalNotEdited.activityReportGoals;
    expect(goalNotEditedArGoal.isActivelyEdited).toBe(false);

    const goalBeingEdited = goalsForReport.find((g) => g.id === goal2.id);
    const [goalBeingEditedArGoal] = goalBeingEdited.activityReportGoals;
    expect(goalBeingEditedArGoal.isActivelyEdited).toBe(false);
  });
});
