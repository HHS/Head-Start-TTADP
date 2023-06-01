import { TRAINING_REPORT_STATUSES as TRS } from '@ttahub/common';

import {
  createEvent,
  updateEvent,
  destroyEvent,
  findEventById,
  findEventsByOwnerId,
  findEventsByPocId,
  findEventsByCollaboratorId,
  findEventsByRegionId,
  findEventsByStatus,
} from './event';

describe('event service', () => {
  const createAnEvent = async (num) => createEvent({
    ownerId: num,
    regionId: num,
    pocId: num,
    collaboratorIds: [num],
    data: {
      status: 'active',
    },
  });

  const createAnEventWithStatus = async (num, status) => createEvent({
    ownerId: num,
    regionId: num,
    pocId: num,
    collaboratorIds: [num],
    data: {
      status,
    },
  });

  describe('createEvent', () => {
    it('works', async () => {
      const created = await createAnEvent(98_989);
      expect(created).toHaveProperty('id');
      expect(created).toHaveProperty('ownerId', 98_989);
      await destroyEvent(created.id);
    });
  });

  describe('updateEvent', () => {
    it('works', async () => {
      const created = await createAnEvent(98_989);

      const updated = await updateEvent(created.id, {
        ownerId: 123,
        pocId: 123,
        regionId: 123,
        collaboratorIds: [123],
        data: {},
      });

      expect(updated).toHaveProperty('ownerId', 123);

      await destroyEvent(created.id);
    });

    it('creates a new event when the id cannot be found', async () => {
      const found = await findEventById(99_999);
      expect(found).toBeNull();

      const updated = await updateEvent(99_999, {
        ownerId: 123,
        pocId: 123,
        regionId: 123,
        collaboratorIds: [123],
        data: {},
      });

      expect(updated).toHaveProperty('id');
      expect(updated).toHaveProperty('ownerId', 123);

      await destroyEvent(updated.id);
    });
  });

  describe('finders', () => {
    it('findEventById', async () => {
      const created = await createAnEvent(98_989);
      const found = await findEventById(created.id);
      expect(found).toHaveProperty('id');
      expect(found).toHaveProperty('ownerId', 98_989);
      await destroyEvent(created.id);
    });

    it('findEventsByOwnerId', async () => {
      const created = await createAnEvent(98_989);
      const found = await findEventsByOwnerId(created.ownerId);
      expect(found[0]).toHaveProperty('id');
      expect(found[0]).toHaveProperty('ownerId', 98_989);
      await destroyEvent(created.id);
    });

    it('findEventsByPocId', async () => {
      const created = await createAnEvent(98_989);
      const found = await findEventsByPocId(created.pocId);
      expect(found[0]).toHaveProperty('id');
      expect(found[0]).toHaveProperty('ownerId', 98_989);
      await destroyEvent(created.id);
    });

    it('findEventsByCollaboratorId', async () => {
      const created = await createAnEvent(98_989);
      const found = await findEventsByCollaboratorId(created.collaboratorIds[0]);
      expect(found[0]).toHaveProperty('id');
      expect(found[0]).toHaveProperty('ownerId', 98_989);
      await destroyEvent(created.id);
    });

    it('findEventsByRegionId', async () => {
      const created = await createAnEvent(98_989);
      const found = await findEventsByRegionId(created.regionId);
      expect(found[0]).toHaveProperty('id');
      expect(found[0]).toHaveProperty('ownerId', 98_989);
      await destroyEvent(created.id);
    });

    it('findEventsByStatus', async () => {
      const created = await createAnEventWithStatus(98_989, TRS.IN_PROGRESS);
      const found = await findEventsByStatus(TRS.IN_PROGRESS);
      expect(found[0].data).toHaveProperty('status', TRS.IN_PROGRESS);
      await destroyEvent(created.id);

      const created2 = await createAnEventWithStatus(98_989, TRS.NOT_STARTED);
      const found2 = await findEventsByStatus(TRS.NOT_STARTED);

      // ---------
      // ensure no found events have a status of TRS.IN_PROGRESS
      // if we search for TRS.NOT_STARTED:
      found2.forEach((event) => {
        expect(event.data).not.toHaveProperty('status', TRS.IN_PROGRESS);
      });

      await destroyEvent(created2.id);

      // ---------
      // ensure allowNull param works:
      const created3 = await createAnEventWithStatus(50_500, null);
      const created4 = await createAnEventWithStatus(50_501, TRS.IN_PROGRESS);

      const found3 = await findEventsByStatus(null, [], null, true);
      const found4 = await findEventsByStatus(
        TRS.IN_PROGRESS,
        [],
        null,
        false,
      );

      expect(found3.length).toBe(1);

      // expect found4.length to be less than found3.length:
      expect(found4.length).toBe(1);

      await destroyEvent(created3.id);
      await destroyEvent(created4.id);
    });
  });
});
