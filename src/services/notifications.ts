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

// all is just sorting by "createdAt"
// action_needed sorts by actionable notifications first, then by createdAt
// informational sorts by non-actionable notifications first, then by createdAt
// type sorts by the notification type, then by createdAt
// All should have a deterministic secondary sort (in this case, ID) to ensure stable pagination
const ALLOWED_SORT_FIELDS = ['all', 'action_needed', 'informational', 'type'] as const;
type AllowedSortField = (typeof ALLOWED_SORT_FIELDS)[number];
const ALLOWED_SORT_DIRECTIONS = ['ASC', 'DESC'] as const;
type AllowedSortDirection = (typeof ALLOWED_SORT_DIRECTIONS)[number];

function buildOrder(sortBy: AllowedSortField, direction: AllowedSortDirection): [string, string][] {
  switch (sortBy) {
    case 'action_needed':
      // actionable=true floats to the top, then by createdAt in the requested direction
      return [
        ['actionable', 'DESC'],
        ['createdAt', direction],
        ['id', direction],
      ];
    case 'informational':
      // actionable=false floats to the top, then by createdAt in the requested direction
      return [
        ['actionable', 'ASC'],
        ['createdAt', direction],
        ['id', direction],
      ];
    case 'type':
      return [
        ['type', direction],
        ['createdAt', direction],
        ['id', direction],
      ];
    // case 'all':
    default:
      return [
        ['createdAt', direction],
        ['id', direction],
      ];
  }
}

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

  const actionable = Boolean(notificationConfig.actionable);

  return Notification.create({
    userId,
    entityId,
    type: notificationType,
    text: notificationText,
    link: notificationLink,
    label: notificationLinkText,
    displayId,
    actionable,
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
    actionable: false,
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
 * @param {number} userId Current user ID used for scoped and global notifications.
 * @param {NotificationScope[]} scopes Query scopes combined with AND filtering.
 * @param {{ limit?: number; offset?: number; sortBy?: string; sortDir?: string }} [options] Pagination and sort options.
 * @param {number} [options.limit=10] Maximum number of notifications to return.
 * @param {number} [options.offset=0] Number of notifications to skip.
 * @param {string} [options.sortBy='action_needed'] Sort mode — one of: all, action_needed, informational, type.
 * @param {string} [options.sortDir='DESC'] Sort direction for the query.
 * @returns {Promise<{ count: number; rows: NotificationWithState[] }>} The matching notifications with user state.
 */
// Retrieves notifications for a user, with sorting and pagination
async function getNotifications(
  userId: number,
  scopes: NotificationScope[],
  {
    limit = NOTIFICATION_PER_PAGE,
    offset = 0,
    sortBy = 'action_needed',
    sortDir = 'DESC',
    archived = false,
  } = {}
): Promise<{ count: number; rows: NotificationWithState[] }> {
  const sort = ALLOWED_SORT_FIELDS.includes(sortBy as AllowedSortField)
    ? (sortBy as AllowedSortField)
    : 'action_needed';
  const normalizedDirection = sortDir.toUpperCase();
  const direction = ALLOWED_SORT_DIRECTIONS.includes(normalizedDirection as AllowedSortDirection)
    ? (normalizedDirection as AllowedSortDirection)
    : 'DESC';

  const rawLimit = Number(limit) || NOTIFICATION_PER_PAGE;
  const limitValue = Math.max(1, Math.min(rawLimit, 100));
  const offsetValue = Math.max(0, Number(offset) || 0);

  const { rows, count } = await Notification.findAndCountAll({
    where: {
      [Op.and]: [
        {
          [Op.or]: [{ userId }, { userId: null }],
        },
        ...scopes,
        ...(archived
          ? [db.sequelize.literal('("userStates"."archivedAt" IS NOT NULL)')]
          : [
              db.sequelize.literal(
                '("userStates"."archivedAt" IS NULL OR "userStates"."id" IS NULL)'
              ),
            ]),
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
    order: buildOrder(sort, direction),
    limit: limitValue,
    offset: offsetValue,
  });

  return {
    count,
    rows: rows.map((notification) => {
      const notificationWithStates = notification as NotificationWithState & {
        userStates?: NotificationUserStateModel[];
      };
      const userState = notificationWithStates.userStates?.[0] ?? null;

      const plain = notification.get({ plain: true }) as NotificationWithState;
      plain.userState = userState
        ? (userState.get({ plain: true }) as NotificationUserStateModel)
        : null;
      plain.viewedAt = userState?.viewedAt ?? null;
      plain.archivedAt = userState?.archivedAt ?? null;

      return plain;
    }),
  };
}

export {
  createGlobalNotification,
  createNotification,
  deleteNotification,
  deleteNotificationsByEntityAndType,
  getNotifications,
  updateNotificationState,
};
