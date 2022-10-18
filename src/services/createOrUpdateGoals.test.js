/* eslint-disable jest/no-disabled-tests */
import faker from '@faker-js/faker';
import { createOrUpdateGoals } from './goals';
import db, {
  Goal,
  Grant,
  Recipient,
  Topic,
  Objective,
  ObjectiveResource,
  ObjectiveTopic,
} from '../models';

describe('createOrUpdateGoals', () => {
  afterEach(async () => {
    jest.clearAllMocks();
  });

  let goal;
  let topic;
  let objective;
  let recipient;
  let newGoals;
  let grants = [
    {
      id: faker.datatype.number(),
      number: faker.random.alphaNumeric(5),
      cdi: false,
      regionId: 1,
    },
    {
      id: faker.datatype.number(),
      number: faker.random.alphaNumeric(5),
      cdi: false,
      regionId: 1,
    },
  ];

  beforeAll(async () => {
    recipient = await Recipient.create({ name: 'recipient', id: faker.datatype.number(), uei: faker.datatype.string(12) });
    grants = await Promise.all(
      grants.map((g) => Grant.create({ ...g, recipientId: recipient.id })),
    );

    goal = await Goal.create({
      name: 'This is some serious goal text',
      status: 'Draft',
      grantId: grants[0].id,
    });
    topic = await Topic.findOne();

    objective = await Objective.create({
      goalId: goal.id,
      title: 'This is some serious goal text',
      status: 'Not Started',
    });

    await Objective.create({
      goalId: goal.id,
      title: 'This objective will be deleted',
      status: 'Not Started',
    });

    await ObjectiveResource.create({
      objectiveId: objective.id,
      userProvidedUrl: 'https://www.test.gov',
    });
  });

  afterAll(async () => {
    await ObjectiveResource.destroy({
      where: {
        objectiveId: objective.id,
      },
    });

    await ObjectiveTopic.destroy({
      where: {
        objectiveId: objective.id,
      },
    });

    await Objective.destroy({
      where: {
        goalId: goal.id,
      },
    });

    await Goal.destroy({
      where: {
        id: newGoals.map((g) => g.id),
      },
    });

    await Grant.destroy({
      where: {
        id: grants.map((g) => g.id),
      },
    });

    await Recipient.destroy({
      where: {
        id: recipient.id,
      },
    });

    await db.sequelize.close();
  });

  it('creates new goals and updates existing ones', async () => {
    const basicGoal = {
      recipientId: recipient.id,
      regionId: 1,
      name: 'This is some serious goal text',
      grantId: goal.grantId,
      status: 'Draft',
    };

    newGoals = await createOrUpdateGoals([
      {
        ...basicGoal,
        id: goal.id,
        createdVia: 'activityReport',
        status: 'Not Started',
        objectives: [
          {
            id: objective.id,
            status: 'Not Started',
            title: 'This is an objective',
            resources: [
              {
                value: 'https://www.test.gov',
              },
            ],
            topics: [
              {
                value: topic.id,
              },
            ],
          },
          {
            id: 'new-0',
            isNew: true,
            status: 'Not Started',
            title: 'This is another objective',
            resources: [],
            topics: [
              {
                value: topic.id,
              },
            ],
          },
        ],
      },
      {
        ...basicGoal,
        grantId: grants[1].id,
        isNew: true,
        objectives: [],
      },
    ]);

    expect(newGoals).toHaveLength(2);

    const [, { goalIds }] = newGoals;
    expect(goalIds.length).toBe(1);

    expect(goalIds).toContain(goal.id);

    const [, updatedGoal] = newGoals;
    expect(updatedGoal.status).toBe('Not Started');
    expect(updatedGoal.name).toBe('This is some serious goal text');
    expect(updatedGoal.grantIds.length).toBe(1);
    expect(updatedGoal.createdVia).toBe('activityReport');
    expect(updatedGoal.grantIds).toContain(grants[0].id);

    const grantRegions = updatedGoal.grants.map((g) => g.regionId);
    const grantRecipients = updatedGoal.grants.map((g) => g.recipientId);

    expect(grantRegions).toContain(1);
    expect(grantRecipients).toContain(recipient.id);

    const objectivesOnUpdatedGoal = await Objective.findAll({
      where: {
        goalId: goalIds,
      },
      raw: true,
    });

    expect(objectivesOnUpdatedGoal.length).toBe(2);
    const titles = objectivesOnUpdatedGoal.map((obj) => obj.title);
    expect(titles).toContain('This is another objective');
    expect(titles).toContain('This is an objective');
    expect(titles).not.toContain('This objective will be deleted');

    const objectiveOnUpdatedGoal = await Objective.findByPk(objective.id, { raw: true });
    expect(objectiveOnUpdatedGoal.id).toBe(objective.id);
    expect(objectiveOnUpdatedGoal.title).toBe('This is an objective');
    expect(objectiveOnUpdatedGoal.status).toBe(objective.status);

    const objectiveTopics = await ObjectiveTopic.findAll({
      where: {
        objectiveId: objective.id,
      },
      raw: true,
    });

    expect(objectiveTopics.length).toBe(1);
    expect(objectiveTopics[0].topicId).toBe(topic.id);

    const resource = await ObjectiveResource.findAll({
      where: {
        objectiveId: objective.id,
      },
      raw: true,
    });

    expect(resource.length).toBe(1);
    expect(resource[0].userProvidedUrl).toBe('https://www.test.gov');

    const newGoal = newGoals.find((g) => g.id !== goal.id);
    expect(newGoal.status).toBe('Draft');
    expect(newGoal.name).toBe('This is some serious goal text');
    expect(newGoal.grant.id).toBe(grants[1].id);
    expect(newGoal.grant.regionId).toBe(1);
    expect(newGoal.grant.recipientId).toBe(recipient.id);
    expect(newGoal.createdVia).toBe('rtr');
  });
});
