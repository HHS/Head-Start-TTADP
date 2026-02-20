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

const DATE_FORMAT = 'MM/dd/yyyy';

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

const GRANT_PERSONNEL_ROLES = [
  'auth_official_contact',
  'ceo',
  'cfo',
  'policy_council',
  'director',
];

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

const REGIONS = [
  'Northeast',
  'Midwest',
  'West',
  'AIAN',
  'Southeast',
  'Southwest',
];

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
