// ─── Notification types ──────────────────────────────────────────────────────
// Tier 1: API contract types (cross BE↔FE boundary)
// ─────────────────────────────────────────────────────────────────────────────

// String-literal unions are derived from the runtime constants in
// @ttahub/common via `typeof`/keyof so each list is maintained in exactly
// one place. We import from the deep `@ttahub/common/src/constants` path
// because only that file has a sibling .d.ts overlay (constants.d.ts) with
// `as const`-style literal types — the package's main entry (index.js) is
// pure JS with dynamic re-exports and would widen these to `string`.
import type {
  IN_APP_NOTIFICATION_SETTING_KEYS,
  NOTIFICATION_TYPES,
  USER_SETTINGS,
} from '@ttahub/common/src/constants';

/**
 * String-literal union of all notification type values as stored in the database.
 * Derived from NOTIFICATION_TYPES in @ttahub/common (the single source of truth).
 */
export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

/**
 * Plain JSON shape of a single notification as returned by GET /api/notifications
 * and GET /api/notifications/archived. This is the wire representation — not tied
 * to the Sequelize model.
 */
export interface Notification {
  id: number | string;
  createdAt: string;
  type?: NotificationType;
  text?: string;
  link?: string;
  label?: string;
  displayId?: string;
  actionable: boolean;
  archivedAt?: string | null;
  viewedAt?: string | null;
}

/**
 * Paginated list response returned by GET /api/notifications and
 * GET /api/notifications/archived.
 */
export interface NotificationsListResponse {
  count: number;
  rows: Notification[];
}

/**
 * Request body for PUT /api/notifications/:id.
 * At least one field must be present; both are ISO-8601 date strings.
 */
export interface UpdateNotificationStatePayload {
  archivedAt?: string | null;
  viewedAt?: string | null;
}

// ─── Tier 2: Sort / query / metadata types ───────────────────────────────────

/**
 * Sort mode accepted by the notifications list endpoints.
 * Corresponds to ALLOWED_SORT_FIELDS in src/services/notifications.ts.
 */
export type NotificationSortBy = 'all' | 'action_needed' | 'informational' | 'type';

/**
 * Sort direction accepted by the notifications list endpoints.
 * The backend normalises to uppercase before applying; FE passes lowercase keys.
 */
export type NotificationSortDirection = 'ASC' | 'DESC' | 'asc' | 'desc';

/**
 * Query parameters accepted by GET /api/notifications and
 * GET /api/notifications/archived.
 */
export interface NotificationListQuery {
  limit?: number;
  offset?: number;
  sortBy?: NotificationSortBy;
  sortDir?: NotificationSortDirection;
}

/**
 * Metadata values used to build notification text, link, and displayId via
 * NOTIFICATION_CONFIGURATION in src/constants.js.
 * Mirrors NotificationMetadata in src/services/types/notifications.ts.
 */
export interface NotificationMetadata {
  id?: number;
  recipientName?: string;
  userName?: string;
  date?: string;
  displayId?: string;
}

/**
 * Email frequency preference values. Derived from USER_SETTINGS.EMAIL.VALUES
 * in @ttahub/common (the single source of truth, also referenced by the
 * frequencyValues array in frontend/src/pages/AccountManagement/index.js).
 */
export type EmailFrequencyValue =
  (typeof USER_SETTINGS)['EMAIL']['VALUES'][keyof (typeof USER_SETTINGS)['EMAIL']['VALUES']];

/**
 * In-app notification user setting keys. Derived from
 * IN_APP_NOTIFICATION_SETTING_KEYS in @ttahub/common, which mirrors the
 * `inApp*` rows seeded by
 * src/migrations/20260625133410-add-new-user-settings-for-in-app-notifications.js.
 */
export type InAppNotificationSettingKey = (typeof IN_APP_NOTIFICATION_SETTING_KEYS)[number];

/**
 * Email notification user setting keys. Derived from USER_SETTINGS.EMAIL.KEYS
 * in @ttahub/common (the single source of truth).
 */
export type EmailNotificationSettingKey =
  (typeof USER_SETTINGS)['EMAIL']['KEYS'][keyof (typeof USER_SETTINGS)['EMAIL']['KEYS']];
