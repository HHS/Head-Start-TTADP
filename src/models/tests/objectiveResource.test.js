import faker from '@faker-js/faker';
import db from '..';
import { calculateIsAutoDetectedForObjectiveTemplate } from '../../services/resource';

jest.mock('../../services/resource', () => ({
  ...jest.requireActual('../../services/resource'),
  calculateIsAutoDetectedForObjectiveTemplate: jest.fn(),
}));

describe('ActivityReportObjectiveResource', () => {
  let objectiveTemp;
  let resource;
  let objectiveTempResource;

  beforeAll(async () => {
    resource = await db.Resource.create({ url: `${faker.internet.url()}/objective-resource.aspx` });
    objectiveTemp = await db.ObjectiveTemplate.create({ hash: 'HASHHASHHASHHASHASHHASHASHASHAHS', templateTitle: 'HASHHASHHASHHASHASHHASHASHASHAHS' });

    objectiveTempResource = await db.ObjectiveTemplateResource.create({
      resourceId: resource.id,
      objectiveTemplateId: objectiveTemp.id,
      sourceFields: ['title'],
    });
  });

  afterAll(async () => {
    jest.clearAllMocks();
    await objectiveTempResource.destroy();
    await objectiveTemp.destroy();
    await resource.destroy();
    await db.sequelize.close();
  });

  it('calculates isAutoDetected & userProvidedUrl', async () => {
    calculateIsAutoDetectedForObjectiveTemplate.mockReturnValue(true);
    await objectiveTempResource.reload({ include: [{ model: db.Resource, as: 'resource' }] });

    expect(objectiveTempResource.isAutoDetected).toBe(true);
    expect(calculateIsAutoDetectedForObjectiveTemplate).toHaveBeenCalled();
    expect(objectiveTempResource.userProvidedUrl).toBe(resource.url);
  });
});
