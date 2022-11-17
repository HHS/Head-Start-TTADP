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

    const goals = await Goal.findAll({
      where: {
        grantId: grants.map((g) => g.id),
      },
    });

    const goalIds = goals.map((g) => g.id);

    await Objective.destroy({
      where: {
        goalId: goalIds,
      },
    });

    await Goal.destroy({
      where: {
        id: goalIds,
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
        ids: [goal.id],
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
                id: topic.id,
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
                id: topic.id,
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
        ids: [goal.id],
      },
    ]);

    expect(newGoals).toHaveLength(2);

    const ids = newGoals.map((g) => g.goalIds).flat();
    expect(ids.length).toBe(2);
    expect(ids).toContain(goal.id);

    const statuses = newGoals.map((g) => g.status);
    expect(statuses.length).toBe(2);
    expect(statuses).toContain('Not Started');
    expect(statuses).toContain('Draft');

    const createdVias = newGoals.map((g) => g.createdVia);
    expect(createdVias.length).toBe(2);
    expect(createdVias).toContain('activityReport');
    expect(createdVias).toContain('rtr');

    const [, updatedGoal] = newGoals;
    expect(updatedGoal.name).toBe('This is some serious goal text');
    expect(updatedGoal.grantIds.length).toBe(1);

    const grantIds = newGoals.map((g) => g.grantIds).flat();
    expect(grantIds.length).toBe(2);
    expect(grantIds).toContain(grants[0].id);
    expect(grantIds).toContain(grants[1].id);

    const grantRegions = updatedGoal.grants.map((g) => g.regionId);
    const grantRecipients = updatedGoal.grants.map((g) => g.recipientId);

    expect(grantRegions).toContain(1);
    expect(grantRecipients).toContain(recipient.id);

    const objectivesOnUpdatedGoal = await Objective.findAll({
      where: {
        goalId: ids,
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
  });

  it('you can change an objectives status', async () => {
    const basicGoal = {
      recipientId: recipient.id,
      regionId: 1,
      name: 'This is some serious goal text for an objective that will have its status updated',
      status: 'Draft',
    };

    const updatedGoals = await createOrUpdateGoals([
      {
        ...basicGoal,
        isNew: true,
        grantId: grants[1].id,
        objectives: [
          {
            id: 'new-0',
            status: 'Not Started',
            title: 'This is an objective',
            resources: [
              {
                value: 'https://www.test.gov',
              },
            ],
            topics: [
              {
                id: topic.id,
              },
            ],
          },
        ],
      },
    ]);

    expect(updatedGoals).toHaveLength(1);
    const [updatedGoal] = updatedGoals;
    expect(updatedGoal.objectives).toHaveLength(1);
    const [updatedObjective] = updatedGoal.objectives;
    expect(updatedObjective.status).toBe('Not Started');

    const updatedGoals2 = await createOrUpdateGoals([
      {
        ...updatedGoal.dataValues,
        recipientId: recipient.id,
        grantId: grants[1].id,
        ids: [updatedGoal.id],
        objectives: [
          {
            title: updatedObjective.title,
            id: [updatedObjective.id],
            status: 'Complete',
            resources: [
              {
                value: 'https://www.test.gov',
              },
            ],
            topics: [
              {
                id: topic.id,
              },
            ],
          },
        ],
      },
    ]);

    expect(updatedGoals2).toHaveLength(1);
    const [updatedGoal2] = updatedGoals2;
    expect(updatedGoal2.objectives).toHaveLength(1);
    const [updatedObjective2] = updatedGoal2.objectives;
    expect(updatedObjective2.status).toBe('Complete');
  });
});
