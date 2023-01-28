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
    try {
      recipient = await createRecipient();
      const recipientId = recipient.id;
      grant = await createGrant({ recipientId });
      const grantId = grant.id;

      goals.push(await createGoal({
        status: GOAL_STATUS.NOT_STARTED,
        grantId,
        recipientId,
        onApprovedAR: true,
      }));
      goals.push(await createGoal({
        status: GOAL_STATUS.NOT_STARTED,
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

      goals.push(await createGoal({
        status: GOAL_STATUS.CLOSED,
        grantId,
        recipientId,
        onApprovedAR: true,
      }));
      goals.push(await createGoal({
        status: GOAL_STATUS.CLOSED,
        grantId,
        recipientId,
        onApprovedAR: true,
      }));

      goals.push(await createGoal({
        status: GOAL_STATUS.DRAFT,
        grantId,
        recipientId,
        onApprovedAR: true,
      }));
      response = await goalStatusGraph({ goal: { id: goals.map((g) => g.id) } });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('goalStatusGraphTest: ', error);
    }
  });

  afterAll(async () => {
    const promises = goals.map((goal) => destroyGoal(goal));
    await Promise.all(promises);
    await Grant.destroy({
      where: { id: grant.id },
      individualHooks: true,
    });
    await Recipient.destroy({
      where: { id: recipient.id },
      individualHooks: true,
    });
    await db.sequelize.close();
  });

  it('counts the total number of goals', () => {
    expect(response.total).toBe(7);
  });

  describe('it counts status of', () => {
    it('not started', () => {
      const notStarted = response['Not started'];
      expect(notStarted).toBe(2);
    });

    it('in progress', () => {
      const inProgress = response['In progress'];
      expect(inProgress).toBe(3);
    });

    it('closed', () => {
      const closed = response.Closed;
      expect(closed).toBe(2);
    });

    it('ceased', () => {
      const ceased = response.Suspended;
      expect(ceased).toBe(0);
    });
  });

  describe('it ignores status of', () => {
    it('draft', () => {
      const draft = response[GOAL_STATUS.DRAFT];
      expect(draft).toBeUndefined();
    });
  });
});
