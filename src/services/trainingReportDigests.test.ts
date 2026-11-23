import { faker } from '@faker-js/faker';
import { frequencyToInterval } from '../lib/mailer';
import db from '../models';
import { createUser } from '../testUtils';
import { REGIONAL_PD_WITH_NATIONAL_CENTERS, REGIONAL_TTA_NO_NATIONAL_CENTERS } from './eventFlow';
import {
  trainingReportsWhereCollaboratorByDate,
  trainingReportsWherePocByDate,
  trainingReportsWhereSessionNeedsActionByDate,
  trainingReportsWhereSessionSubmittedByDate,
} from './trainingReportDigests';

jest.mock('bull');

const { EventReportPilot, SessionReportPilot, User, sequelize } = db;

const DAILY = frequencyToInterval('today');

describe('training report digests', () => {
  let owner;
  let poc;
  let outsider;
  const eventIds: number[] = [];

  const createEvent = async (
    pocIds: number[],
    eventOrganizer = REGIONAL_PD_WITH_NATIONAL_CENTERS,
    ownerId = owner.id,
    collaboratorIds: number[] = []
  ) => {
    const event = await EventReportPilot.create({
      ownerId,
      pocIds,
      collaboratorIds,
      regionId: 1,
      eventId: `R01-TR-${faker.string.numeric(8)}`,
      data: { eventOrganizer },
    });
    eventIds.push(event.id);
    return event;
  };

  // a digest window that starts now, so audit rows written before this call fall outside it
  const windowStartingNow = async () => {
    const [[{ now }]] = (await sequelize.query('SELECT clock_timestamp()::text AS now')) as [
      [{ now: string }],
      unknown,
    ];
    return `'${now}'::timestamptz`;
  };

  beforeAll(async () => {
    [owner, poc, outsider] = await Promise.all([createUser({}), createUser({}), createUser({})]);
  });

  afterAll(async () => {
    await SessionReportPilot.destroy({ where: { eventId: eventIds } });
    await EventReportPilot.destroy({ where: { id: eventIds } });
    await User.destroy({ where: { id: [owner.id, poc.id, outsider.id] } });
    await sequelize.close();
  });

  describe('trainingReportsWherePocByDate', () => {
    it('returns reports the user was added to as a POC within the interval', async () => {
      const added = await createEvent([]);
      const since = await windowStartingNow();
      const created = await createEvent([poc.id]);
      await added.update({ pocIds: [poc.id] });

      const reports = await trainingReportsWherePocByDate(poc.id, since);
      const ids = reports.map((r) => r.id);

      expect(ids).toEqual(expect.arrayContaining([created.id, added.id]));
      expect(reports.find((r) => r.id === added.id)).toEqual({
        id: added.id,
        displayId: added.eventId,
      });
    });

    it('skips reports where the user was already a POC before the interval', async () => {
      const event = await createEvent([poc.id]);
      const since = await windowStartingNow();
      await event.update({ collaboratorIds: [owner.id] });

      const reports = await trainingReportsWherePocByDate(poc.id, since);

      expect(reports.map((r) => r.id)).not.toContain(event.id);
    });

    it('skips reports the user was removed from, events without National Centers, and owners', async () => {
      const removed = await createEvent([poc.id]);
      await removed.update({ pocIds: [] });
      const noNationalCenters = await createEvent([poc.id], REGIONAL_TTA_NO_NATIONAL_CENTERS);
      const ownedByPoc = await createEvent([poc.id], REGIONAL_PD_WITH_NATIONAL_CENTERS, poc.id);

      const ids = (await trainingReportsWherePocByDate(poc.id, DAILY)).map((r) => r.id);

      expect(ids).not.toContain(removed.id);
      expect(ids).not.toContain(noNationalCenters.id);
      expect(ids).not.toContain(ownedByPoc.id);
    });

    it('returns nothing for a non-integer user id', async () => {
      expect(await trainingReportsWherePocByDate('1 OR 1=1', DAILY)).toEqual([]);
    });
  });
  describe('trainingReportsWhereCollaboratorByDate', () => {
    const TTA_HOSTED = REGIONAL_TTA_NO_NATIONAL_CENTERS;

    it('returns reports the user was added to as a collaborator within the interval', async () => {
      const before = await createEvent([], TTA_HOSTED, owner.id, [poc.id]);
      const added = await createEvent([], TTA_HOSTED);
      const since = await windowStartingNow();
      const created = await createEvent([], TTA_HOSTED, owner.id, [poc.id]);
      await added.update({ collaboratorIds: [poc.id] });
      await before.update({ pocIds: [owner.id] });

      const reports = await trainingReportsWhereCollaboratorByDate(poc.id, since);
      const ids = reports.map((r) => r.id);

      expect(ids).toEqual(expect.arrayContaining([created.id, added.id]));
      expect(ids).not.toContain(before.id);
      expect(reports.find((r) => r.id === added.id)).toEqual({
        id: added.id,
        displayId: added.eventId,
      });
    });

    it('skips reports the user was removed from and reports they own', async () => {
      const removed = await createEvent([], TTA_HOSTED, owner.id, [poc.id]);
      await removed.update({ collaboratorIds: [] });
      const ownedByUser = await createEvent([], TTA_HOSTED, poc.id, [poc.id]);

      const ids = (await trainingReportsWhereCollaboratorByDate(poc.id, DAILY)).map((r) => r.id);

      expect(ids).not.toContain(removed.id);
      expect(ids).not.toContain(ownedByUser.id);
    });

    it('returns nothing for a non-integer user id', async () => {
      expect(await trainingReportsWhereCollaboratorByDate('x', DAILY)).toEqual([]);
    });
  });
  describe('trainingReportsWhereSessionSubmittedByDate', () => {
    // a Regional PD session counts as submitted once the collaborator and POC sides are complete
    const COMPLETE = { collabComplete: true, pocComplete: true };
    const createSession = (
      eventId: number,
      submittedAt: Date | null,
      data = {},
      approverId = poc.id
    ) =>
      SessionReportPilot.create({
        eventId,
        approverId,
        submittedAt,
        data: { ...COMPLETE, ...data },
      });

    it('returns each session submitted to the user within the interval', async () => {
      const [submitted, approved, old, otherApprover] = await Promise.all([
        createEvent([]),
        createEvent([]),
        createEvent([]),
        createEvent([]),
      ]);
      const now = new Date();
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [inProgress, unnamed] = await Promise.all([
        createSession(submitted.id, now, { status: 'In progress', sessionName: 'Session A' }),
        createSession(submitted.id, now, {}),
        createSession(approved.id, now, { status: 'Complete' }),
        createSession(approved.id, now, { status: 'needs_action' }),
        createSession(old.id, lastWeek),
        createSession(otherApprover.id, now, {}, owner.id),
      ]);

      const reports = await trainingReportsWhereSessionSubmittedByDate(poc.id, DAILY);

      expect(reports).toEqual([
        { id: inProgress.id, eventId: submitted.eventId, displayId: 'Session A' },
        { id: unnamed.id, eventId: submitted.eventId, displayId: `Session ${unnamed.id}` },
      ]);
    });

    it('skips sessions no longer submitted though they keep a recent submittedAt', async () => {
      // e.g. a facilitation reset cleared completion and only one side resubmitted
      const partial = await createEvent([]);
      const session = await createSession(partial.id, new Date(), {
        status: 'In progress',
        collabComplete: false,
      });

      const reports = await trainingReportsWhereSessionSubmittedByDate(poc.id, DAILY);

      expect(reports.map((report) => report.id)).not.toContain(session.id);
    });

    it('returns nothing for a non-integer user id', async () => {
      expect(await trainingReportsWhereSessionSubmittedByDate('x', DAILY)).toEqual([]);
    });
  });

  describe('trainingReportsWhereSessionNeedsActionByDate', () => {
    const NEEDS_ACTION = 'needs_action';
    const createNeedsActionSession = (
      eventId: number,
      needsActionAt: Date | null,
      data: Record<string, unknown> = { status: NEEDS_ACTION }
    ) =>
      SessionReportPilot.create({
        eventId,
        approverId: outsider.id,
        needsActionAt,
        data: { collabComplete: true, pocComplete: true, ...data },
      });

    it('returns sessions needing action on TRs the user owns, collaborates on or is a POC for', async () => {
      const since = await windowStartingNow();
      const [asOwner, asCollaborator, asPoc, notMine] = await Promise.all([
        createEvent([], REGIONAL_TTA_NO_NATIONAL_CENTERS, poc.id),
        createEvent([], REGIONAL_TTA_NO_NATIONAL_CENTERS, owner.id, [poc.id]),
        createEvent([poc.id]),
        createEvent([]),
      ]);
      const now = new Date();
      const owned = await createNeedsActionSession(asOwner.id, now, {
        status: NEEDS_ACTION,
        sessionName: 'Owned session',
      });
      const collaborated = await createNeedsActionSession(asCollaborator.id, now);
      const pocSession = await createNeedsActionSession(asPoc.id, now);
      await createNeedsActionSession(notMine.id, now);

      const reports = await trainingReportsWhereSessionNeedsActionByDate(poc.id, since);

      expect(reports).toEqual([
        { id: owned.id, eventId: asOwner.eventId, displayId: 'Owned session' },
        {
          id: collaborated.id,
          eventId: asCollaborator.eventId,
          displayId: `Session ${collaborated.id}`,
        },
        { id: pocSession.id, eventId: asPoc.eventId, displayId: `Session ${pocSession.id}` },
      ]);
    });

    it('skips sessions outside the interval and sessions no longer needing action', async () => {
      const event = await createEvent([poc.id]);
      const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const old = await createNeedsActionSession(event.id, lastWeek);
      const resubmitted = await createNeedsActionSession(event.id, new Date(), {
        status: 'In progress',
      });
      const neverNeededAction = await createNeedsActionSession(event.id, null);

      const ids = (await trainingReportsWhereSessionNeedsActionByDate(poc.id, DAILY)).map(
        (r) => r.id
      );

      expect(ids).not.toContain(old.id);
      expect(ids).not.toContain(resubmitted.id);
      expect(ids).not.toContain(neverNeededAction.id);
    });

    it('returns nothing for a non-integer user id', async () => {
      expect(await trainingReportsWhereSessionNeedsActionByDate('1 OR 1=1', DAILY)).toEqual([]);
    });
  });
});
