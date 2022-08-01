/* eslint-disable jest/no-disabled-tests */
import faker from '@faker-js/faker';
import { destroyGoal } from '../goals';
import db, {
  Goal,
  Grant,
  Recipient,
  Objective,
  ObjectiveResource,
  ActivityReport,
} from '../../models';
import { auditLogger } from '../../logger';

describe.skip('destroyGoal handler', () => {
  const oldFindAll = ActivityReport.findAll;

  let goal;
  let goalTwo;
  let recipient;
  let objective;

  let grant = {
    id: faker.datatype.number({ min: 67000, max: 68000 }),
    number: faker.random.alphaNumeric(10),
    cdi: false,
    regionId: 1,
  };

  beforeAll(async () => {
    recipient = await Recipient.create({ name: `recipient${faker.datatype.number()}`, id: faker.datatype.number({ min: 67000, max: 68000 }), uei: faker.datatype.string(12) });
    grant = await Grant.create({ ...grant, recipientId: recipient.id });
    goal = await Goal.create({
      name: 'This is some serious goal text',
      status: 'Draft',
    });

    goalTwo = await Goal.create({
      name: 'This is another goal',
      status: 'Not Started',
    });

    // await GrantGoal.create({
    //   recipientId: recipient.id,
    //   grantId: grant.id,
    //   goalId: goal.id,
    // });

    objective = await Objective.create({
      goalId: goal.id,
      status: 'Not Started',
      title: 'Make everything ok',
      // ttaProvided: 'No',
    });

    await ObjectiveResource.create({
      userProvidedUrl: 'http://website',
      objectiveId: objective.id,
    });
  });

  afterAll(async () => {
    await ObjectiveResource.destroy({
      where: {
        objectiveId: objective.id,
      },
    });

    await Objective.destroy({
      where: {
        goalId: goal.id,
      },
    });

    // await GrantGoal.destroy({
    //   where: {
    //     goalId: goal.id,
    //   },
    // });

    await Goal.destroy({
      where: {
        id: [goal.id, goalTwo.id],
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

    jest.clearAllMocks();

    await db.sequelize.close();
  });

  it('destroys goals and associated data', async () => {
    let foundGoal = await Goal.findAll({
      where: {
        id: goal.id,
      },
    });

    // let foundGrantGoal = await GrantGoal.findAll({
    //   where: {
    //     goalId: goal.id,
    //   },
    // });

    let foundObjective = await Objective.findAll({
      where: {
        goalId: goal.id,
      },
    });

    let foundObjectiveResource = await ObjectiveResource.findAll({
      where: {
        userProvidedUrl: 'http://website',
        objectiveId: objective.id,
      },
    });

    expect(foundGoal.length).toBe(1);
    // expect(foundGrantGoal.length).toBe(1);
    expect(foundObjective.length).toBe(1);
    expect(foundObjectiveResource.length).toBe(1);

    const result = await destroyGoal(goal.id);
    expect(result.objectivesDestroyed).toBe(1);
    expect(result.objectiveResourcesDestroyed).toBe(1);
    expect(result.goalsDestroyed).toBe(1);

    foundGoal = await Goal.findAll({
      where: {
        id: goal.id,
      },
    });

    // foundGrantGoal = await GrantGoal.findAll({
    //   where: {
    //     goalId: goal.id,
    //   },
    // });

    foundObjective = await Objective.findAll({
      where: {
        goalId: goal.id,
      },
    });

    foundObjectiveResource = await ObjectiveResource.findAll({
      where: {
        userProvidedUrl: 'http://website',
        objectiveId: objective.id,
      },
    });

    expect(foundGoal.length).toBe(0);
    // expect(foundGrantGoal.length).toBe(0);
    expect(foundObjective.length).toBe(0);
    expect(foundObjectiveResource.length).toBe(0);
  });

  it('wont delete a goal if its on an AR', async () => {
    ActivityReport.findAll = jest.fn().mockResolvedValue([1]);
    const spy = jest.spyOn(auditLogger, 'error');
    const result = await destroyGoal(goalTwo.id);

    const foundGoal = await Goal.findByPk(goalTwo.id);
    expect(foundGoal).toBeTruthy();

    expect(result).toBe(0);
    expect(spy).toBeCalledWith(
      'SERVICE:GOALS - Sequelize error - unable to delete from db - Error: Goal is on an activity report and can\'t be deleted',
    );
    ActivityReport.findAll = oldFindAll;
  });

  it('handles invalid ids', async () => {
    const result = await destroyGoal('fish');
    expect(result).toBe(0);
  });
});
