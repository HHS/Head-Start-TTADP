const FILE_STATUSES = {
  UPLOADING: 'UPLOADING',
  UPLOADED: 'UPLOADED',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  QUEUED: 'SCANNING_QUEUED',
  QUEUEING_FAILED: 'QUEUEING_FAILED',
  SCANNING: 'SCANNING',
  SCANNING_FAILED: 'SCANNING_FAILED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

const IMPORT_STATUSES = {
  IDENTIFIED: 'IDENTIFIED',
  COLLECTING: 'COLLECTING',
  COLLECTED: 'COLLECTED',
  COLLECTION_FAILED: 'COLLECTION_FAILED',
  PROCESSING: 'PROCESSING',
  PROCESSED: 'PROCESSED',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
};

const IMPORT_DATA_STATUSES = {
  IDENTIFIED: 'IDENTIFIED',
  PROCESSING: 'PROCESSING',
  PROCESSED: 'PROCESSED',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  WILL_NOT_PROCESS: 'WILL_NOT_PROCESS',
};

const DATE_FORMAT = 'MM/DD/YYYY';

const REPORTS_PER_PAGE = 10;
const RECIPIENTS_PER_PAGE = 12;
const GOALS_PER_PAGE = 5;

const SEARCH_RESULTS_PER_PAGE = 23;

const AUTOMATIC_CREATION = 'Automatic';
const CURATED_CREATION = 'Curated';
const SYSTEM_GENERATED = 'System Generated';
const CREATION_METHOD = {
  AUTOMATIC: AUTOMATIC_CREATION,
  CURATED: CURATED_CREATION,
  SYSTEM_GENERATED,
};

const GOAL_STATUS = {
  DRAFT: 'Draft',
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  SUSPENDED: 'Suspended',
  CLOSED: 'Closed',
};

const GOAL_COLLABORATORS = {
  CREATOR: 'Creator', // The user who creates a goal
  EDITOR: 'Editor', // The user(s) who edits the text of a goal
  LINKER: 'Linker', // The user who links the goal to a report
  UTILIZER: 'Utilizer', // The user who created report and users listed as collaborators on report where goal is used
};

const GRANT_PERSONNEL_ROLES = ['auth_official_contact', 'ceo', 'cfo', 'policy_council', 'director'];

const OBJECTIVE_STATUS = {
  DRAFT: 'Draft',
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  SUSPENDED: 'Suspended',
  COMPLETE: 'Complete',
};

const OBJECTIVE_COLLABORATORS = {
  CREATOR: 'Creator', // The user who creates a objective
  EDITOR: 'Editor', // The user(s) who edits the text of a objective
  LINKER: 'Linker', // The user who links the objective to a report
  UTILIZER: 'Utilizer', // The user who created report and users listed as collaborators on report where objective is used
};

const NEXTSTEP_NOTETYPE = {
  SPECIALIST: 'SPECIALIST',
  RECIPIENT: 'RECIPIENT',
};

const RESOURCE_ACTIONS = {
  GET_METADATA: 'getMetaData',
};

const GROUP_COLLABORATORS = {
  CREATOR: 'Creator',
  CO_OWNER: 'Co-Owner',
  SHARED_WITH: 'SharedWith',
  EDITOR: 'Editor',
};

/**
 * Stored in `UserSettings` table, e.g.:
 * userId: 111, key: 'reportSubmittedForReview', value: 'immediately',
 */
const USER_SETTINGS = {
  EMAIL: {
    KEYS: {
      // Email you when an activity report is submitted for your approval.
      SUBMITTED_FOR_REVIEW: 'emailWhenReportSubmittedForReview',
      // Email you when an activity report you created or are a collaborator on needs an action.
      CHANGE_REQUESTED: 'emailWhenChangeRequested',
      // Email you when an activity report you created or are a collaborator on is approved.
      APPROVAL: 'emailWhenReportApproval',
      // Email you when you are added as a collaborator to an activity report.
      COLLABORATOR_ADDED: 'emailWhenAppointedCollaborator',
      // As a Program Specialist, email you when an AR for one of your grants is approved.
      RECIPIENT_APPROVAL: 'emailWhenRecipientReportApprovedProgramSpecialist',
    },
    VALUES: {
      NEVER: 'never',
      IMMEDIATELY: 'immediately',
      DAILY_DIGEST: 'today',
      WEEKLY_DIGEST: 'this week',
      MONTHLY_DIGEST: 'this month',
    },
  },
};

const NOTIFICATION_TYPES = {
  // ── Activity Report ──────────────────────────────────────────────────────────
  // AR-1: Creator adds collaborator (existing)
  ACTIVITY_REPORT_COLLABORATOR_ADDED: 'collaboratorAssigned',
  // AR-6/8: Approver requests changes (existing)
  ACTIVITY_REPORT_NEEDS_ACTION: 'changesRequested',
  // AR-2/3: Creator or collaborator submits report for approval (existing)
  ACTIVITY_REPORT_SUBMITTED: 'approverAssigned',
  // AR-7/9: Approver approves report (existing)
  ACTIVITY_REPORT_APPROVED: 'reportApproved',
  // AR-13 digest: added as collaborator (existing)
  ACTIVITY_REPORT_COLLABORATOR_DIGEST: 'collaboratorDigest',
  // AR-11 digest: changes requested (existing)
  ACTIVITY_REPORT_NEEDS_ACTION_DIGEST: 'changesRequestedDigest',
  // AR-10 digest: reports for approval (existing)
  ACTIVITY_REPORT_SUBMITTED_DIGEST: 'approverAssignedDigest',
  // AR-12 digest: approved reports (existing)
  ACTIVITY_REPORT_APPROVED_DIGEST: 'reportApprovedDigest',
  // Recipient notified when their AR is approved (existing)
  ACTIVITY_REPORT_RECIPIENT_REPORT_APPROVED: 'recipientReportApproved',
  // Digest: recipient notified of approved ARs (existing)
  ACTIVITY_REPORT_RECIPIENT_REPORT_APPROVED_DIGEST: 'recipientReportApprovedDigest',
  // AR-4/5: Creator or collaborator re-submits a report for approval
  ACTIVITY_REPORT_RESUBMITTED: 'activityReportResubmitted',
  // AR-14 digest: creator submits AR where recipient is a collaborator
  ACTIVITY_REPORT_SUBMITTED_TO_COLLABORATOR_DIGEST: 'activityReportSubmittedToCollaboratorDigest',
  // AR-15 digest: collaborator submits AR, creator notified
  ACTIVITY_REPORT_COLLABORATOR_SUBMITTED_DIGEST: 'activityReportCollaboratorSubmittedDigest',

  // ── Collaborative Report ──────────────────────────────────────────────────────
  // CR-1: Creator adds collaborator
  COLLAB_REPORT_COLLABORATOR_ADDED: 'collabReportCollaboratorAdded',
  // CR-2/3: Creator or collaborator submits report for approval
  COLLAB_REPORT_SUBMITTED: 'collabReportSubmitted',
  // CR-4/5: Creator or collaborator re-submits report for approval
  COLLAB_REPORT_RESUBMITTED: 'collabReportResubmitted',
  // CR-6/8: Approver requests changes
  COLLAB_REPORT_NEEDS_ACTION: 'collabReportNeedsAction',
  // CR-7/9: Approver approves report
  COLLAB_REPORT_APPROVED: 'collabReportApproved',
  // CR-10 digest: reports for approval
  COLLAB_REPORT_SUBMITTED_DIGEST: 'collabReportSubmittedDigest',
  // CR-11/14 digest: changes requested
  COLLAB_REPORT_NEEDS_ACTION_DIGEST: 'collabReportNeedsActionDigest',
  // CR-12/15 digest: approved reports
  COLLAB_REPORT_APPROVED_DIGEST: 'collabReportApprovedDigest',
  // CR-13 digest: added as collaborator
  COLLAB_REPORT_COLLABORATOR_DIGEST: 'collabReportCollaboratorDigest',
  // CR-16 digest: creator submits CR where recipient is a collaborator
  COLLAB_REPORT_SUBMITTED_TO_COLLABORATOR_DIGEST: 'collabReportSubmittedToCollaboratorDigest',
  // CR-17 digest: collaborator submits CR, creator notified
  COLLAB_REPORT_COLLABORATOR_SUBMITTED_DIGEST: 'collabReportCollaboratorSubmittedDigest',

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

const EMAIL_ACTIONS = {
  COLLABORATOR_ADDED: 'collaboratorAssigned',
  NEEDS_ACTION: 'changesRequested',
  SUBMITTED: 'approverAssigned',
  APPROVED: 'reportApproved',
  COLLABORATOR_DIGEST: 'collaboratorDigest',
  NEEDS_ACTION_DIGEST: 'changesRequestedDigest',
  SUBMITTED_DIGEST: 'approverAssignedDigest',
  APPROVED_DIGEST: 'reportApprovedDigest',
  RECIPIENT_REPORT_APPROVED: 'recipientReportApproved',
  RECIPIENT_REPORT_APPROVED_DIGEST: 'recipientReportApprovedDigest',
  TRAINING_REPORT_COLLABORATOR_ADDED: 'trainingReportCollaboratorAdded',
  TRAINING_REPORT_SESSION_CREATED: 'trainingReportSessionCreated',
  TRAINING_REPORT_EVENT_COMPLETED: 'trainingReportEventCompleted',
  TRAINING_REPORT_TASK_DUE: 'trainingReportTaskDueNotifications',
  TRAINING_REPORT_EVENT_IMPORTED: 'trainingReportEventImported',
};

const S3_ACTIONS = {
  DELETE_FILE: 'deleteFile',
};

const EMAIL_DIGEST_FREQ = {
  DAILY: 'today',
  WEEKLY: 'this week',
  MONTHLY: 'this month',
};

const DIGEST_SUBJECT_FREQ = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
};

const PROMPT_FIELD_TYPE = {
  MULTISELECT: 'multiselect',
};

const SOURCE_FIELD = {
  REPORT: {
    NONECLKC: 'nonECLKCResourcesUsed',
    ECLKC: 'ECLKCResourcesUsed',
    CONTEXT: 'context',
    NOTES: 'additionalNotes',
    RESOURCE: 'resource',
  },
  NEXTSTEPS: {
    NOTE: 'note',
    RESOURCE: 'resource',
  },
  GOAL: {
    NAME: 'name',
    TIMEFRAME: 'timeframe',
    RESOURCE: 'resource',
  },
  GOALTEMPLATE: {
    NAME: 'name',
    RESOURCE: 'resource',
  },
  REPORTGOAL: {
    NAME: 'name',
    TIMEFRAME: 'timeframe',
    RESOURCE: 'resource',
  },
  OBJECTIVE: {
    TITLE: 'title',
    RESOURCE: 'resource',
  },
  OBJECTIVETEMPLATE: {
    TITLE: 'title',
    RESOURCE: 'resource',
  },
  REPORTOBJECTIVE: {
    TITLE: 'title',
    TTAPROVIDED: 'ttaProvided',
    RESOURCE: 'resource',
  },
};

const RESOURCE_DOMAIN = {
  HEAD_START: 'headstart.gov',
};

const GRANT_INACTIVATION_REASONS = {
  REPLACED: 'Replaced',
  TERMINATED: 'Terminated',
  RELINQUISHED: 'Relinquished',
  UNKNOWN: 'Unknown',
};

const MAINTENANCE_TYPE = {
  VACUUM_ANALYZE: 'VACUUM ANALYZE',
  REINDEX: 'REINDEX',
  VACUUM_TABLES: 'VACUUM TABLES',
  REINDEX_TABLES: 'REINDEX TABLES',
  DAILY_DB_MAINTENANCE: 'DAILY DB MAINTENANCE',
  CORRECT_AR_FLAGS: 'CORRECT AR FLAGS',
  CLEAR_MAINTENANCE_LOGS: 'CLEAR MAINTENANCE LOGS',
  IMPORT_DOWNLOAD: 'IMPORT_DOWNLOAD',
  IMPORT_PROCESS: 'IMPORT_PROCESS',
};

const FEATURE_FLAGS = [
  'quality_assurance_dashboard',
  'monitoring-regional-dashboard',
  'actionable_notifications',
];

const MAINTENANCE_CATEGORY = {
  DB: 'DB',
  MAINTENANCE: 'MAINTENANCE',
  IMPORT: 'IMPORT',
};

const GOAL_CREATED_VIA = ['imported', 'activityReport', 'rtr', 'admin', 'monitoring', 'merge'];

const FEI_PROD_GOAL_TEMPLATE_ID = 19017;
const CLASS_MONITORING_PROD_GOAL_TEMPLATE_ID = 18172;

const COMMUNICATION_LOG_LIMIT_MAX = 1000;

const SORT_DIR = {
  ASC: 'ASC',
  DESC: 'DESC',
};

const REGIONS = ['Northeast', 'Midwest', 'West', 'AIAN', 'Southeast', 'Southwest'];

module.exports = {
  FEI_PROD_GOAL_TEMPLATE_ID,
  CLASS_MONITORING_PROD_GOAL_TEMPLATE_ID,
  FILE_STATUSES,
  IMPORT_STATUSES,
  IMPORT_DATA_STATUSES,
  DATE_FORMAT,
  REPORTS_PER_PAGE,
  RECIPIENTS_PER_PAGE,
  GOALS_PER_PAGE,
  GOAL_CREATED_VIA,
  SEARCH_RESULTS_PER_PAGE,
  AUTOMATIC_CREATION,
  CURATED_CREATION,
  CREATION_METHOD,
  GOAL_STATUS,
  GOAL_COLLABORATORS,
  GRANT_PERSONNEL_ROLES,
  OBJECTIVE_STATUS,
  OBJECTIVE_COLLABORATORS,
  GROUP_COLLABORATORS,
  NEXTSTEP_NOTETYPE,
  RESOURCE_ACTIONS,
  USER_SETTINGS,
  NOTIFICATION_TYPES,
  EMAIL_ACTIONS,
  S3_ACTIONS,
  EMAIL_DIGEST_FREQ,
  DIGEST_SUBJECT_FREQ,
  PROMPT_FIELD_TYPE,
  SOURCE_FIELD,
  RESOURCE_DOMAIN,
  GRANT_INACTIVATION_REASONS,
  MAINTENANCE_TYPE,
  MAINTENANCE_CATEGORY,
  FEATURE_FLAGS,
  SORT_DIR,
  COMMUNICATION_LOG_LIMIT_MAX,
  REGIONS,
};
