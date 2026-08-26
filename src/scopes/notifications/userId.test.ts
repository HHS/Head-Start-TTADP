import faker from '@faker-js/faker';
import { Op } from 'sequelize';
import { NOTIFICATION_TYPES } from '../../constants';
import db from '../../models';
import { withUserId } from './userId';

const { Notification, User } = db;

describe('notifications/userId scope', () => {
  let user1;
  let user2;
  let user1Notification1;
  let user1Notification2;
  let user2Notification1;
  let user2Notification2;
  let allIds: number[];

  beforeAll(async () => {
    user1 = await User.create({
      id: faker.datatype.number({ min: 300000, max: 349999 }),
      name: faker.name.findName(),
      hsesUsername: faker.internet.userName(),
      hsesUserId: faker.datatype.uuid(),
      email: faker.internet.email(),
      role: ['Specialist'],
      lastLogin: new Date(),
    });

    user2 = await User.create({
      id: faker.datatype.number({ min: 350000, max: 399999 }),
      name: faker.name.findName(),
      hsesUsername: faker.internet.userName(),
      hsesUserId: faker.datatype.uuid(),
      email: faker.internet.email(),
      role: ['Specialist'],
      lastLogin: new Date(),
    });

    user1Notification1 = await Notification.create({
      userId: user1.id,
      type: NOTIFICATION_TYPES.ACTIVITY_REPORT_APPROVED,
    });

    user1Notification2 = await Notification.create({
      userId: user1.id,
      type: NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED,
    });

    user2Notification1 = await Notification.create({
      userId: user2.id,
      type: NOTIFICATION_TYPES.COLLAB_REPORT_APPROVED,
    });

    user2Notification2 = await Notification.create({
      userId: user2.id,
      type: NOTIFICATION_TYPES.COLLAB_REPORT_SUBMITTED,
    });

    allIds = [
      user1Notification1.id,
      user1Notification2.id,
      user2Notification1.id,
      user2Notification2.id,
    ];
  });

  afterAll(async () => {
    await Notification.destroy({ where: { id: allIds } });
    await User.destroy({ where: { id: [user1.id, user2.id] } });
    await db.sequelize.close();
  });

  it('returns only notifications for the specified user', async () => {
    const scope = withUserId([String(user1.id)]);
    const found = await Notification.findAll({
      where: { [Op.and]: [scope, { id: allIds }] },
    });
    expect(found).toHaveLength(2);
    expect(found.map((n) => n.id)).toEqual(
      expect.arrayContaining([user1Notification1.id, user1Notification2.id])
    );
  });

  it('returns notifications for multiple specified users', async () => {
    const scope = withUserId([String(user1.id), String(user2.id)]);
    const found = await Notification.findAll({
      where: { [Op.and]: [scope, { id: allIds }] },
    });
    expect(found).toHaveLength(4);
    expect(found.map((n) => n.id)).toEqual(expect.arrayContaining(allIds));
  });

  it('excludes notifications for users not in the filter', async () => {
    const scope = withUserId([String(user2.id)]);
    const found = await Notification.findAll({
      where: { [Op.and]: [scope, { id: allIds }] },
    });
    expect(found.map((n) => n.id)).not.toContain(user1Notification1.id);
    expect(found.map((n) => n.id)).not.toContain(user1Notification2.id);
  });

  it('returns no notifications for an empty user id array', async () => {
    const scope = withUserId([]);
    const found = await Notification.findAll({
      where: { [Op.and]: [scope, { id: allIds }] },
    });
    expect(found).toHaveLength(0);
  });

  it('filters out non-numeric string ids and returns no results for all-invalid input', async () => {
    const scope = withUserId(['not-a-number', 'abc']);
    const found = await Notification.findAll({
      where: { [Op.and]: [scope, { id: allIds }] },
    });
    expect(found).toHaveLength(0);
  });
});
