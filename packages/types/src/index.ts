/**
 * @ttahub/types
 *
 * Shared TypeScript type definitions for the TTA Smart Hub.
 *
 * IMPORTANT:
 * - This package is types-only. It contains no runtime JavaScript.
 *   Never add `const`, `function`, or other value exports — those belong in @ttahub/common.
 * - This package is NOT published to npm. It is locally linked via the Yarn `link:` protocol.
 *   Do NOT run `npm publish` or `yarn publish` from this directory.
 * - Consumers must use `import type` (or `require` only for type positions) to import from this
 *   package. TypeScript strips type-only imports at compile time, so no runtime resolution occurs.
 *
 * Adding a new type:
 * 1. Create (or update) a `.ts` file under `src/`.
 * 2. Re-export it from this file using `export type { ... } from './your-module'`.
 * 3. No build step is needed — changes are reflected immediately.
 */

export type {
  EmailFrequencyValue,
  EmailNotificationSettingKey,
  InAppNotificationSettingKey,
  Notification,
  NotificationListQuery,
  NotificationMetadata,
  NotificationSortBy,
  NotificationSortDirection,
  NotificationsListResponse,
  NotificationType,
  UpdateNotificationStatePayload,
} from './notifications';
