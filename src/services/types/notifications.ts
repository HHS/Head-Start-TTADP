import type { Notification, NotificationMetadata, NotificationType } from '@ttahub/types';
import type { Model, WhereOptions } from 'sequelize';

type NotificationScope = WhereOptions;

interface NotificationModel extends Model, Notification {
  userId: number | null;
  entityId: number | null;
  triggeredAt: string | null;
  isGlobal?: boolean;
}

interface NotificationUserStateModel extends Model {
  id: number;
  notificationId: number;
  userId: number;
  viewedAt: string | null;
  archivedAt: string | null;
}

interface NotificationWithState extends NotificationModel {
  userState?: NotificationUserStateModel | null;
  viewedAt?: string | null;
  archivedAt?: string | null;
}

export type {
  Notification,
  NotificationMetadata,
  NotificationModel,
  NotificationScope,
  NotificationType,
  NotificationUserStateModel,
  NotificationWithState,
};
