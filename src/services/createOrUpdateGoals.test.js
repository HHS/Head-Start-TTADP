import faker from 'faker';
import { createOrUpdateGoals } from './goals';
import db, {
  Goal,
  Grant,
  GrantGoal,
  Recipient,
} from '../models';

describe('createOrUpdateGoals', () => {
  afterEach(async () => {
    jest.clearAllMocks();
  });

  let goal;
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
    recipient = await Recipient.create({ name: 'recipient', id: faker.datatype.number() });
    grants = await Promise.all(
      grants.map((g) => Grant.create({ ...g, recipientId: recipient.id })),
    );
    goal = await Goal.create({
      name: 'This is some serious goal text',
      status: 'Draft',
    });
  });

  afterAll(async () => {
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
      },
      {
        ...basicGoal,
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
