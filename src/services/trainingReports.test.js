import { createEvent, destroyEvent } from './event';
import {
  createTR,
  destroyTR,
  findTRById,
  findTRsByEventId,
  updateTR,
} from './trainingReports';

describe('training reports service', () => {
  let eventId;

  beforeAll(async () => {
    const eventData = {
      ownerId: 99_888,
      regionId: 99_888,
      pocId: 99_888,
      collaboratorIds: [99_888],
      data: {},
    };
    const created = await createEvent(eventData);
    eventId = created.id;
  });

  afterAll(async () => {
    await destroyEvent(eventId);
  });

  describe('createTR', () => {
    it('works', async () => {
      const created = await createTR({ eventId, data: {} });

      expect(created).toMatchObject({
        id: expect.anything(),
        eventId,
      });

      await destroyTR(created.id);
    });
  });

  describe('updateTR', () => {
    it('works', async () => {
      const created = await createTR({ eventId, data: {} });

      const updatedData = {
        eventId,
        data: {
          harry: 'potter',
        },
      };
      const updated = await updateTR(created.id, updatedData);

      expect(updated).toMatchObject({
        eventId,
        data: updatedData.data,
      });

      await destroyTR(created.id);
    });

    it('creates a new TR when the id cannot be found', async () => {
      const found = await findTRById(99_999);
      expect(found).toBeNull();

      const updatedData = { eventId, data: { harry: 'potter' } };
      const updated = await updateTR(99_999, updatedData);

      expect(updated).toMatchObject({
        id: expect.anything(),
        eventId,
        data: updatedData.data,
      });

      await destroyTR(updated.id);
    });
  });

  describe('findTRById', () => {
    it('works', async () => {
      const created = await createTR({ eventId, data: {} });

      const found = await findTRById(created.id);

      expect(found).toMatchObject({
        id: created.id,
        eventId,
      });

      await destroyTR(created.id);
    });
  });

  describe('findTRsByEventId', () => {
    it('works', async () => {
      const created1 = await createTR({ eventId, data: {} });
      const created2 = await createTR({ eventId, data: {} });

      const found = await findTRsByEventId(eventId);

      expect(found).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: created1.id,
            eventId,
          }),
          expect.objectContaining({
            id: created2.id,
            eventId,
          }),
        ]),
      );

      await destroyTR(created1.id);
      await destroyTR(created2.id);
    });
  });
});
