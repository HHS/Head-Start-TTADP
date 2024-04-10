import faker from '@faker-js/faker';
import db from '..';
import { beforeValidate, afterCreate, afterDestroy } from '../../hooks/objectiveTopic';

jest.mock('../../hooks/objectiveTopic', () => ({
  beforeValidate: jest.fn(),
  afterCreate: jest.fn(),
  afterDestroy: jest.fn(),
}));

describe('objectiveTopic', () => {
  let topic;
  let objective;

  beforeAll(async () => {
    topic = await db.Topic.create({ name: `something gross ${faker.random.words(10)}` });
    objective = await db.Objective.create({
      name: `Test Objective ${faker.random.words(10)}`,
      status: 'In Progress',
    });

    await db.ObjectiveTopic.create({
      topicId: topic.id,
      objectiveId: objective.id,
    }, { individualHooks: true });
  });

  afterAll(async () => {
    jest.clearAllMocks();
    await db.ObjectiveTopic.destroy({
      where: {
        objectiveId: objective.id,
      },
    });
    await db.Objective.destroy({ where: { id: objective.id }, force: true });
    await db.Topic.destroy({ where: { id: topic.id }, force: true });
    await db.sequelize.close();
  });

  it('calls hooks', async () => {
    expect(beforeValidate).toHaveBeenCalledTimes(1);
    expect(afterCreate).toHaveBeenCalledTimes(1);

    await db.ObjectiveTopic.destroy({
      where: {
        objectiveId: objective.id,
      },
      individualHooks: true,
    });

    expect(afterDestroy).toHaveBeenCalledTimes(1);
  });
});
