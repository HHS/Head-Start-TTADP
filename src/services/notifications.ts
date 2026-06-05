import { Op } from 'sequelize';
import { NOTIFICATION_CONFIGURATION } from '../constants';
import db from '../models';
import type {
  NotificationMetadata,
  NotificationModel,
  NotificationScope,
  NotificationType,
} from './types/notifications';

const { Notification } = db;
const NOTIFICATION_PER_PAGE = 10;

/**
 * Creates a notification for a specific user and entity.
 * @param {number} userId The recipient user ID.
 * @param {number} entityId The related entity ID.
 * @param {NotificationType} notificationType The notification configuration key to apply.
 * @param {{ metadata: NotificationMetadata }} options Values used to generate the notification content.
 * @param {NotificationMetadata} options.metadata Metadata passed to the notification text and link builders.
 * @returns {Promise<NotificationModel>} The newly created notification record.
 * @throws {Error} Throws when the notification type has no configuration.
 */
async function createNotification(
  userId: number,
  entityId: number,
  notificationType: NotificationType,
  { metadata }: { metadata: NotificationMetadata }
): Promise<NotificationModel> {
  const notificationConfig = NOTIFICATION_CONFIGURATION[notificationType];
  if (!notificationConfig) {
    throw new Error(`No notification configuration found for type ${notificationType}`);
  }

  const notificationText = notificationConfig.textFn(metadata);
  const notificationLink = notificationConfig.linkFn
    ? notificationConfig.linkFn(metadata)
    : undefined;
  const notificationLinkText = notificationConfig.linkText
    ? notificationConfig.linkText()
    : undefined;

  const displayId = notificationConfig.displayId
    ? notificationConfig.displayId(metadata)
    : undefined;

  return Notification.create({
    userId,
    entityId,
    type: notificationType,
    text: notificationText,
    link: notificationLink,
    label: notificationLinkText,
    displayId,
  });
}

/**
 * Creates a global notification that is not scoped to a specific user.
 * @param {NotificationType} notificationType The notification configuration key to apply.
 * @param {{ metadata: NotificationMetadata }} options Values used to generate the notification content.
 * @param {NotificationMetadata} options.metadata Metadata passed to the notification text and link builders.
 * @returns {Promise<NotificationModel>} The newly created global notification record.
 * @throws {Error} Throws when the notification type has no configuration.
 */
async function createGlobalNotification(
  notificationType: NotificationType,
  { metadata }: { metadata: NotificationMetadata }
): Promise<NotificationModel> {
  const notificationConfig = NOTIFICATION_CONFIGURATION[notificationType];
  if (!notificationConfig) {
    throw new Error(`No notification configuration found for type ${notificationType}`);
  }

  const notificationText = notificationConfig.textFn(metadata);
  const notificationLink = notificationConfig.linkFn
    ? notificationConfig.linkFn(metadata)
    : undefined;
  const notificationLinkText = notificationConfig.linkText
    ? notificationConfig.linkText()
    : undefined;

  const displayId = notificationConfig.displayId
    ? notificationConfig.displayId(metadata)
    : undefined;

  return Notification.create({
    type: notificationType,
    text: notificationText,
    link: notificationLink,
    label: notificationLinkText,
    displayId,
  });
}

/**
 * Updates permitted timestamp fields on an existing notification.
 * @param {NotificationModel} notification The existing notification instance to update.
 * @param {Partial<NotificationModel>} updatedNotification The incoming notification field changes.
 * @returns {Promise<NotificationModel>} The updated notification record.
 */
async function updateNotification(
  notification: NotificationModel,
  updatedNotification: Partial<NotificationModel>
): Promise<NotificationModel> {
  // the handler will check the notification ID from the params, and pass in the existing notification
  // or 404 if it doesn't exist

  const allowedFields: Array<'archivedAt' | 'triggeredAt' | 'viewedAt'> = [
    'archivedAt',
    'triggeredAt',
    'viewedAt',
  ];
  const fieldsToUpdate: Partial<
    Pick<NotificationModel, 'archivedAt' | 'triggeredAt' | 'viewedAt'>
  > = {};
  for (const field of allowedFields) {
    if (field in updatedNotification) {
      fieldsToUpdate[field] = updatedNotification[field];
    }
  }

  return notification.update(fieldsToUpdate);
}

/**
 * Deletes a single notification by ID.
 * Not to be called from HTTP handlers — use programmatically (e.g. scheduled cleanup job).
 * @param {number} notificationId The ID of the notification to delete.
 * @returns {Promise<number>} The number of deleted notifications (0 or 1).
 * @throws {Error} Throws when notificationId is falsy.
 */
async function deleteNotification(notificationId: number): Promise<number> {
  if (!notificationId) {
    throw new Error('notificationId is required');
  }
  return Notification.destroy({ where: { id: notificationId } });
}

/**
 * Deletes all notifications for a given entity and notification type.
 * Used to invalidate stale notifications when a state change makes them no longer actionable
 * (e.g. an Activity Report returned to "needs action" invalidates pending approval-request
 * notifications for that report's approvers).
 * Not to be called from HTTP handlers — call it inline in the same service function that
 * performs the state change.
 * @param {number} entityId The ID of the entity whose notifications should be removed.
 * @param {NotificationType} notificationType The notification type to target.
 * @returns {Promise<number>} The number of deleted notifications.
 * @throws {Error} Throws when entityId or notificationType is falsy.
 */
async function deleteNotificationsByEntityAndType(
  entityId: number,
  notificationType: NotificationType
): Promise<number> {
  if (!entityId) {
    throw new Error('entityId is required');
  }
  if (!notificationType) {
    throw new Error('notificationType is required');
  }
  return Notification.destroy({ where: { entityId, type: notificationType } });
}

/**
 * Retrieves notifications matching the provided scopes with pagination and sorting.
 * @param {NotificationScope[]} scopes Query scopes combined with AND filtering.
 * @param {{ limit?: number; offset?: number; sortBy?: string; sortDirection?: string }} [options] Pagination and sort options.
 * @param {number} [options.limit=10] Maximum number of notifications to return.
 * @param {number} [options.offset=0] Number of notifications to skip.
 * @param {string} [options.sortBy='triggeredAt'] Notification field used for sorting.
 * @param {string} [options.sortDirection='DESC'] Sort direction for the query.
 * @returns {Promise<NotificationModel[]>} The matching notifications.
 */
// Retrieves notifications for a user, with sorting and pagination
async function getNotifications(
  scopes: NotificationScope[],
  { limit = NOTIFICATION_PER_PAGE, offset = 0, sortBy = 'triggeredAt', sortDirection = 'DESC' } = {}
) {
  return Notification.findAll({
    where: {
      [Op.and]: scopes,
    },
    order: [[sortBy, sortDirection]],
    limit,
    offset,
  });
}

export {
  createGlobalNotification,
  createNotification,
  deleteNotification,
  deleteNotificationsByEntityAndType,
  getNotifications,
  updateNotification,
};
