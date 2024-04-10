import faker from '@faker-js/faker';
import db from '..';
import { calculateIsAutoDetectedForGoalTemplate } from '../../services/resource';

jest.mock('../../services/resource', () => ({
  ...jest.requireActual('../../services/resource'),
  calculateIsAutoDetectedForGoalTemplate: jest.fn(),
}));

const {
  sequelize, GoalTemplate, Resource, GoalTemplateResource,
} = db;

describe('GoalTemplateResource', () => {
  let goalTemp;
  let resource;
  let goalTempResource;

  beforeAll(async () => {
    resource = await Resource.create({ url: `${faker.internet.url()}/objective-resource.aspx` });
    goalTemp = await GoalTemplate.create({ hash: 'HASHHASHHASHHASHASHHASHASHASHAHS', templateName: 'HASHHASHHASHHASHASHHASHASHASHAHS' });

    goalTempResource = await GoalTemplateResource.create({
      resourceId: resource.id,
      goalTemplateId: goalTemp.id,
      sourceFields: ['name'],
    });
  });

  afterAll(async () => {
    jest.clearAllMocks();
    await goalTempResource.destroy();
    await goalTemp.destroy();
    await resource.destroy();
    await sequelize.close();
  });

  it('calculates isAutoDetected & userProvidedUrl', async () => {
    calculateIsAutoDetectedForGoalTemplate.mockReturnValue(true);
    await goalTempResource.reload({ include: [{ model: Resource, as: 'resource' }] });

    expect(goalTempResource.isAutoDetected).toBe(true);
    expect(calculateIsAutoDetectedForGoalTemplate).toHaveBeenCalled();
  });
});
