import goalsPercentage from './goalsPercentage';
import db from '../../models';
import {
  createGoal, destroyGoal, createGrant, createRecipient,
} from '../../testUtils';
import { GOAL_STATUS } from './goalsByStatus';

const { Grant, Recipient, Goal } = db;

describe('goalsPercentage', () => {
  const goals = [];
  let recipient;
  let grant;
  let response;

  beforeAll(async () => {
    try {
      await Goal.destroy({ where: {}, truncate: true });
      recipient = await createRecipient();
      const recipientId = recipient.id;
      grant = await createGrant({ recipientId });
      const grantId = grant.id;

      goals.push(await createGoal({
        status: GOAL_STATUS.IN_PROGRESS,
        grantId,
        recipientId,
        onApprovedAR: true,
      }));
      goals.push(await createGoal({
        status: GOAL_STATUS.IN_PROGRESS,
        grantId,
        recipientId,
        onApprovedAR: true,
      }));

      response = await goalsPercentage({ goal: { id: goals.map((g) => g.id) } });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('goalsPercentageTest: ', error);
    }
  });

  afterAll(async () => {
    const promises = goals.map((goal) => destroyGoal(goal));
    await Promise.all(promises);
    await Grant.destroy({
      where: {
        id: grant.id,
      },
      individualHooks: true,
    });
    await Recipient.destroy({
      where: {
        id: recipient.id,
      },
    });
    await db.sequelize.close();
  });

  it('calculates the correct numerator', () => {
    expect(response.numerator).toBe(goals.length);
  });

  it('calculates the correct denominator', () => {
    expect(response.denominator).toBe(goals.length);
  });

  it('calculates the correct percentage', () => {
    expect(response.percentage).toBe(100);
  });
});
