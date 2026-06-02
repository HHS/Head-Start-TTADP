import { Op } from 'sequelize';
import { NOTIFICATION_TYPES } from '../../constants';
import { filterStringArrayToNumberArray } from '../utils';

const VALID_TYPES = ['activityReport', 'collabReport', 'trainingReport', 'systemRelated', 'other'];

const NOTIFICATION_TYPE_MAP = {
  [NOTIFICATION_TYPES.ACTIVITY_REPORT_COLLABORATOR_ADDED]: 'activityReport',
  [NOTIFICATION_TYPES.ACTIVITY_REPORT_NEEDS_ACTION]: 'activityReport',
  [NOTIFICATION_TYPES.ACTIVITY_REPORT_SUBMITTED]: 'activityReport',
  [NOTIFICATION_TYPES.ACTIVITY_REPORT_APPROVED]: 'activityReport',
  [NOTIFICATION_TYPES.ACTIVITY_REPORT_RECIPIENT_REPORT_APPROVED]: 'activityReport',
  [NOTIFICATION_TYPES.ACTIVITY_REPORT_RESUBMITTED]: 'activityReport',

  [NOTIFICATION_TYPES.COLLAB_REPORT_COLLABORATOR_ADDED]: 'collabReport',
  [NOTIFICATION_TYPES.COLLAB_REPORT_SUBMITTED]: 'collabReport',
  [NOTIFICATION_TYPES.COLLAB_REPORT_RESUBMITTED]: 'collabReport',
  [NOTIFICATION_TYPES.COLLAB_REPORT_NEEDS_ACTION]: 'collabReport',
  [NOTIFICATION_TYPES.COLLAB_REPORT_APPROVED]: 'collabReport',

  // ── Training Report ───────────────────────────────────────────────────────────
  // TR-1: Creator adds a regional POC
  TRAINING_REPORT_POC_ADDED: 'trainingReportPocAdded',
  // TR-2: Creator adds collaborator (existing)
  TRAINING_REPORT_COLLABORATOR_ADDED: 'trainingReportCollaboratorAdded',
  // Session created on an event (existing)
  TRAINING_REPORT_SESSION_CREATED: 'trainingReportSessionCreated',
  // TR-3: Creator submits a session for approval
  TRAINING_REPORT_SESSION_SUBMITTED: 'trainingReportSessionSubmitted',
  // TR-4: Approver requests changes to a session
  TRAINING_REPORT_SESSION_NEEDS_ACTION: 'trainingReportSessionNeedsAction',
  // TR-5/6: Creator or collaborator re-submits a session for review
  TRAINING_REPORT_SESSION_RESUBMITTED: 'trainingReportSessionResubmitted',
  // Event completed (existing)
  TRAINING_REPORT_EVENT_COMPLETED: 'trainingReportEventCompleted',
  // Cron umbrella for task-due reminders (existing)
  TRAINING_REPORT_TASK_DUE: 'trainingReportTaskDueNotifications',
  // Event imported from HSES (existing)
  TRAINING_REPORT_EVENT_IMPORTED: 'trainingReportEventImported',
  // TR-5/7 (Paused): event info missing 20 days past event start date
  TRAINING_REPORT_EVENT_INFO_MISSING: 'trainingReportEventInfoMissing',
  // TR-6/8 (Paused): event info still missing 20 days past previous reminder
  TRAINING_REPORT_EVENT_INFO_PAST_DUE: 'trainingReportEventInfoPastDue',
  // TR-9/10/11 (Paused): session info missing 20 days past session start date
  TRAINING_REPORT_SESSION_INFO_MISSING: 'trainingReportSessionInfoMissing',
  // TR-10c/12 (Paused): session info still missing 20 days past previous reminder
  TRAINING_REPORT_SESSION_INFO_PAST_DUE: 'trainingReportSessionInfoPastDue',
  // TR-13/15 (Paused): no sessions created 20 days past event end date
  TRAINING_REPORT_NO_SESSIONS_CREATED: 'trainingReportNoSessionsCreated',
  // TR-14/16 (Paused): still no sessions 20 days past previous reminder
  TRAINING_REPORT_NO_SESSIONS_PAST_DUE: 'trainingReportNoSessionsPastDue',
  // TR-17 (Paused): event not completed 20 days past event end date
  TRAINING_REPORT_EVENT_NOT_COMPLETED: 'trainingReportEventNotCompleted',
  // TR-18 (Paused): event not completed 20 days past previous reminder
  TRAINING_REPORT_EVENT_NOT_COMPLETED_PAST_DUE: 'trainingReportEventNotCompletedPastDue',
  // TR-19 digest: added as Event POC
  TRAINING_REPORT_POC_ADDED_DIGEST: 'trainingReportPocAddedDigest',
  // TR-20 digest: added as Event Collaborator
  TRAINING_REPORT_COLLABORATOR_ADDED_DIGEST: 'trainingReportCollaboratorAddedDigest',
  // TR-21 digest: session submitted for review
  TRAINING_REPORT_SESSION_SUBMITTED_DIGEST: 'trainingReportSessionSubmittedDigest',
  // TR-22 digest: session changes requested
  TRAINING_REPORT_SESSION_NEEDS_ACTION_DIGEST: 'trainingReportSessionNeedsActionDigest',
  // TR-23 digest: event details not complete
  TRAINING_REPORT_EVENT_INFO_MISSING_DIGEST: 'trainingReportEventInfoMissingDigest',
  // TR-24/25 digest: session details not complete
  TRAINING_REPORT_SESSION_INFO_MISSING_DIGEST: 'trainingReportSessionInfoMissingDigest',
  // TR-26 digest: no sessions created past event end date
  TRAINING_REPORT_NO_SESSIONS_CREATED_DIGEST: 'trainingReportNoSessionsCreatedDigest',
  // TR-27 digest: event not completed past event end date
  TRAINING_REPORT_EVENT_NOT_COMPLETED_DIGEST: 'trainingReportEventNotCompletedDigest',

  // ── Communication Log ─────────────────────────────────────────────────────────
  // CL-1: Creator adds TTA staff to a comm log
  COMMUNICATION_LOG_TTA_STAFF_ADDED: 'communicationLogTtaStaffAdded',
  // CL-2: Comm log entered for a recipient in a program specialist's group
  COMMUNICATION_LOG_RECIPIENT_IN_GROUP: 'communicationLogRecipientInGroup',
  // CL-3 digest: added as TTA staff on a comm log
  COMMUNICATION_LOG_TTA_STAFF_ADDED_DIGEST: 'communicationLogTtaStaffAddedDigest',
  // CL-4 digest: comm log added for a recipient in one of your groups
  COMMUNICATION_LOG_RECIPIENT_IN_GROUP_DIGEST: 'communicationLogRecipientInGroupDigest',

  // ── Monitoring / Group / System ───────────────────────────────────────────────
  // Misc-1 (Draft): monitoring goal added/opened for recipients in a region
  MONITORING_GOAL_ADDED: 'monitoringGoalAdded',
  // Misc-1b: new monitoring data received for recipients in a region
  MONITORING_DATA_RECEIVED: 'monitoringDataReceived',
  // Misc-2: group co-owner added
  GROUP_CO_OWNER_ADDED: 'groupCoOwnerAdded',
  // Misc-3: group shared with user
  GROUP_SHARED: 'groupShared',
  // Misc-4: TTA Hub planned outage notification
  SYSTEM_PLANNED_OUTAGE: 'systemPlannedOutage',
  // Misc-5: TTA Hub unplanned outage notification
  SYSTEM_UNPLANNED_OUTAGE: 'systemUnplannedOutage',
};

export function withNotificationType(notificationTypes: string[]) {
  return {
    where: {
      notificationType: {
        [Op.in]: filterStringArrayToNumberArray(notificationTypes),
      },
    },
  };
}

export function withoutNotificationType(notificationTypes: string[]) {
  return {
    where: {
      notificationType: {
        [Op.notIn]: filterStringArrayToNumberArray(notificationTypes),
      },
    },
  };
}
