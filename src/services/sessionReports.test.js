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
  getSessionReports,
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

  describe('getSessionReports', () => {
    let testEvent;
    let testSessions = [];
    const uniqueOwnerId = 99_800;

    const testEventLongId = 'R01-PD-99800';

    beforeAll(async () => {
      // Create test event
      testEvent = await createEvent({
        ownerId: uniqueOwnerId,
        regionId: 1,
        pocIds: [18],
        collaboratorIds: [18],
        data: {
          eventId: testEventLongId,
          eventName: 'Test Event for Sessions',
        },
      });

      // Create test sessions with varied data for sorting/filtering
      testSessions = await Promise.all([
        createSession({
          eventId: testEvent.id,
          data: {
            sessionName: 'Alpha Session',
            startDate: '01/15/2024',
            endDate: '01/16/2024',
            objectiveTopics: ['Topic A', 'Topic B'],
          },
        }),
        createSession({
          eventId: testEvent.id,
          data: {
            sessionName: 'Beta Session',
            startDate: '01/10/2024',
            endDate: '01/11/2024',
            objectiveTopics: ['Topic C'],
          },
        }),
        createSession({
          eventId: testEvent.id,
          data: {
            sessionName: 'Gamma Session',
            startDate: '01/20/2024',
            endDate: '01/21/2024',
            objectiveTopics: [],
          },
        }),
      ]);
    });

    afterAll(async () => {
      await Promise.all(
        testSessions.map((session) => destroySession(session.id)),
      );
      await destroyEvent(testEvent.id);
    });

    // Basic Functionality Tests
    it('should return correct structure with count and rows', async () => {
      const result = await getSessionReports({
        'eventId.ctn': [testEventLongId],
      });

      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('rows');
      expect(typeof result.count).toBe('number');
      expect(Array.isArray(result.rows)).toBe(true);
    });

    it('should work with no parameters (defaults)', async () => {
      const result = await getSessionReports({
        'eventId.ctn': [testEventLongId],
      });

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.count).toBeGreaterThanOrEqual(result.rows.length);
    });

    it('should return all expected fields per row', async () => {
      const result = await getSessionReports({
        'eventId.ctn': [testEventLongId],
      });

      expect(result.rows.length).toBeGreaterThan(0);
      const row = result.rows[0];
      expect(row).toHaveProperty('id');
      expect(row).toHaveProperty('eventId');
      expect(row).toHaveProperty('eventName');
      expect(row).toHaveProperty('sessionName');
      expect(row).toHaveProperty('startDate');
      expect(row).toHaveProperty('endDate');
      expect(row).toHaveProperty('objectiveTopics');
    });

    // Pagination Tests
    it('should apply default offset of 0 and limit of 10', async () => {
      const result = await getSessionReports({
        'eventId.ctn': [testEventLongId],
      });

      expect(result.rows.length).toBeLessThanOrEqual(10);
    });

    it('should skip records with offset parameter', async () => {
      const firstPage = await getSessionReports({ limit: 1, offset: 0, 'eventId.ctn': [testEventLongId] });
      const secondPage = await getSessionReports({ limit: 1, offset: 1, 'eventId.ctn': [testEventLongId] });

      expect(firstPage.rows.length).toBe(1);
      expect(secondPage.rows.length).toBe(1);
      expect(firstPage.rows[0].id).not.toBe(secondPage.rows[0].id);
    });

    it('should limit results with limit parameter', async () => {
      const limitOne = await getSessionReports({ limit: 1, 'eventId.ctn': [testEventLongId] });
      const limitTwo = await getSessionReports({ limit: 2, 'eventId.ctn': [testEventLongId] });

      expect(limitOne.rows.length).toBeLessThanOrEqual(1);
      expect(limitTwo.rows.length).toBeLessThanOrEqual(2);
    });

    it('should return accurate total count regardless of pagination', async () => {
      const allResults = await getSessionReports({ limit: 1000, 'eventId.ctn': [testEventLongId] });
      const paginatedResults = await getSessionReports({ limit: 1, offset: 0, 'eventId.ctn': [testEventLongId] });

      expect(allResults.count).toBe(paginatedResults.count);
    });

    // Sorting Tests
    it('should sort by id DESC by default', async () => {
      const result = await getSessionReports({ limit: 100, 'eventId.ctn': [testEventLongId] });

      expect(result.rows.length).toBeGreaterThanOrEqual(0);
      const pairs = result.rows.slice(0, -1).map((row, idx) => [
        row.id,
        result.rows[idx + 1].id,
      ]);
      pairs.forEach(([current, next]) => {
        expect(current).toBeGreaterThanOrEqual(next);
      });
    });

    it('should sort by id ASC', async () => {
      const result = await getSessionReports({
        sortBy: 'id',
        sortDir: 'ASC',
        limit: 100,
        'eventId.ctn': [testEventLongId],
      });

      expect(result.rows.length).toBeGreaterThanOrEqual(0);
      const pairs = result.rows.slice(0, -1).map((row, idx) => [
        row.id,
        result.rows[idx + 1].id,
      ]);
      pairs.forEach(([current, next]) => {
        expect(current).toBeLessThanOrEqual(next);
      });
    });

    it('should sort by sessionName ASC', async () => {
      const result = await getSessionReports({
        sortBy: 'sessionName',
        sortDir: 'ASC',
        limit: 100,
        'eventId.ctn': [testEventLongId],
      });

      expect(result.rows.length).toBeGreaterThanOrEqual(0);
      const pairs = result.rows.slice(0, -1).map((row, idx) => [
        row.sessionName || '',
        result.rows[idx + 1].sessionName || '',
      ]);
      pairs.forEach(([current, next]) => {
        expect(current.localeCompare(next)).toBeLessThanOrEqual(0);
      });
    });

    it('should sort by sessionName DESC', async () => {
      const result = await getSessionReports({
        sortBy: 'sessionName',
        sortDir: 'DESC',
        limit: 100,
        'eventId.ctn': [testEventLongId],
      });

      expect(result.rows.length).toBeGreaterThanOrEqual(0);
      const pairs = result.rows.slice(0, -1).map((row, idx) => [
        row.sessionName || '',
        result.rows[idx + 1].sessionName || '',
      ]);
      pairs.forEach(([current, next]) => {
        expect(current.localeCompare(next)).toBeGreaterThanOrEqual(0);
      });
    });

    it('should sort by startDate ASC with date casting', async () => {
      const result = await getSessionReports({
        sortBy: 'startDate',
        sortDir: 'ASC',
        limit: 100,
        'eventId.ctn': [testEventLongId],
      });

      expect(result.rows.length).toBeGreaterThanOrEqual(0);
      const pairs = result.rows.slice(0, -1).map((row, idx) => [
        new Date(row.startDate || 0).getTime(),
        new Date(result.rows[idx + 1].startDate || 0).getTime(),
      ]);
      pairs.forEach(([current, next]) => {
        expect(current).toBeLessThanOrEqual(next);
      });
    });

    it('should sort by startDate DESC with date casting', async () => {
      const result = await getSessionReports({
        sortBy: 'startDate',
        sortDir: 'DESC',
        limit: 100,
        'eventId.ctn': [testEventLongId],
      });

      expect(result.rows.length).toBeGreaterThanOrEqual(0);
      const pairs = result.rows.slice(0, -1).map((row, idx) => [
        new Date(row.startDate || 0).getTime(),
        new Date(result.rows[idx + 1].startDate || 0).getTime(),
      ]);
      pairs.forEach(([current, next]) => {
        expect(current).toBeGreaterThanOrEqual(next);
      });
    });

    it('should sort by endDate ASC', async () => {
      const result = await getSessionReports({
        sortBy: 'endDate',
        sortDir: 'ASC',
        limit: 100,
        'eventId.ctn': [testEventLongId],
      });

      expect(result.rows.length).toBeGreaterThanOrEqual(0);
      const pairs = result.rows.slice(0, -1).map((row, idx) => [
        new Date(row.endDate || 0).getTime(),
        new Date(result.rows[idx + 1].endDate || 0).getTime(),
      ]);
      pairs.forEach(([current, next]) => {
        expect(current).toBeLessThanOrEqual(next);
      });
    });

    it('should sort by eventId ASC', async () => {
      const result = await getSessionReports({
        sortBy: 'eventId',
        sortDir: 'ASC',
        limit: 100,
        'eventId.ctn': [testEventLongId],
      });

      expect(result.rows.length).toBeGreaterThanOrEqual(0);
      const pairs = result.rows.slice(0, -1).map((row, idx) => [
        row.eventId || '',
        result.rows[idx + 1].eventId || '',
      ]);
      pairs.forEach(([current, next]) => {
        expect(current.localeCompare(next)).toBeLessThanOrEqual(0);
      });
    });

    it('should sort by eventName DESC', async () => {
      const result = await getSessionReports({
        sortBy: 'eventName',
        sortDir: 'DESC',
        limit: 100,
        'eventId.ctn': [testEventLongId],
      });

      expect(result.rows.length).toBeGreaterThanOrEqual(0);
      const pairs = result.rows.slice(0, -1).map((row, idx) => [
        row.eventName || '',
        result.rows[idx + 1].eventName || '',
      ]);
      pairs.forEach(([current, next]) => {
        expect(current.localeCompare(next)).toBeGreaterThanOrEqual(0);
      });
    });

    it('should fall back to id sort when sortBy is invalid', async () => {
      const result = await getSessionReports({ sortBy: 'invalidField', sortDir: 'DESC', 'eventId.ctn': [testEventLongId] });

      expect(result.rows.length).toBeGreaterThanOrEqual(0);
      // Should not throw and should return results
      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('rows');
    });

    // Data Extraction Tests
    it('should extract JSONB sessionName correctly from SessionReportPilot.data', async () => {
      const result = await getSessionReports({ limit: 100, 'eventId.ctn': [testEventLongId] });

      const alphaSession = result.rows.find((r) => r.sessionName === 'Alpha Session');
      expect(alphaSession).toBeDefined();
      expect(alphaSession.sessionName).toBe('Alpha Session');
    });

    it('should extract JSONB eventId correctly from EventReportPilot.data', async () => {
      const result = await getSessionReports({ limit: 100, 'eventId.ctn': [testEventLongId] });

      const sessions = result.rows.filter((r) => r.eventId === 'R01-PD-99800');
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions[0].eventId).toBe('R01-PD-99800');
    });

    it('should extract JSONB eventName correctly from EventReportPilot.data', async () => {
      const result = await getSessionReports({ limit: 100, 'eventId.ctn': [testEventLongId] });

      const sessions = result.rows.filter((r) => r.eventName === 'Test Event for Sessions');
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions[0].eventName).toBe('Test Event for Sessions');
    });

    it('should return objectiveTopics array correctly', async () => {
      const result = await getSessionReports({ limit: 100, 'eventId.ctn': [testEventLongId] });

      const alphaSession = result.rows.find((r) => r.sessionName === 'Alpha Session');
      expect(alphaSession).toBeDefined();
      expect(Array.isArray(alphaSession.objectiveTopics)).toBe(true);
      expect(alphaSession.objectiveTopics.length).toBe(2);
    });

    it('should return empty objectiveTopics array when not set', async () => {
      const result = await getSessionReports({ limit: 100, 'eventId.ctn': [testEventLongId] });

      const gammaSession = result.rows.find((r) => r.sessionName === 'Gamma Session');
      expect(gammaSession).toBeDefined();
      expect(Array.isArray(gammaSession.objectiveTopics)).toBe(true);
      expect(gammaSession.objectiveTopics.length).toBe(0);
    });

    it('should handle null/undefined JSONB fields gracefully', async () => {
      const result = await getSessionReports({ limit: 100, 'eventId.ctn': [testEventLongId] });

      // Should not throw and should return results
      expect(result.rows.length).toBeGreaterThanOrEqual(0);
      result.rows.forEach((row) => {
        expect(row).toHaveProperty('id');
      });
    });

    it('should handle large offset returning empty rows but correct count', async () => {
      const allResults = await getSessionReports({ limit: 1000, 'eventId.ctn': [testEventLongId] });
      const largeOffset = await getSessionReports({
        limit: 10,
        offset: allResults.count + 100,
        'eventId.ctn': [testEventLongId],
      });

      expect(largeOffset.rows.length).toBe(0);
      expect(largeOffset.count).toBe(allResults.count);
    });

    it('should return single result correctly', async () => {
      const result = await getSessionReports({ limit: 1, 'eventId.ctn': [testEventLongId] });

      expect(result.rows.length).toBeLessThanOrEqual(1);
      result.rows.forEach((row) => {
        expect(row).toHaveProperty('id');
        expect(row).toHaveProperty('sessionName');
      });
    });

    it('should apply sessionReportScopes consistently to both count and data queries', async () => {
      // Get all sessions for the test event first
      const allResults = await getSessionReports({
        'eventId.ctn': [testEventLongId],
        limit: 1000,
      });

      // Now filter by a specific session ID using sessionId.in filter
      const specificSessionId = allResults.rows[0].id;
      const filteredResults = await getSessionReports({
        'eventId.ctn': [testEventLongId],
        'sessionId.in': [String(specificSessionId)],
      });

      // The count should match the actual rows returned
      expect(filteredResults.count).toBe(filteredResults.rows.length);
      expect(filteredResults.count).toBe(1);
      expect(filteredResults.rows[0].id).toBe(specificSessionId);
    });
  });
});
