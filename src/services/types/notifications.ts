import type {
  Notification,
  NotificationMetadata,
  NotificationType,
} from '@ttahub/common/src/notifications';
import type { Model, WhereOptions } from 'sequelize';

type NotificationScope = WhereOptions;

interface NotificationModel extends Model, Notification {
  userId: number | null;
  entityId: number | null;
  triggeredAt: string | null;
  isGlobal?: boolean;
}

interface NotificationUserStateAttributes {
  id: number;
  notificationId: number;
  userId: number;
  viewedAt: string | null;
  archivedAt: string | null;
}

interface NotificationUserStateModel extends Model, NotificationUserStateAttributes {}

interface NotificationWithState extends NotificationModel {
  userState?: NotificationUserStateAttributes | null;
  viewedAt?: string | null;
  archivedAt?: string | null;
}

export type {
  Notification,
  NotificationMetadata,
  NotificationModel,
  NotificationScope,
  NotificationType,
  NotificationUserStateAttributes,
  NotificationUserStateModel,
  NotificationWithState,
};
