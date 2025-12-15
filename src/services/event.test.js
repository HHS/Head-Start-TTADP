import { TRAINING_REPORT_STATUSES as TRS } from '@ttahub/common';
import faker from '@faker-js/faker';

import { Op } from 'sequelize';
import SCOPES from '../middleware/scopeConstants';
import db from '../models';
import {
  createEvent,
  updateEvent,
  destroyEvent,
  findEventByDbId,
  findEventsByOwnerId,
  findEventsByPocId,
  findEventsByCollaboratorId,
  findEventsByRegionId,
  findEventsByStatus,
  csvImport,
  validateFields,
  findEventHelper,
  filterEventsByStatus,
  findAllEvents,
  findEventHelperBlob,
  mapLineToData,
  checkUserExists,
  checkUserExistsByNationalCenter,
} from './event';
import { auditLogger } from '../logger';
import * as mailer from '../lib/mailer';

describe('event service', () => {
  const ownerIds = [98_989, 98_900, 11_111, 11_112, 11_113, 50_500, 50_501];
  beforeAll(async () => {
    // Clean up any existing test data before running tests
    // First find the events we want to delete
    const eventsToDelete = await db.EventReportPilot.findAll({
      where: { ownerId: { [Op.in]: ownerIds } },
      attributes: ['id'],
    });

    // Delete SessionReportPilot records for these events first
    if (eventsToDelete.length > 0) {
      const eventIds = eventsToDelete.map((event) => event.id);
      await db.SessionReportPilot.destroy({ where: { eventId: { [Op.in]: eventIds } } });
    }

    // Then delete the EventReportPilot records
    await db.EventReportPilot.destroy({ where: { ownerId: { [Op.in]: ownerIds } } });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });
  const createAnEvent = async (num) => createEvent({
    ownerId: num,
    regionId: num,
    pocIds: [num],
    collaboratorIds: [num],
    data: {
      status: 'active',
      owner: {
        id: num,
        name: 'test',
        email: 'test@test.com',
      },
    },
  });

  const createAnEventWithStatus = async (num, status) => createEvent({
    ownerId: num,
    regionId: num,
    pocIds: [num],
    collaboratorIds: [num],
    data: {
      status,
    },
  });

  const createAnEventWithData = async (num, data) => createEvent({
    ownerId: num,
    regionId: num,
    pocIds: [num],
    collaboratorIds: [num],
    data,
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
        pocIds: [123],
        regionId: 123,
        collaboratorIds: [123],
        data: {},
      });

      expect(updated).toHaveProperty('ownerId', 123);

      await destroyEvent(created.id);
    });

    it('update owner json', async () => {
      const created = await createAnEvent(99_927);
      const newOwner = await db.User.create({
        homeRegionId: 1,
        name: 'New Owner',
        hsesUsername: 'DF431423',
        hsesUserId: 'DF431423',
        email: 'newowner@test.com',
        role: [],
        lastLogin: new Date(),
      });

      const updated = await updateEvent(created.id, {
        ownerId: newOwner.id,
        pocIds: [123],
        regionId: 123,
        collaboratorIds: [123],
        data: {},
      });

      expect(updated.data.owner).toHaveProperty('id', newOwner.id);
      expect(updated.data.owner).toHaveProperty('name', 'New Owner');
      expect(updated.data.owner).toHaveProperty('email', 'newowner@test.com');

      await destroyEvent(created.id);
      await db.User.destroy({ where: { id: newOwner.id } });
    });
    it('creates a new event when the id cannot be found', async () => {
      const found = await findEventByDbId(99_999);
      expect(found).toBeNull();

      const updated = await updateEvent(99_999, {
        ownerId: 123,
        pocIds: [123],
        regionId: 123,
        collaboratorIds: [123],
        data: {},
      });

      expect(updated).toHaveProperty('id');
      expect(updated).toHaveProperty('ownerId', 123);

      await destroyEvent(updated.id);
    });

    it('calls trEventComplete when status is updated to COMPLETE', async () => {
      const created = await createAnEvent(98_989);

      const mockEvent = {
        toJSON: jest.fn().mockReturnValue({
          id: created.id,
          ownerId: created.ownerId,
          pocIds: created.pocIds,
          collaboratorIds: created.collaboratorIds,
          regionId: created.regionId,
          data: created.data,
        }),
        update: jest.fn(),
      };

      jest.spyOn(db.EventReportPilot, 'findByPk').mockResolvedValue(mockEvent);
      const trEventCompleteSpy = jest.spyOn(mailer, 'trEventComplete').mockResolvedValue();

      await updateEvent(created.id, {
        ownerId: created.ownerId,
        pocIds: created.pocIds,
        regionId: created.regionId,
        collaboratorIds: created.collaboratorIds,
        data: { status: TRS.COMPLETE },
      });

      expect(trEventCompleteSpy).toHaveBeenCalledWith(mockEvent.toJSON());

      await destroyEvent(created.id);
      jest.restoreAllMocks();
    });
  });

  describe('finders', () => {
    beforeEach(async () => {
      // Clean up test data before each test in this section
      // First find the events we want to delete
      const eventsToDelete = await db.EventReportPilot.findAll({
        where: { ownerId: { [Op.in]: ownerIds } },
        attributes: ['id'],
      });

      // Delete SessionReportPilot records for these events first
      if (eventsToDelete.length > 0) {
        const eventIds = eventsToDelete.map((event) => event.id);
        await db.SessionReportPilot.destroy({ where: { eventId: { [Op.in]: eventIds } } });
      }

      // Then delete the EventReportPilot records
      await db.EventReportPilot.destroy({ where: { ownerId: { [Op.in]: ownerIds } } });
    });

    it('findEventByDbId', async () => {
      const created = await createAnEvent(98_989);
      const found = await findEventByDbId(created.id);
      expect(found).toHaveProperty('id');
      expect(found).toHaveProperty('ownerId', 98_989);
      await destroyEvent(created.id);
    });

    it('findEventHelper session sort order', async () => {
      const created = await createAnEvent(98_989);
      const sessionReport1 = await db.SessionReportPilot.create({
        eventId: created.id,
        data: {
          sessionName: 'Session Name 2',
        },
      });

      const sessionReport2 = await db.SessionReportPilot.create({
        eventId: created.id,
        data: {
        },
      });

      const sessionReport3 = await db.SessionReportPilot.create({
        eventId: created.id,
        data: {
          startDate: '01/01/2023',
          sessionName: 'Session Name 1',
        },
      });

      const sessionIds = [sessionReport1.id, sessionReport2.id, sessionReport3.id];

      const found = await findEventByDbId(created.id);
      expect(found).toHaveProperty('id');
      expect(found).toHaveProperty('ownerId', 98_989);

      expect(found.sessionReports.length).toBe(3);
      expect(found.sessionReports[0].id).toBe(sessionReport3.id);
      expect(found.sessionReports[1].id).toBe(sessionReport1.id);
      expect(found.sessionReports[2].id).toBe(sessionReport2.id);

      await db.SessionReportPilot.destroy({
        where: {
          id: sessionIds,
        },
      });

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
      const found = await findEventsByPocId(created.pocIds);
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

    it('findEventHelperBlob session sort order', async () => {
      // Clean up any existing events for this test user to ensure clean state
      await db.EventReportPilot.destroy({ where: { ownerId: 98_989 } });

      const created = await createAnEventWithStatus(98_989, TRS.IN_PROGRESS);

      const sessionReport1 = await db.SessionReportPilot.create({
        eventId: created.id,
        data: {
          sessionName: 'Session Name 2',
        },
      });

      const sessionReport2 = await db.SessionReportPilot.create({
        eventId: created.id,
        data: {
        },
      });

      const sessionReport3 = await db.SessionReportPilot.create({
        eventId: created.id,
        data: {
          startDate: '01/01/2023',
          sessionName: 'Session Name 1',
        },
      });

      const sessionIds = [sessionReport1.id, sessionReport2.id, sessionReport3.id];

      const found = await findEventsByStatus(
        TRS.IN_PROGRESS,
        [],
        98_989,
        null,
        false,
        { ownerId: 98_989 },
      );

      expect(found.length).toBe(1);
      const foundReport = found[0];
      expect(foundReport.data).toHaveProperty('status', TRS.IN_PROGRESS);

      expect(foundReport.sessionReports.length).toBe(3);
      expect(foundReport.sessionReports[0].id).toBe(sessionReport3.id);
      expect(foundReport.sessionReports[1].id).toBe(sessionReport1.id);
      expect(foundReport.sessionReports[2].id).toBe(sessionReport2.id);

      await db.SessionReportPilot.destroy({
        where: {
          id: sessionIds,
        },
      });

      await destroyEvent(created.id);
    });

    it('shows all if user is admin', async () => {
      const created = await createAnEventWithStatus(98_900, TRS.NOT_STARTED);
      const found = await findEventsByStatus(
        TRS.NOT_STARTED,
        [],
        98_989,
        null,
        false,
        { ownerId: 98_900 },
        true, // isAdmin?
      );

      expect(found.length).toBe(1);
      expect(found[0].data).toHaveProperty('status', TRS.NOT_STARTED);
      await destroyEvent(created.id);
    });

    it('findEventsByStatus sort order', async () => {
      // eventId is used for sorting, then startDate
      const e1 = await createAnEventWithData(11_111, { eventId: 'C', startDate: '2020-01-02', status: TRS.NOT_STARTED });
      const e2 = await createAnEventWithData(11_111, { eventId: 'B', startDate: '2020-01-03', status: TRS.NOT_STARTED });
      const e3 = await createAnEventWithData(11_111, { eventId: 'A', startDate: '2020-01-01', status: TRS.NOT_STARTED });

      const found = await findEventsByStatus(
        TRS.NOT_STARTED,
        [],
        11_111,
        null,
        true,
        [{ id: [e1.id, e2.id, e3.id] }],
      );

      // expect date to be priority sorted, followed by title:
      expect(found[0].data).toHaveProperty('eventId', 'A');
      expect(found[1].data).toHaveProperty('eventId', 'B');
      expect(found[2].data).toHaveProperty('eventId', 'C');

      await destroyEvent(found[0].id);
      await destroyEvent(found[1].id);
      await destroyEvent(found[2].id);

      // when eventId is missing, sort by startDate:
      const e4 = await createAnEventWithData(11_112, { startDate: '2020-01-02', status: TRS.NOT_STARTED });
      const e5 = await createAnEventWithData(11_112, { startDate: '2020-01-03', status: TRS.NOT_STARTED });
      const e6 = await createAnEventWithData(11_112, { startDate: '2020-01-01', status: TRS.NOT_STARTED });

      const found2 = await findEventsByStatus(
        TRS.NOT_STARTED,
        [],
        11_112,
        null,
        true,
        [{ id: [e4.id, e5.id, e6.id] }],
      );

      expect(found2[0].data).toHaveProperty('startDate', '2020-01-01');
      expect(found2[1].data).toHaveProperty('startDate', '2020-01-02');
      expect(found2[2].data).toHaveProperty('startDate', '2020-01-03');

      await destroyEvent(found2[0].id);
      await destroyEvent(found2[1].id);
      await destroyEvent(found2[2].id);

      // when eventId is the same, sort by startDate:
      const e7 = await createAnEventWithData(11_113, { eventId: 'A', startDate: '2020-01-02', status: TRS.NOT_STARTED });
      const e8 = await createAnEventWithData(11_113, { eventId: 'A', startDate: '2020-01-03', status: TRS.NOT_STARTED });
      const e9 = await createAnEventWithData(11_113, { eventId: 'A', startDate: '2020-01-01', status: TRS.NOT_STARTED });

      const found3 = await findEventsByStatus(
        TRS.NOT_STARTED,
        [],
        11_113,
        null,
        true,
        [{ id: [e7.id, e8.id, e9.id] }],
      );

      expect(found3[0].data).toHaveProperty('startDate', '2020-01-01');
      expect(found3[1].data).toHaveProperty('startDate', '2020-01-02');
      expect(found3[2].data).toHaveProperty('startDate', '2020-01-03');

      await destroyEvent(found3[0].id);
      await destroyEvent(found3[1].id);
      await destroyEvent(found3[2].id);
    });

    it('findEventsByStatus use scopes', async () => {
      // create events.
      const event1 = await createAnEventWithData(11_111, { startDate: '2023-01-01', title: 'C', status: TRS.NOT_STARTED });
      const event2 = await createAnEventWithData(11_111, { startDate: '2023-02-01', title: 'B', status: TRS.NOT_STARTED });
      const event3 = await createAnEventWithData(11_111, { startDate: '2020-03-01', title: 'A', status: TRS.NOT_STARTED });

      // create scopes.
      const scopesWhere = [
        {
          [Op.and]: [
            { 'data.startDate': { [Op.gte]: '2023-01-15' } },
            { 'data.startDate': { [Op.lte]: '2023-02-15' } },
            { id: [event1.id, event2.id, event3.id] },
          ],
        },
      ];

      // get events that start between 2023-01-15 and 2023-02-10:
      const found = await findEventsByStatus(TRS.NOT_STARTED, [], 11_111, null, true, scopesWhere);

      // expect date to be priority sorted, followed by title:
      expect(found.length).toBe(1);
      expect(found[0].data).toHaveProperty('startDate', '2023-02-01');

      // destroy events.
      await destroyEvent(event1.id);
      await destroyEvent(event2.id);
      await destroyEvent(event3.id);
    });
  });

  describe('tr import', () => {
    let data;
    let buffer;
    let created;

    const userId = faker.datatype.number();
    const pocId = faker.datatype.number();
    let poc;
    const collaboratorId = faker.datatype.number();
    let collaborator;

    let ncOne;
    let ncTwo;

    const eventId = 'R01-TR-3333';
    const regionId = 1;
    const eventTitle = 'Hogwarts Academy';
    const email = 'smartsheetevents@ss.com';
    const audience = 'Recipients';
    const vision = 'To learn';
    const trainingType = 'Series';
    const targetPopulation = `"Program Staff
    Affected by Disaster"`;
    const reasons = `"Complaint
    Planning/Coordination"`;
    const typeOfEvent = 'Regional PD Event (with National Centers)';
    const ncOneName = 'TEST_NC_ONE_EVENT';
    const ncTwoName = 'TEST_NC_TWO_EVENT';

    const headings = [
      'Event Creator',
      'Event ID',
      'Edit Title',
      'Event Organizer - Type of Event',
      'National Centers',
      'Event Duration',
      'Reason for Activity',
      'Vision/Goal/Outcomes for the PD Event',
      'Target Population(s)',
      'Audience',
      'Designated POC for Event/Request',
    ];

    beforeAll(async () => {
      // Clean up any existing test data from previous failed runs
      await db.EventReportPilot.destroy({ where: { ownerId: userId } });
      await db.NationalCenterUser.destroy({
        where: { userId: [userId, collaboratorId, pocId] },
      });
      await db.NationalCenter.destroy({ where: { name: [ncOneName, ncTwoName] } });
      await db.Permission.destroy({ where: { userId: [userId, collaboratorId, pocId] } });
      await db.User.destroy({ where: { id: [userId, collaboratorId, pocId] } });

      // owner
      await db.User.create({
        id: userId,
        homeRegionId: regionId,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        email,
        lastLogin: new Date(),
        name: `${faker.name.firstName()} ${faker.name.lastName()}`,
      });

      await db.Permission.create({
        userId,
        regionId: 1,
        scopeId: SCOPES.READ_WRITE_TRAINING_REPORTS,
      });

      // collaborator
      collaborator = await db.User.create({
        id: collaboratorId,
        homeRegionId: regionId,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        email: faker.internet.email(),
        lastLogin: new Date(),
        name: `${faker.name.firstName()} ${faker.name.lastName()}`,
      });

      await db.Permission.create({
        userId: collaboratorId,
        regionId: 1,
        scopeId: SCOPES.READ_WRITE_TRAINING_REPORTS,
      });

      // poc
      poc = await db.User.create({
        id: pocId,
        homeRegionId: regionId,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        email: faker.internet.email(),
        lastLogin: new Date(),
        name: `${faker.name.firstName()} ${faker.name.lastName()}`,
      });

      await db.Permission.create({
        userId: pocId,
        regionId: 1,
        scopeId: SCOPES.POC_TRAINING_REPORTS,
      });

      // national centers
      ncOne = await db.NationalCenter.create({
        name: ncOneName,
      });

      // owner for national center 1
      await db.NationalCenterUser.create({
        userId,
        nationalCenterId: ncOne.id,
      });

      ncTwo = await db.NationalCenter.create({
        name: ncTwoName,
      });

      // collab is national center user 2
      await db.NationalCenterUser.create({
        userId: collaboratorId,
        nationalCenterId: ncTwo.id,
      });

      data = `${headings.join(',')}
${email},${eventId},${eventTitle},${typeOfEvent},${ncTwo.name},${trainingType},${reasons},${vision},${targetPopulation},${audience},${poc.name}`;

      buffer = Buffer.from(data);
    });

    afterAll(async () => {
      await db.EventReportPilot.destroy({ where: { ownerId: userId } });
      await db.NationalCenterUser.destroy({
        where: { userId: [userId, collaboratorId, pocId] },
      });
      await db.NationalCenter.destroy({ where: { name: [ncOneName, ncTwoName] } });
      await db.Permission.destroy({ where: { userId: [userId, collaboratorId, pocId] } });
      await db.User.destroy({ where: { id: [userId, collaboratorId, pocId] } });
    });

    it('imports good data correctly', async () => {
      const result = await csvImport(buffer);

      expect(result.errors).toEqual([]);
      expect(result.count).toEqual(1);

      // eventId is now a field in the jsonb body of the "data" column on
      // db.EventReportPilot.
      // Let's make sure it exists.
      created = await db.EventReportPilot.findOne({
        where: { 'data.eventId': eventId },
      });

      expect(created).not.toBeNull();

      expect(created).toHaveProperty('ownerId', userId);
      expect(created).toHaveProperty('regionId', regionId);
      expect(created.data.reasons).toEqual(['Complaint', 'Planning/Coordination']);
      expect(created.data.vision).toEqual(vision);
      expect(created.data.eventIntendedAudience).toEqual(audience.toLowerCase());
      expect(created.data.targetPopulations).toEqual(['Program Staff', 'Affected by Disaster']);
      expect(created.data.eventOrganizer).toEqual(typeOfEvent);
      expect(created.data.creator).toEqual(email);
      expect(created.data.eventName).toEqual(eventTitle);
      expect(created.data.trainingType).toEqual(trainingType);

      const secondImport = `${headings.join(',')}
${email},${eventId},${eventTitle},${typeOfEvent},${ncTwo.name},${trainingType},${reasons},${vision},${targetPopulation},${audience},${poc.name}`;

      // Subsequent import with event ID that already exists in the database
      // should skip importing this TR.
      const resultSkip = await csvImport(Buffer.from(secondImport));
      expect(resultSkip.count).toEqual(0);
      expect(resultSkip.skipped).toEqual([eventId]);
    });

    it('gives an error if the user can\'t write in the region', async () => {
      await db.Permission.destroy({ where: { userId } });
      const d = `${headings.join(',')}
${email},R01-TR-3334,${eventTitle},${typeOfEvent},${ncTwo.name},${trainingType},${reasons},${vision},${targetPopulation},${audience},${poc.name}`;
      const b = Buffer.from(d);
      const result = await csvImport(b);
      expect(result.count).toEqual(0);
      expect(result.errors).toEqual([`User ${email} does not have permission to write in region ${regionId}`]);
      await db.Permission.create({
        userId,
        regionId: 1,
        scopeId: SCOPES.READ_WRITE_TRAINING_REPORTS,
      });
    });

    it('errors if the POC user lacks permissions', async () => {
      await db.Permission.destroy({ where: { userId: pocId } });
      const d = `${headings.join(',')}
${email},R01-TR-3334,${eventTitle},${typeOfEvent},${ncTwo.name},${trainingType},${reasons},${vision},${targetPopulation},${audience},${poc.name}`;
      const b = Buffer.from(d);
      const result = await csvImport(b);
      expect(result.count).toEqual(0);
      expect(result.errors).toEqual([`User ${poc.name} does not have POC permission in region ${regionId}`]);
      await db.Permission.create({
        userId: pocId,
        regionId: 1,
        scopeId: SCOPES.POC_TRAINING_REPORTS,
      });
    });

    it('skips rows that don\'t start with the correct prefix', async () => {
      const dataToTest = `${headings.join(',')}
${email},01-TR-4256,${eventTitle},${typeOfEvent},${ncTwo.name},${trainingType},${reasons},${vision},${targetPopulation},${audience},${poc.name}`;

      const bufferWithSkips = Buffer.from(dataToTest);

      const result = await csvImport(bufferWithSkips);
      expect(result.skipped.length).toEqual(1);
      expect(result.skipped).toEqual(
        ['Invalid "Event ID" format expected R##-TR-#### received 01-TR-4256'],
      );
    });

    it('only imports valid columns ignores others', async () => {
      const mixedColumns = `${headings.join(',')},Extra Column`;
      const reportId = 'R01-TR-3478';
      const d = `${mixedColumns}
${email},${reportId},${eventTitle},${typeOfEvent},${ncTwo.name},${trainingType},${reasons},${vision},${targetPopulation},${audience},${poc.name},JIBBER-JABBER`;
      const b = Buffer.from(d);
      const result = await csvImport(b);
      expect(result.count).toEqual(1);
      expect(result.skipped.length).toEqual(0);
      expect(result.errors.length).toEqual(0);

      const importedEvent = await db.EventReportPilot.findOne({
        where: { 'data.eventId': reportId },
      });
      expect(importedEvent).not.toBeNull();

      // Assert data does not contain the extra column.
      expect(importedEvent.data).not.toHaveProperty('Extra Column');
    });

    it('only imports valid reasons ignores others', async () => {
      const mixedColumns = `${headings.join(',')},Extra Column`;
      const reportId = 'R01-TR-9528';
      const reasonsToTest = `"New Director or Management
      Complaint
      Planning/Coordination
      Invalid Reason"`;
      const d = `${mixedColumns}
${email},${reportId},${eventTitle},${typeOfEvent},${ncTwo.name},${trainingType},${reasonsToTest},${vision},${targetPopulation},${audience},${poc.name},JIBBER-JABBER`;
      const b = Buffer.from(d);
      const result = await csvImport(b);
      expect(result.count).toEqual(1);
      expect(result.skipped.length).toEqual(0);
      expect(result.errors.length).toEqual(0);

      const importedEvent = await db.EventReportPilot.findOne({
        where: { 'data.eventId': reportId },
      });
      expect(importedEvent).not.toBeNull();
      expect(importedEvent.data.reasons).toEqual(['New Director or Management', 'Complaint', 'Planning/Coordination']);
    });

    it('only imports valid target populations ignores others', async () => {
      const mixedColumns = `${headings.join(',')},Extra Column`;
      const reportId = 'R01-TR-6578';
      const tgtPopToTest = `"Program Staff
          Expectant families
          Invalid Pop"`;

      const d = `${mixedColumns}
${email},${reportId},${eventTitle},${typeOfEvent},${ncTwo.name},${trainingType},${reasons},${vision},${tgtPopToTest},${audience},${poc.name},JIBBER-JABBER`;
      const b = Buffer.from(d);
      const result = await csvImport(b);
      expect(result.count).toEqual(1);
      expect(result.skipped.length).toEqual(0);
      expect(result.errors.length).toEqual(0);

      const importedEvent = await db.EventReportPilot.findOne({
        where: { 'data.eventId': reportId },
      });
      expect(importedEvent).not.toBeNull();
      expect(importedEvent.data.targetPopulations).toEqual(['Program Staff', 'Expectant families']);
    });

    it('skips rows that have an invalid audience', async () => {
      const reportId = 'R01-TR-5725';
      const mixedColumns = `${headings.join(',')},Extra Column`;
      const d = `${mixedColumns}
${email},${reportId},${eventTitle},${typeOfEvent},${ncTwo.name},${trainingType},${reasons},${vision},${targetPopulation},Invalid Audience,${poc.name},JIBBER-JABBER`;
      const b = Buffer.from(d);
      const result = await csvImport(b);
      expect(result.count).toEqual(0);
      expect(result.skipped.length).toEqual(1);
      expect(result.skipped).toEqual(['Value "Invalid Audience" is invalid for column "Audience". Must be of one of Recipients, Regional office/TTA: R01-TR-5725']);
    });

    it('defaults to `Creator` heading when `Event Creator` is not found, but errors when Creator fallback is not found', async () => {
      const reportId = 'R01-TR-5725';
      const newHeadings = headings.filter((h) => h !== 'Event Creator');
      const d = `${newHeadings.join(',')}
${reportId},${eventTitle},${typeOfEvent},${ncTwo.name},${trainingType},${reasons},${vision},${targetPopulation},Recipients,${poc.name}`;
      const b = Buffer.from(d);
      const result = await csvImport(b);
      expect(result.count).toEqual(0);
      expect(result.errors.length).toEqual(1);
      expect(result.errors).toEqual(['No creator listed on import for R01-TR-5725']);
    });
  });

  describe('validateFields', () => {
    it('throws an error when fields are invalid', async () => {
      expect(() => validateFields({ pig: 1 }, ['man'])).toThrow();
    });
  });

  describe('findEventHelper', () => {
    it('should set owner when ownerUser exists', async () => {
      const ownerId = 67890;

      const mockUser = {
        toJSON: jest.fn().mockReturnValue({
          id: ownerId,
          name: 'Test Owner',
          email: 'owner@test.com',
        }),
      };
      jest.spyOn(db.User, 'findOne').mockResolvedValue(mockUser);

      const createdEvent = await db.EventReportPilot.create({
        ownerId,
        pocIds: [ownerId],
        collaboratorIds: [ownerId],
        regionId: 1,
        data: {
          eventId: 'E123',
          eventName: 'Test Event',
        },
      });

      const foundEvent = await findEventHelper({ id: createdEvent.id });

      expect(foundEvent).toHaveProperty('owner');
      expect(foundEvent.owner).toEqual({
        id: ownerId,
        name: 'Test Owner',
        email: 'owner@test.com',
      });

      await db.EventReportPilot.destroy({ where: { id: createdEvent.id } });
      jest.restoreAllMocks();
    });

    it('should return default values when data, sessionReports, and eventReportPilotNationalCenterUsers are undefined', async () => {
      const ownerId = 67890;

      // Create an event without data, sessionReports, and eventReportPilotNationalCenterUsers
      const createdEvent = await db.EventReportPilot.create({
        ownerId,
        pocIds: [ownerId],
        collaboratorIds: [ownerId],
        regionId: 1,
        data: {},
      });

      const foundEvent = await findEventHelper({ id: createdEvent.id });

      expect(foundEvent).toHaveProperty('data', {});
      expect(foundEvent).toHaveProperty('sessionReports', []);
      expect(foundEvent).toHaveProperty('eventReportPilotNationalCenterUsers', []);

      // Clean up
      await db.EventReportPilot.destroy({ where: { id: createdEvent.id } });
    });
  });

  describe('destroyEvent', () => {
    it('logs an error when deleting session reports fails', async () => {
      const eventId = 12345;

      jest.spyOn(db.SessionReportPilot, 'destroy').mockRejectedValue(new Error('Session report deletion error'));
      const auditLoggerSpy = jest.spyOn(auditLogger, 'error');

      await destroyEvent(eventId);

      expect(auditLoggerSpy).toHaveBeenCalledWith(`Error deleting session reports for event ${eventId}:`, expect.any(Error));

      jest.restoreAllMocks();
    });

    it('logs an error when deleting event report fails', async () => {
      const eventId = 12345;

      jest.spyOn(db.EventReportPilot, 'destroy').mockRejectedValue(new Error('Event report deletion error'));
      const auditLoggerSpy = jest.spyOn(auditLogger, 'error');

      await destroyEvent(eventId);

      expect(auditLoggerSpy).toHaveBeenCalledWith(`Error deleting event report for event ${eventId}:`, expect.any(Error));

      jest.restoreAllMocks();
    });
  });

  describe('filterEventsByStatus', () => {
    const userId = 123;
    const baseEventData = {
      id: 1,
      ownerId: userId,
      pocIds: [456],
      collaboratorIds: [789],
      regionId: 1,
      data: { status: TRS.NOT_STARTED },
      sessionReports: [],
    };
    const event = {
      ...baseEventData,
      toJSON: () => baseEventData,
    };

    it('should return events for POC, owner, or collaborator when status is null', async () => {
      const events = [event];

      const filteredEvents = await filterEventsByStatus(events, null, userId);

      expect(filteredEvents).toHaveLength(1);
      expect(filteredEvents[0]).toMatchObject(baseEventData);
    });

    it('should NOT return NOT_STARTED events for collaborator (changed behavior)', async () => {
      const events = [event];

      const filteredEvents = await filterEventsByStatus(events, null, 789);

      // Collaborators can NO LONGER see NOT_STARTED events
      expect(filteredEvents).toHaveLength(0);
    });

    it('should return events for owner when status is null', async () => {
      const events = [event];

      const filteredEvents = await filterEventsByStatus(events, null, userId);

      expect(filteredEvents).toHaveLength(1);
      expect(filteredEvents[0]).toMatchObject(baseEventData);
    });

    it('should return events for admin without filtering', async () => {
      const events = [event];

      const filteredEvents = await filterEventsByStatus(events, TRS.NOT_STARTED, userId, true);

      expect(filteredEvents).toHaveLength(1);
      expect(filteredEvents[0]).toMatchObject(baseEventData);
    });

    it('should return events with all sessions for owner, collaborator, or POC when status is IN_PROGRESS', async () => {
      const inProgressEventData = {
        id: 1,
        ownerId: userId,
        pocIds: [456],
        collaboratorIds: [789],
        regionId: 1,
        data: { status: TRS.IN_PROGRESS },
        sessionReports: [
          { id: 1, data: { status: TRS.COMPLETE } },
          { id: 2, data: { status: TRS.IN_PROGRESS } },
        ],
      };
      const inProgressEvent = {
        ...inProgressEventData,
        toJSON: () => inProgressEventData,
      };
      const events = [inProgressEvent];

      const filteredEvents = await filterEventsByStatus(events, TRS.IN_PROGRESS, userId);

      expect(filteredEvents).toHaveLength(1);
      expect(filteredEvents[0].sessionReports).toHaveLength(2);
    });

    it('should return events with all sessions for collaborator when status is IN_PROGRESS', async () => {
      const inProgressEventData = {
        id: 1,
        ownerId: userId,
        pocIds: [456],
        collaboratorIds: [789],
        regionId: 1,
        data: { status: TRS.IN_PROGRESS },
        sessionReports: [
          { id: 1, data: { status: TRS.COMPLETE } },
          { id: 2, data: { status: TRS.IN_PROGRESS } },
        ],
      };
      const inProgressEvent = {
        ...inProgressEventData,
        toJSON: () => inProgressEventData,
      };
      const events = [inProgressEvent];

      const filteredEvents = await filterEventsByStatus(events, TRS.IN_PROGRESS, 789);

      expect(filteredEvents).toHaveLength(1);
      expect(filteredEvents[0].sessionReports).toHaveLength(2);
    });

    it('should return events with all sessions for POC when status is IN_PROGRESS', async () => {
      const inProgressEventData = {
        id: 1,
        ownerId: userId,
        pocIds: [456],
        collaboratorIds: [789],
        regionId: 1,
        data: { status: TRS.IN_PROGRESS },
        sessionReports: [
          { id: 1, data: { status: TRS.COMPLETE } },
          { id: 2, data: { status: TRS.IN_PROGRESS } },
        ],
      };
      const inProgressEvent = {
        ...inProgressEventData,
        toJSON: () => inProgressEventData,
      };
      const events = [inProgressEvent];

      const filteredEvents = await filterEventsByStatus(events, TRS.IN_PROGRESS, 456);

      expect(filteredEvents).toHaveLength(1);
      expect(filteredEvents[0].sessionReports).toHaveLength(2);
    });

    it('should return events for all users when status is COMPLETE', async () => {
      const completeEventData = {
        id: 1,
        ownerId: userId,
        pocIds: [456],
        collaboratorIds: [789],
        regionId: 1,
        data: { status: TRS.COMPLETE },
        sessionReports: [
          { id: 1, data: { status: TRS.COMPLETE } },
          { id: 2, data: { status: TRS.IN_PROGRESS } },
        ],
      };
      const completeEvent = {
        ...completeEventData,
        toJSON: () => completeEventData,
      };
      const events = [completeEvent];

      const filteredEvents = await filterEventsByStatus(events, TRS.COMPLETE, 999);

      expect(filteredEvents).toHaveLength(1);
      expect(filteredEvents[0].sessionReports).toHaveLength(2);
    });

    it('should return events for all users when status is SUSPENDED', async () => {
      const suspendedEventData = {
        id: 1,
        ownerId: userId,
        pocIds: [456],
        collaboratorIds: [789],
        regionId: 1,
        data: { status: TRS.SUSPENDED },
        sessionReports: [
          { id: 1, data: { status: TRS.COMPLETE } },
          { id: 2, data: { status: TRS.IN_PROGRESS } },
        ],
      };
      const suspendedEvent = {
        ...suspendedEventData,
        toJSON: () => suspendedEventData,
      };
      const events = [suspendedEvent];

      const filteredEvents = await filterEventsByStatus(events, TRS.SUSPENDED, 999);

      expect(filteredEvents).toHaveLength(1);
      expect(filteredEvents[0].sessionReports).toHaveLength(2);
    });

    it('should return an empty array for an unknown status', async () => {
      const events = [event];
      const filteredEvents = await filterEventsByStatus(events, 'UNKNOWN_STATUS', userId);
      expect(filteredEvents).toHaveLength(0);
    });
  });

  describe('findAllEvents', () => {
    it('should return all events', async () => {
      const event1 = await createAnEvent(1);
      const event2 = await createAnEvent(2);

      const events = await findAllEvents();

      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: event1.id }),
          expect.objectContaining({ id: event2.id }),
        ]),
      );

      await destroyEvent(event1.id);
      await destroyEvent(event2.id);
    });
  });

  describe('findEventsByStatus', () => {
    it('should handle default values for fallbackValue, allowNull, and scopes', async () => {
      const createdEvent1 = await createAnEventWithStatus(50_500, null);
      const foundEvents = await findEventsByStatus(null, [], 50_500);
      const eventWithFallback = foundEvents.find((event) => event.id === createdEvent1.id);
      expect(eventWithFallback.data.status).toBe(null);
      await destroyEvent(createdEvent1.id);
    });
  });

  describe('findEventHelperBlob', () => {
    it('should return null if no events are found', async () => {
      jest.spyOn(db.EventReportPilot, 'findAll').mockResolvedValue(null);
      const result = await findEventHelperBlob({
        key: 'status',
        value: TRS.NOT_STARTED,
        regions: [],
        scopes: [],
      });
      expect(result).toBeNull();
      jest.restoreAllMocks();
    });
  });

  describe('mapLineToData', () => {
    it('should map CSV line to data object correctly', () => {
      const line = {
        Audience: 'Recipients',
        'Event Creator': 'creator@example.com',
        'Edit Title': 'Event Title Example',
        'Event Duration': '2 days',
        'Event Duration/#NC Days of Support': '3 days',
        'Event ID': 'R01-TR-1234',
        'Overall Vision/Goal for the PD Event': 'Overall Vision',
        'Vision/Goal/Outcomes for the PD Event': 'Vision Outcome',
        'Reason for Activity': 'Complaint\nPlanning/Coordination',
        'Target Population(s)': 'Program Staff\nAffected by Disaster',
        'Event Organizer - Type of Event': 'Regional office/TTA',
        'IST Name:': 'IST Name Example',
        'IST Name': 'IST Name Example 2',
        'Extra Column': 'Extra Value',
      };

      const expectedData = {
        eventIntendedAudience: 'Recipients',
        creator: 'creator@example.com',
        eventName: 'Event Title Example',
        trainingType: '3 days',
        eventId: 'R01-TR-1234',
        vision: 'Vision Outcome',
        reasons: ['Complaint', 'Planning/Coordination'],
        targetPopulations: ['Program Staff', 'Affected by Disaster'],
        eventOrganizer: 'Regional office/TTA',
        istName: 'IST Name Example 2',
      };

      const result = mapLineToData(line);
      expect(result).toEqual(expectedData);
    });
  });

  describe('checkUserExists', () => {
    it('should return the user if they exist', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
      };

      jest.spyOn(db.User, 'findOne').mockResolvedValue(mockUser);

      const result = await checkUserExists('email', 'test@example.com');
      expect(result).toEqual(mockUser);

      jest.restoreAllMocks();
    });

    it('should throw an error if the user does not exist', async () => {
      jest.spyOn(db.User, 'findOne').mockResolvedValue(null);

      await expect(checkUserExists('email', 'nonexistent@example.com')).rejects.toThrow('User with email: nonexistent@example.com does not exist');

      jest.restoreAllMocks();
    });

    it('should throw an error if the user does not exist by name', async () => {
      jest.spyOn(db.User, 'findOne').mockResolvedValue(null);

      await expect(checkUserExists('name', 'Nonexistent User')).rejects.toThrow('User with name: Nonexistent User does not exist');

      jest.restoreAllMocks();
    });
  });

  describe('checkUserExistsByNationalCenter', () => {
    it('should return the user if they exist', async () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
      };

      jest.spyOn(db.User, 'findOne').mockResolvedValue(mockUser);

      const result = await checkUserExistsByNationalCenter('Test National Center');
      expect(result).toEqual(mockUser);

      jest.restoreAllMocks();
    });

    it('should throw an error if the user does not exist', async () => {
      jest.spyOn(db.User, 'findOne').mockResolvedValue(null);

      await expect(checkUserExistsByNationalCenter('Nonexistent National Center')).rejects.toThrow('User associated with National Center: Nonexistent National Center does not exist');

      jest.restoreAllMocks();
    });
  });

  describe('Session visibility based on event organizer type', () => {
    describe('Scenario 1: Regional TTA Hosted Event (no National Centers)', () => {
      let regionalTtaEvent;
      let ownerId;
      let collaboratorId;
      let pocId;
      let approverId;
      let regionalUserId;
      let approverUser;

      beforeAll(async () => {
        ownerId = 80000;
        collaboratorId = 80001;
        pocId = 80002;
        approverId = 80003;
        regionalUserId = 80004;

        // Create approver user
        approverUser = await db.User.create({
          id: approverId,
          homeRegionId: 1,
          name: 'Scenario 1 Approver',
          hsesUsername: `scenario1approver${approverId}`,
          hsesUserId: `scenario1approver${approverId}`,
          email: `approver${approverId}@test.com`,
        });

        regionalTtaEvent = await createAnEvent(ownerId);

        // Update event with Regional TTA organizer type
        await db.EventReportPilot.update(
          {
            pocIds: [pocId],
            collaboratorIds: [collaboratorId],
            data: {
              ...regionalTtaEvent.data,
              eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
              status: TRS.IN_PROGRESS,
            },
          },
          { where: { id: regionalTtaEvent.id } },
        );

        // Create sessions with different statuses
        await db.SessionReportPilot.create({
          eventId: regionalTtaEvent.id,
          data: {
            sessionName: 'Session 1 - In Progress',
            status: TRS.IN_PROGRESS,
          },
          approverId,
        });

        await db.SessionReportPilot.create({
          eventId: regionalTtaEvent.id,
          data: {
            sessionName: 'Session 2 - Complete',
            status: TRS.COMPLETE,
          },
          approverId,
        });
      });

      afterAll(async () => {
        await destroyEvent(regionalTtaEvent.id);
        if (approverUser) {
          await db.User.destroy({ where: { id: approverId } });
        }
      });

      it('Event collaborator sees all sessions', async () => {
        const events = await findEventsByStatus(
          TRS.IN_PROGRESS,
          [ownerId],
          collaboratorId,
          null,
          false,
          { id: regionalTtaEvent.id },
          false, // isAdmin
        );

        expect(events).toHaveLength(1);
        expect(events[0].sessionReports).toHaveLength(2);
      });

      it('Event POC sees NO sessions for Regional TTA events', async () => {
        const events = await findEventsByStatus(
          TRS.IN_PROGRESS,
          [ownerId],
          pocId,
          null,
          false,
          { id: regionalTtaEvent.id },
          false, // isAdmin
        );

        expect(events).toHaveLength(1);
        // POC cannot see any sessions for Regional TTA events
        expect(events[0].sessionReports).toHaveLength(0);
      });

      it('Event owner sees all sessions', async () => {
        const events = await findEventsByStatus(
          TRS.IN_PROGRESS,
          [ownerId],
          ownerId,
          null,
          false,
          { id: regionalTtaEvent.id },
          false, // isAdmin
        );

        expect(events).toHaveLength(1);
        expect(events[0].sessionReports).toHaveLength(2);
      });

      it('Approver sees only sessions that have been submitted', async () => {
        const events = await findEventsByStatus(
          TRS.IN_PROGRESS,
          [ownerId],
          approverId,
          null,
          false,
          { id: regionalTtaEvent.id },
          false, // isAdmin
        );

        expect(events).toHaveLength(0);
      });

      it('Regional user does not see in progress events', async () => {
        const events = await findEventsByStatus(
          TRS.IN_PROGRESS,
          [ownerId],
          regionalUserId,
          null,
          false,
          { id: regionalTtaEvent.id },
          false, // isAdmin
        );

        expect(events).toHaveLength(0);
      });

      it('Administrator sees all sessions', async () => {
        const events = await findEventsByStatus(
          TRS.IN_PROGRESS,
          [ownerId],
          regionalUserId,
          null,
          false,
          { id: regionalTtaEvent.id },
          true, // isAdmin
        );

        expect(events).toHaveLength(1);
        expect(events[0].sessionReports).toHaveLength(2);
      });
    });

    describe('Scenario 2: Regional PD Event (with National Centers)', () => {
      let regionalPdEvent;
      let ownerId;
      let collaboratorId;
      let pocId;
      let approverId;
      let regionalUserId;
      let approverUser;

      beforeAll(async () => {
        ownerId = 81000;
        collaboratorId = 81001;
        pocId = 81002;
        approverId = 81003;
        regionalUserId = 81004;

        // Create approver user
        approverUser = await db.User.create({
          id: approverId,
          homeRegionId: 1,
          name: 'Scenario 2 Approver',
          hsesUsername: `scenario2approver${approverId}`,
          hsesUserId: `scenario2approver${approverId}`,
          email: `approver${approverId}@test.com`,
        });

        regionalPdEvent = await createAnEvent(ownerId);

        // Update event with Regional PD organizer type
        await db.EventReportPilot.update(
          {
            pocIds: [pocId],
            collaboratorIds: [collaboratorId],
            data: {
              ...regionalPdEvent.data,
              eventOrganizer: 'Regional PD Event (with National Centers)',
              status: TRS.IN_PROGRESS,
            },
          },
          { where: { id: regionalPdEvent.id } },
        );

        // Create sessions with different statuses
        await db.SessionReportPilot.create({
          eventId: regionalPdEvent.id,
          data: {
            sessionName: 'Session 1 - In Progress',
            status: TRS.IN_PROGRESS,
          },
          approverId,
        });

        await db.SessionReportPilot.create({
          eventId: regionalPdEvent.id,
          data: {
            sessionName: 'Session 2 - Complete',
            status: TRS.COMPLETE,
          },
          approverId,
        });
      });

      afterAll(async () => {
        await destroyEvent(regionalPdEvent.id);
        if (approverUser) {
          await db.User.destroy({ where: { id: approverId } });
        }
      });

      it('Event collaborator sees all sessions', async () => {
        const events = await findEventsByStatus(
          TRS.IN_PROGRESS,
          [ownerId],
          collaboratorId,
          null,
          false,
          { id: regionalPdEvent.id },
          false, // isAdmin
        );

        expect(events).toHaveLength(1);
        expect(events[0].sessionReports).toHaveLength(2);
      });

      it('Event POC sees all sessions for Regional PD events', async () => {
        const events = await findEventsByStatus(
          TRS.IN_PROGRESS,
          [ownerId],
          pocId,
          null,
          false,
          { id: regionalPdEvent.id },
          false, // isAdmin
        );

        expect(events).toHaveLength(1);
        // POC CAN see all sessions for Regional PD events
        expect(events[0].sessionReports).toHaveLength(2);
      });

      it('Event owner sees all sessions', async () => {
        const events = await findEventsByStatus(
          TRS.IN_PROGRESS,
          [ownerId],
          ownerId,
          null,
          false,
          { id: regionalPdEvent.id },
          false, // isAdmin
        );

        expect(events).toHaveLength(1);
        expect(events[0].sessionReports).toHaveLength(2);
      });

      it('Approver does not see in progress events (with no submitted sessions)', async () => {
        const events = await findEventsByStatus(
          TRS.IN_PROGRESS,
          [ownerId],
          approverId,
          null,
          false,
          { id: regionalPdEvent.id },
          false, // isAdmin
        );

        expect(events).toHaveLength(0);
      });

      it('Regional user does not see in progress events', async () => {
        const events = await findEventsByStatus(
          TRS.IN_PROGRESS,
          [ownerId],
          regionalUserId,
          null,
          false,
          { id: regionalPdEvent.id },
          false, // isAdmin
        );

        expect(events).toHaveLength(0);
      });

      it('Administrator sees all sessions', async () => {
        const events = await findEventsByStatus(
          TRS.IN_PROGRESS,
          [ownerId],
          regionalUserId,
          null,
          false,
          { id: regionalPdEvent.id },
          true, // isAdmin
        );

        expect(events).toHaveLength(1);
        expect(events[0].sessionReports).toHaveLength(2);
      });
    });
  });
});
