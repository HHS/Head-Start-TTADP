export const FILE_STATUSES = {
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

export const DATE_FORMAT = 'MM/DD/YYYY';

export const DECIMAL_BASE = 10;

export const REPORTS_PER_PAGE = 10;
export const RECIPIENTS_PER_PAGE = 12;
export const GOALS_PER_PAGE = 5;

export const SEARCH_RESULTS_PER_PAGE = 23;

export const AUTOMATIC_CREATION = 'Automatic';
export const CURATED_CREATION = 'Curated';
export const CREATION_METHOD = [
  AUTOMATIC_CREATION,
  CURATED_CREATION,
];

export const GOAL_STATUS = {
  DRAFT: 'Draft',
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  SUSPENDED: 'Suspended',
  CLOSED: 'Closed',
};

export const OBJECTIVE_STATUS = {
  DRAFT: 'Draft',
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  SUSPENDED: 'Suspended',
  COMPLETE: 'Complete',
};

/**
 * Stored in `UserSettings` table, e.g.:
 * userId: 111, key: 'reportSubmittedForReview', value: 'immediately',
 */
export const USER_SETTINGS = {
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

export const EMAIL_ACTIONS = {
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

export const EMAIL_DIGEST_FREQ = {
  DAILY: 'today',
  WEEKLY: 'this week',
  MONTHLY: 'this month',
};

export const DIGEST_SUBJECT_FREQ = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
};

export const AWS_ELASTIC_SEARCH_INDEXES = {
  ACTIVITY_REPORTS: 'activityreports',
};
