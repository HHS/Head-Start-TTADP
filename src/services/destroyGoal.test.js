import faker from 'faker';
import { destroyGoal } from './goals';
import db, {
  Goal,
  Grant,
  GrantGoal,
  Recipient,
} from '../models';

describe('destroyGoal handler', () => {
  afterEach(async () => {
    jest.clearAllMocks();
  });

  let goal;
  let recipient;
  let grant = {
    id: faker.datatype.number(),
    number: faker.random.alphaNumeric(5),
    cdi: false,
    regionId: 1,
  };

  beforeAll(async () => {
    recipient = await Recipient.create({ name: `recipient${faker.datatype.number()}`, id: faker.datatype.number(6) });
    grant = await Grant.create({ ...grant, recipientId: recipient.id });
    goal = await Goal.create({
      name: 'This is some serious goal text',
      status: 'Draft',
    });

    await GrantGoal.create({
      recipientId: recipient.id,
      grantId: grant.id,
      goalId: goal.id,
    });
  });

  afterAll(async () => {
    await GrantGoal.destroy({
      where: {
        goalId: goal.id,
      },
    });

    await Goal.destroy({
      where: {
        id: goal.id,
      },
    });

    await Grant.destroy({
      where: {
        id: grant.id,
      },
    });

    await Recipient.destroy({
      where: {
        id: recipient.id,
      },
    });
    await db.sequelize.close();
  });

  it('destroys goals and associated grantgoals', async () => {
    let foundGoal = await Goal.findAll({
      where: {
        id: goal.id,
      },
    });

    let foundGrantGoal = await GrantGoal.findAll({
      where: {
        goalId: goal.id,
      },
    });

    expect(foundGoal.length).toBe(1);
    expect(foundGrantGoal.length).toBe(1);

    const result = await destroyGoal(goal.id);
    expect(result).toBe(1);

    foundGoal = await Goal.findAll({
      where: {
        id: goal.id,
      },
    });

    foundGrantGoal = await GrantGoal.findAll({
      where: {
        goalId: goal.id,
      },
    });

    expect(foundGoal.length).toBe(0);
    expect(foundGrantGoal.length).toBe(0);
  });

  it('handles invalid ids', async () => {
    const result = await destroyGoal(182349);
    expect(result).toBe(0);
  });
});
