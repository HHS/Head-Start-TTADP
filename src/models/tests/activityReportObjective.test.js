import db from '..';
import { beforeDestroy, afterUpdate, afterDestroy } from '../../hooks/activityReportObjective';
import { createReport, destroyReport } from '../../testUtils';

jest.mock('../../hooks/activityReportObjective', () => ({
  beforeDestroy: jest.fn(),
  beforeValidate: jest.fn(),
  afterCreate: jest.fn(),
  afterDestroy: jest.fn(),
  afterUpdate: jest.fn(),
}));

describe('activityReportObjective', () => {
  let report;
  let objective;

  beforeAll(async () => {
    report = await createReport({ activityRecipients: [] });
    objective = await db.Objective.create({
      name: 'Test Objective',
      status: 'In Progress',
    });

    await db.ActivityReportObjective.create({
      activityReportId: report.id,
      objectiveId: objective.id,
    }, { individualHooks: true });
  });

  afterAll(async () => {
    jest.clearAllMocks();
    await db.ActivityReportObjective.destroy({
      where: {
        objectiveId: objective.id,
      },
    });
    await db.Objective.destroy({ where: { id: objective.id }, force: true });
    await destroyReport(report);
    await db.sequelize.close();
  });

  it('calls hooks', async () => {
    await db.ActivityReportObjective.update({
      status: 'Complete',
    }, {
      where: {
        objectiveId: objective.id,
      },
      individualHooks: true,
    });

    expect(afterUpdate).toHaveBeenCalledTimes(1);

    await db.ActivityReportObjective.destroy({
      where: {
        objectiveId: objective.id,
      },
      individualHooks: true,
    });

    expect(beforeDestroy).toHaveBeenCalledTimes(1);
    expect(afterDestroy).toHaveBeenCalledTimes(1);
  });
});
