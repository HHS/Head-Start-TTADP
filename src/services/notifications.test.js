import faker from '@faker-js/faker';
import { NOTIFICATION_TYPES } from '../constants';
import db from '../models';
import {
  createGlobalNotification,
  createNotification,
  deleteNotification,
  getNotifications,
  updateNotification,
} from './notifications';

const { Notification, User } = db;

describe('Notification service', () => {
  let user;
  let createdNotificationIds = [];

  const activityMetadata = (id = faker.datatype.number({ min: 99001, max: 99999 })) => ({
    id,
    recipientName: faker.company.companyName(),
    userName: faker.name.findName(),
    date: '01/15/2026',
  });

  const outageMetadata = {
    id: faker.datatype.number({ min: 99001, max: 99999 }),
    recipientName: faker.company.companyName(),
    userName: faker.name.findName(),
    date: '01/15/2026 12:00 PM ET',
  };

  const trackNotification = (notification) => {
    createdNotificationIds.push(notification.id);
    return notification;
  };

  const createTrackedNotification = async (overrides = {}) => {
    const notification = await Notification.create({
      userId: user.id,
      entityId: faker.datatype.number({ min: 99001, max: 99999 }),
      type: NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
      text: faker.lorem.sentence(),
      ...overrides,
    });

    return trackNotification(notification);
  };

  beforeAll(async () => {
    user = await User.create({
      id: faker.datatype.number({ min: 99001, max: 99999 }),
      name: faker.name.findName(),
      hsesUsername: faker.internet.userName(),
      hsesUserId: faker.datatype.uuid(),
      lastLogin: new Date(),
    });
  });

  afterEach(async () => {
    if (createdNotificationIds.length) {
      await Notification.destroy({ where: { id: createdNotificationIds } });
      createdNotificationIds = [];
    }
  });

  afterAll(async () => {
    if (createdNotificationIds.length) {
      await Notification.destroy({ where: { id: createdNotificationIds } });
    }

    await User.destroy({ where: { id: user.id } });
    await db.sequelize.close();
  });

  describe('createNotification', () => {
    it('creates a user notification with link and label when the type has configuration', async () => {
      const metadata = activityMetadata();

      const notification = trackNotification(
        await createNotification(
          user.id,
          metadata.id,
          NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
          { metadata }
        )
      );

      expect(notification.userId).toBe(user.id);
      expect(notification.entityId).toBe(metadata.id);
      expect(notification.type).toBe(NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION);
      expect(notification.text).toBe(
        `${metadata.userName} has requested changes to your Activity Report for ${metadata.recipientName}.`
      );
      expect(notification.link).toBe(`/activity-reports/${metadata.id}`);
      expect(notification.label).toBe('View AR');
    });

    it('creates a user notification with null link and label when configuration returns null', async () => {
      const notification = trackNotification(
        await createNotification(
          user.id,
          faker.datatype.number({ min: 99001, max: 99999 }),
          NOTIFICATION_TYPES.SYSTEM_PLANNED_OUTAGE,
          { metadata: outageMetadata }
        )
      );

      expect(notification.userId).toBe(user.id);
      expect(notification.type).toBe(NOTIFICATION_TYPES.SYSTEM_PLANNED_OUTAGE);
      expect(notification.text).toBe(
        `Planned outage: the TTA Hub will be closed for maintenance from ${outageMetadata.date}`
      );
      expect(notification.link).toBeNull();
      expect(notification.label).toBeNull();
    });

    it('throws an error when the notification type has no configuration', async () => {
      await expect(
        createNotification(
          user.id,
          faker.datatype.number({ min: 99001, max: 99999 }),
          'invalidType',
          { metadata: activityMetadata() }
        )
      ).rejects.toThrow('No notification configuration found for type invalidType');
    });
  });

  describe('createGlobalNotification', () => {
    it('creates a global notification with the configured text', async () => {
      const notification = trackNotification(
        await createGlobalNotification(NOTIFICATION_TYPES.SYSTEM_PLANNED_OUTAGE, {
          metadata: outageMetadata,
        })
      );

      expect(notification.userId).toBeNull();
      expect(notification.type).toBe(NOTIFICATION_TYPES.SYSTEM_PLANNED_OUTAGE);
      expect(notification.text).toBe(
        `Planned outage: the TTA Hub will be closed for maintenance from ${outageMetadata.date}`
      );
    });

    it('throws an error when the notification type has no configuration', async () => {
      await expect(
        createGlobalNotification('invalidType', {
          metadata: activityMetadata(),
        })
      ).rejects.toThrow('No notification configuration found for type invalidType');
    });
  });

  describe('updateNotification', () => {
    it('updates archivedAt, triggeredAt, and viewedAt fields', async () => {
      const notification = await createTrackedNotification({
        archivedAt: null,
        triggeredAt: null,
        viewedAt: null,
      });

      const updatedNotification = await updateNotification(notification, {
        archivedAt: '2026-01-15',
        triggeredAt: '2026-01-16',
        viewedAt: '2026-01-17',
      });

      expect(updatedNotification.archivedAt).toBe('2026-01-15');
      expect(updatedNotification.triggeredAt).toBe('2026-01-16');
      expect(updatedNotification.viewedAt).toBe('2026-01-17');
    });

    it('does not update disallowed fields', async () => {
      const notification = await createTrackedNotification({
        text: 'Original text',
        type: NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
      });

      await updateNotification(notification, {
        archivedAt: '2026-02-01',
        text: 'Updated text that should be ignored',
        type: NOTIFICATION_TYPES.SYSTEM_PLANNED_OUTAGE,
      });

      const found = await Notification.findByPk(notification.id);

      expect(found.archivedAt).toBe('2026-02-01');
      expect(found.text).toBe('Original text');
      expect(found.type).toBe(NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION);
    });
  });

  describe('deleteNotification', () => {
    it('destroys notifications matching the given scopes and returns the count', async () => {
      const matchingOne = await createTrackedNotification({
        type: NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
      });
      const matchingTwo = await createTrackedNotification({
        type: NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
      });
      const otherNotification = await createTrackedNotification({
        type: NOTIFICATION_TYPES.SYSTEM_PLANNED_OUTAGE,
      });

      const deletedCount = await deleteNotification([
        { userId: user.id },
        { type: NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION },
      ]);

      expect(deletedCount).toBe(2);

      const remainingNotifications = await Notification.findAll({
        where: { id: [matchingOne.id, matchingTwo.id, otherNotification.id] },
      });

      expect(remainingNotifications.map((notification) => notification.id)).toEqual([
        otherNotification.id,
      ]);
    });

    it('returns 0 when no notifications match the scope', async () => {
      await createTrackedNotification();

      const deletedCount = await deleteNotification([
        { userId: user.id },
        { type: NOTIFICATION_TYPES.SYSTEM_PLANNED_OUTAGE },
      ]);

      expect(deletedCount).toBe(0);
    });
  });

  describe('getNotifications', () => {
    it('returns notifications matching scopes using default pagination and sorting', async () => {
      const oldest = await createTrackedNotification({
        entityId: 99011,
        triggeredAt: '2026-01-01',
      });
      const middle = await createTrackedNotification({
        entityId: 99012,
        triggeredAt: '2026-01-02',
      });
      const newest = await createTrackedNotification({
        entityId: 99013,
        triggeredAt: '2026-01-03',
      });

      const notifications = await getNotifications([
        { userId: user.id },
        { id: [oldest.id, middle.id, newest.id] },
      ]);

      expect(notifications.map((notification) => notification.id)).toEqual([
        newest.id,
        middle.id,
        oldest.id,
      ]);
    });

    it('respects limit and offset options', async () => {
      const first = await createTrackedNotification({
        entityId: 99021,
        triggeredAt: '2026-02-01',
      });
      const second = await createTrackedNotification({
        entityId: 99022,
        triggeredAt: '2026-02-02',
      });
      const third = await createTrackedNotification({
        entityId: 99023,
        triggeredAt: '2026-02-03',
      });

      const notifications = await getNotifications(
        [{ userId: user.id }, { id: [first.id, second.id, third.id] }],
        { limit: 1, offset: 1 }
      );

      expect(notifications).toHaveLength(1);
      expect(notifications[0].id).toBe(second.id);
    });

    it('respects custom sortBy and sortDirection options', async () => {
      const first = await createTrackedNotification({ entityId: 99033, triggeredAt: '2026-03-01' });
      const second = await createTrackedNotification({
        entityId: 99031,
        triggeredAt: '2026-03-02',
      });
      const third = await createTrackedNotification({ entityId: 99032, triggeredAt: '2026-03-03' });

      const notifications = await getNotifications(
        [{ userId: user.id }, { id: [first.id, second.id, third.id] }],
        { sortBy: 'entityId', sortDirection: 'ASC' }
      );

      expect(notifications.map((notification) => notification.entityId)).toEqual([
        99031, 99032, 99033,
      ]);
    });
  });
});
