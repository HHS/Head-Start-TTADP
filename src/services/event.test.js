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
} from './event';

describe('event service', () => {
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
  });

  describe('finders', () => {
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

    it('findEventsByStatus', async () => {
      const created = await createAnEventWithStatus(98_989, TRS.IN_PROGRESS);
      const found = await findEventsByStatus(
        TRS.IN_PROGRESS,
        [],
        98_989,
        null,
        false,
        { ownerId: 98_989 },
      );

      expect(found.length).toBe(1);
      expect(found[0].data).toHaveProperty('status', TRS.IN_PROGRESS);
      await destroyEvent(created.id);

      const created2 = await createAnEventWithStatus(98_989, TRS.NOT_STARTED);
      const found2 = await findEventsByStatus(
        TRS.NOT_STARTED,
        [],
        98_989,
        null,
        false,
        { ownerId: 98_989 },
      );

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

      const found3 = await findEventsByStatus(
        null,
        [],
        50_500,
        null,
        true,
        { ownerId: 50_500 },
      );
      const found4 = await findEventsByStatus(
        TRS.IN_PROGRESS,
        [],
        50_501,
        null,
        false,
        { ownerId: 50_501 },
      );

      expect(found3.map((f) => f.id)).toContain(created3.id);
      expect(found4.length).toBe(1);
      expect(found4[0].id).toBe(created4.id);

      // await destroyEvent(created3.id);
      await destroyEvent(created4.id);
    });

    it('findEventHelperBlob session sort order', async () => {
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
      expect(found[0].data).toHaveProperty('status', TRS.IN_PROGRESS);

      expect(found[0].sessionReports.length).toBe(3);
      expect(found[0].sessionReports[0].id).toBe(sessionReport3.id);
      expect(found[0].sessionReports[1].id).toBe(sessionReport1.id);
      expect(found[0].sessionReports[2].id).toBe(sessionReport2.id);

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
    let user;
    let data;
    let buffer;
    let created;

    const userId = faker.datatype.number();

    const eventId = 'R01-TR-02-3333';
    const regionId = 1;
    const editTitle = 'Hogwarts Academy';
    const istName = 'Harry Potter';
    const email = 'smartsheetevents@ss.com';
    const audience = 'Recipients';
    const vision = 'To learn';
    const nationalCenters = `"ABC
    DEF
    GHI"`;
    const duration = 'Series';
    const targetPopulation = `"Dogs
    Cats
    Mice"`;
    const reasons = `"Reason 1
    Reason 2"`;
    const organizer = 'Dumbledore';

    const headings = ['Sheet Name', 'Event ID', 'Edit Title', 'IST Name:', 'Creator', 'Event Organizer - Type of Event', 'National Center(s) Requested', 'Event Duration/# NC Days of Support', 'Reason for Activity', 'Target Population(s)', 'Audience', 'Overall Vision/Goal for the PD Event'];

    beforeAll(async () => {
      await db.User.create({
        id: userId,
        homeRegionId: regionId,
        hsesUsername: faker.datatype.string(),
        hsesUserId: faker.datatype.string(),
        email,
        lastLogin: new Date(),
      });
      await db.Permission.create({
        userId,
        regionId: 1,
        scopeId: SCOPES.READ_WRITE_TRAINING_REPORTS,
      });
      user = await db.User.findOne({ where: { id: userId } });
      data = `${headings.join(',')}
      ,${eventId},${editTitle},${istName},${email},${organizer},${nationalCenters},${duration},${reasons},${targetPopulation},${audience},${vision}
      ,bad_id,bad_title,bad_istname,bad_email,bad_organizer,bad_nc,bad_duration,bad_reasons,bad_target,bad_audience,bad_vision`;

      buffer = Buffer.from(data);
    });

    afterAll(async () => {
      await db.User.destroy({ where: { id: userId } });
      await db.EventReportPilot.destroy({ where: { id: created.id } });
      await db.Permission.destroy({ where: { userId } });
    });

    it('imports good data correctly', async () => {
      const result = await csvImport(buffer);

      // eventId is now a field in the jsonb body of the "data" column on
      // db.EventReportPilot.
      // Let's make sure it exists.
      created = await db.EventReportPilot.findOne({
        where: { 'data.eventId': eventId },
        raw: true,
      });

      expect(created).toHaveProperty('ownerId', userId);
      expect(created).toHaveProperty('regionId', regionId);
      expect(created.data.reasons).toEqual(['Reason 1', 'Reason 2']);
      expect(created.data.vision).toEqual(vision);
      expect(created.data.audience).toEqual(audience);
      expect(created.data.targetPopulations).toEqual(['Dogs', 'Cats', 'Mice']);
      expect(created.data.eventOrganizer).toEqual(organizer);
      expect(created.data.creator).toEqual(email);
      expect(created.data.istName).toEqual(istName);
      expect(created.data.eventName).toEqual(editTitle);
      expect(created.data.nationalCenters).toEqual(['ABC', 'DEF', 'GHI']);
      expect(created.data.eventDuration).toEqual(duration);

      expect(result.count).toEqual(1);
      expect(result.errors).toEqual(['User bad_email does not exist']);

      const secondImport = `${headings.join(',')}
      ,${eventId},bad_title,bad_istname,${email},bad_organizer,bad_nc,bad_duration,bad_reasons,bad_target,bad_audience,bad_vision`;

      // Subsequent import with event ID that already exists in the database
      // should skip importing this TR.
      const resultSkip = await csvImport(Buffer.from(secondImport));
      expect(resultSkip.count).toEqual(0);
      expect(resultSkip.skipped).toEqual([eventId]);
    });

    it('gives an error if the user can\'t write in the region', async () => {
      await db.Permission.destroy({ where: { userId } });
      const result = await csvImport(buffer);
      expect(result.count).toEqual(0);
      expect(result.errors).toEqual([`User ${email} does not have permission to write in region ${regionId}`, 'User bad_email does not exist']);
      await db.Permission.create({
        userId,
        regionId: 1,
        scopeId: SCOPES.READ_WRITE_TRAINING_REPORTS,
      });
    });
  });
});
