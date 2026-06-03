import type { Model } from 'sequelize';
import type { NOTIFICATION_TYPES } from '../../constants';

interface NotificationScope {
  id?: number | number[];
}

interface NotificationMetadata {
  id: number | null;
  recipientName: string | null;
  userName: string | null;
  date: string | null;
}

type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

interface NotificationModel extends Model {
  userId?: number;
  entityId?: number;
  type: NotificationType;
  link?: string;
  label?: string;
  text?: string;
  archivedAt?: Date;
  triggeredAt?: Date;
  viewedAt?: Date;
  isGlobal?: boolean;
  isInformational?: boolean;
}

export type { NotificationMetadata, NotificationModel, NotificationScope, NotificationType };
