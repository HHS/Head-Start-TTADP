import faker from '@faker-js/faker';
import { NOTIFICATION_TYPES } from '../../constants';
import db, { Notification, User } from '..';

describe('Notification model', () => {
  let user;

  beforeAll(async () => {
    user = await User.create({
      id: faker.datatype.number({ min: 10000, max: 100000 }),
      name: faker.name.findName(),
      hsesUsername: faker.internet.userName(),
      hsesUserId: faker.datatype.uuid(),
      email: faker.internet.email(),
      role: ['Specialist'],
      lastLogin: new Date(),
    });
  });

  afterAll(async () => {
    await Notification.destroy({ where: { userId: user.id } });
    await User.destroy({ where: { id: user.id } });
    await db.sequelize.close();
  });

  it('creates a notification with all required fields', async () => {
    const notification = await Notification.create({
      userId: user.id,
      entityId: 42,
      type: NOTIFICATION_TYPES.ACTIVITY_REPORT_CHANGES_REQUESTED,
      link: '/activity-reports/42/review',
      label: 'Activity Report #42',
      text: 'Changes were requested.',
    });

    expect(notification.id).toBeDefined();
    expect(notification.userId).toEqual(user.id);
    expect(notification.entityId).toEqual(42);
    expect(notification.type).toEqual(NOTIFICATION_TYPES.ACTIVITY_REPORT_CHANGES_REQUESTED);
    expect(notification.link).toEqual('/activity-reports/42/review');
    expect(notification.label).toEqual('Activity Report #42');
    expect(notification.text).toEqual('Changes were requested.');

    await notification.destroy();
  });

  it('defaults isArchived and isViewed to false', async () => {
    const notification = await Notification.create({
      userId: user.id,
      type: NOTIFICATION_TYPES.ACTIVITY_REPORT_CHANGES_REQUESTED,
    });

    expect(notification.isArchived).toBe(false);
    expect(notification.isViewed).toBe(false);
    expect(notification.archivedAt).toBeNull();
    expect(notification.viewedAt).toBeNull();

    await notification.destroy();
  });

  it('allows nullable userId (global notification)', async () => {
    const notification = await Notification.create({
      userId: null,
      type: NOTIFICATION_TYPES.ACTIVITY_REPORT_CHANGES_REQUESTED,
      text: 'Global system notice.',
    });

    expect(notification.userId).toBeNull();

    await notification.destroy();
  });

  it('allows nullable entityId', async () => {
    const notification = await Notification.create({
      userId: user.id,
      entityId: null,
      type: NOTIFICATION_TYPES.ACTIVITY_REPORT_CHANGES_REQUESTED,
    });

    expect(notification.entityId).toBeNull();

    await notification.destroy();
  });

  it('rejects an invalid type value', async () => {
    await expect(
      Notification.create({
        userId: user.id,
        type: 'invalidType',
      })
    ).rejects.toThrow();
  });

  it('sets timestamps automatically', async () => {
    const notification = await Notification.create({
      userId: user.id,
      type: NOTIFICATION_TYPES.ACTIVITY_REPORT_CHANGES_REQUESTED,
    });

    expect(notification.createdAt).toBeDefined();
    expect(notification.updatedAt).toBeDefined();

    await notification.destroy();
  });

  it('user association returns the related user', async () => {
    const notification = await Notification.create({
      userId: user.id,
      type: NOTIFICATION_TYPES.ACTIVITY_REPORT_CHANGES_REQUESTED,
    });

    const withUser = await Notification.findOne({
      where: { id: notification.id },
      include: [{ model: User, as: 'user' }],
    });

    expect(withUser.user).toBeDefined();
    expect(withUser.user.id).toEqual(user.id);

    await notification.destroy();
  });

  it('persists archivedAt and viewedAt when set', async () => {
    const notification = await Notification.create({
      userId: user.id,
      type: NOTIFICATION_TYPES.ACTIVITY_REPORT_CHANGES_REQUESTED,
      isViewed: true,
      viewedAt: '2026-01-15',
      isArchived: true,
      archivedAt: '2026-01-16',
    });

    const found = await Notification.findOne({ where: { id: notification.id } });
    expect(found.viewedAt).toEqual('2026-01-15');
    expect(found.archivedAt).toEqual('2026-01-16');

    await notification.destroy();
  });
});
