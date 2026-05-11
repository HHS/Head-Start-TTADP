import { REPORT_STATUSES } from '@ttahub/common';
import { Op } from 'sequelize';
import { goalDashboardGoals } from './goal';
import {
  ActivityReportGoal,
  Goal,
  GoalTemplate,
} from '../../models';
import {
  createGrant,
  createRecipient,
  createReport,
  destroyReport,
} from '../../testUtils';

describe('goalDashboardGoals service integration', () => {
  let grant;
  let goalTemplate;
  let report;
  let duplicateReport;
  let goals;

  beforeAll(async () => {
    const recipient = await createRecipient();
    grant = await createGrant({ recipientId: recipient.id, regionId: 1 });
    goalTemplate = await GoalTemplate.findOne({
      where: {
        standard: {
          [Op.ne]: null,
        },
      },
    });

    if (!goalTemplate) {
      throw new Error('Standard goal template not found - migration did not run');
    }

    report = await createReport({
      activityRecipients: [{ grantId: grant.id }],
      calculatedStatus: REPORT_STATUSES.APPROVED,
      regionId: 1,
    });
    duplicateReport = await createReport({
      activityRecipients: [{ grantId: grant.id }],
      calculatedStatus: REPORT_STATUSES.APPROVED,
      regionId: 1,
    });

    goals = await Goal.bulkCreate(
      Array.from({ length: 55 }).map((_, index) => ({
        name: `Goal dashboard integration goal ${String(index + 1).padStart(2, '0')}`,
        grantId: grant.id,
        goalTemplateId: goalTemplate.id,
        status: 'Closed',
        timeframe: '2026',
        isFromSmartsheetTtaPlan: false,
        onAR: true,
        onApprovedAR: true,
        rtrOrder: index + 1,
        prestandard: false,
        createdAt: new Date(Date.UTC(2026, 0, index + 1)),
        updatedAt: new Date(Date.UTC(2026, 0, index + 1)),
      })),
      {
        hooks: false,
        returning: true,
      },
    );

    await ActivityReportGoal.bulkCreate([
      ...goals.map((goal) => ({
        activityReportId: report.id,
        goalId: goal.id,
      })),
      {
        activityReportId: duplicateReport.id,
        goalId: goals[0].id,
      },
    ]);
  });

  afterAll(async () => {
    const goalIds = goals ? goals.map((goal) => goal.id) : [];
    if (goalIds.length) {
      await ActivityReportGoal.destroy({
        where: { goalId: goalIds },
        force: true,
      });
      await Goal.destroy({
        where: { id: goalIds },
        force: true,
      });
    }
    if (report) {
      await destroyReport(report);
    }
    if (duplicateReport) {
      await destroyReport(duplicateReport);
    }
  });

  it('returns a distinct count and offset page when approved-report joins duplicate a goal', async () => {
    const goalIds = goals.map((goal) => goal.id);

    const result = await goalDashboardGoals(
      { goal: { id: goalIds } },
      {
        sortBy: 'createdOn',
        direction: 'asc',
        offset: '10',
        perPage: '10',
        includeAllGoalIds: 'true',
      },
    );

    expect(result.goalDashboardGoals.count).toBe(55);
    expect(result.goalDashboardGoals.goalRows).toHaveLength(10);
    expect(result.goalDashboardGoals.goalRows.map((goal) => goal.id)).toEqual(
      goals.slice(10, 20).map((goal) => goal.id),
    );
    expect(result.goalDashboardGoals.allGoalIds).toHaveLength(55);
    expect(new Set(result.goalDashboardGoals.allGoalIds).size).toBe(55);
  });

  it('caps oversized page requests while preserving the full distinct count', async () => {
    const result = await goalDashboardGoals(
      { goal: { id: goals.map((goal) => goal.id) } },
      {
        sortBy: 'createdOn',
        direction: 'asc',
        offset: '0',
        perPage: '999',
      },
    );

    expect(result.goalDashboardGoals.count).toBe(55);
    expect(result.goalDashboardGoals.goalRows).toHaveLength(50);
  });
});
