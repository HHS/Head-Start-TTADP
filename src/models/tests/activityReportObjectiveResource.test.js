import faker from '@faker-js/faker';
import db from '..';
import {
  createReport, destroyReport,
} from '../../testUtils';
import { afterCreate, afterDestroy } from '../../hooks/activityReportObjectiveResource';
import { calculateIsAutoDetectedForActivityReportObjective } from '../../services/resource';

jest.mock('../../hooks/activityReportObjectiveResource', () => ({
  afterCreate: jest.fn(),
  afterDestroy: jest.fn(),
}));

jest.mock('../../services/resource', () => ({
  ...jest.requireActual('../../services/resource'),
  calculateIsAutoDetectedForActivityReportObjective: jest.fn(),
}));

describe('ActivityReportObjectiveResource', () => {
  let objective;
  let ar;
  let aro;
  let resource;
  let aror;

  beforeAll(async () => {
    jest.clearAllMocks();
    objective = await db.Objective.create({
      title: faker.lorem.words(10),
      status: 'In Progress',
    });
    ar = await createReport({ activityRecipients: [] });
    aro = await db.ActivityReportObjective.create({
      activityReportId: ar.id, objectiveId: objective.id,
    });
    resource = await db.Resource.create({ url: `${faker.internet.url()}/activity-report-objective-resource.aspx` });

    aror = await db.ActivityReportObjectiveResource.create({
      resourceId: resource.id,
      activityReportObjectiveId: aro.id,
      sourceFields: ['title'],
    }, { individualHooks: true });
  });

  afterAll(async () => {
    jest.clearAllMocks();
    await db.ActivityReportObjectiveResource.destroy({ where: { id: aror.id } });
    await db.Resource.destroy({ where: { id: resource.id } });
    await db.ActivityReportObjective.destroy({ where: { id: aro.id } });
    await destroyReport(ar);
    await db.Objective.destroy({ where: { id: objective.id }, force: true });
    await db.sequelize.close();
  });

  it('calculates isAutoDetected', async () => {
    expect(afterCreate).toHaveBeenCalled();
    expect(afterDestroy).not.toHaveBeenCalled();
    calculateIsAutoDetectedForActivityReportObjective.mockReturnValue(true);
    await aror.reload({ include: [{ model: db.Resource, as: 'resource' }] });

    expect(aror.isAutoDetected).toBe(true);
    expect(calculateIsAutoDetectedForActivityReportObjective).toHaveBeenCalled();
    expect(aror.userProvidedUrl).toBe(resource.url);

    await aror.destroy({ individualHooks: true });

    expect(afterDestroy).toHaveBeenCalled();
  });
});
