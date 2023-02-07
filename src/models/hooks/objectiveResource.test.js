import { faker } from '@faker-js/faker';
import {
  sequelize,
  Objective,
  ObjectiveTemplate,
  ObjectiveResource,
  ObjectiveTemplateResource,
} from '..';
import { OBJECTIVE_STATUS } from '../../constants';
import { objectiveTemplateGenerator } from './testHelpers';
import { beforeValidate } from './objectiveResource';

describe('objectiveResource hooks', () => {
  const userProvidedUrl = faker.internet.url();
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

    await ObjectiveResource.create({
      objectiveId: objective.id,
      userProvidedUrl,
    }, { transaction, individualHooks: true });

    await transaction.commit();
  });

  afterEach(async () => {
    await ObjectiveTemplateResource.destroy({
      where: { objectiveTemplateId: objectiveTemplate.id },
    });

    await ObjectiveResource.destroy({
      where: { objectiveId: objective.id },
    });

    await Objective.destroy({ where: { id: objective.id } });

    await ObjectiveTemplate.destroy({
      where: { id: objectiveTemplate.id },
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
          userProvidedUrl,
          objectiveTemplateId: objectiveTemplate.id,
        },
      });

      expect(otr).not.toBeNull();
    });
  });
});
