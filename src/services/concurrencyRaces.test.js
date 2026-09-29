import crypto from 'crypto';
import { GOAL_COLLABORATORS } from '../constants';
import {
  findOrCreateCollaborator,
  removeCollaboratorsForType,
} from '../models/helpers/genericCollaborator';
import { syncLink } from '../models/hooks/genericLink';
import db from '../models';
import { createGrant, createRecipient, createUser, getUniqueId } from '../testUtils';
import { findOrCreateResource, findOrCreateResources } from './resource';

// Creating a Resource enqueues a metadata fetch; keep that off Redis and the network.
jest.mock('./resourceQueue', () => ({
  addGetResourceMetadataToQueue: jest.fn(),
}));

const {
  sequelize, Goal, GoalCollaborator, Grant, MonitoringReviewLink, Recipient, Resource, User,
} = db;

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
};
const uniqueUrl = (label) => `https://race-${label}-${getUniqueId()}.test`;
const DEADLOCK_DETECTED = '40P01';

// Two transactions each inserting a new unique key the other one is about to insert will
// deadlock. Postgres detects this and aborts exactly one; the other must still commit cleanly.
const expectOneDeadlockVictim = (outcomes) => {
  const rejected = outcomes.filter((o) => o.status === 'rejected');
  expect(rejected).toHaveLength(1);
  expect(rejected[0].reason?.parent?.code).toBe(DEADLOCK_DETECTED);
};
const sortedIds = (linkBack) => [...(linkBack?.activityReportIds || [])].sort((a, b) => a - b);

// Starts `winnerWork` in its own transaction and holds that transaction open (uncommitted)
// until released, so a second transaction is forced to race against the uncommitted row.
const holdOpenTransaction = (winnerWork, { rollback = false } = {}) => {
  const ready = deferred();
  const release = deferred();
  const done = sequelize.transaction(async (transaction) => {
    const result = await winnerWork(transaction);
    ready.resolve(result);
    await release.promise;
    if (rollback) throw new Error('intentional rollback');
    return result;
  });
  return {
    ready: ready.promise,
    release: release.resolve,
    done: rollback ? done.catch((e) => e) : done,
  };
};

// Runs `work` in its own transaction and records whether it has settled yet, so a test can
// prove the call is genuinely blocked on the other transaction (not just racing past it).
const trackedTransaction = (work) => {
  const state = { settled: false };
  const done = sequelize.transaction(work).finally(() => { state.settled = true; });
  return { state, done };
};

