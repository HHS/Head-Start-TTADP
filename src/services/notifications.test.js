import faker from '@faker-js/faker';
import { ACTIVITY_REPORT_NOTIFICATION_TYPES, NOTIFICATION_TYPES } from '../constants';
import db from '../models';
import {
  createGlobalNotification,
  createNotification,
  deleteNotification,
  deleteNotificationsByEntityAndType,
  getNotifications,
  updateNotificationState,
} from './notifications';

const { ActivityReport, Notification, NotificationUserState, User } = db;

describe('Notification service', () => {
  let user;
  let otherUser;
  let createdNotificationIds = [];
  let createdActivityReportIds = [];

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

  const trackActivityReport = (activityReport) => {
    createdActivityReportIds.push(activityReport.id);
    return activityReport;
  };

  const createTrackedActivityReport = async (overrides = {}) =>
    trackActivityReport(
      await ActivityReport.create({
        userId: user.id,
        regionId: 1,
        submissionStatus: 'draft',
        numberOfParticipants: 1,
        deliveryMethod: 'method',
        duration: 0,
        endDate: '2000-01-01T12:00:00Z',
        startDate: '2000-01-01T12:00:00Z',
        activityRecipientType: 'something',
        requester: 'requester',
        targetPopulations: ['pop'],
        reason: ['reason'],
        participants: ['participants'],
        topics: ['topics'],
        ttaType: ['type'],
        language: ['English'],
        activityReason: 'reason',
        version: 2,
        creatorRole: 'TTAC',
        ...overrides,
      })
    );

  const ensureActivityReportForNotification = async (notification) => {
    if (notification.entityId == null) return notification;
    if (!ACTIVITY_REPORT_NOTIFICATION_TYPES.includes(notification.type)) return notification;

    const existing = await ActivityReport.findByPk(notification.entityId);
    if (!existing) {
      await createTrackedActivityReport({
        id: notification.entityId,
        userId: user.id,
      });
    }

    return notification;
  };

  const createTrackedNotification = async (overrides = {}) => {
    const attributes = await ensureActivityReportForNotification({
      userId: user.id,
      entityId: faker.datatype.number({ min: 99001, max: 99999 }),
      type: NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
      text: faker.lorem.sentence(),
      ...overrides,
    });
    const notification = await Notification.create(attributes);

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

    if (createdActivityReportIds.length) {
      await ActivityReport.destroy({ where: { id: createdActivityReportIds } });
      createdActivityReportIds = [];
    }
  });

  afterAll(async () => {
    if (createdNotificationIds.length) {
      await NotificationUserState.destroy({ where: { notificationId: createdNotificationIds } });
      await Notification.destroy({ where: { id: createdNotificationIds } });
    }

    if (createdActivityReportIds.length) {
      await ActivityReport.destroy({ where: { id: createdActivityReportIds } });
    }

    await User.destroy({ where: { id: [user.id, otherUser.id] } });
    await db.sequelize.close();
  });

  describe('createNotification', () => {
    it('creates a user notification with link and label when the type has configuration', async () => {
      const metadata = activityMetadata();
      await createTrackedActivityReport({ id: metadata.id });

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

    it('throws when notificationId is falsy', async () => {
      await expect(deleteNotification(0)).rejects.toThrow('notificationId is required');
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

      const { rows: notifications } = await getNotifications(user.id, [
        { id: [ownNotification.id, otherNotification.id] },
      ]);

      expect(notifications.map((notification) => notification.id)).toEqual([ownNotification.id]);
    });

    it('returns global notifications for all users', async () => {
      const globalNotification = await createTrackedNotification({
        userId: null,
        triggeredAt: '2026-05-03',
      });

      const { rows: notifications } = await getNotifications(otherUser.id, [
        { id: [globalNotification.id] },
      ]);

      expect(notifications.map((notification) => notification.id)).toEqual([globalNotification.id]);
    });

    it('does not return notifications from other users', async () => {
      const otherNotification = await createTrackedNotification({
        userId: otherUser.id,
        triggeredAt: '2026-05-04',
      });

      const { rows: notifications } = await getNotifications(user.id, [
        { id: [otherNotification.id] },
      ]);

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

      const { rows: notifications } = await getNotifications(user.id, [
        { id: [archivedNotification.id] },
      ]);

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

      const { rows: notifications } = await getNotifications(user.id, [
        { id: [withoutState.id, withOpenState.id] },
      ]);

      expect(notifications.map((notification) => notification.id)).toEqual([
        withOpenState.id,
        withoutState.id,
      ]);
    });

    it('returns only archived notifications when archived: true', async () => {
      const archivedNotification = await createTrackedNotification({ triggeredAt: '2026-05-10' });
      await NotificationUserState.create({
        notificationId: archivedNotification.id,
        userId: user.id,
        archivedAt: '2026-05-11',
        viewedAt: null,
      });

      const { rows: notifications } = await getNotifications(
        user.id,
        [{ id: [archivedNotification.id] }],
        {
          archived: true,
        }
      );

      expect(notifications.map((notification) => notification.id)).toEqual([
        archivedNotification.id,
      ]);
    });

    it('does not return unarchived notifications when archived: true', async () => {
      const withoutState = await createTrackedNotification({ triggeredAt: '2026-05-12' });
      const withOpenState = await createTrackedNotification({ triggeredAt: '2026-05-13' });
      await NotificationUserState.create({
        notificationId: withOpenState.id,
        userId: user.id,
        archivedAt: null,
        viewedAt: '2026-05-14',
      });

      const { rows: notifications } = await getNotifications(
        user.id,
        [{ id: [withoutState.id, withOpenState.id] }],
        { archived: true }
      );

      expect(notifications.map((notification) => notification.id)).toEqual([]);
    });

    it('does not return notifications archived by a different user when archived: true', async () => {
      const notification = await createTrackedNotification({ triggeredAt: '2026-05-15' });
      await NotificationUserState.create({
        notificationId: notification.id,
        userId: otherUser.id,
        archivedAt: '2026-05-16',
        viewedAt: null,
      });

      const { rows: notifications } = await getNotifications(user.id, [{ id: [notification.id] }], {
        archived: true,
      });

      expect(notifications.map((result) => result.id)).toEqual([]);
    });

    it('archived: false returns the same results as the default (no archived param)', async () => {
      const notification = await createTrackedNotification({ triggeredAt: '2026-05-17' });

      const { rows: explicitFalseNotifications } = await getNotifications(
        user.id,
        [{ id: [notification.id] }],
        { archived: false }
      );
      const { rows: defaultNotifications } = await getNotifications(user.id, [
        { id: [notification.id] },
      ]);

      expect(explicitFalseNotifications.map((result) => result.id)).toEqual([notification.id]);
      expect(defaultNotifications.map((result) => result.id)).toEqual([notification.id]);
    });

    it('respects pagination', async () => {
      const first = await createTrackedNotification({ triggeredAt: '2026-06-01' });
      const second = await createTrackedNotification({ triggeredAt: '2026-06-02' });
      const third = await createTrackedNotification({ triggeredAt: '2026-06-03' });

      const { rows: notifications } = await getNotifications(
        user.id,
        [{ id: [first.id, second.id, third.id] }],
        { limit: 1, offset: 1 }
      );

      expect(notifications).toHaveLength(1);
      expect(notifications[0].id).toBe(second.id);
    });

    it('respects the "all" sortBy by ordering by createdAt', async () => {
      const first = await createTrackedNotification({ createdAt: new Date('2026-07-01') });
      const second = await createTrackedNotification({ createdAt: new Date('2026-07-02') });
      const third = await createTrackedNotification({ createdAt: new Date('2026-07-03') });

      const { rows: notifications } = await getNotifications(
        user.id,
        [{ id: [first.id, second.id, third.id] }],
        { sortBy: 'all', sortDir: 'ASC' }
      );

      expect(notifications.map((notification) => notification.id)).toEqual([
        first.id,
        second.id,
        third.id,
      ]);
    });

    it('respects the "all" sortBy DESC by ordering by createdAt descending', async () => {
      const first = await createTrackedNotification({ createdAt: new Date('2026-07-01') });
      const second = await createTrackedNotification({ createdAt: new Date('2026-07-02') });
      const third = await createTrackedNotification({ createdAt: new Date('2026-07-03') });

      const { rows: notifications } = await getNotifications(
        user.id,
        [{ id: [first.id, second.id, third.id] }],
        { sortBy: 'all', sortDir: 'DESC' }
      );

      expect(notifications.map((notification) => notification.id)).toEqual([
        third.id,
        second.id,
        first.id,
      ]);
    });

    it('respects the "action_needed" sortBy by placing actionable notifications first', async () => {
      const informational = await createTrackedNotification({ actionable: false });
      const actionable = await createTrackedNotification({ actionable: true });

      const { rows: notifications } = await getNotifications(
        user.id,
        [{ id: [informational.id, actionable.id] }],
        { sortBy: 'action_needed', sortDir: 'DESC' }
      );

      expect(notifications.map((n) => n.id)).toEqual([actionable.id, informational.id]);
    });

    it('respects the "informational" sortBy by placing non-actionable notifications first', async () => {
      const actionable = await createTrackedNotification({ actionable: true });
      const informational = await createTrackedNotification({ actionable: false });

      const { rows: notifications } = await getNotifications(
        user.id,
        [{ id: [actionable.id, informational.id] }],
        { sortBy: 'informational', sortDir: 'DESC' }
      );

      expect(notifications.map((n) => n.id)).toEqual([informational.id, actionable.id]);
    });

    it('respects the "type" sortBy by ordering alphabetically by notification type', async () => {
      const notificationZ = await createTrackedNotification({
        type: NOTIFICATION_TYPES.SYSTEM_PLANNED_OUTAGE,
      });
      const notificationA = await createTrackedNotification({
        type: NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
      });

      const { rows: notifications } = await getNotifications(
        user.id,
        [{ id: [notificationZ.id, notificationA.id] }],
        { sortBy: 'type', sortDir: 'ASC' }
      );

      expect(notifications.map((n) => n.id)).toEqual([notificationA.id, notificationZ.id]);
    });

    it('falls back to "action_needed" sort when an unrecognised sortBy is provided', async () => {
      const informational = await createTrackedNotification({ actionable: false });
      const actionable = await createTrackedNotification({ actionable: true });

      const { rows: notifications } = await getNotifications(
        user.id,
        [{ id: [informational.id, actionable.id] }],
        { sortBy: 'not_a_real_field', sortDir: 'DESC' }
      );

      // action_needed puts actionable=true first
      expect(notifications.map((n) => n.id)).toEqual([actionable.id, informational.id]);
    });

    it('attaches user state to returned notifications', async () => {
      const notification = await createTrackedNotification({ triggeredAt: '2026-08-01' });
      await NotificationUserState.create({
        notificationId: notification.id,
        userId: user.id,
        viewedAt: '2026-08-02',
        archivedAt: null,
      });

      const {
        rows: [result],
      } = await getNotifications(user.id, [{ id: [notification.id] }]);

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

    it('includes viewedAt and archivedAt as own properties on returned objects', async () => {
      const notification = await createTrackedNotification({ triggeredAt: '2026-08-03' });
      await NotificationUserState.create({
        notificationId: notification.id,
        userId: user.id,
        viewedAt: '2026-01-01',
        archivedAt: null,
      });

      const { rows: results } = await getNotifications(user.id, [], {});
      const found = results.find((n) => n.id === notification.id);
      expect(found).toBeDefined();

      expect(Object.hasOwn(found, 'viewedAt')).toBe(true);
      expect(Object.hasOwn(found, 'archivedAt')).toBe(true);
      expect(Object.hasOwn(found, 'userState')).toBe(true);
      expect(found.viewedAt).toBe('2026-01-01');
      expect(found.archivedAt).toBeNull();

      const json = JSON.parse(JSON.stringify(found));
      expect(json.viewedAt).toBe('2026-01-01');
      expect(json.archivedAt).toBeNull();
    });
  });

  describe('ActivityReport ↔ Notification polymorphic associations', () => {
    let associationUser;
    let createdActivityReportIds = [];
    let associationNotificationIds = [];

    const arFixture = {
      regionId: 1,
      submissionStatus: 'draft',
      numberOfParticipants: 1,
      deliveryMethod: 'method',
      duration: 0,
      endDate: '2000-01-01T12:00:00Z',
      startDate: '2000-01-01T12:00:00Z',
      activityRecipientType: 'something',
      requester: 'requester',
      targetPopulations: ['pop'],
      reason: ['reason'],
      participants: ['participants'],
      topics: ['topics'],
      ttaType: ['type'],
      language: ['English'],
      activityReason: 'reason',
      version: 2,
      creatorRole: 'TTAC',
    };

    const trackActivityReport = (activityReport) => {
      createdActivityReportIds.push(activityReport.id);
      return activityReport;
    };

    const trackAssociationNotification = (notification) => {
      associationNotificationIds.push(notification.id);
      return notification;
    };

    beforeAll(async () => {
      associationUser = await User.create({
        id: faker.datatype.number({ min: 99001, max: 99999 }),
        name: faker.name.findName(),
        hsesUsername: faker.internet.userName(),
        hsesUserId: faker.datatype.uuid(),
        lastLogin: new Date(),
      });
    });

    afterEach(async () => {
      if (associationNotificationIds.length) {
        await NotificationUserState.destroy({
          where: { notificationId: associationNotificationIds },
        });
        await Notification.destroy({
          where: { id: associationNotificationIds },
        });
        associationNotificationIds = [];
      }

      if (createdActivityReportIds.length) {
        await ActivityReport.destroy({
          where: { id: createdActivityReportIds },
        });
        createdActivityReportIds = [];
      }
    });

    afterAll(async () => {
      if (associationNotificationIds.length) {
        await NotificationUserState.destroy({
          where: { notificationId: associationNotificationIds },
        });
        await Notification.destroy({
          where: { id: associationNotificationIds },
        });
      }

      if (createdActivityReportIds.length) {
        await ActivityReport.destroy({
          where: { id: createdActivityReportIds },
        });
      }

      if (associationUser) {
        await User.destroy({ where: { id: associationUser.id } });
      }
    });

    it('ActivityReport.findByPk includes AR notifications', async () => {
      const activityReport = trackActivityReport(
        await ActivityReport.create({
          ...arFixture,
          userId: associationUser.id,
        })
      );

      trackAssociationNotification(
        await Notification.create({
          userId: associationUser.id,
          entityId: activityReport.id,
          type: NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION,
          text: faker.lorem.sentence(),
        })
      );
      trackAssociationNotification(
        await Notification.create({
          userId: associationUser.id,
          entityId: activityReport.id,
          type: NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED,
          text: faker.lorem.sentence(),
        })
      );

      const foundActivityReport = await ActivityReport.findByPk(activityReport.id, {
        include: [{ association: 'notifications' }],
      });

      expect(foundActivityReport.notifications).toHaveLength(2);
    });

    it('scope filters out non-AR type notifications', async () => {
      const activityReport = trackActivityReport(
        await ActivityReport.create({
          ...arFixture,
          userId: associationUser.id,
        })
      );

      trackAssociationNotification(
        await Notification.create({
          userId: associationUser.id,
          entityId: activityReport.id,
          type: NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED,
          text: faker.lorem.sentence(),
        })
      );
      trackAssociationNotification(
        await Notification.create({
          userId: associationUser.id,
          entityId: activityReport.id,
          type: NOTIFICATION_TYPES.SYSTEM_PLANNED_OUTAGE,
          text: faker.lorem.sentence(),
        })
      );

      const foundActivityReport = await ActivityReport.findByPk(activityReport.id, {
        include: [{ association: 'notifications' }],
      });

      expect(foundActivityReport.notifications).toHaveLength(1);
    });

    it('Notification.findByPk includes activityReport', async () => {
      const activityReport = trackActivityReport(
        await ActivityReport.create({
          ...arFixture,
          userId: associationUser.id,
        })
      );

      const notification = trackAssociationNotification(
        await Notification.create({
          userId: associationUser.id,
          entityId: activityReport.id,
          type: NOTIFICATION_TYPES.ACTIVITY_REPORT_APPROVED,
          text: faker.lorem.sentence(),
        })
      );

      const foundNotification = await Notification.findByPk(notification.id, {
        include: [{ association: 'activityReport' }],
      });

      expect(foundNotification.activityReport.id).toBe(activityReport.id);
    });
  });
});
