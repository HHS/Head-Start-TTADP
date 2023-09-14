import { TRAINING_REPORT_STATUSES as TRS } from '@ttahub/common';

import { Op } from 'sequelize';
import SCOPES from '../middleware/scopeConstants';
import db from '../models';
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
  findEventCreators,
} from './event';
import { createUser } from '../routes/admin/user';

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
      const found = await findEventById(99_999);
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
  describe('find event creators', () => {
    let userIds = [];
    beforeAll(async () => {
      // Create a user with READ_WRITE_TRAINING_REPORTS permissions for region 1.
      const user1 = await db.User.create({
        homeRegionId: 1,
        name: 'User region 1 RW',
        hsesUsername: 'JS431423',
        hsesUserId: 'JS431423',
        role: [],
        lastLogin: new Date(),
      });

      await db.Permission.create({
        userId: user1.id,
        regionId: 1,
        scopeId: SCOPES.READ_WRITE_TRAINING_REPORTS,
      });

      // Create a user with READ_WRITE_TRAINING_REPORTS permissions for region 2.
      const user2 = await db.User.create({
        homeRegionId: 1,
        name: 'User region 1 RW',
        hsesUsername: 'JS581423',
        hsesUserId: 'JS581423',
        role: [],
        lastLogin: new Date(),
      });

      await db.Permission.create({
        userId: user2.id,
        regionId: 2,
        scopeId: SCOPES.READ_WRITE_TRAINING_REPORTS,
      });

      // Create a user with READ_WRITE_TRAINING_REPORTS permissions for region 2 & 3.
      const user3 = await db.User.create({
        homeRegionId: 1,
        name: 'User region 2 and 3 RW',
        hsesUsername: 'BS581423',
        hsesUserId: 'BS581423',
        role: [],
        lastLogin: new Date(),
      });

      await db.Permission.create({
        userId: user3.id,
        regionId: 2,
        scopeId: SCOPES.READ_WRITE_TRAINING_REPORTS,
      });

      await db.Permission.create({
        userId: user3.id,
        regionId: 3,
        scopeId: SCOPES.READ_WRITE_TRAINING_REPORTS,
      });

      // Create a user with READ_TRAINING_REPORTS permissions for region 2.
      const user4 = await db.User.create({
        homeRegionId: 1,
        name: 'User region 3 R',
        hsesUsername: 'BS5841423',
        hsesUserId: 'BS5841423',
        role: [],
        lastLogin: new Date(),
      });

      await db.Permission.create({
        userId: user4.id,
        regionId: 4,
        scopeId: SCOPES.READ_TRAINING_REPORTS,
      });

      userIds = [user1.id, user2.id, user3.id, user4.id];
    });

    afterAll(async () => {
      await db.Permission.destroy({ where: { userId: userIds } });
      await db.User.destroy({ where: { id: userIds } });
    });

    it('findEventCreators', async () => {
      // Contains user 1.
      let creators = await findEventCreators(1);
      creators = creators.filter((c) => userIds.includes(c.id));
      expect(creators.length).toBe(1);
      expect(creators[0].id).toBe(userIds[0]);

      // Creators array contains user 2 and user 3.c
      creators = await findEventCreators(2);
      creators = creators.filter((c) => userIds.includes(c.id));
      expect(creators.length).toBe(2);
      expect(creators.map((c) => c.id)).toContain(userIds[1]);
      expect(creators.map((c) => c.id)).toContain(userIds[2]);

      // Contains no users.
      creators = await findEventCreators(4);
      creators = creators.filter((c) => userIds.includes(c.id));
      expect(creators.length).toBe(0);
    });
  });
});
