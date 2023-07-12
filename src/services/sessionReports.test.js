import faker from '@faker-js/faker';
import db from '../models';
import { createEvent, destroyEvent } from './event';
import {
  createSession,
  destroySession,
  findSessionById,
  findSessionsByEventId,
  updateSession,
  getPossibleSessionParticipants,
} from './sessionReports';

describe('session reports service', () => {
  let eventId;

  beforeAll(async () => {
    const eventData = {
      ownerId: 99_888,
      regionId: 99_888,
      pocId: [99_888],
      collaboratorIds: [99_888],
      data: {},
    };
    const created = await createEvent(eventData);
    eventId = created.id;
  });

  afterAll(async () => {
    await destroyEvent(eventId);
    await db.sequelize.close();
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

  describe('getPossibleSessionParticipants', () => {
    const mockRegionId = faker.datatype.number({ min: 20 });

    let program;
    let program2;
    let recipient;

    beforeAll(async () => {
      await db.Region.create({
        id: mockRegionId,
        name: `Random test region ${mockRegionId}`,
      });

      recipient = await db.Recipient.create({
        id: faker.datatype.number(),
        name: faker.name.firstName(),
      });

      const grant = await db.Grant.create({
        id: faker.datatype.number(),
        number: faker.datatype.string(),
        recipientId: recipient.id,
        regionId: mockRegionId,
        status: 'Active',
      });

      const oldGrant = await db.Grant.create({
        id: faker.datatype.number(),
        number: faker.datatype.string(),
        recipientId: recipient.id,
        regionId: mockRegionId,
        status: 'Inactive',
      });

      program = await db.Program.create({
        id: faker.datatype.number(),
        name: faker.company.companyName() + faker.company.bsBuzz(),
        grantId: grant.id,
        programType: 'HS',
        startYear: 2016,
        startDate: '2016-11-01',
        endDate: null,
        status: 'Active',
      });

      program2 = await db.Program.create({
        id: faker.datatype.number(),
        name: faker.company.companyName() + faker.company.bsBuzz(),
        grantId: oldGrant.id,
        programType: 'HS',
        startYear: 2016,
        startDate: '2016-11-01',
        endDate: null,
        status: 'Inactive',
      });
    });

    afterAll(async () => {
      await db.Program.destroy({
        where: {
          id: [program.id, program2.id],
        },
      });

      await db.Grant.destroy({
        where: {
          recipientId: recipient.id,
        },
      });

      await db.Recipient.destroy({ where: { id: recipient.id } });
      await db.Region.destroy({ where: { id: mockRegionId } });
    });
    it('retrieves possible participants', async () => {
      const participants = await getPossibleSessionParticipants(mockRegionId);
      expect(participants.length).toBe(1);
      expect(participants[0].id).toBe(recipient.id);
      expect(participants[0]).toHaveProperty('id');
      expect(participants[0]).toHaveProperty('name');
      expect(participants[0].grants.length).toBe(1);
    });
  });
});
