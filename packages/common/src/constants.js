const RECIPIENT_PARTICIPANTS = [
  'CEO / CFO / Executive',
  'Center Director / Site Director',
  'Coach',
  'Direct Service: Other',
  'Family Service Worker / Case Manager',
  'Fiscal Manager/Team',
  'Governing Body / Tribal Council / Policy Council',
  'Home Visitor',
  'Manager / Coordinator / Specialist',
  'Parent / Guardian',
  'Program Director (HS / EHS)',
  'Program Support / Administrative Assistant',
  'Teacher / Infant-Toddler Caregiver',
  'Volunteer',
];
exports.RECIPIENT_PARTICIPANTS = RECIPIENT_PARTICIPANTS;

const LANGUAGES = ['English', 'Spanish'];
exports.LANGUAGES = LANGUAGES;

const OTHER_ENTITY_PARTICIPANTS = [
  'HSCO',
  'Local or State Agency',
  'OCC Regional Office',
  'OHS Regional Office',
  'Regional Head Start Association',
  'Regional TTA Team / Specialists',
  'State Early Learning System',
  'State Head Start Association',
  'Other',
];
exports.OTHER_ENTITY_PARTICIPANTS = OTHER_ENTITY_PARTICIPANTS;

const ALL_PARTICIPANTS = [...RECIPIENT_PARTICIPANTS, ...OTHER_ENTITY_PARTICIPANTS];
exports.ALL_PARTICIPANTS = ALL_PARTICIPANTS;

const TOPICS = [
  'Behavioral / Mental Health / Trauma',
  'Child Screening and Assessment',
  'CLASS: Classroom Organization',
  'CLASS: Emotional Support',
  'CLASS: Instructional Support',
  'Coaching',
  'Communication',
  'Community and Self-Assessment',
  'Culture & Language',
  'Curriculum (Instructional or Parenting)',
  'Data and Evaluation',
  'Disabilities Services',
  'ERSEA',
  'Emergency Preparedness, Response, and Recovery (EPRR)',
  'Environmental Health and Safety / EPRR',
  'Environmental Health and Safety',
  'Facilities',
  'Family Support Services',
  'Fatherhood / Male Caregiving',
  'Fiscal / Budget',
  'Five-Year Grant',
  'Home Visiting',
  'Human Resources',
  'Leadership / Governance',
  'Learning Environments',
  'Nutrition',
  'Ongoing Monitoring and Continuous Improvement',
  'Oral Health',
  'Parent and Family Engagement',
  'Partnerships and Community Engagement',
  'Physical Health and Screenings',
  'Pregnancy Services / Expectant Families',
  'Program Planning and Services',
  'Quality Improvement Plan / QIP',
  'Recordkeeping and Reporting',
  'Safety Practices',
  'Staff Wellness',
  'Teaching / Caregiving Practices',
  'Technology and Information Systems',
  'Training and Professional Development',
  'Transition Practices',
  'Transportation',
];
exports.TOPICS = TOPICS;

const REASONS = [
  'Below Competitive Threshold (CLASS)',
  'Below Quality Threshold (CLASS)',
  'Change in Scope',
  'Child Incident',
  'Complaint',
  'Full Enrollment',
  'New Recipient',
  'New Director or Management',
  'New Program Option',
  'New Staff / Turnover',
  'Ongoing Quality Improvement',
  'Planning/Coordination',
  'School Readiness Goals',
  'Monitoring | Area of Concern',
  'Monitoring | Noncompliance',
  'Monitoring | Deficiency',
];
exports.REASONS = REASONS;

const DEPRECATED_REASONS = ['COVID-19 response'];

exports.DEPRECATED_REASONS = DEPRECATED_REASONS;

const PRIORITY_INDICATORS = [
  'Child incidents',
  'Deficiency',
  'DRS',
  'FEI',
  'New recipient',
  'New staff',
  'No TTA',
];

exports.PRIORITY_INDICATORS = PRIORITY_INDICATORS;

const REPORT_STATUSES = {
  DRAFT: 'draft',
  DELETED: 'deleted',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  NEEDS_ACTION: 'needs_action',
};
exports.REPORT_STATUSES = REPORT_STATUSES;

