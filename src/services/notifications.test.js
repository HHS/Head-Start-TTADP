import faker from '@faker-js/faker';
import { NOTIFICATION_TYPES } from '../constants';
import db from '../models';
import {
  createGlobalNotification,
  createNotification,
  deleteNotification,
  deleteNotificationsByEntityAndType,
  getNotifications,
  updateNotificationState,
} from './notifications';

const { Notification, NotificationUserState, User } = db;

describe('Notification service', () => {
  let user;
  let otherUser;
  let createdNotificationIds = [];

  const activityMetadata = (id = faker.datatype.number({ min: 99001, max: 99999 })) => ({
    id,
    recipientName: faker.company.companyName(),
    userName: faker.name.findName(),
    date: '01/15/2026',
    displayId: `R01-AR-${id}`,
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

    otherUser = await User.create({
      id: faker.datatype.number({ min: 88001, max: 88999 }),
      name: faker.name.findName(),
      hsesUsername: faker.internet.userName(),
      hsesUserId: faker.datatype.uuid(),
      lastLogin: new Date(),
    });
  });

  afterEach(async () => {
    if (createdNotificationIds.length) {
      await NotificationUserState.destroy({ where: { notificationId: createdNotificationIds } });
      await Notification.destroy({ where: { id: createdNotificationIds } });
      createdNotificationIds = [];
    }
  });

  afterAll(async () => {
    if (createdNotificationIds.length) {
      await NotificationUserState.destroy({ where: { notificationId: createdNotificationIds } });
      await Notification.destroy({ where: { id: createdNotificationIds } });
    }

    await User.destroy({ where: { id: [user.id, otherUser.id] } });
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
      expect(notification.displayId).toBe(metadata.displayId);
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
      expect(notification.displayId).toBeNull();
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
      expect(notification.displayId).toBeNull();
    });

    it('throws an error when the notification type has no configuration', async () => {
      await expect(
        createGlobalNotification('invalidType', {
          metadata: activityMetadata(),
        })
      ).rejects.toThrow('No notification configuration found for type invalidType');
    });
  });

  describe('updateNotificationState', () => {
    it('creates a state row when none exists', async () => {
      const notification = await createTrackedNotification();

      const state = await updateNotificationState(notification.id, user.id, {
        viewedAt: '2026-01-15',
      });

      expect(state.notificationId).toBe(notification.id);
      expect(state.userId).toBe(user.id);
      expect(state.viewedAt).toBe('2026-01-15');
      expect(state.archivedAt).toBeNull();
    });

    it('updates an existing state row', async () => {
      const notification = await createTrackedNotification();
      await NotificationUserState.create({
        notificationId: notification.id,
        userId: user.id,
        viewedAt: '2026-01-15',
        archivedAt: null,
      });

      const state = await updateNotificationState(notification.id, user.id, {
        archivedAt: '2026-01-20',
      });

      expect(state.viewedAt).toBe('2026-01-15');
      expect(state.archivedAt).toBe('2026-01-20');
    });

    it('only updates viewedAt and archivedAt', async () => {
      const notification = await createTrackedNotification({ text: 'Original text' });

      await updateNotificationState(notification.id, user.id, {
        viewedAt: '2026-02-01',
        text: 'Ignored text',
      });

      const state = await NotificationUserState.findOne({
        where: { notificationId: notification.id, userId: user.id },
      });
      const foundNotification = await Notification.findByPk(notification.id);

      expect(state.viewedAt).toBe('2026-02-01');
      expect(state.archivedAt).toBeNull();
      expect(state.get('text')).toBeUndefined();
      expect(foundNotification.text).toBe('Original text');
    });

    it('works for both user-scoped and global notifications', async () => {
      const userNotification = await createTrackedNotification();
      const globalNotification = await createTrackedNotification({ userId: null });

      const userState = await updateNotificationState(userNotification.id, user.id, {
        viewedAt: '2026-03-01',
      });
      const globalState = await updateNotificationState(globalNotification.id, user.id, {
        archivedAt: '2026-03-02',
      });

      expect(userState.notificationId).toBe(userNotification.id);
      expect(globalState.notificationId).toBe(globalNotification.id);
      expect(globalState.userId).toBe(user.id);
    });
  });

  describe('deleteNotification', () => {
    it('destroys the notification with the given ID and returns 1', async () => {
      const notification = await createTrackedNotification();

      const deletedCount = await deleteNotification(notification.id);

      expect(deletedCount).toBe(1);
      const found = await Notification.findByPk(notification.id);
      expect(found).toBeNull();
    });

    it('returns 0 when no notification matches the given ID', async () => {
      const deletedCount = await deleteNotification(0);

      expect(deletedCount).toBe(0);
    });

    it('throws when notificationId is falsy', async () => {
      await expect(deleteNotification(null)).rejects.toThrow('notificationId is required');
      await expect(deleteNotification(undefined)).rejects.toThrow('notificationId is required');
    });
  });

  describe('deleteNotificationsByEntityAndType', () => {
    it('destroys all notifications for the given entityId and type', async () => {
      const entityId = faker.datatype.number({ min: 99001, max: 99999 });
      const matchingOne = await createTrackedNotification({
        entityId,
        type: NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
      });
      const matchingTwo = await createTrackedNotification({
        entityId,
        type: NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
      });
      const differentType = await createTrackedNotification({
        entityId,
        type: NOTIFICATION_TYPES.SYSTEM_PLANNED_OUTAGE,
      });

      const deletedCount = await deleteNotificationsByEntityAndType(
        entityId,
        NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION
      );

      expect(deletedCount).toBe(2);

      const remaining = await Notification.findAll({
        where: { id: [matchingOne.id, matchingTwo.id, differentType.id] },
      });
      expect(remaining.map((n) => n.id)).toEqual([differentType.id]);
    });

    it('returns 0 when no notifications match', async () => {
      const entityId = faker.datatype.number({ min: 99001, max: 99999 });
      await createTrackedNotification({ entityId, type: NOTIFICATION_TYPES.SYSTEM_PLANNED_OUTAGE });

      const deletedCount = await deleteNotificationsByEntityAndType(
        entityId,
        NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION
      );

      expect(deletedCount).toBe(0);
    });

    it('throws when entityId is falsy', async () => {
      await expect(
        deleteNotificationsByEntityAndType(null, NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION)
      ).rejects.toThrow('entityId is required');
      await expect(
        deleteNotificationsByEntityAndType(
          undefined,
          NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION
        )
      ).rejects.toThrow('entityId is required');
    });

    it('throws when notificationType is falsy', async () => {
      const entityId = faker.datatype.number({ min: 99001, max: 99999 });
      await expect(deleteNotificationsByEntityAndType(entityId, null)).rejects.toThrow(
        'notificationType is required'
      );
      await expect(deleteNotificationsByEntityAndType(entityId, undefined)).rejects.toThrow(
        'notificationType is required'
      );
    });
  });

  describe('getNotifications', () => {
    it('returns user-scoped notifications for the user', async () => {
      const ownNotification = await createTrackedNotification({ triggeredAt: '2026-05-01' });
      const otherNotification = await createTrackedNotification({
        userId: otherUser.id,
        triggeredAt: '2026-05-02',
      });

      const notifications = await getNotifications(user.id, [
        { id: [ownNotification.id, otherNotification.id] },
      ]);

      expect(notifications.map((notification) => notification.id)).toEqual([ownNotification.id]);
    });

    it('returns global notifications for all users', async () => {
      const globalNotification = await createTrackedNotification({
        userId: null,
        triggeredAt: '2026-05-03',
      });

      const notifications = await getNotifications(otherUser.id, [{ id: [globalNotification.id] }]);

      expect(notifications.map((notification) => notification.id)).toEqual([globalNotification.id]);
    });

    it('does not return notifications from other users', async () => {
      const otherNotification = await createTrackedNotification({
        userId: otherUser.id,
        triggeredAt: '2026-05-04',
      });

      const notifications = await getNotifications(user.id, [{ id: [otherNotification.id] }]);

      expect(notifications).toEqual([]);
    });

    it('filters out archived notifications', async () => {
      const archivedNotification = await createTrackedNotification({ triggeredAt: '2026-05-05' });
      await NotificationUserState.create({
        notificationId: archivedNotification.id,
        userId: user.id,
        archivedAt: '2026-05-06',
        viewedAt: null,
      });

      const notifications = await getNotifications(user.id, [{ id: [archivedNotification.id] }]);

      expect(notifications).toEqual([]);
    });

    it('returns unarchived notifications when state is missing or archivedAt is null', async () => {
      const withoutState = await createTrackedNotification({ triggeredAt: '2026-05-07' });
      const withOpenState = await createTrackedNotification({ triggeredAt: '2026-05-08' });
      await NotificationUserState.create({
        notificationId: withOpenState.id,
        userId: user.id,
        archivedAt: null,
        viewedAt: '2026-05-09',
      });

      const notifications = await getNotifications(user.id, [
        { id: [withoutState.id, withOpenState.id] },
      ]);

      expect(notifications.map((notification) => notification.id)).toEqual([
        withOpenState.id,
        withoutState.id,
      ]);
    });

    it('respects pagination', async () => {
      const first = await createTrackedNotification({ triggeredAt: '2026-06-01' });
      const second = await createTrackedNotification({ triggeredAt: '2026-06-02' });
      const third = await createTrackedNotification({ triggeredAt: '2026-06-03' });

      const notifications = await getNotifications(
        user.id,
        [{ id: [first.id, second.id, third.id] }],
        { limit: 1, offset: 1 }
      );

      expect(notifications).toHaveLength(1);
      expect(notifications[0].id).toBe(second.id);
    });

    it('respects sortBy and sortDirection', async () => {
      const first = await createTrackedNotification({ triggeredAt: '2026-07-01' });
      const second = await createTrackedNotification({ triggeredAt: '2026-07-02' });
      const third = await createTrackedNotification({ triggeredAt: '2026-07-03' });

      const notifications = await getNotifications(
        user.id,
        [{ id: [first.id, second.id, third.id] }],
        { sortBy: 'triggeredAt', sortDirection: 'ASC' }
      );

      expect(notifications.map((notification) => notification.id)).toEqual([
        first.id,
        second.id,
        third.id,
      ]);
    });

    it('attaches user state to returned notifications', async () => {
      const notification = await createTrackedNotification({ triggeredAt: '2026-08-01' });
      await NotificationUserState.create({
        notificationId: notification.id,
        userId: user.id,
        viewedAt: '2026-08-02',
        archivedAt: null,
      });

      const [result] = await getNotifications(user.id, [{ id: [notification.id] }]);

      expect(result.userState).toMatchObject({
        notificationId: notification.id,
        userId: user.id,
        viewedAt: '2026-08-02',
        archivedAt: null,
      });
      expect(result.viewedAt).toBe('2026-08-02');
      expect(result.archivedAt).toBeNull();
      expect(result.userStates).toHaveLength(1);
    });
  });
});
