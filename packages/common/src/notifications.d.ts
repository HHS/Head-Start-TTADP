import type {
  EMAIL_NOTIFICATION_SETTING_KEYS,
  IN_APP_NOTIFICATION_SETTING_KEYS,
  NOTIFICATION_TYPES,
  USER_SETTINGS,
} from './constants';

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export interface Notification {
  id: number | string;
  createdAt: string;
  type?: NotificationType;
  text: string | null;
  link: string | null;
  label: string | null;
  displayId: string | null;
  actionable: boolean;
  archivedAt?: string | null;
  viewedAt?: string | null;
}

export interface NotificationsListResponse {
  count: number;
  rows: Notification[];
}

export interface UpdateNotificationStatePayload {
  archivedAt?: string | null;
  viewedAt?: string | null;
}

export type NotificationSortBy = 'all' | 'action_needed' | 'informational' | 'type';

export type NotificationSortDirection = 'ASC' | 'DESC' | 'asc' | 'desc';

export interface NotificationListQuery {
  limit?: number;
  offset?: number;
  sortBy?: NotificationSortBy;
  sortDir?: NotificationSortDirection;
}

export interface NotificationMetadata {
  id?: number;
  recipientName?: string;
  userName?: string;
  date?: string;
  displayId?: string;
}

export type EmailFrequencyValue =
  (typeof USER_SETTINGS)['EMAIL']['VALUES'][keyof (typeof USER_SETTINGS)['EMAIL']['VALUES']];

export type InAppNotificationSettingKey = (typeof IN_APP_NOTIFICATION_SETTING_KEYS)[number];

export type EmailNotificationSettingKey = (typeof EMAIL_NOTIFICATION_SETTING_KEYS)[number];
