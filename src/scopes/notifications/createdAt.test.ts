import faker from '@faker-js/faker';
import { Op } from 'sequelize';
import { NOTIFICATION_TYPES } from '../../constants';
import db from '../../models';
import { afterCreateDate, beforeCreateDate, withinCreateDate } from './createdAt';

const { Notification, User } = db;

describe('notifications/createdAt scopes', () => {
  let user;
  let earlyNotification;
  let middleNotification;
  let lateNotification;
  let possibleIds: number[];

  beforeAll(async () => {
    user = await User.create({
      id: faker.datatype.number({ min: 200000, max: 299999 }),
      name: faker.name.findName(),
      hsesUsername: faker.internet.userName(),
      hsesUserId: faker.datatype.uuid(),
      email: faker.internet.email(),
      role: ['Specialist'],
      lastLogin: new Date(),
    });

    earlyNotification = await Notification.create({
      userId: user.id,
      type: NOTIFICATION_TYPES.ACTIVITY_REPORT_APPROVED,
      createdAt: new Date('2019-06-15T12:00:00Z'),
      updatedAt: new Date('2019-06-15T12:00:00Z'),
    });

    middleNotification = await Notification.create({
      userId: user.id,
      type: NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED,
      createdAt: new Date('2021-06-15T12:00:00Z'),
      updatedAt: new Date('2021-06-15T12:00:00Z'),
    });

    lateNotification = await Notification.create({
      userId: user.id,
      type: NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
      createdAt: new Date('2023-06-15T12:00:00Z'),
      updatedAt: new Date('2023-06-15T12:00:00Z'),
    });

    possibleIds = [earlyNotification.id, middleNotification.id, lateNotification.id];
  });

  afterAll(async () => {
    await Notification.destroy({ where: { id: possibleIds } });
    await User.destroy({ where: { id: user.id } });
    await db.sequelize.close();
  });

  describe('beforeCreateDate', () => {
    it('returns notifications with createdAt before the given date', async () => {
      const scope = beforeCreateDate(['2020-12-31']);
      const found = await Notification.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.map((n) => n.id)).toEqual(expect.arrayContaining([earlyNotification.id]));
      expect(found.map((n) => n.id)).not.toContain(middleNotification.id);
      expect(found.map((n) => n.id)).not.toContain(lateNotification.id);
    });

    it('returns no notifications when all records are after the given date', async () => {
      const scope = beforeCreateDate(['2018-01-01']);
      const found = await Notification.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found).toHaveLength(0);
    });
  });

  describe('afterCreateDate', () => {
    it('returns notifications with createdAt after the given date', async () => {
      const scope = afterCreateDate(['2022-01-01']);
      const found = await Notification.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.map((n) => n.id)).toEqual(expect.arrayContaining([lateNotification.id]));
      expect(found.map((n) => n.id)).not.toContain(earlyNotification.id);
      expect(found.map((n) => n.id)).not.toContain(middleNotification.id);
    });

    it('returns no notifications when all records are before the given date', async () => {
      const scope = afterCreateDate(['2025-01-01']);
      const found = await Notification.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found).toHaveLength(0);
    });
  });

  describe('withinCreateDate', () => {
    it('returns notifications with createdAt between two dates', async () => {
      const scope = withinCreateDate(['2020/01/01-2022/12/31']);
      const found = await Notification.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.map((n) => n.id)).toEqual(expect.arrayContaining([middleNotification.id]));
      expect(found.map((n) => n.id)).not.toContain(earlyNotification.id);
      expect(found.map((n) => n.id)).not.toContain(lateNotification.id);
    });

    it('returns all notifications when range spans all records', async () => {
      const scope = withinCreateDate(['2018/01/01-2024/12/31']);
      const found = await Notification.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.map((n) => n.id)).toEqual(expect.arrayContaining(possibleIds));
    });
  });
});