const TRAINING_REPORT_STATUSES = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  COMPLETE: 'Complete',
  SUSPENDED: 'Suspended',
};
exports.TRAINING_REPORT_STATUSES = TRAINING_REPORT_STATUSES;

const NAVIGATOR_PAGE_STATUSES = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  COMPLETE: 'Complete',
};
exports.NAVIGATOR_PAGE_STATUSES = NAVIGATOR_PAGE_STATUSES;

const TRAINING_REPORT_STATUSES_URL_PARAMS = {
  'not-started': TRAINING_REPORT_STATUSES.NOT_STARTED,
  'in-progress': TRAINING_REPORT_STATUSES.IN_PROGRESS,
  suspended: TRAINING_REPORT_STATUSES.SUSPENDED,
  complete: TRAINING_REPORT_STATUSES.COMPLETE,
};

exports.TRAINING_REPORT_STATUSES_URL_PARAMS = TRAINING_REPORT_STATUSES_URL_PARAMS;

const EVENT_REPORT_STATUSES = {
  IN_PROGRESS: 'In progress',
  COMPLETE: 'Complete',
};

exports.EVENT_REPORT_STATUSES = EVENT_REPORT_STATUSES;

const TARGET_POPULATIONS = [
  'Infants and Toddlers (ages birth to 3)',
  'Preschool Children (ages 3-5)',
  'Expectant families',
  'Affected by Child Welfare Involvement',
  'Affected by Disaster',
  'Affected by Substance Use',
  'Children Experiencing Homelessness',
  'Children in Migrant and Seasonal Families',
  'Children with Disabilities',
  'Children with Special Health Care Needs',
  'Dual-Language Learners',
  'Program Staff',
];
exports.TARGET_POPULATIONS = TARGET_POPULATIONS;

const EVENT_TARGET_POPULATIONS = [
  'Children/Families affected by traumatic events',
  'Parents/Families impacted by health disparities',
];

exports.EVENT_TARGET_POPULATIONS = EVENT_TARGET_POPULATIONS;

const USER_ROLES = [
  'Central Office',
  'Other Federal Staff',
  'National Center',
  'Regional Program Manager',
  'COR',
  'Supervisory Program Specialist',
  'Program Specialist',
  'Grants Specialist',
  'Customer Service Contract',
  'TTAC',
  'Admin. Assistant',
  'Early Childhood Manager',
  'Early Childhood Specialist',
  'Family Engagement Specialist',
  'Grantee Specialist Manager',
  'Grantee Specialist',
  'Health Specialist',
  'System Specialist',
  'Interim Management Team',
  'Integrated Service Team',
  'Grants Management Specialist',
];
exports.USER_ROLES = USER_ROLES;

const CLOSE_SUSPEND_REASONS = [
  'Duplicate goal',
  'Key staff turnover / vacancies',
  'Recipient is not responding',
  'Recipient request',
  'Regional Office request',
  'TTA complete',
];

exports.CLOSE_SUSPEND_REASONS = CLOSE_SUSPEND_REASONS;

const GOAL_CLOSE_REASONS = ['Recipient request', 'Regional Office request', 'TTA complete'];
exports.GOAL_CLOSE_REASONS = GOAL_CLOSE_REASONS;

const GOAL_SUSPEND_REASONS = [
  'Key staff turnover / vacancies',
  'Recipient request',
  'Recipient is not responding',
  'Regional Office request',
];
exports.GOAL_SUSPEND_REASONS = GOAL_SUSPEND_REASONS;

const GOAL_SOURCES = [
  'Federal monitoring issues, including CLASS and RANs',
  'RTTAPA development',
  'Recipient request',
  'Regional office priority',
  'Training event',
];

exports.GOAL_SOURCES = GOAL_SOURCES;

const ACTIVITY_REASONS = [
  'Federal monitoring issues, including CLASS and RANs',
  'Group event follow-up',
  'Recipient requested',
  'Regional Office requested',
];

exports.ACTIVITY_REASONS = ACTIVITY_REASONS;

