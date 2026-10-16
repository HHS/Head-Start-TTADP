import { REPORT_STATUSES } from '@ttahub/common';
import crypto from 'crypto';
import { GOAL_COLLABORATORS } from '../constants';
import db from '../models';
import {
  findOrCreateCollaborator,
  removeCollaboratorsForType,
} from '../models/helpers/genericCollaborator';
import { syncLink } from '../models/hooks/genericLink';
import { createGrant, createRecipient, createReport, createUser, getUniqueId } from '../testUtils';
import { findOrCreateResource, findOrCreateResources } from './resource';

// Creating a Resource enqueues a metadata fetch; keep that off Redis and the network.
jest.mock('./resourceQueue', () => ({
  addGetResourceMetadataToQueue: jest.fn(),
}));

const {
  sequelize,
  ActivityReport,
  Goal,
  GoalCollaborator,
  GoalCollaboratorActivityReport,
  Grant,
  MonitoringReviewLink,
  Recipient,
  Resource,
  User,
} = db;

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
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
const sortedNumbers = (values) => [...values].sort((a, b) => a - b);
const linkedReportIds = async (goalCollaboratorId) =>
  sortedNumbers(
    (await GoalCollaboratorActivityReport.findAll({ where: { goalCollaboratorId } })).map(
      (link) => link.activityReportId
    )
  );

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
  const done = sequelize.transaction(work).finally(() => {
    state.settled = true;
  });
  return { state, done };
};

