import goalStatusGraph from './goalStatusGraph';
import db, { Grant, Recipient } from '../models';
import {
  createGoal, destroyGoal, createGrant, createRecipient,
} from '../testUtils';

describe('goalStatusGraph', () => {
  const goals = [];
  let recipient;
  let grant;
  let total;
  let allGoals;

  beforeAll(async () => {
    recipient = await createRecipient();
    const recipientId = recipient.id;
    grant = await createGrant({ recipientId });
    const grantId = grant.id;

    goals.push(await createGoal({
      status: 'not_started',
      grantId,
      recipientId,
    }));
    goals.push(await createGoal({
      status: 'not_started',
      grantId,
      recipientId,
    }));

    goals.push(await createGoal({
      status: 'in_progress',
      grantId,
      recipientId,
    }));
    goals.push(await createGoal({
      status: 'in_progress',
      grantId,
      recipientId,
    }));
    goals.push(await createGoal({
      status: 'in_progress',
      grantId,
      recipientId,
    }));

    goals.push(await createGoal({
      status: 'closed',
      grantId,
      recipientId,
    }));
    goals.push(await createGoal({
      status: 'closed',
      grantId,
      recipientId,
    }));

    goals.push(await createGoal({
      status: 'ceased',
      grantId,
      recipientId,
    }));

    goals.push(await createGoal({
      status: null,
      grantId,
      recipientId,
    }));
    const res = await goalStatusGraph({ goal: { id: goals.map((g) => g.id) } });
    total = res.total;
    allGoals = res.goals;
  });

  afterAll(async () => {
    const promises = goals.map((goal) => destroyGoal(goal));
    await Promise.all(promises);
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

  it('counts the total number of goals', () => {
    expect(total).toBe(8);
  });

  describe('it counts', () => {
    it('not started', () => {
      const notStarted = allGoals.find((r) => r.status === 'not_started');
      expect(notStarted.count).toBe(2);
    });

    it('in progress', () => {
      const inProgress = allGoals.find((r) => r.status === 'in_progress');
      expect(inProgress.count).toBe(3);
    });

    it('closed', () => {
      const closed = allGoals.find((r) => r.status === 'closed');
      expect(closed.count).toBe(2);
    });

    it('ceased', () => {
      const ceased = allGoals.find((r) => r.status === 'ceased');
      expect(ceased.count).toBe(1);
    });
  });

  describe('it ignores', () => {
    it('null', () => {
      const notDefined = allGoals.find((r) => r.status === null);
      expect(notDefined).toBeUndefined();
    });
  });
});