const APPROVER_STATUSES = {
  APPROVED: 'approved',
  NEEDS_ACTION: 'needs_action',
};
exports.APPROVER_STATUSES = APPROVER_STATUSES;

const SCOPE_IDS = {
  SITE_ACCESS: 1,
  ADMIN: 2,
  READ_WRITE_ACTIVITY_REPORTS: 3,
  READ_REPORTS: 4,
  READ_ACTIVITY_REPORTS: 4,
  APPROVE_ACTIVITY_REPORTS: 5,
  UNLOCK_APPROVED_REPORTS: 6,
  READ_WRITE_TRAINING_REPORTS: 7,
  POC_TRAINING_REPORTS: 9,
};
exports.SCOPE_IDS = SCOPE_IDS;

const DECIMAL_BASE = 10;
exports.DECIMAL_BASE = DECIMAL_BASE;

const ALERT_STATUSES = {
  UNPUBLISHED: 'Unpublished',
  PUBLISHED: 'Published',
};
exports.ALERT_STATUSES = ALERT_STATUSES;

const ALERT_VARIANTS = {
  INFO: 'info',
  EMERGENCY: 'emergency',
};
exports.ALERT_VARIANTS = ALERT_VARIANTS;

const ALERT_SIZES = {
  STANDARD: 'standard',
  SLIM: 'slim',
  LARGE: 'large',
};
exports.ALERT_SIZES = ALERT_SIZES;

const COMMUNICATION_GOALS = [
  'Child Safety',
  'CLASS Monitoring',
  'CQI and Data',
  'Development and Learning',
  'Disaster Recovery',
  'ERSEA',
  'Family Engagement',
  'Family Support',
  'FEI',
  'Fiscal Management',
  'Governance',
  'Mental Health',
  'Monitoring',
  'New Leaders',
  'Physical Health',
  'Professional Development',
  'Program Structure',
  'RAN investigation',
  'Teaching Practices',
  'Workforce Development',
];

exports.COMMUNICATION_GOALS = COMMUNICATION_GOALS;

const COMMUNICATION_METHODS = ['Email', 'Phone', 'In person', 'Virtual'];

exports.COMMUNICATION_METHODS = COMMUNICATION_METHODS;

const COMMUNICATION_PURPOSES = [
  'General Check-In',
  'New TTA request',
  'Program Specialist or Regional Office meeting',
  "Program Specialist's Monthly contact",
  "Program Specialist's site visit",
  'Recipient question/feedback',
  'RTTAPA updates',
  'RTTAPA Initial Plan / New Recipient',
  'TTA planning or scheduling',
];

exports.COMMUNICATION_PURPOSES = COMMUNICATION_PURPOSES;

const COMMUNICATION_RESULTS = [
  'New TTA accepted',
  'New TTA declined',
  'RTTAPA declined',
  'Next Steps identified',
];

exports.COMMUNICATION_RESULTS = COMMUNICATION_RESULTS;

const GOAL_STATUS = {
  DRAFT: 'Draft',
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  SUSPENDED: 'Suspended',
  CLOSED: 'Closed',
};

exports.GOAL_STATUS = GOAL_STATUS;

const SUPPORT_TYPES = ['Introducing', 'Planning', 'Implementing', 'Maintaining'];

exports.SUPPORT_TYPES = SUPPORT_TYPES;

const EVENT_AUDIENCE = ['Recipients', 'Regional office/TTA'];

exports.EVENT_AUDIENCE = EVENT_AUDIENCE;

const GROUP_SHARED_WITH = {
  EVERYONE: 'Everyone',
  INDIVIDUALS: 'Individuals',
};

exports.GROUP_SHARED_WITH = GROUP_SHARED_WITH;

/**
 * A list of reasons that a CLOSED goal can be reopened.
 */
const REOPEN_CLOSED_REASONS = {
  ACCIDENTALLY_CLOSED: 'Accidentally closed',
  RECIPIENT_REQUEST: 'Recipient request to restart the work',
  PS_REQUEST: 'PS request to restart the work',
  NEW_RECIPIENT_STAFF_REQUEST: 'New recipient staff request similar work',
};

