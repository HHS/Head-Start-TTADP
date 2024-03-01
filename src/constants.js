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

const DATE_FORMAT = 'MM/DD/YYYY';

const REPORTS_PER_PAGE = 10;
const RECIPIENTS_PER_PAGE = 12;
const GOALS_PER_PAGE = 5;

const SEARCH_RESULTS_PER_PAGE = 23;

const AUTOMATIC_CREATION = 'Automatic';
const CURATED_CREATION = 'Curated';
const CREATION_METHOD = {
  AUTOMATIC: AUTOMATIC_CREATION,
  CURATED: CURATED_CREATION,
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
  MERGE_CREATOR: 'Merge-Creator', // The user who merged the goal on the goal created by the merge
  MERGE_DEPRECATOR: 'Merge-Deprecator', // The user who merged the goal on the goals merged
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
  MERGE_CREATOR: 'Merge-Creator', // The user who merged the objective on the objective created by the merge
  MERGE_DEPRECATOR: 'Merge-Deprecator', // The user who merged the objective on the objectives merged
};

const NEXTSTEP_NOTETYPE = {
  SPECIALIST: 'SPECIALIST',
  RECIPIENT: 'RECIPIENT',
};

const RESOURCE_ACTIONS = {
  GET_METADATA: 'getMetaData',
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
  TRAINING_REPORT_POC_SESSION_COMPLETE: 'trainingReportPocComplete',
  TRAINING_REPORT_POC_VISION_GOAL_COMPLETE: 'trainingReportPocVisionGoalComplete',
  TRAINING_REPORT_POC_ADDED: 'trainingReportPocAdded',
  TRAINING_REPORT_SESSION_CREATED: 'trainingReportSessionCreated',
  TRAINING_REPORT_SESSION_COMPLETED: 'trainingReportSessionCompleted',
  TRAINING_REPORT_EVENT_COMPLETED: 'trainingReportEventCompleted',
};

const AWS_ELASTICSEARCH_ACTIONS = {
  ADD_INDEX_DOCUMENT: 'addIndexDocument',
  UPDATE_INDEX_DOCUMENT: 'updateIndexDocument',
  DELETE_INDEX_DOCUMENT: 'deleteIndexDocument',
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
  ECLKC: 'eclkc.ohs.acf.hhs.gov',
};

const AWS_ELASTIC_SEARCH_INDEXES = {
  ACTIVITY_REPORTS: 'activityreports',
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
  CLEAR_MAINTENANCE_LOGS: 'CLEAR MAINTENANCE LOGS',
};

const FEATURE_FLAGS = [
  'resources_dashboard',
  'anv_statistics',
  'regional_goal_dashboard',
  'merge_goals',
  'monitoring',
  'closed_goal_merge_override',
];

const MAINTENANCE_CATEGORY = {
  DB: 'DB',
  MAINTENANCE: 'MAINTENANCE',
};

const GOAL_CREATED_VIA = ['imported', 'activityReport', 'rtr', 'merge', 'admin', 'tr'];

module.exports = {
  FILE_STATUSES,
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
  NEXTSTEP_NOTETYPE,
  RESOURCE_ACTIONS,
  USER_SETTINGS,
  EMAIL_ACTIONS,
  AWS_ELASTICSEARCH_ACTIONS,
  S3_ACTIONS,
  EMAIL_DIGEST_FREQ,
  DIGEST_SUBJECT_FREQ,
  PROMPT_FIELD_TYPE,
  SOURCE_FIELD,
  RESOURCE_DOMAIN,
  AWS_ELASTIC_SEARCH_INDEXES,
  GRANT_INACTIVATION_REASONS,
  MAINTENANCE_TYPE,
  MAINTENANCE_CATEGORY,
  FEATURE_FLAGS,
};
