import type { Model, WhereOptions } from 'sequelize';

type NotificationScope = WhereOptions;

interface NotificationMetadata {
  id: number | undefined;
  recipientName: string | undefined;
  userName: string | undefined;
  date: string | undefined;
  displayId: string | undefined;
}

type NotificationType =
  typeof import('../../constants').NOTIFICATION_TYPES[keyof typeof import('../../constants').NOTIFICATION_TYPES];

interface NotificationModel extends Model {
  id: number;
  userId: number | null;
  entityId: number | null;
  type: NotificationType;
  link: string | null;
  label: string | null;
  displayId: string | null;
  text: string | null;
  archivedAt: string | null;
  triggeredAt: string | null;
  viewedAt: string | null;
  isGlobal?: boolean;
  isInformational?: boolean;
}

export type { NotificationMetadata, NotificationModel, NotificationScope, NotificationType };
