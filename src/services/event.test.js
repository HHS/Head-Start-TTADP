import {
  createEvent,
  updateEvent,
  destroyEvent,
  findEventById,
  findEventsByOwnerId,
  findEventsByPocId,
  findEventsByCollaboratorId,
  findEventsByRegionId,
} from "./event";

describe('event service', () => {
  /* beforeAll(async () => { */
  /*   await EventReportPilot.create({ */
  /*     id: 99_999, */
  /*     ownerId: 99_999, */
  /*     pocId: 99_999, */
  /*     regionId: 99_999, */
  /*     collaboratorIds: [99_998, 99_999], */
  /*     data: {}, */
  /*   }); */
  /* }); */
  /**/
  /* afterAll(async () => { */
  /*   await EventReportPilot.destroy({ where: { id: 99_999 } }); */
  /* }); */

  const createAnEvent = async (num) => {
    return createEvent({
      ownerId: num,
      regionId: num,
      pocId: num,
      collaboratorIds: [num],
      data: {},
    });
  };

  describe('createEvent', () => {
    it('createEvent', async () => {
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
    describe('findEventById', () => {
      it('works', async () => {
        const created = await createAnEvent(98_989);
        const found = await findEventById(created.id);
        expect(found).toHaveProperty('id');
        expect(found).toHaveProperty('ownerId', 98_989);
        await destroyEvent(created.id);
      });
    });

    describe('findEventsByOwnerId', () => {
      it('works', async () => {
        const created = await createAnEvent(98_989);
        const found = await findEventsByOwnerId(created.ownerId);
        expect(found[0]).toHaveProperty('id');
        expect(found[0]).toHaveProperty('ownerId', 98_989);
        await destroyEvent(created.id);
      });
    });

    describe('findEventsByPocId', () => {
      it('works', async () => {
        const created = await createAnEvent(98_989);
        const found = await findEventsByPocId(created.pocId);
        expect(found[0]).toHaveProperty('id');
        expect(found[0]).toHaveProperty('ownerId', 98_989);
        await destroyEvent(created.id);
      });
    });

    describe('findEventsByCollaboratorId', () => {
      it('works', async () => {
        const created = await createAnEvent(98_989);
        const found = await findEventsByCollaboratorId(created.collaboratorIds[0]);
        expect(found[0]).toHaveProperty('id');
        expect(found[0]).toHaveProperty('ownerId', 98_989);
        await destroyEvent(created.id);
      });
    });

    describe('findEventsByRegionId', () => {
      it('works', async () => {
        const created = await createAnEvent(98_989);
        const found = await findEventsByRegionId(created.regionId);
        expect(found[0]).toHaveProperty('id');
        expect(found[0]).toHaveProperty('ownerId', 98_989);
        await destroyEvent(created.id);
      });
    });
  });
});

