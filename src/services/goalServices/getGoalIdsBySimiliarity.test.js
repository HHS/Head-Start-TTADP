import faker from '@faker-js/faker';
import {
  Grant, Recipient, Goal, sequelize,
} from '../../models';
import { createGoal } from '../../testUtils';
import { GOAL_STATUS } from '../../constants';
import { getGoalIdsBySimilarity } from '../goals';

describe('getGoalIdsBySimilarity', () => {
  let goalGroupOne = [];
  let goalGroupTwo = [];
  let goalGroupThree = [];

  const goalTitleOne = faker.lorem.sentence();
  const goalTitleTwo = faker.lorem.sentence();
  const goalTitleThree = faker.lorem.sentence();

  beforeAll(async () => {
    goalGroupOne = await Promise.all([
      createGoal({ status: GOAL_STATUS.IN_PROGRESS, name: goalTitleOne }),
      createGoal({ status: GOAL_STATUS.IN_PROGRESS, name: goalTitleOne }),
      createGoal({ status: GOAL_STATUS.IN_PROGRESS, name: goalTitleOne }),
      createGoal({ status: GOAL_STATUS.NOT_STARTED, name: goalTitleOne }),
    ]);

    goalGroupTwo = await Promise.all([
      createGoal({ status: GOAL_STATUS.IN_PROGRESS, name: goalTitleTwo }),
      createGoal({ status: GOAL_STATUS.DRAFT, name: goalTitleTwo }),
      createGoal({ status: GOAL_STATUS.CLOSED, name: goalTitleTwo }),
      createGoal({ status: GOAL_STATUS.NOT_STARTED, name: goalTitleTwo }),
    ]);

    goalGroupThree = await Promise.all([
      createGoal({ status: GOAL_STATUS.IN_PROGRESS, name: goalTitleThree }),
      createGoal({ status: GOAL_STATUS.IN_PROGRESS, name: goalTitleThree }),
    ]);
  });

  afterAll(async () => {
    const goals = [
      ...goalGroupOne,
      ...goalGroupTwo,
      ...goalGroupThree,
    ];
    const grants = await Grant.findAll({
      attributes: ['id', 'recipientId'],
      where: {
        id: goals.map((g) => g.grantId),
      },
    });

    const recipients = await Recipient.findAll({
      attributes: ['id'],
      where: {
        id: grants.map((g) => g.recipientId),
      },
    });

    await Goal.destroy({
      where: {
        id: goals.map((g) => g.id),
      },
      force: true,
    });

    await Grant.destroy({
      where: {
        id: grants.map((g) => g.id),
      },
      force: true,
    });

    await Recipient.destroy({
      where: {
        id: recipients.map((r) => r.id),
      },
      force: true,
    });

    await sequelize.close();
  });

  it('shapes the similiarty response', async () => {
    const similarityResponse = [goalGroupOne, goalGroupTwo, goalGroupThree].map((group) => ({
      id: group[0].id,
      name: group[0].name,
      matches: group.map((g) => ({
        id: g.id,
        name: g.name,
      })),
    }));

    const idsSets = await getGoalIdsBySimilarity(similarityResponse);
    // we expect goal group three to be eliminated, so we should have two sets
    expect(idsSets).toHaveLength(2);

    const [setOne, setTwo] = idsSets;

    // set one has been partially de-duped
    expect(setOne.goals.length).toBe(2);
    expect(setOne.ids).toHaveLength(4);
    // set two is all distinct
    expect(setTwo.goals.length).toBe(4);
    expect(setTwo.ids).toHaveLength(4);
  });
});
