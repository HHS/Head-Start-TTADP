// ─── Notification types ──────────────────────────────────────────────────────
// Tier 1: API contract types (cross BE↔FE boundary)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * String-literal union of all notification type values as stored in the database.
 * Mirrors NOTIFICATION_TYPES in src/constants.js. Update both together.
 */
export type NotificationType =
  // Activity Report
  | 'collaboratorAssigned'
  | 'changesRequested'
  | 'approverAssigned'
  | 'reportApproved'
  | 'recipientReportApproved'
  | 'activityReportResubmitted'
  // Collaborative Report
  | 'collabReportCollaboratorAdded'
  | 'collabReportSubmitted'
  | 'collabReportResubmitted'
  | 'collabReportNeedsAction'
  | 'collabReportApproved'
  // Training Report
  | 'trainingReportPocAdded'
  | 'trainingReportCollaboratorAdded'
  | 'trainingReportSessionCreated'
  | 'trainingReportSessionSubmitted'
  | 'trainingReportSessionNeedsAction'
  | 'trainingReportSessionResubmitted'
  | 'trainingReportEventCompleted'
  | 'trainingReportTaskDueNotifications'
  | 'trainingReportEventImported'
  | 'trainingReportEventInfoMissing'
  | 'trainingReportEventInfoPastDue'
  | 'trainingReportSessionInfoMissing'
  | 'trainingReportSessionInfoPastDue'
  | 'trainingReportNoSessionsCreated'
  | 'trainingReportNoSessionsPastDue'
  | 'trainingReportEventNotCompleted'
  | 'trainingReportEventNotCompletedPastDue'
  // Communication Log
  | 'communicationLogTtaStaffAdded'
  | 'communicationLogRecipientInGroup'
  // Monitoring / Group / System
  | 'monitoringGoalAdded'
  | 'monitoringDataReceived'
  | 'groupCoOwnerAdded'
  | 'groupShared'
  | 'systemPlannedOutage'
  | 'systemUnplannedOutage';

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
 * Email frequency preference values. Keys must match USER_SETTINGS.EMAIL.VALUES
 * in src/constants.js and the frequencyValues array in
 * frontend/src/pages/AccountManagement/index.js.
 */
export type EmailFrequencyValue = 'never' | 'immediately' | 'today' | 'this week' | 'this month';

/**
 * In-app notification user setting keys. Values are the `key` column entries
 * in the UserSettingOverrides table, as defined in
 * src/migrations/20260625133410-add-new-user-settings-for-in-app-notifications.js.
 */
export type InAppNotificationSettingKey =
  | 'inAppWhenReportSubmittedForReview'
  | 'inAppWhenChangeRequested'
  | 'inAppWhenReportApproval'
  | 'inAppWhenAppointedCollaborator'
  | 'inAppWhenRecipientReportApprovedProgramSpecialist'
  | 'inAppWhenCollaboratorReportSubmittedForReview'
  | 'inAppWhenCreatorReportSubmittedForReview'
  | 'inAppWhenCollabReportSubmittedForReview'
  | 'inAppWhenCollaborationReportSubmittedForReview'
  | 'inAppWhenCollaborationReportCollaboratorSubmitted'
  | 'inAppWhenCollaborationChangeRequested'
  | 'inAppWhenCollaborationReportApproved'
  | 'inAppWhenAddedAsCollaborationCollaborator'
  | 'inAppWhenAddedAsTTAStaffCommLog'
  | 'inAppWhenAddedAsRecipientCommLog'
  | 'inAppWhenAddedAsPocTrainingReport'
  | 'inAppWhenAddedAsCollaboratorTrainingReport'
  | 'inAppWhenSessionReviewRequestedTrainingReport'
  | 'inAppWhenSessionChangesRequestedTrainingReport'
  | 'inAppWhenSessionDetails20DaysCreatorCollaborator'
  | 'inAppWhenSessionDetails20DaysPoc'
  | 'inAppWhenNoSessionsCreatorCollaborator'
  | 'inAppWhenNoSessionsPoc'
  | 'inAppWhenEventDetails20DaysCreatorCollaborator'
  | 'inAppWhenEventNotCompleted'
  | 'inAppWhenPlannedOutage'
  | 'inAppWhenMonitoringDetailsAdded'
  | 'inAppWhenAddedAsCoOwner'
  | 'inAppWhenSharedMyGroup';

/**
 * Email notification user setting keys. Values are the `key` column entries
 * in the UserSettings table, matching USER_SETTINGS.EMAIL.KEYS in src/constants.js.
 */
export type EmailNotificationSettingKey =
  | 'emailWhenReportSubmittedForReview'
  | 'emailWhenChangeRequested'
  | 'emailWhenReportApproval'
  | 'emailWhenAppointedCollaborator'
  | 'emailWhenRecipientReportApprovedProgramSpecialist';
