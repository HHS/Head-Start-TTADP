import { Op } from 'sequelize';
import {
  sequelize,
  Objective,
  ObjectiveTemplate,
  ObjectiveTopic,
  ObjectiveTemplateTopic,
  Topic,
} from '..';
import { OBJECTIVE_STATUS } from '../../constants';
import { objectiveTemplateGenerator } from './testHelpers';
import { beforeValidate } from './objectiveTopic';

describe('objectiveTopic hooks', () => {
  let topic;
  let objectiveTemplate;
  let objective;

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    const transaction = await sequelize.transaction();

    topic = await Topic.findOne({
      where: { deletedAt: { [Op.eq]: null } },
      order: [['id', 'ASC']],
      limit: 1,
      transaction,
    });

    objectiveTemplate = await ObjectiveTemplate.create(
      objectiveTemplateGenerator(),
      { transaction, individualHooks: true },
    );

    objective = await Objective.create({
      title: 'Random objective title',
      status: OBJECTIVE_STATUS.APPROVED,
      objectiveTemplateId: objectiveTemplate.id,
    }, { transaction, individualHooks: true });

    await ObjectiveTopic.create({
      objectiveId: objective.id,
      topicId: topic.id,
    }, { transaction, individualHooks: true });

    await transaction.commit();
  });

  afterEach(async () => {
    await ObjectiveTemplateTopic.destroy({
      where: { objectiveTemplateId: objectiveTemplate.id },
    });

    await ObjectiveTopic.destroy({
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
    it('creates an objectiveTemplateTopic where none existed', async () => {
      // confirm that the objectiveTemplateTopic was created
      const ott = await ObjectiveTemplateTopic.findOne({
        where: {
          topicId: topic.id,
          objectiveTemplateId: objectiveTemplate.id,
        },
      });

      expect(ott).not.toBeNull();
    });
  });
});
