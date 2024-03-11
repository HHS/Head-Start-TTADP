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

const LANGUAGES = [
  'English',
  'Spanish',
];
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

const ALL_PARTICIPANTS = [
  ...RECIPIENT_PARTICIPANTS,
  ...OTHER_ENTITY_PARTICIPANTS,
];
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
  'Environmental Health and Safety / EPRR',
  'Equity',
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
  'COVID-19 response',
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
}

exports.EVENT_REPORT_STATUSES = EVENT_REPORT_STATUSES;

const TARGET_POPULATIONS = [
  'Infants and Toddlers (ages birth to 3)',
  'Preschool Children (ages 3-5)',
  'Pregnant Women / Pregnant Persons',
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
  'Children/Families affected by systemic discrimination/bias/exclusion',
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

const GOAL_CLOSE_REASONS = [
  'Duplicate goal',
  'Recipient request',
  'Regional Office request',
  'TTA complete',
];
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
    PUBLISHED: 'Published'
};
exports.ALERT_STATUSES = ALERT_STATUSES;

const ALERT_VARIANTS = {
    INFO: 'info',
    EMERGENCY: 'emergency'
};
exports.ALERT_VARIANTS = ALERT_VARIANTS;

const ALERT_SIZES = {
    STANDARD: 'standard',
    SLIM: 'slim',
    LARGE: 'large'
};
exports.ALERT_SIZES = ALERT_SIZES;

const COMMUNICATION_METHODS = [
  'Email',
  'Phone',
  'In person',
  'Virtual',
];

exports.COMMUNICATION_METHODS = COMMUNICATION_METHODS;

const COMMUNICATION_PURPOSES = [
  'CLASS',
  'FEI',
  'Monitoring',
  'New TTA request',
  'Program Specialist or Regional Office meeting',
  'Program Specialist\'s Monthly contact',
  'Program Specialist\'s site visit',
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

const SUPPORT_TYPES = [ 
  'Introducing',
  'Planning',
  'Implementing',
  'Maintaining',
];

exports.SUPPORT_TYPES = SUPPORT_TYPES;

const EVENT_AUDIENCE = [
  'Recipients',
  'Regional office/TTA',
];

exports.EVENT_AUDIENCE = EVENT_AUDIENCE;

const GROUP_SHARED_WITH = {
  EVERYONE: 'Everyone',
  INDIVIDUALS: 'Individuals',
};

exports.GROUP_SHARED_WITH = GROUP_SHARED_WITH;
