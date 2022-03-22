import { Op } from 'sequelize';
import { createOrUpdateGoals } from './goals';
import db, {
  Goal,
  Grant,
  GrantGoal,
  Recipient,
  Topic,
  Objective,
  ObjectiveResource,
  ObjectiveTopic,
  sequelize,
} from '../models';

describe('createOrUpdateGoals', () => {
  afterEach(async () => {
    jest.clearAllMocks();
  });

  let goal;
  let recipient;
  let newGoals;
  let topic;
  let objective;

  let grants;

  beforeAll(async () => {
    recipient = await Recipient.findOne({
      where: {
        id: {
          [Op.in]: sequelize.literal(
            `(
              SELECT "Recipients"."id" FROM "Recipients" 
              INNER JOIN "Grants" ON "Grants"."recipientId" = "Recipients"."id" 
              WHERE "Grants"."regionId" = 1 AND "Recipients"."id" IN (
                SELECT "Recipients"."id" FROM "Recipients"
                INNER JOIN "Grants" on "Recipients"."id" = "Grants"."recipientId"
                GROUP BY "Recipients"."id"
                HAVING
                  COUNT("Grants"."id") > 1                
              )
            )`,
          ),
        },
      },
    });
    const grant = await Grant.findOne({
      where: {
        recipientId: recipient.id,
      },
    });

    const secondGrant = await Grant.findOne({
      where: {
        recipientId: recipient.id,
        id: {
          [Op.notIn]: [grant.id],
        },
      },
    });

    grants = [grant, secondGrant];

    goal = await Goal.create({
      name: 'This is some serious goal text',
      status: 'Draft',
    });
    topic = await Topic.findOne();

    objective = await Objective.create({
      goalId: goal.id,
      title: 'This is some serious goal text',
      ttaProvided: '',
      status: 'Not started',
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
        id: objective.id,
      },
    });

    await GrantGoal.destroy({
      where: {
        goalId: newGoals.map((g) => g.id),
      },
    });

    await Goal.destroy({
      where: {
        id: newGoals.map((g) => g.id),
      },
    });

    await db.sequelize.close();
  });

  it('creates new goals and updates existing ones', async () => {
    const basicGoal = {
      recipientId: recipient.id,
      regionId: 1,
      name: 'This is some serious goal text',
      status: 'Draft',
      grants: [
        {
          value: grants[0].id,
        },
      ],
    };

    newGoals = await createOrUpdateGoals([
      {
        ...basicGoal,
        id: goal.id,
        status: 'Not Started',
        objectives: [
          {
            id: objective.id,
            ttaProvided: '',
            status: 'Not started',
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
        ],
      },
      {
        ...basicGoal,
        objectives: [],
        grants: [
          {
            value: grants[1].id,
          },
          {
            value: grants[0].id,
          },
        ],
      },
    ]);

    expect(newGoals.length).toBe(2);

    const goalIds = newGoals.map((g) => g.id);
    expect(goalIds).toContain(goal.id);

    const updatedGoal = newGoals.find((g) => g.id === goal.id);
    expect(updatedGoal.status).toBe('Not Started');
    expect(updatedGoal.name).toBe('This is some serious goal text');
    expect(updatedGoal.grants.length).toBe(1);
    expect(updatedGoal.grants[0].value).toBe(grants[0].id);
    expect(updatedGoal.regionId).toBe(1);
    expect(updatedGoal.recipientId).toBe(recipient.id);

    const objectivesOnUpdatedGoal = await Objective.findAll({
      where: {
        goalId: updatedGoal.id,
      },
      raw: true,
    });

    expect(objectivesOnUpdatedGoal.length).toBe(1);
    const [objectiveOnUpdatedGoal] = objectivesOnUpdatedGoal;
    expect(objectiveOnUpdatedGoal.id).toBe(objective.id);
    expect(objectiveOnUpdatedGoal.title).toBe('This is an objective');
    expect(objectiveOnUpdatedGoal.ttaProvided).toBe(objective.ttaProvided);
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
    expect(newGoal.grants.length).toBe(2);
    const grantIds = newGoal.grants.map((g) => g.value);
    expect(grantIds).toContain(grants[0].id);
    expect(grantIds).toContain(grants[1].id);
    expect(newGoal.regionId).toBe(1);
    expect(newGoal.recipientId).toBe(recipient.id);
  });
});