describe('concurrency races (real database)', () => {
  let recipient;
  let grant;
  let goals;
  let user;
  // Collaborator links reference real reports, so tests draw their report ids from this pool.
  let reportIds;
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
    const reports = await Promise.all(
      Array.from({ length: 10 }, () =>
        createReport({
          activityRecipients: [],
          userId: user.id,
          regionId: grant.regionId,
          submissionStatus: REPORT_STATUSES.DRAFT,
          calculatedStatus: REPORT_STATUSES.DRAFT,
        })
      )
    );
    reportIds = reports.map((report) => report.id);
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
    await Goal.destroy({
      where: { id: goals.map((g) => g.id) },
      individualHooks: false,
      force: true,
    });
    await ActivityReport.destroy({ where: { id: reportIds }, individualHooks: false, force: true });
    await User.destroy({ where: { id: user.id } });
    await Grant.destroy({ where: { id: grant.id }, individualHooks: true, force: true });
    await Recipient.destroy({ where: { id: recipient.id }, force: true });
    await sequelize.close();
  });

  const collab = (transaction, goalId, reportIds) =>
    findOrCreateCollaborator(
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

      const results = await Promise.all(
        Array.from({ length: 20 }, () => findOrCreateResource(url))
      );

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
    const removeLinker = (t, goalId, ids) =>
      removeCollaboratorsForType('goal', sequelize, t, goalId, GOAL_COLLABORATORS.LINKER, {
        activityReportIds: ids,
      });

    it('10 concurrent callers each linking a different report produce one row with every link', async () => {
      const goalId = goals[0].id;
      const ids = reportIds.slice(0, 10);

      await Promise.all(ids.map((id) => collab(null, goalId, [id])));

      const rows = await GoalCollaborator.findAll({ where: { goalId, userId: user.id } });
      expect(rows).toHaveLength(1);
      expect(await linkedReportIds(rows[0].id)).toEqual(sortedNumbers(ids));
    });

    it('sibling calls sharing one transaction link every report and leave the transaction usable', async () => {
      const goalId = goals[0].id;
      const ids = reportIds.slice(0, 5);

      const count = await sequelize.transaction(async (t) => {
        await Promise.all(ids.map((id) => collab(t, goalId, [id])));
        return GoalCollaborator.count({ where: { goalId }, transaction: t });
      });

      const rows = await GoalCollaborator.findAll({ where: { goalId, userId: user.id } });
      expect(count).toBe(1);
      expect(await linkedReportIds(rows[0].id)).toEqual(sortedNumbers(ids));
    });

    it('a second transaction blocks on the uncommitted row, then adds its link to it', async () => {
      const goalId = goals[0].id;
      const [a, b] = reportIds;

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
      expect(await linkedReportIds(rows[0].id)).toEqual(sortedNumbers([a, b]));
    });

    it('sibling add and remove sharing one transaction never lose an update', async () => {
      const goalId = goals[0].id;
      const [keep, removeMe, addMe] = reportIds;
      await collab(null, goalId, [keep, removeMe]);

      await sequelize.transaction((t) =>
        Promise.all([collab(t, goalId, [addMe]), removeLinker(t, goalId, [removeMe])])
      );

      const rows = await GoalCollaborator.findAll({ where: { goalId, userId: user.id } });
      expect(rows).toHaveLength(1);
      expect(await linkedReportIds(rows[0].id)).toEqual(sortedNumbers([keep, addMe]));
    });

    it.each([
      ['add holds the row lock first', 'add'],
      ['remove holds the row lock first', 'remove'],
    ])('concurrent add and remove never lose an update (%s)', async (_label, first) => {
      const goalId = goals[0].id;
      const [keep, removeMe, addMe] = reportIds;
      await collab(null, goalId, [keep, removeMe]);

      const add = (t) => collab(t, goalId, [addMe]);
      const remove = (t) => removeLinker(t, goalId, [removeMe]);
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
      expect(await linkedReportIds(rows[0].id)).toEqual(sortedNumbers([keep, addMe]));
    });

    it.each([
      ['remove holds the row lock first', 'remove'],
      ['add holds the row lock first', 'add'],
    ])(
      'removing the last report while another transaction adds one keeps the new link (%s)',
      async (_label, first) => {
        const goalId = goals[0].id;
        const [lastReport, newReport] = reportIds;
        await collab(null, goalId, [lastReport]);

        const add = (t) => collab(t, goalId, [newReport]);
        const remove = (t) => removeLinker(t, goalId, [lastReport]);
        const [holder, waiter] = first === 'add' ? [add, remove] : [remove, add];

        const held = holdOpenTransaction(holder);
        await held.ready;
        const blocked = trackedTransaction(waiter);
        await sleep(300);
        expect(blocked.state.settled).toBe(false);

        held.release();
        await held.done;
        await blocked.done;

        // Whichever order they ran in, exactly one active Linker remains, linked to the new report.
        const active = await GoalCollaborator.findAll({ where: { goalId, userId: user.id } });
        expect(active).toHaveLength(1);
        expect(await linkedReportIds(active[0].id)).toEqual([newReport]);
      }
    );

    // Callers without a transaction (neither passed nor ambient) still get an atomic removal.
    // Each case repeats the race, since its interleaving isn't controlled.
    it('standalone removes of different reports soft-delete the collaborator once both are gone', async () => {
      const goalId = goals[0].id;
      const [first, second] = reportIds;

      for (let i = 0; i < 20; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await collab(null, goalId, [first, second]);
        // eslint-disable-next-line no-await-in-loop
        await Promise.all([
          removeLinker(null, goalId, [first]),
          removeLinker(null, goalId, [second]),
        ]);
        // eslint-disable-next-line no-await-in-loop
        expect(await GoalCollaborator.count({ where: { goalId, userId: user.id } })).toBe(0);
      }
    });

    it('a standalone add racing a standalone remove of the last report keeps the new link', async () => {
      const goalId = goals[0].id;
      const [lastReport, newReport] = reportIds;

      for (let i = 0; i < 20; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await GoalCollaborator.destroy({ where: { goalId }, force: true });
        // eslint-disable-next-line no-await-in-loop
        await collab(null, goalId, [lastReport]);
        // eslint-disable-next-line no-await-in-loop
        await Promise.all([
          collab(null, goalId, [newReport]),
          removeLinker(null, goalId, [lastReport]),
        ]);

        // eslint-disable-next-line no-await-in-loop
        const active = await GoalCollaborator.findAll({ where: { goalId, userId: user.id } });
        expect(active).toHaveLength(1);
        // eslint-disable-next-line no-await-in-loop
        expect(await linkedReportIds(active[0].id)).toEqual([newReport]);
      }
    });

    it('linking more reports to an existing collaborator adds links without rewriting its row', async () => {
      const goalId = goals[0].id;
      const [first, second] = reportIds;
      const original = await collab(null, goalId, [first]);
      await sleep(20);

      const relinked = await collab(null, goalId, [first, second]);

      expect(relinked.id).toBe(original.id);
      const row = await GoalCollaborator.findByPk(original.id);
      expect(row.updatedAt.getTime()).toBe(original.updatedAt.getTime());
      expect(await linkedReportIds(original.id)).toEqual(sortedNumbers([first, second]));
    });

    it('a collaborator that appears between the lock and the unlink is left alone', async () => {
      const goalId = goals[0].id;
      const [removed, added] = reportIds;

      // Pause the removal right after its lock statement, before it unlinks anything.
      const locked = deferred();
      const proceed = deferred();
      const pausingSequelize = Object.create(sequelize);
      pausingSequelize.query = async (sql, options) => {
        const result = await sequelize.query(sql, options);
        if (sql.includes('FOR UPDATE')) {
          locked.resolve();
          await proceed.promise;
        }
        return result;
      };
      const removal = trackedTransaction((t) =>
        removeCollaboratorsForType('goal', pausingSequelize, t, goalId, GOAL_COLLABORATORS.LINKER, {
          activityReportIds: [removed],
        })
      );
      // Nothing is linked to the report yet, so the removal locked nothing.
      await locked.promise;

      // Meanwhile one add creates the collaborator linked to that report, and another holds the
      // collaborator's lock while linking a second report.
      await collab(null, goalId, [removed]);
      const held = holdOpenTransaction((t) => collab(t, goalId, [added]));
      await held.ready;

      proceed.resolve();
      await sleep(300);
      held.release();
      await held.done;
      await removal.done;

      // The removal ran before the collaborator existed, so the collaborator keeps both links.
      const active = await GoalCollaborator.findAll({ where: { goalId, userId: user.id } });
      expect(active).toHaveLength(1);
      expect(await linkedReportIds(active[0].id)).toEqual(sortedNumbers([removed, added]));
    });

    it('a removal and an approval-style batch of adds lock in the same order and do not deadlock', async () => {
      const goalId = goals[0].id;
      const [unapproved, approved] = reportIds;
      const [first, second] = (await Promise.all([createUser(), createUser()])).sort(
        (a, b) => a.id - b.id
      );
      const link = (t, userId, ids) =>
        findOrCreateCollaborator('goal', sequelize, t, goalId, userId, GOAL_COLLABORATORS.LINKER, {
          activityReportIds: ids,
        });
      try {
        // Create the second user's collaborator first, so collaborator ids run opposite to user ids.
        await link(null, second.id, [unapproved]);
        await link(null, first.id, [unapproved]);

        // An approval adds collaborators in user order: lock the first user's row, then pause.
        const firstLocked = deferred();
        const continueAdding = deferred();
        const adds = sequelize.transaction(async (t) => {
          await link(t, first.id, [approved]);
          firstLocked.resolve();
          await continueAdding.promise;
          await link(t, second.id, [approved]);
        });
        await firstLocked.promise;

        // The removal needs both rows; it must wait on the first rather than grab the second.
        const removal = trackedTransaction((t) => removeLinker(t, goalId, [unapproved]));
        await sleep(300);
        expect(removal.state.settled).toBe(false);

        continueAdding.resolve();
        await Promise.all([adds, removal.done]);

        const active = await GoalCollaborator.findAll({ where: { goalId } });
        expect(active.map((c) => c.userId).sort((a, b) => a - b)).toEqual([first.id, second.id]);
        await Promise.all(
          active.map(async (c) => expect(await linkedReportIds(c.id)).toEqual([approved]))
        );
      } finally {
        await GoalCollaborator.destroy({ where: { goalId }, force: true });
        await User.destroy({ where: { id: [first.id, second.id] } });
      }
    });

    it("a removal doesn't block on another user's collaborator it can't change", async () => {
      const goalId = goals[0].id;
      const [mine, theirs] = reportIds;
      const otherUser = await createUser();
      try {
        await collab(null, goalId, [mine]);
        await findOrCreateCollaborator(
          'goal',
          sequelize,
          null,
          goalId,
          otherUser.id,
          GOAL_COLLABORATORS.LINKER,
          { activityReportIds: [theirs] }
        );

        const held = holdOpenTransaction((t) => removeLinker(t, goalId, [mine]));
        await held.ready;
        const other = trackedTransaction((t) => removeLinker(t, goalId, [theirs]));
        await sleep(300);
        // Settles while the first removal still holds its locks.
        expect(other.state.settled).toBe(true);
        await other.done;

        held.release();
        await held.done;
        expect(await GoalCollaborator.count({ where: { goalId } })).toBe(0);
      } finally {
        await GoalCollaborator.destroy({ where: { goalId }, force: true });
        await User.destroy({ where: { id: otherUser.id } });
      }
    });

    it("removing a collaborator's last report soft-deletes it, and re-adding creates a fresh one", async () => {
      const goalId = goals[0].id;
      const [report] = reportIds;
      const original = await collab(null, goalId, [report]);

      await removeLinker(null, goalId, [report]);
      expect(await GoalCollaborator.count({ where: { goalId, userId: user.id } })).toBe(0);
      expect(
        await GoalCollaborator.count({
          where: { id: original.id },
          paranoid: false,
        })
      ).toBe(1);

      const recreated = await collab(null, goalId, [report]);
      expect(recreated.id).not.toBe(original.id);
      expect(await linkedReportIds(recreated.id)).toEqual([report]);
    });

    it('opposite-order creates deadlock: Postgres aborts one side, no duplicate rows', async () => {
      const [g1, g2] = goals.map((g) => g.id);
      const [r1, r2, r3, r4] = reportIds;
      const firstCreated = deferred();
      const secondCreated = deferred();

      const first = sequelize.transaction(async (t) => {
        await collab(t, g1, [r1]);
        firstCreated.resolve();
        await secondCreated.promise;
        return collab(t, g2, [r2]);
      });
      const second = sequelize.transaction(async (t) => {
        await firstCreated.promise;
        await collab(t, g2, [r3]);
        secondCreated.resolve();
        return collab(t, g1, [r4]);
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

      await Promise.all(
        Array.from({ length: 20 }, () =>
          syncLink(
            sequelize,
            linkInstance(),
            {},
            MonitoringReviewLink,
            'reviewId',
            'reviewId',
            reviewId,
            callback
          )
        )
      );

      expect(await MonitoringReviewLink.count({ where: { reviewId } })).toBe(1);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('a second transaction blocks on the uncommitted link, then treats it as already linked', async () => {
      const reviewId = `race-held-${getUniqueId()}`;
      reviewIdsToCleanup.push(reviewId);
      const callback = jest.fn().mockResolvedValue();
      const sync = (t) =>
        syncLink(
          sequelize,
          linkInstance(),
          { transaction: t },
          MonitoringReviewLink,
          'reviewId',
          'reviewId',
          reviewId,
          callback
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
      const [reportId] = reportIds;
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
            sequelize,
            linkInstance(),
            { transaction: t },
            MonitoringReviewLink,
            'reviewId',
            'reviewId',
            reviewId,
            callback
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
