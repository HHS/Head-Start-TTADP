import { Op } from 'sequelize';
import { NOTIFICATION_CONFIGURATION } from '../constants';
import db from '../models';
import type {
  NotificationMetadata,
  NotificationModel,
  NotificationScope,
  NotificationType,
  NotificationUserStateModel,
  NotificationWithState,
} from './types/notifications';

const { Notification, NotificationUserState } = db;
const NOTIFICATION_PER_PAGE = 10;

const ALLOWED_SORT_FIELDS = ['triggeredAt', 'createdAt', 'updatedAt'] as const;
type AllowedSortField = (typeof ALLOWED_SORT_FIELDS)[number];
const ALLOWED_SORT_DIRECTIONS = ['ASC', 'DESC'] as const;
type AllowedSortDirection = (typeof ALLOWED_SORT_DIRECTIONS)[number];

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
 * Creates or updates the current user's notification state.
 * @param {number} notificationId The notification ID.
 * @param {number} userId The user ID.
 * @param {{ viewedAt?: string | null; archivedAt?: string | null }} updates Allowed state updates.
 * @returns {Promise<NotificationUserStateModel>} The persisted notification user state.
 */
async function updateNotificationState(
  notificationId: number,
  userId: number,
  updates: { viewedAt?: string | null; archivedAt?: string | null }
): Promise<NotificationUserStateModel> {
  const allowedFields: Array<'viewedAt' | 'archivedAt'> = ['viewedAt', 'archivedAt'];
  const fieldsToUpdate: Partial<Pick<NotificationUserStateModel, 'viewedAt' | 'archivedAt'>> = {};

  for (const field of allowedFields) {
    if (field in updates) {
      fieldsToUpdate[field] = updates[field];
    }
  }

  let state = await NotificationUserState.findOne({
    where: { notificationId, userId },
  });

  if (!state) {
    state = await NotificationUserState.create({ notificationId, userId, ...fieldsToUpdate });
    return state;
  }

  if (Object.keys(fieldsToUpdate).length > 0) {
    await state.update(fieldsToUpdate);
  }

  return state;
}

/**
 * Deletes notifications matching all provided scopes.
 * @param {NotificationScope[]} scopes Query scopes combined with AND filtering.
 * @returns {Promise<number>} The number of deleted notifications.
 */
// Deletes a notification with the given scopes
// called either by the scheduled job or by a handler when
// a user action invalidates a notification (ex: a report that is "un-submitted")
async function deleteNotification(scopes: NotificationScope[]) {
  return Notification.destroy({
    where: {
      [Op.and]: scopes,
    },
  });
}

/**
 * Retrieves notifications matching the provided scopes with pagination and sorting.
 * @param {number} userId Current user ID used for scoped and global notifications.
 * @param {NotificationScope[]} scopes Query scopes combined with AND filtering.
 * @param {{ limit?: number; offset?: number; sortBy?: string; sortDirection?: string }} [options] Pagination and sort options.
 * @param {number} [options.limit=10] Maximum number of notifications to return.
 * @param {number} [options.offset=0] Number of notifications to skip.
 * @param {string} [options.sortBy='triggeredAt'] Notification field used for sorting.
 * @param {string} [options.sortDirection='DESC'] Sort direction for the query.
 * @returns {Promise<NotificationWithState[]>} The matching notifications with user state.
 */
// Retrieves notifications for a user, with sorting and pagination
async function getNotifications(
  userId: number,
  scopes: NotificationScope[],
  { limit = NOTIFICATION_PER_PAGE, offset = 0, sortBy = 'triggeredAt', sortDirection = 'DESC' } = {}
): Promise<NotificationWithState[]> {
  const sort = ALLOWED_SORT_FIELDS.includes(sortBy as AllowedSortField) ? sortBy : 'triggeredAt';
  const normalizedDirection = sortDirection.toUpperCase();
  const direction = ALLOWED_SORT_DIRECTIONS.includes(normalizedDirection as AllowedSortDirection)
    ? (normalizedDirection as AllowedSortDirection)
    : 'DESC';

  const rawLimit = Number(limit) || NOTIFICATION_PER_PAGE;
  const limitValue = Math.max(1, Math.min(rawLimit, 100));
  const offsetValue = Math.max(0, Number(offset) || 0);

  const notifications = await Notification.findAll({
    where: {
      [Op.and]: [
        {
          [Op.or]: [{ userId }, { userId: null }],
        },
        ...scopes,
        db.sequelize.literal('("userStates"."archivedAt" IS NULL OR "userStates"."id" IS NULL)'),
      ],
    },
    include: [
      {
        model: NotificationUserState,
        as: 'userStates',
        where: { userId },
        required: false,
      },
    ],
    subQuery: false,
    order: [[sort, direction]],
    limit: limitValue,
    offset: offsetValue,
  });

  return notifications.map((notification) => {
    const notificationWithStates = notification as NotificationWithState & {
      userStates?: NotificationUserStateModel[];
    };
    const userState = notificationWithStates.userStates?.[0] ?? null;

    notificationWithStates.userState = userState;
    notificationWithStates.viewedAt = userState?.viewedAt ?? null;
    notificationWithStates.archivedAt = userState?.archivedAt ?? null;

    return notificationWithStates;
  });
}

export {
  createGlobalNotification,
  createNotification,
  deleteNotification,
  getNotifications,
  updateNotificationState,
};
