// Targeted TypeScript declaration overlay for runtime constants whose
// literal-typed shape must flow to consumers (notably @ttahub/types, which
// derives string-literal unions from these objects via `typeof`).
//
// Only declare exports here that need literal-type narrowing. Other exports
// from constants.js continue to be inferred from the JS source as-is.

export const NOTIFICATION_TYPES: {
  readonly ACTIVITY_REPORT_COLLABORATOR_ADDED: 'collaboratorAssigned';
  readonly ACTIVITY_REPORT_NEEDS_ACTION: 'changesRequested';
  readonly ACTIVITY_REPORT_SUBMITTED: 'approverAssigned';
  readonly ACTIVITY_REPORT_APPROVED: 'reportApproved';
  readonly ACTIVITY_REPORT_RECIPIENT_REPORT_APPROVED: 'recipientReportApproved';
  readonly ACTIVITY_REPORT_RESUBMITTED: 'activityReportResubmitted';
  readonly COLLAB_REPORT_COLLABORATOR_ADDED: 'collabReportCollaboratorAdded';
  readonly COLLAB_REPORT_SUBMITTED: 'collabReportSubmitted';
  readonly COLLAB_REPORT_RESUBMITTED: 'collabReportResubmitted';
  readonly COLLAB_REPORT_NEEDS_ACTION: 'collabReportNeedsAction';
  readonly COLLAB_REPORT_APPROVED: 'collabReportApproved';
  readonly TRAINING_REPORT_POC_ADDED: 'trainingReportPocAdded';
  readonly TRAINING_REPORT_COLLABORATOR_ADDED: 'trainingReportCollaboratorAdded';
  readonly TRAINING_REPORT_SESSION_CREATED: 'trainingReportSessionCreated';
  readonly TRAINING_REPORT_SESSION_SUBMITTED: 'trainingReportSessionSubmitted';
  readonly TRAINING_REPORT_SESSION_NEEDS_ACTION: 'trainingReportSessionNeedsAction';
  readonly TRAINING_REPORT_SESSION_RESUBMITTED: 'trainingReportSessionResubmitted';
  readonly TRAINING_REPORT_EVENT_COMPLETED: 'trainingReportEventCompleted';
  readonly TRAINING_REPORT_TASK_DUE: 'trainingReportTaskDueNotifications';
  readonly TRAINING_REPORT_EVENT_IMPORTED: 'trainingReportEventImported';
  readonly TRAINING_REPORT_EVENT_INFO_MISSING: 'trainingReportEventInfoMissing';
  readonly TRAINING_REPORT_EVENT_INFO_PAST_DUE: 'trainingReportEventInfoPastDue';
  readonly TRAINING_REPORT_SESSION_INFO_MISSING: 'trainingReportSessionInfoMissing';
  readonly TRAINING_REPORT_SESSION_INFO_PAST_DUE: 'trainingReportSessionInfoPastDue';
  readonly TRAINING_REPORT_NO_SESSIONS_CREATED: 'trainingReportNoSessionsCreated';
  readonly TRAINING_REPORT_NO_SESSIONS_PAST_DUE: 'trainingReportNoSessionsPastDue';
  readonly TRAINING_REPORT_EVENT_NOT_COMPLETED: 'trainingReportEventNotCompleted';
  readonly TRAINING_REPORT_EVENT_NOT_COMPLETED_PAST_DUE: 'trainingReportEventNotCompletedPastDue';
  readonly COMMUNICATION_LOG_TTA_STAFF_ADDED: 'communicationLogTtaStaffAdded';
  readonly COMMUNICATION_LOG_RECIPIENT_IN_GROUP: 'communicationLogRecipientInGroup';
  readonly MONITORING_GOAL_ADDED: 'monitoringGoalAdded';
  readonly MONITORING_DATA_RECEIVED: 'monitoringDataReceived';
  readonly GROUP_CO_OWNER_ADDED: 'groupCoOwnerAdded';
  readonly GROUP_SHARED: 'groupShared';
  readonly SYSTEM_PLANNED_OUTAGE: 'systemPlannedOutage';
  readonly SYSTEM_UNPLANNED_OUTAGE: 'systemUnplannedOutage';
};

export const USER_SETTINGS: {
  readonly EMAIL: {
    readonly KEYS: {
      readonly SUBMITTED_FOR_REVIEW: 'emailWhenReportSubmittedForReview';
      readonly CHANGE_REQUESTED: 'emailWhenChangeRequested';
      readonly APPROVAL: 'emailWhenReportApproval';
      readonly COLLABORATOR_ADDED: 'emailWhenAppointedCollaborator';
      readonly RECIPIENT_APPROVAL: 'emailWhenRecipientReportApprovedProgramSpecialist';
    };
    readonly VALUES: {
      readonly NEVER: 'never';
      readonly IMMEDIATELY: 'immediately';
      readonly DAILY_DIGEST: 'today';
      readonly WEEKLY_DIGEST: 'this week';
      readonly MONTHLY_DIGEST: 'this month';
    };
  };
};

export const IN_APP_NOTIFICATION_SETTING_KEYS: readonly [
  'inAppWhenReportSubmittedForReview',
  'inAppWhenChangeRequested',
  'inAppWhenReportApproval',
  'inAppWhenAppointedCollaborator',
  'inAppWhenRecipientReportApprovedProgramSpecialist',
  'inAppWhenCollaboratorReportSubmittedForReview',
  'inAppWhenCreatorReportSubmittedForReview',
  'inAppWhenCollabReportSubmittedForReview',
  'inAppWhenCollaborationReportSubmittedForReview',
  'inAppWhenCollaborationReportCollaboratorSubmitted',
  'inAppWhenCollaborationChangeRequested',
  'inAppWhenCollaborationReportApproved',
  'inAppWhenAddedAsCollaborationCollaborator',
  'inAppWhenAddedAsTTAStaffCommLog',
  'inAppWhenAddedAsRecipientCommLog',
  'inAppWhenAddedAsPocTrainingReport',
  'inAppWhenAddedAsCollaboratorTrainingReport',
  'inAppWhenSessionReviewRequestedTrainingReport',
  'inAppWhenSessionChangesRequestedTrainingReport',
  'inAppWhenSessionDetails20DaysCreatorCollaborator',
  'inAppWhenSessionDetails20DaysPoc',
  'inAppWhenNoSessionsCreatorCollaborator',
  'inAppWhenNoSessionsPoc',
  'inAppWhenEventDetails20DaysCreatorCollaborator',
  'inAppWhenEventNotCompleted',
  'inAppWhenPlannedOutage',
  'inAppWhenMonitoringDetailsAdded',
  'inAppWhenAddedAsCoOwner',
  'inAppWhenSharedMyGroup',
];
