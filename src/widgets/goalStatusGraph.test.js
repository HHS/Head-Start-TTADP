import goalStatusGraph, { GOAL_STATUS } from './goalStatusGraph';
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
      status: GOAL_STATUS.NOT_STARTED,
      grantId,
      recipientId,
    }));
    goals.push(await createGoal({
      status: GOAL_STATUS.NOT_STARTED,
      grantId,
      recipientId,
    }));

    goals.push(await createGoal({
      status: GOAL_STATUS.IN_PROGRESS,
      grantId,
      recipientId,
    }));
    goals.push(await createGoal({
      status: GOAL_STATUS.IN_PROGRESS,
      grantId,
      recipientId,
    }));
    goals.push(await createGoal({
      status: GOAL_STATUS.IN_PROGRESS,
      grantId,
      recipientId,
    }));

    goals.push(await createGoal({
      status: GOAL_STATUS.CLOSED,
      grantId,
      recipientId,
    }));
    goals.push(await createGoal({
      status: GOAL_STATUS.CLOSED,
      grantId,
      recipientId,
    }));

    goals.push(await createGoal({
      status: GOAL_STATUS.DRAFT,
      grantId,
      recipientId,
    }));

    goals.push(await createGoal({
      status: '',
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
    expect(total).toBe(7);
  });

  describe('it counts status of', () => {
    it('not started', () => {
      const notStarted = allGoals.find((r) => r.status === GOAL_STATUS.NOT_STARTED);
      expect(notStarted.count).toBe(2);
    });

    it('in progress', () => {
      const inProgress = allGoals.find((r) => r.status === GOAL_STATUS.IN_PROGRESS);
      expect(inProgress.count).toBe(3);
    });

    it('closed', () => {
      const closed = allGoals.find((r) => r.status === GOAL_STATUS.CLOSED);
      expect(closed.count).toBe(2);
    });

    it('ceased', () => {
      const ceased = allGoals.find((r) => r.status === GOAL_STATUS.CEASED);
      expect(ceased.count).toBe(0);
    });
  });

  describe('it ignores status of', () => {
    it('null', () => {
      const notDefined = allGoals.find((r) => r.status === null);
      expect(notDefined).toBeUndefined();
    });

    it('draft', () => {
      const draft = allGoals.find((r) => r.status === GOAL_STATUS.DRAFT);
      expect(draft).toBeUndefined();
    });

    it('empty string', () => {
      const empty = allGoals.find((r) => r.status === '');
      expect(empty).toBeUndefined();
    });
  });
});