/**
 * A list of reasons that a SUSPENDED goal can be reopened.
 */
const REOPEN_SUSPENDED_REASONS = {};

/**
 * REOPEN_REASONS is a map of FROM status to an array of
 * possible TO statuses.
 */
const REOPEN_REASONS = {
  [GOAL_STATUS.CLOSED]: REOPEN_CLOSED_REASONS,
  [GOAL_STATUS.SUSPENDED]: REOPEN_SUSPENDED_REASONS,

  INFERRED: {
    OBJECTIVE_REOPEN: 'Objective Reopen',
    IMPORTED_FROM_SMARTSHEET: 'Imported from Smartsheet',
  },
};

exports.REOPEN_REASONS = REOPEN_REASONS;

const DISALLOWED_URLS = [
  {
    url: 'https://eclkc.ohs.acf.hhs.gov/professional-development/individualized-professional-development-ipd-portfolio/course-catalog',
    error:
      'This link is no longer accepted in this field. Enter iPD courses used during your TTA session in the other field in this section.',
  },
  {
    url: 'https://eclkc.ohs.acf.hhs.gov/professional-development/individualized-professional-development-ipd-portfolio/individualized-professional-development-ipd-portfolio',
    error:
      'This link is no longer accepted in this field. Enter iPD courses used during your TTA session in the other field in this section.',
  },
  {
    url: 'https://eclkc.ohs.acf.hhs.gov/cas/login',
    error:
      'This link is no longer accepted in this field. Enter iPD courses used during your TTA session in the other field in this section.',
  },
  {
    url: 'https://www.eclkc.ohs.acf.hhs.gov/professional-development/individualized-professional-development-ipd-portfolio/course-catalog',
    error:
      'This link is no longer accepted in this field. Enter iPD courses used during your TTA session in the other field in this section.',
  },
  {
    url: 'https://www.eclkc.ohs.acf.hhs.gov/professional-development/individualized-professional-development-ipd-portfolio/individualized-professional-development-ipd-portfolio',
    error:
      'This link is no longer accepted in this field. Enter iPD courses used during your TTA session in the other field in this section.',
  },
  {
    url: 'https://www.eclkc.ohs.acf.hhs.gov/cas/login',
    error:
      'This link is no longer accepted in this field. Enter iPD courses used during your TTA session in the other field in this section.',
  },
  {
    url: 'https://headstart.gov/professional-development/individualized-professional-development-ipd-portfolio/course-catalog',
    error:
      'This link is no longer accepted in this field. Enter iPD courses used during your TTA session in the other field in this section.',
  },
  {
    url: 'https://headstart.gov/professional-development/individualized-professional-development-ipd-portfolio/individualized-professional-development-ipd-portfolio',
    error:
      'This link is no longer accepted in this field. Enter iPD courses used during your TTA session in the other field in this section.',
  },
  {
    url: 'https://headstart.gov/cas/login',
    error:
      'This link is no longer accepted in this field. Enter iPD courses used during your TTA session in the other field in this section.',
  },
  {
    url: 'https://www.headstart.gov/professional-development/individualized-professional-development-ipd-portfolio/course-catalog',
    error:
      'This link is no longer accepted in this field. Enter iPD courses used during your TTA session in the other field in this section.',
  },
  {
    url: 'https://www.headstart.gov/professional-development/individualized-professional-development-ipd-portfolio/individualized-professional-development-ipd-portfolio',
    error:
      'This link is no longer accepted in this field. Enter iPD courses used during your TTA session in the other field in this section.',
  },
  {
    url: 'https://www.headstart.gov/cas/login',
    error:
      'This link is no longer accepted in this field. Enter iPD courses used during your TTA session in the other field in this section.',
  },
];

exports.DISALLOWED_URLS = DISALLOWED_URLS;

