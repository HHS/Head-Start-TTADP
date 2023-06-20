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

const OBJECTIVE_STATUS = {
  DRAFT: 'Draft',
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  SUSPENDED: 'Suspended',
  COMPLETE: 'Complete',
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

const DB_MAINTENANCE_TYPE = {
  VACUUM: 'VACUUM',
  REINDEX: 'REINDEX',
  DAILY_MAINTENANCE: 'DAILY_MAINTENANCE',
};

const MAINTENANCE_TYPE = {
  DB: 'DB',
};

module.exports = {
  FILE_STATUSES,
  DATE_FORMAT,
  REPORTS_PER_PAGE,
  RECIPIENTS_PER_PAGE,
  GOALS_PER_PAGE,
  SEARCH_RESULTS_PER_PAGE,
  AUTOMATIC_CREATION,
  CURATED_CREATION,
  CREATION_METHOD,
  GOAL_STATUS,
  OBJECTIVE_STATUS,
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
  DB_MAINTENANCE_TYPE,
  MAINTENANCE_TYPE,
};
