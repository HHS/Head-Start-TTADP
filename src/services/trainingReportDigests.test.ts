import { faker } from '@faker-js/faker';
import { frequencyToInterval } from '../lib/mailer';
import db from '../models';
import { createUser } from '../testUtils';
import { REGIONAL_PD_WITH_NATIONAL_CENTERS, REGIONAL_TTA_NO_NATIONAL_CENTERS } from './eventFlow';
import {
  trainingReportsWhereCollaboratorByDate,
  trainingReportsWherePocByDate,
} from './trainingReportDigests';

jest.mock('bull');

const { EventReportPilot, User, sequelize } = db;

const DAILY = frequencyToInterval('today');

describe('training report digests', () => {
  let owner;
  let poc;
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
    [owner, poc] = await Promise.all([createUser({}), createUser({})]);
  });

  afterAll(async () => {
    await EventReportPilot.destroy({ where: { id: eventIds } });
    await User.destroy({ where: { id: [owner.id, poc.id] } });
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
});