describe('concurrency races (real database)', () => {
  let recipient;
  let grant;
  let goals;
  let user;
  const urlsToCleanup = [];
  const reviewIdsToCleanup = [];

  beforeAll(async () => {
    recipient = await createRecipient();
    grant = await createGrant({ recipientId: recipient.id });
    goals = await Promise.all([
      Goal.create({ grantId: grant.id, name: 'race test goal 1' }),
      Goal.create({ grantId: grant.id, name: 'race test goal 2' }),
    ]);
    user = await createUser();
  });

  afterEach(async () => {
    await GoalCollaborator.destroy({
      where: { goalId: goals.map((g) => g.id) },
      individualHooks: false,
      force: true,
    });
  });

  afterAll(async () => {
    await Resource.destroy({ where: { url: urlsToCleanup }, individualHooks: false, force: true });
    await MonitoringReviewLink.destroy({
      where: { reviewId: reviewIdsToCleanup },
      individualHooks: false,
      force: true,
    });
    await Goal.destroy({ where: { id: goals.map((g) => g.id) }, individualHooks: false, force: true });
    await User.destroy({ where: { id: user.id } });
    await Grant.destroy({ where: { id: grant.id }, individualHooks: true, force: true });
    await Recipient.destroy({ where: { id: recipient.id }, force: true });
    await sequelize.close();
  });

  const collab = (transaction, goalId, reportIds) => findOrCreateCollaborator(
    'goal',
    sequelize,
    transaction,
    goalId,
    user.id,
    GOAL_COLLABORATORS.LINKER,
    { activityReportIds: reportIds }
  );

  const linkInstance = () => ({
    isNewRecord: true,
    changed: jest.fn().mockReturnValue(['reviewId']),
  });

  describe('Resources', () => {
    it('20 concurrent callers on separate connections resolve to exactly one row', async () => {
      const url = uniqueUrl('fanout');
      urlsToCleanup.push(url);

      const results = await Promise.all(Array.from({ length: 20 }, () => findOrCreateResource(url)));

      expect(new Set(results.map((r) => r.id)).size).toBe(1);
      expect(await Resource.count({ where: { url } })).toBe(1);
    });

    it('a second transaction blocks on the uncommitted row, then recovers with a usable transaction', async () => {
      const url = uniqueUrl('held');
      urlsToCleanup.push(url);

      const winner = holdOpenTransaction((t) => findOrCreateResource(url, t));
      const winnerRow = await winner.ready;

      const loser = trackedTransaction(async (t) => {
        const row = await findOrCreateResource(url, t);
        // Fails with "current transaction is aborted" if the lost race poisoned the transaction.
        const count = await Resource.count({ where: { url }, transaction: t });
        return { row, count };
      });

      await sleep(300);
      expect(loser.state.settled).toBe(false);

      winner.release();
      await winner.done;
      const { row, count } = await loser.done;

      expect(row.id).toBe(winnerRow.id);
      expect(count).toBe(1);
      expect(await Resource.count({ where: { url } })).toBe(1);
    });

    it('when the winner rolls back, the blocked transaction creates the row itself', async () => {
      const url = uniqueUrl('rollback');
      urlsToCleanup.push(url);

      const winner = holdOpenTransaction((t) => findOrCreateResource(url, t), { rollback: true });
      await winner.ready;

      const loser = trackedTransaction((t) => findOrCreateResource(url, t));
      await sleep(300);
      expect(loser.state.settled).toBe(false);

      winner.release();
      await winner.done;
      const row = await loser.done;

      const rows = await Resource.findAll({ where: { url } });
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(row.id);
    });

    it('accepts urls too long for a plain btree index, including concurrent creates', async () => {
      // Incompressible, so it can't squeeze under the ~2.7KB btree entry limit via TOAST.
      const url = `https://race-long.test/?q=${crypto.randomBytes(3000).toString('hex')}`;
      urlsToCleanup.push(url);

      const results = await Promise.all(Array.from({ length: 5 }, () => findOrCreateResource(url)));

      expect(new Set(results.map((r) => r.id)).size).toBe(1);
      expect(await Resource.count({ where: { url } })).toBe(1);
    });

    it('opposite-order creates deadlock: Postgres aborts one side, no duplicate rows', async () => {
      const urlA = uniqueUrl('deadlock-a');
      const urlB = uniqueUrl('deadlock-b');
      urlsToCleanup.push(urlA, urlB);

      const firstCreatedA = deferred();
      const secondCreatedB = deferred();

      const first = sequelize.transaction(async (t) => {
        await findOrCreateResource(urlA, t);
        firstCreatedA.resolve();
        await secondCreatedB.promise;
        return findOrCreateResource(urlB, t);
      });
      const second = sequelize.transaction(async (t) => {
        await firstCreatedA.promise;
        await findOrCreateResource(urlB, t);
        secondCreatedB.resolve();
        return findOrCreateResource(urlA, t);
      });

      expectOneDeadlockVictim(await Promise.allSettled([first, second]));
      expect(await Resource.count({ where: { url: urlA } })).toBe(1);
      expect(await Resource.count({ where: { url: urlB } })).toBe(1);
    });
  });

  describe('Collaborators', () => {
    it('10 concurrent callers each with a different linkBack produce one row with every id', async () => {
      const goalId = goals[0].id;
      const reportIds = Array.from({ length: 10 }, () => getUniqueId());

      await Promise.all(reportIds.map((id) => collab(null, goalId, [id])));

      const rows = await GoalCollaborator.findAll({ where: { goalId, userId: user.id } });
      expect(rows).toHaveLength(1);
      expect(sortedIds(rows[0].linkBack)).toEqual([...reportIds].sort((a, b) => a - b));
    });

    it('sibling calls sharing one transaction merge correctly and leave the transaction usable', async () => {
      const goalId = goals[0].id;
      const reportIds = Array.from({ length: 5 }, () => getUniqueId());

      const count = await sequelize.transaction(async (t) => {
        await Promise.all(reportIds.map((id) => collab(t, goalId, [id])));
        return GoalCollaborator.count({ where: { goalId }, transaction: t });
      });

      const rows = await GoalCollaborator.findAll({ where: { goalId, userId: user.id } });
      expect(count).toBe(1);
      expect(sortedIds(rows[0].linkBack)).toEqual([...reportIds].sort((a, b) => a - b));
    });

    it('a second transaction blocks on the uncommitted row, then merges its linkBack', async () => {
      const goalId = goals[0].id;
      const [a, b] = [getUniqueId(), getUniqueId()];

      const winner = holdOpenTransaction((t) => collab(t, goalId, [a]));
      await winner.ready;

      const loser = trackedTransaction(async (t) => {
        await collab(t, goalId, [b]);
        return GoalCollaborator.count({ where: { goalId }, transaction: t });
      });
      await sleep(300);
      expect(loser.state.settled).toBe(false);

      winner.release();
      await winner.done;
      expect(await loser.done).toBe(1);

      const rows = await GoalCollaborator.findAll({ where: { goalId, userId: user.id } });
      expect(rows).toHaveLength(1);
      expect(sortedIds(rows[0].linkBack)).toEqual([a, b].sort((x, y) => x - y));
    });

    it.each([
      ['add holds the row lock first', 'add'],
      ['remove holds the row lock first', 'remove'],
    ])('concurrent add and remove on linkBack never lose an update (%s)', async (_label, first) => {
      const goalId = goals[0].id;
      const [keep, removeMe, addMe] = [getUniqueId(), getUniqueId(), getUniqueId()];
      await collab(null, goalId, [keep, removeMe]);

      const add = (t) => collab(t, goalId, [addMe]);
      const remove = (t) => removeCollaboratorsForType(
        'goal',
        sequelize,
        t,
        goalId,
        GOAL_COLLABORATORS.LINKER,
        { activityReportIds: [removeMe] }
      );
      const [holder, waiter] = first === 'add' ? [add, remove] : [remove, add];

      const held = holdOpenTransaction(holder);
      await held.ready;
      const blocked = trackedTransaction(waiter);
      await sleep(300);
      expect(blocked.state.settled).toBe(false);

      held.release();
      await held.done;
      await blocked.done;

      const rows = await GoalCollaborator.findAll({ where: { goalId, userId: user.id } });
      expect(rows).toHaveLength(1);
      expect(sortedIds(rows[0].linkBack)).toEqual([keep, addMe].sort((x, y) => x - y));
    });

    it('opposite-order creates deadlock: Postgres aborts one side, no duplicate rows', async () => {
      const [g1, g2] = goals.map((g) => g.id);
      const firstCreated = deferred();
      const secondCreated = deferred();

      const first = sequelize.transaction(async (t) => {
        await collab(t, g1, [getUniqueId()]);
        firstCreated.resolve();
        await secondCreated.promise;
        return collab(t, g2, [getUniqueId()]);
      });
      const second = sequelize.transaction(async (t) => {
        await firstCreated.promise;
        await collab(t, g2, [getUniqueId()]);
        secondCreated.resolve();
        return collab(t, g1, [getUniqueId()]);
      });

      expectOneDeadlockVictim(await Promise.allSettled([first, second]));
      expect(await GoalCollaborator.count({ where: { goalId: g1, userId: user.id } })).toBe(1);
      expect(await GoalCollaborator.count({ where: { goalId: g2, userId: user.id } })).toBe(1);
    });
  });

  describe('Links', () => {
    it('20 concurrent callers create one row and fire the create callback exactly once', async () => {
      const reviewId = `race-fanout-${getUniqueId()}`;
      reviewIdsToCleanup.push(reviewId);
      const callback = jest.fn().mockResolvedValue();

      await Promise.all(Array.from({ length: 20 }, () => syncLink(
        sequelize, linkInstance(), {}, MonitoringReviewLink, 'reviewId', 'reviewId', reviewId, callback
      )));

      expect(await MonitoringReviewLink.count({ where: { reviewId } })).toBe(1);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('a second transaction blocks on the uncommitted link, then treats it as already linked', async () => {
      const reviewId = `race-held-${getUniqueId()}`;
      reviewIdsToCleanup.push(reviewId);
      const callback = jest.fn().mockResolvedValue();
      const sync = (t) => syncLink(
        sequelize, linkInstance(), { transaction: t }, MonitoringReviewLink,
        'reviewId', 'reviewId', reviewId, callback
      );

      const winner = holdOpenTransaction(sync);
      await winner.ready;

      const loser = trackedTransaction(async (t) => {
        await sync(t);
        return MonitoringReviewLink.count({ where: { reviewId }, transaction: t });
      });
      await sleep(300);
      expect(loser.state.settled).toBe(false);

      winner.release();
      await winner.done;

      expect(await loser.done).toBe(1);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Mixed siblings in one transaction', () => {
    it('a lost race does not discard an unrelated sibling write made just before the insert', async () => {
      const url = uniqueUrl('sibling-write');
      const reviewId = `race-sibling-write-${getUniqueId()}`;
      urlsToCleanup.push(url);
      reviewIdsToCleanup.push(reviewId);
      const originalCreate = Resource.create.bind(Resource);
      let outer;

      // Right before the helper's INSERT: another request commits the same url (so the helper
      // loses the race), and unrelated code on the shared transaction writes a row.
      const spy = jest.spyOn(Resource, 'create').mockImplementationOnce(async (values, options) => {
        await sequelize.transaction((other) => originalCreate({ url }, { transaction: other }));
        await MonitoringReviewLink.create({ reviewId }, { transaction: outer });
        return originalCreate(values, options);
      });

      try {
        await sequelize.transaction(async (t) => {
          outer = t;
          await findOrCreateResource(url, t);
        });
      } finally {
        spy.mockRestore();
      }

      expect(await MonitoringReviewLink.count({ where: { reviewId } })).toBe(1);
      expect(await Resource.count({ where: { url } })).toBe(1);
    });

    it('resource, collaborator and link siblings stay usable while one of them loses a race', async () => {
      const contestedUrl = uniqueUrl('mixed-contested');
      const freshUrl = uniqueUrl('mixed-fresh');
      const reviewId = `race-mixed-${getUniqueId()}`;
      urlsToCleanup.push(contestedUrl, freshUrl);
      reviewIdsToCleanup.push(reviewId);
      const goalId = goals[1].id;
      const reportId = getUniqueId();
      const callback = jest.fn().mockResolvedValue();

      // Another request holds an uncommitted row for contestedUrl, so the main request's
      // resource sibling blocks and then loses the race while the others share its connection.
      const other = holdOpenTransaction((t) => findOrCreateResource(contestedUrl, t));
      await other.ready;

      const main = trackedTransaction(async (t) => {
        await Promise.all([
          findOrCreateResources([contestedUrl, freshUrl], t),
          collab(t, goalId, [reportId]),
          syncLink(
            sequelize, linkInstance(), { transaction: t }, MonitoringReviewLink,
            'reviewId', 'reviewId', reviewId, callback
          ),
        ]);
        return Promise.all([
          Resource.count({ where: { url: [contestedUrl, freshUrl] }, transaction: t }),
          GoalCollaborator.count({ where: { goalId }, transaction: t }),
          MonitoringReviewLink.count({ where: { reviewId }, transaction: t }),
        ]);
      });

      await sleep(300);
      expect(main.state.settled).toBe(false);

      other.release();
      await other.done;

      expect(await main.done).toEqual([2, 1, 1]);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
