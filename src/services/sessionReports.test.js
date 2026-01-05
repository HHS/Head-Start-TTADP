import faker from '@faker-js/faker';
import db, {
  SessionReportPilotFile,
  SessionReportPilotSupportingAttachment,
  Grant, Recipient,
  SessionReportPilot,
} from '../models';
import { createEvent, destroyEvent } from './event';
import {
  createSession,
  destroySession,
  findSessionById,
  findSessionsByEventId,
  updateSession,
  getPossibleSessionParticipants,
  findSessionHelper,
  validateFields,
} from './sessionReports';
import { createGrant, createGoal, destroyGoal } from '../testUtils';

jest.mock('bull');

describe('session reports service', () => {
  let event;

  const eventId = 'R01-PD-99_888';
  const eventIdSubstring = '99_888';

  beforeAll(async () => {
    const eventData = {
      ownerId: 99_888,
      regionId: 99_888,
      pocIds: [18],
      collaboratorIds: [18],
      data: {
        eventId,
      },
    };
    const created = await createEvent(eventData);
    event = created;
  });

  afterAll(async () => {
    await destroyEvent(event.id);
    await db.sequelize.close();
  });

  describe('createSession', () => {
    it('works', async () => {
      const created = await createSession({ eventId: event.id, data: { card: 'ace' } });

      expect(created).toMatchObject({
        id: expect.anything(),
        eventId: eventIdSubstring,
      });

      await destroySession(created.id);
    });

    it('throws an error when the event is not found', async () => {
      await expect(createSession({ eventId: 999999, data: { card: 'ace' } }))
        .rejects
        .toThrow('Event with id 999999 not found');
    });
  });

  describe('updateSession', () => {
    it('works', async () => {
      const created = await createSession({ eventId: event.id, data: {} });

      const updatedData = {
        eventId: eventIdSubstring,
        data: {
          harry: 'potter',
        },
      };
      const updated = await updateSession(created.id, updatedData);

      expect(updated).toMatchObject({
        eventId: eventIdSubstring,
        data: updatedData.data,
      });

      await destroySession(created.id);
    });

    it('creates a new Session when the id cannot be found', async () => {
      const found = await findSessionById(99_999);
      expect(found).toBeNull();

      const updatedData = { eventId: event.id, data: { harry: 'potter' } };
      const updated = await updateSession(99_999, updatedData);

      expect(updated).toMatchObject({
        id: expect.anything(),
        eventId: eventIdSubstring,
        data: updatedData.data,
      });

      await destroySession(updated.id);
    });
  });

  describe('destroySession', () => {
    let goal; let grant; let createdSession;
    const grantData = {
      id: 5555555,
      number: '1234',
      regionId: 1,
      recipientId: 7,
    };
    const goalData = {
      id: 99_111,
      name: 'Random text goal; Random text',
      grantId: 5555555,
      status: 'Draft',
    };
    beforeAll(async () => {
      createdSession = await createSession({ eventId: event.id, data: {} });
      grant = await createGrant(grantData);
      goal = await createGoal(goalData);
    });

    afterAll(async () => {
      await SessionReportPilot.destroy({ where: { eventId: event.id }, force: true });
      await destroyGoal(goalData);
      await Grant.destroy({ where: { id: 5555555 }, force: true, individualHooks: true });
      await Recipient.destroy({ where: { id: 69514 }, force: true });
    });

    it('should delete files and attachments associated with the session report pilot', async () => {
      const id = 1;
      const destroyMock = jest.spyOn(SessionReportPilotFile, 'destroy').mockResolvedValue(undefined);
      const destroyAttachmentMock = jest.spyOn(SessionReportPilotSupportingAttachment, 'destroy').mockResolvedValue(undefined);

      await destroySession(id);

      expect(destroyMock).toHaveBeenCalledWith(
        {
          where: { sessionReportPilotId: id },
        },
        { individualHooks: true },
      );
      expect(destroyAttachmentMock).toHaveBeenCalledWith(
        {
          where: { sessionReportPilotId: id },
        },
        { individualHooks: true },
      );
    });
    it('should delete session', async () => {
      // Verify the session record is present
      expect(createdSession).toBeDefined();

      // Delete the session
      await destroySession(createdSession.id);

      // Verify the session was deleted
      const session = await SessionReportPilot.findByPk(createdSession.id);
      expect(session).toBeNull();
    });
  });

  describe('findSessionById', () => {
    it('works', async () => {
      const created = await createSession({ eventId: event.id, data: {} });

      const found = await findSessionById(created.id);

      expect(found).toMatchObject({
        id: created.id,
        eventId: eventIdSubstring,
      });

      await destroySession(created.id);
    });
  });

  describe('findSessionsByEventId', () => {
    it('works', async () => {
      const created1 = await createSession({ eventId: event.id, data: {} });
      const created2 = await createSession({ eventId: event.id, data: {} });

      const found = await findSessionsByEventId(event.id);

      expect(found).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: created1.id,
            eventId: event.id,
          }),
          expect.objectContaining({
            id: created2.id,
            eventId: event.id,
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
    let alternateRecipient;

    beforeAll(async () => {
      await db.Region.create({
        id: mockRegionId,
        name: `Random test region ${mockRegionId}`,
      });

      await db.Region.create({
        id: mockRegionId + 1,
        name: `Random test region ${mockRegionId + 1}`,
      });

      recipient = await db.Recipient.create({
        id: faker.datatype.number(),
        name: faker.name.firstName(),
      });

      alternateRecipient = await db.Recipient.create({
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

      await db.Grant.create({
        id: faker.datatype.number(),
        number: faker.datatype.string(),
        recipientId: alternateRecipient.id,
        regionId: mockRegionId + 1,
        stateCode: 'CA',
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
          recipientId: [
            recipient.id,
            alternateRecipient.id,
          ],
        },
        individualHooks: true,
      });

      await db.Recipient.destroy({
        where: {
          id: [
            recipient.id,
            alternateRecipient.id,
          ],
        },
      });
      await db.Region.destroy({
        where: {
          id: [
            mockRegionId,
            mockRegionId + 1,
          ],
        },
      });
    });
    it('retrieves possible participants', async () => {
      const participants = await getPossibleSessionParticipants(mockRegionId);
      expect(participants.length).toBe(1);
      expect(participants[0].id).toBe(recipient.id);
      expect(participants[0]).toHaveProperty('id');
      expect(participants[0]).toHaveProperty('name');
      expect(participants[0].grants.length).toBe(1);
    });

    it('ignores an empty states array', async () => {
      const participants = await getPossibleSessionParticipants(mockRegionId, []);
      expect(participants.length).toBe(1);
      expect(participants[0].id).toBe(recipient.id);
      expect(participants[0]).toHaveProperty('id');
      expect(participants[0]).toHaveProperty('name');
      expect(participants[0].grants.length).toBe(1);
    });

    it('retrieves participants from alternate states', async () => {
      const participants = await getPossibleSessionParticipants(mockRegionId, ['CA']);
      expect(participants.length).toBe(2);
      expect(participants.map((p) => p.id)).toEqual(
        expect.arrayContaining([recipient.id, alternateRecipient.id]),
      );
    });
  });
  describe('findSessionHelper', () => {
    let createdEvent;
    let sessionIds;
    beforeAll(async () => {
      const eventData = {
        ownerId: 99_989,
        regionId: 99_888,
        pocIds: [18],
        collaboratorIds: [18],
        data: {
          eventId,
        },
      };
      createdEvent = await createEvent(eventData);

      // Create Sessions.
      const session1 = await createSession({ eventId: createdEvent.id, data: { startDate: '04/20/2022' } });
      const session2 = await createSession({ eventId: createdEvent.id, data: { startDate: '01/01/2023' } });
      const session3 = await createSession({ eventId: createdEvent.id, data: { startDate: '02/10/2022' } });
      sessionIds = [session1.id, session2.id, session3.id];
    });

    afterAll(async () => {
      await SessionReportPilot.destroy({
        where: {
          id: sessionIds,
        },
      });
      destroyEvent(createdEvent.id);
    });

    it('check sessions sort order', async () => {
      const sessions = await findSessionHelper({ eventId: createdEvent.id }, true);
      expect(sessions.length).toBe(3);
      expect(sessions[0].data.startDate).toBe('02/10/2022');
      expect(sessions[1].data.startDate).toBe('04/20/2022');
      expect(sessions[2].data.startDate).toBe('01/01/2023');
    });

    it('should return null if no sessions are found', async () => {
      jest.spyOn(db.SessionReportPilot, 'findAll').mockResolvedValueOnce(null);
      const sessions = await findSessionHelper({ eventId: 999999 }, true);
      expect(sessions).toBeNull();
    });

    it('should return a single session when plural is false', async () => {
      const session = await findSessionHelper({ id: sessionIds[0] }, false);
      expect(session).toHaveProperty('id', sessionIds[0]);
    });

    it('should return multiple sessions when plural is true', async () => {
      const sessions = await findSessionHelper({ eventId: createdEvent.id }, true);
      expect(sessions.length).toBe(3);
    });

    it('should return default values when data, files, supportingAttachments, and event are undefined', async () => {
      const createdSession = await SessionReportPilot.create({
        eventId: createdEvent.id,
        data: {},
      });

      const foundSession = await findSessionHelper({ id: createdSession.id });

      expect(foundSession).toHaveProperty('data', {});
      expect(foundSession).toHaveProperty('files', []);
      expect(foundSession).toHaveProperty('supportingAttachments', []);

      await SessionReportPilot.destroy({ where: { id: createdSession.id } });
    });

    it('should return null for the eventId when session.event is null', async () => {
      jest.spyOn(db.SessionReportPilot, 'findOne').mockResolvedValueOnce({ id: 999 });
      const foundSession = await findSessionHelper({ id: 'it doesnt matter' });
      expect(foundSession).toHaveProperty('eventId', null);
      expect(foundSession).toHaveProperty('id', 999);
      expect(foundSession).toHaveProperty('data', {});
      expect(foundSession).toHaveProperty('files', []);
      expect(foundSession).toHaveProperty('supportingAttachments', []);
    });
  });

  describe('validateFields', () => {
    it('throws an error when there are missingFields', () => {
      expect(() => {
        validateFields({ field1: 'value1' }, ['field1', 'field2']);
      }).toThrow();
    });
  });
});