const VALID_URL_REGEX =
  /(?<url>(?<scheme>http(?:s)?):\/\/(?:(?<user>[a-zA-Z0-9._]+)(?:[:](?<password>[a-zA-Z0-9%._+~#=]+))?[@])?(?:(?:www\.)?(?<host>[-a-zA-Z0-9%._+~#=]{1,}\.[a-z]{2,6})|(?<ip>(?:[0-9]{1,3}\.){3}[0-9]{1,3}))(?:[:](?<port>[0-9]+))?(?:[/](?<path>[-a-zA-Z0-9'@:%_+.,~#&/=()]*[-a-zA-Z0-9@:%_+.~#&/=()])?)?(?:[?](?<query>[-a-zA-Z0-9@:%_+.~#&/=()]*))*)/gi;
exports.VALID_URL_REGEX = VALID_URL_REGEX;

const TRACE_IDS = {
  TRAINING: 'training',
  TECHNICAL_ASSISTANCE: 'technical-assistance',
  BOTH: 'both',
  ACTIVE_DEFICIENCIES_WITH_TTA_SUPPORT: 'active-deficiencies-with-tta-support',
  ALL_ACTIVE_DEFICIENCIES: 'all-active-deficiencies',
  ACTIVE_AREAS_OF_NONCOMPLIANCE_WITH_TTA_SUPPORT: 'active-areas-of-noncompliance-with-tta-support',
  ALL_ACTIVE_AREAS_OF_NONCOMPLIANCE: 'all-active-areas-of-noncompliance',
};

exports.TRACE_IDS = TRACE_IDS;

const COLLAB_REPORT_PARTICIPANTS = [
  'Child Care and Development Fund',
  'Child care licensing',
  'Child Care Training and Technical Assistance Network',
  'DOE/State PreK',
  'Head Start Collaboration Office',
  'Head Start Recipients',
  'Health department/WIC',
  'Office of Child Care',
  'Quality Rating and Improvement System',
  'State and territory adminstrators',
  'Regional HSA',
  'Regional Office staff',
  'State HSA',
  'State environmental health and safety systems',
  'State family engagement systems',
  'State health and wellness systems',
  'State homelessness agency/McKinney Vento liason',
  'State Professional development system',
  'TTA staff',
  'Other',
];

exports.COLLAB_REPORT_PARTICIPANTS = COLLAB_REPORT_PARTICIPANTS;

// List of states, by region
// see: https://www.acf.hhs.gov/oro/regional-offices
const ALL_STATES = [
  // Region 1 States
  [
    { label: 'Massachusetts (MA)', value: 'MA' },
    { label: 'Maine (ME)', value: 'ME' },
    { label: 'Connecticut (CT)', value: 'CT' },
    { label: 'Rhode Island (RI)', value: 'RI' },
    { label: 'Vermont (VT)', value: 'VT' },
    { label: 'New Hampshire (NH)', value: 'NH' },
  ],
  // Region 2 States
  [
    { label: 'New York (NY)', value: 'NY' },
    { label: 'New Jersey (NJ)', value: 'NJ' },
    { label: 'Puerto Rico (PR)', value: 'PR' },
  ],
  // Region 3 States
  [
    { label: 'Pennsylvania (PA)', value: 'PA' },
    { label: 'West Virginia (WV)', value: 'WV' },
    { label: 'Maryland (MD)', value: 'MD' },
    { label: 'Delaware (DE)', value: 'DE' },
    { label: 'Virginia (VA)', value: 'VA' },
    { label: 'District of Columbia (DC)', value: 'DC' },
  ],
  // Region 4 States
  [
    { label: 'Kentucky (KY)', value: 'KY' },
    { label: 'Tennessee (TN)', value: 'TN' },
    { label: 'North Carolina (NC)', value: 'NC' },
    { label: 'Alabama (AL)', value: 'AL' },
    { label: 'Mississippi (MS)', value: 'MS' },
    { label: 'Georgia (GA)', value: 'GA' },
    { label: 'South Carolina (SC)', value: 'SC' },
    { label: 'Florida (FL)', value: 'FL' },
  ],
  // Region 5 States
  [
    { label: 'Minnesota (MN)', value: 'MN' },
    { label: 'Wisconsin (WI)', value: 'WI' },
    { label: 'Illinois (IL)', value: 'IL' },
    { label: 'Indiana (IN)', value: 'IN' },
    { label: 'Michigan (MI)', value: 'MI' },
    { label: 'Ohio (OH)', value: 'OH' },
  ],
  // Region 6 States
  [
    { label: 'New Mexico (NM)', value: 'NM' },
    { label: 'Oklahoma (OK)', value: 'OK' },
    { label: 'Arkansas (AR)', value: 'AR' },
    { label: 'Texas (TX)', value: 'TX' },
    { label: 'Louisiana (LA)', value: 'LA' },
  ],
  // Region 7 States
  [
    { label: 'Nebraska (NE)', value: 'NE' },
    { label: 'Iowa (IA)', value: 'IA' },
    { label: 'Kansas (KS)', value: 'KS' },
    { label: 'Missouri (MO)', value: 'MO' },
  ],
  // Region 8 States
  [
    { label: 'Montana (MT)', value: 'MT' },
    { label: 'North Dakota (ND)', value: 'ND' },
    { label: 'South Dakota (SD)', value: 'SD' },
    { label: 'Wyoming (WY)', value: 'WY' },
    { label: 'Utah (UT)', value: 'UT' },
    { label: 'Colorado (CO)', value: 'CO' },
  ],
  // Region 9 States
  [
    { label: 'Nevada (NV)', value: 'NV' },
    { label: 'California (CA)', value: 'CA' },
    { label: 'Arizona (AZ)', value: 'AZ' },
    { label: 'Hawaii (HI)', value: 'HI' },
    { label: 'Guam (GU)', value: 'GU' },
    { label: 'American Samoa (AS)', value: 'AS' },
    { label: 'Virgin Islands (VI)', value: 'VI' },
    { label: 'Northern Mariana Islands (MP)', value: 'MP' },
    { label: 'Federated States of Micronesia (FM)', value: 'FM' },
    { label: 'Marshall Islands (MH)', value: 'MH' },
    { label: 'Republic of Palau (PW)', value: 'PW' },
  ],
  // 'Region 10 States
  [
    { label: 'Washington (WA)', value: 'WA' },
    { label: 'Oregon (OR)', value: 'OR' },
    { label: 'Idaho (ID)', value: 'ID' },
    { label: 'Alaska (AK)', value: 'AK' },
  ],
];

exports.ALL_STATES = ALL_STATES;

const ALL_STATES_FLATTENED = ALL_STATES.flat();
exports.ALL_STATES_FLATTENED = ALL_STATES_FLATTENED;

// ─── Notification constants ──────────────────────────────────────────────────
// Canonical runtime source for notification-related literals. The matching
// TypeScript unions live in packages/types/src/notifications.ts and are
// derived from these objects via `typeof`, so each list is maintained in
// exactly one place. See packages/common/src/constants.d.ts for the
// literal-type overlay.

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
  // Recipient notified when their AR is approved (existing)
  ACTIVITY_REPORT_RECIPIENT_REPORT_APPROVED: 'recipientReportApproved',
  // AR-4/5: Creator or collaborator re-submits a report for approval
  ACTIVITY_REPORT_RESUBMITTED: 'activityReportResubmitted',

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

  // ── Communication Log ─────────────────────────────────────────────────────────
  // CL-1: Creator adds TTA staff to a comm log
  COMMUNICATION_LOG_TTA_STAFF_ADDED: 'communicationLogTtaStaffAdded',
  // CL-2: Comm log entered for a recipient in a program specialist's group
  COMMUNICATION_LOG_RECIPIENT_IN_GROUP: 'communicationLogRecipientInGroup',

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
exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;

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
exports.USER_SETTINGS = USER_SETTINGS;

// Canonical list of in-app notification setting keys.
// Mirrors `inApp*` rows seeded by
// src/migrations/20260625133410-add-new-user-settings-for-in-app-notifications.js.
// Adding a new in-app notification setting requires both a migration and an
// entry here.
const IN_APP_NOTIFICATION_SETTING_KEYS = [
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
exports.IN_APP_NOTIFICATION_SETTING_KEYS = IN_APP_NOTIFICATION_SETTING_KEYS;
