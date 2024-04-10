import faker from '@faker-js/faker';
import db from '..';
import {
  createGoal, createGrant, createReport, destroyReport,
} from '../../testUtils';

const { calculateIsAutoDetectedForActivityReportGoal } = require('../../services/resource');

jest.mock('../../services/resource', () => ({
  ...jest.requireActual('../../services/resource'),
  calculateIsAutoDetectedForActivityReportGoal: jest.fn(),
}));

const { ActivityReportGoalResource } = db;

describe('ActivityReportGoalResource', () => {
  let grant;
  let goal;
  let ar;
  let arg;
  let resource;
  let argr;

  beforeAll(async () => {
    jest.clearAllMocks();

    grant = await createGrant();
    goal = await createGoal({ grantId: grant.id, status: 'In Progress' });
    ar = await createReport({ activityRecipients: [] });
    arg = await db.ActivityReportGoal.create({ activityReportId: ar.id, goalId: goal.id });
    resource = await db.Resource.create({ url: `${faker.internet.url()}/activity-report-goal-resource.aspx` });

    argr = await ActivityReportGoalResource.create({
      resourceId: resource.id,
      activityReportGoalId: arg.id,
      sourceFields: ['name'],
    });
  });

  afterAll(async () => {
    jest.clearAllMocks();
    await ActivityReportGoalResource.destroy({ where: { id: argr.id } });
    await db.Resource.destroy({ where: { id: resource.id } });
    await db.ActivityReportGoal.destroy({ where: { id: arg.id } });
    await destroyReport(ar);
    await db.Goal.destroy({ where: { id: goal.id }, force: true });
    await db.GrantNumberLink.destroy({ where: { grantId: grant.id }, force: true });
    await db.Grant.destroy({ where: { id: grant.id } });
    await db.sequelize.close();
  });

  it('calculates isAutoDetected', async () => {
    calculateIsAutoDetectedForActivityReportGoal.mockReturnValue(true);
    await argr.reload();

    expect(argr.isAutoDetected).toBe(true);

    expect(calculateIsAutoDetectedForActivityReportGoal).toHaveBeenCalled();
  });
});
