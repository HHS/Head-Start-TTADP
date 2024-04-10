import {
  sequelize,
  Resource,
  ObjectiveTemplate,
  ObjectiveTemplateResource,
} from '../models';

jest.mock('bull');

describe('objectiveTemplateResource hooks', () => {
  let resourceToDestroy;
  let objectiveTemplateToDestroy;

  beforeAll(async () => {
    // Create resource.
    resourceToDestroy = await Resource.create({ url: 'https://objective-template-resource-hook.gov' });

    // Create report.
    objectiveTemplateToDestroy = await ObjectiveTemplate.create(
      {
        hash: 'objective-template-resource-hash-test',
        regionId: 1,
        templateName: '',
        templateTitle: 'objective-template-resource-hash-test-title',
      },
    );

    // Create activity report resource.
    await ObjectiveTemplateResource.create({
      objectiveTemplateId: objectiveTemplateToDestroy.id,
      resourceId: resourceToDestroy.id,
      sourceFields: ['resource'],
    });
  });

  afterAll(async () => {
    // Delete objective template resource.
    await ObjectiveTemplateResource.destroy({
      where: { objectiveTemplateId: objectiveTemplateToDestroy.id },
      individualHooks: true,
    });

    // Delete objective template.
    await ObjectiveTemplate.destroy({
      where: { id: objectiveTemplateToDestroy.id },
      individualHooks: true,
    });

    // Delete resource.
    await Resource.destroy({
      where: { id: [resourceToDestroy.id] },
      individualHooks: true,
    });

    // Close sequelize connection.
    await sequelize.close();
  });

  it('afterDestroy', async () => {
    // Verify objective template resource resource exist's.
    let otr = await ObjectiveTemplateResource.findOne({
      where: { objectiveTemplateId: objectiveTemplateToDestroy.id },
    });
    expect(otr).not.toBeNull();

    // Verify resource exists's.
    let resource = await Resource.findOne({ where: { id: [resourceToDestroy.id] } });
    expect(resource).not.toBeNull();

    // Delete with hooks.
    await ObjectiveTemplateResource.destroy({
      where: { objectiveTemplateId: objectiveTemplateToDestroy.id },
      individualHooks: true,
    });

    // Verify objective template deleted.
    otr = await ObjectiveTemplateResource.findOne({
      where: { objectiveTemplateId: objectiveTemplateToDestroy.id },
    });
    expect(otr).toBeNull();

    // Verify resource was deleted.
    resource = await Resource.findOne({ where: { id: [resourceToDestroy.id] } });
    expect(resource).toBeNull();
  });
});
