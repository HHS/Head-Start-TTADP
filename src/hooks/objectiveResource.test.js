import { faker } from '@faker-js/faker';
import {
  sequelize,
  Objective,
  ObjectiveTemplate,
  ObjectiveResource,
  ObjectiveTemplateResource,
  Resource,
} from '../models';
import { OBJECTIVE_STATUS } from '../constants';
import { objectiveTemplateGenerator } from './testHelpers';
import { beforeValidate, afterDestroy } from './objectiveResource';
import { processObjectiveForResourcesById } from '../services/resource';

describe('objectiveResource hooks', () => {
  const url = faker.internet.url();
  let objectiveTemplate;
  let objective;

  let objectiveToDestroy;
  let objectiveResourceToDestroy;
  let resourceToDestroy;
  const destroyUrl = faker.internet.url();

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    objectiveTemplate = await ObjectiveTemplate.create(
      objectiveTemplateGenerator(),
      { individualHooks: true },
    );

    objective = await Objective.create({
      title: 'Random objective title',
      status: OBJECTIVE_STATUS.APPROVED,
      objectiveTemplateId: objectiveTemplate.id,
    }, { individualHooks: true });

    await processObjectiveForResourcesById(objective.id, [url]);

    // Destroy objects.
    objectiveToDestroy = await Objective.create({
      title: 'objective to destroy title',
      status: OBJECTIVE_STATUS.APPROVED,
    }, { individualHooks: true });

    resourceToDestroy = await Resource.create({ url: destroyUrl });

    objectiveResourceToDestroy = await ObjectiveResource.create({
      objectiveId: objectiveToDestroy.id,
      resourceId: resourceToDestroy.id,
      sourceFields: ['resource'],
    });
  });

  afterEach(async () => {
    await ObjectiveTemplateResource.destroy({
      where: { objectiveTemplateId: objectiveTemplate.id },
      individualHooks: true,
    });

    await ObjectiveResource.destroy({
      where: { objectiveId: [objective.id, objectiveToDestroy.id] },
      individualHooks: true,
    });

    await Resource.destroy({
      where: { url: [url, destroyUrl] },
      individualHooks: true,
    });

    await Objective.destroy({
      where: { id: [objective.id, objectiveToDestroy.id] },
      individualHooks: true,
      force: true,
    });

    await ObjectiveTemplate.destroy({
      where: { id: objectiveTemplate.id },
      individualHooks: true,
    });
  });
  describe('beforeValidate', () => {
    it('beforeValidate', async () => {
      const instance = {
      };
      instance.set = (name, value) => { instance[name] = value; };
      const options = {};
      beforeValidate({}, instance, options);
      expect(instance.onAR).toBe(false);
      expect(instance.onApprovedAR).toBe(false);
      expect(options.fields.sort()).toStrictEqual(['onAR', 'onApprovedAR'].sort());
    });
  });

  describe('afterCreate', () => {
    it('creates an objectiveTemplateResource where none existed', async () => {
      // confirm that the objectiveTemplateResource was created
      const otr = await ObjectiveTemplateResource.findOne({
        where: {
          objectiveTemplateId: objectiveTemplate.id,
        },
        include: [{
          model: Resource,
          as: 'resource',
          where: { url },
        }],
      });

      expect(otr).not.toBeNull();
    });
  });

  describe('afterDestroy', () => {
    it('clean up orphan resources', async () => {
      let objectiveResource = await ObjectiveResource.findOne({
        where: { objectiveId: objectiveToDestroy.id },
      });
      expect(objectiveResource).not.toBeNull();

      let resource = await Resource.findOne({
        where: { id: resourceToDestroy.id },
      });
      expect(resource).not.toBeNull();

      // Destroy.
      await ObjectiveResource.destroy({
        where: { objectiveId: objectiveToDestroy.id },
        individualHooks: true,
      });

      objectiveResource = await ObjectiveResource.findOne({
        where: { objectiveId: objectiveToDestroy.id },
      });
      expect(objectiveResource).toBeNull();

      resource = await Resource.findOne({
        where: { id: resourceToDestroy.id },
      });
      expect(resource).toBeNull();
    });
  });
});
