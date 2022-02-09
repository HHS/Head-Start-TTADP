import goalStatusGraph, { GOAL_STATUS } from './goalStatusGraph';
import db, { Grant, Recipient } from '../models';
import {
  createGoal, destroyGoal, createGrant, createRecipient,
} from '../testUtils';

describe('goalStatusGraph', () => {
  const goals = [];
  let recipient;
  let grant;
  let response;

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
    response = await goalStatusGraph({ goal: { id: goals.map((g) => g.id) } });
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
    expect(response.total).toBe(7);
  });

  describe('it counts status of', () => {
    it('not started', () => {
      const notStarted = response[GOAL_STATUS.NOT_STARTED];
      expect(notStarted.count).toBe(2);
    });

    it('in progress', () => {
      const inProgress = response[GOAL_STATUS.IN_PROGRESS];
      expect(inProgress.count).toBe(3);
    });

    it('closed', () => {
      const closed = response[GOAL_STATUS.CLOSED];
      expect(closed.count).toBe(2);
    });

    it('ceased', () => {
      const ceased = response[GOAL_STATUS.CEASED];
      expect(ceased.count).toBe(0);
    });
  });

  describe('it ignores status of', () => {
    it('null', () => {
      const notDefined = response.null;
      expect(notDefined).toBeUndefined();
    });

    it('draft', () => {
      const draft = response[GOAL_STATUS.DRAFT];
      expect(draft).toBeUndefined();
    });

    it('empty string', () => {
      const empty = response[''];
      expect(empty).toBeUndefined();
    });
  });
});
