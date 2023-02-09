import { faker } from '@faker-js/faker';
import {
  sequelize,
  Objective,
  ObjectiveTemplate,
  ObjectiveResource,
  ObjectiveTemplateResource,
  Resource,
} from '..';
import { OBJECTIVE_STATUS } from '../../constants';
import { objectiveTemplateGenerator } from './testHelpers';
import { beforeValidate } from './objectiveResource';
import { processObjectiveForResourcesById } from '../../services/resource';

describe('objectiveResource hooks', () => {
  const url = faker.internet.url();
  let objectiveTemplate;
  let objective;

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    const transaction = await sequelize.transaction();

    objectiveTemplate = await ObjectiveTemplate.create(
      objectiveTemplateGenerator(),
      { transaction, individualHooks: true },
    );

    objective = await Objective.create({
      title: 'Random objective title',
      status: OBJECTIVE_STATUS.APPROVED,
      objectiveTemplateId: objectiveTemplate.id,
    }, { transaction, individualHooks: true });

    await processObjectiveForResourcesById(objective.id, [url]);

    await transaction.commit();
  });

  afterEach(async () => {
    await ObjectiveTemplateResource.destroy({
      where: { objectiveTemplateId: objectiveTemplate.id },
      individualHooks: true,
    });

    await ObjectiveResource.destroy({
      where: { objectiveId: objective.id },
      individualHooks: true,
    });

    await Resource.destroy({
      where: { url },
      individualHooks: true,
    });

    await Objective.destroy({
      where: { id: objective.id },
      individualHooks: true,
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
});
