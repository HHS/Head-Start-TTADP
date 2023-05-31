import { createEvent, destroyEvent } from './event';
import {
  createSession,
  destroySession,
  findSessionById,
  findSessionsByEventId,
  updateSession,
} from './sessionReports';

describe('session reports service', () => {
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

  describe('createSession', () => {
    it('works', async () => {
      const created = await createSession({ eventId, data: {} });

      expect(created).toMatchObject({
        id: expect.anything(),
        eventId,
      });

      await destroySession(created.id);
    });
  });

  describe('updateSession', () => {
    it('works', async () => {
      const created = await createSession({ eventId, data: {} });

      const updatedData = {
        eventId,
        data: {
          harry: 'potter',
        },
      };
      const updated = await updateSession(created.id, updatedData);

      expect(updated).toMatchObject({
        eventId,
        data: updatedData.data,
      });

      await destroySession(created.id);
    });

    it('creates a new Session when the id cannot be found', async () => {
      const found = await findSessionById(99_999);
      expect(found).toBeNull();

      const updatedData = { eventId, data: { harry: 'potter' } };
      const updated = await updateSession(99_999, updatedData);

      expect(updated).toMatchObject({
        id: expect.anything(),
        eventId,
        data: updatedData.data,
      });

      await destroySession(updated.id);
    });
  });

  describe('findSessionById', () => {
    it('works', async () => {
      const created = await createSession({ eventId, data: {} });

      const found = await findSessionById(created.id);

      expect(found).toMatchObject({
        id: created.id,
        eventId,
      });

      await destroySession(created.id);
    });
  });

  describe('findSessionsByEventId', () => {
    it('works', async () => {
      const created1 = await createSession({ eventId, data: {} });
      const created2 = await createSession({ eventId, data: {} });

      const found = await findSessionsByEventId(eventId);

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

      await destroySession(created1.id);
      await destroySession(created2.id);
    });
  });
});
