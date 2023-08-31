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

const ALL_PARTICIPANTS = [
  ...RECIPIENT_PARTICIPANTS,
  ...OTHER_ENTITY_PARTICIPANTS,
];

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
  'Fiscal / Budget',
  'Five-Year Grant',
  'Home Visiting',
  'Human Resources',
  'Leadership / Governance',
  'Learning Environments',
  'Nutrition',
  'Ongoing Monitoring Management System',
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
  'Planning/Coordination (also TTA Plan Agreement)',
  'School Readiness Goals',
  'Monitoring | Area of Concern',
  'Monitoring | Noncompliance',
  'Monitoring | Deficiency',
];

const REPORT_STATUSES = {
  DRAFT: 'draft',
  DELETED: 'deleted',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  NEEDS_ACTION: 'needs_action',
};

const TRAINING_REPORT_STATUSES = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  COMPLETE: 'Complete',
  SUSPENDED: 'Suspended',
};

const TRAINING_REPORT_STATUSES_URL_PARAMS = {
  'not-started': TRAINING_REPORT_STATUSES.NOT_STARTED,
  'in-progress': TRAINING_REPORT_STATUSES.IN_PROGRESS,
  suspended: TRAINING_REPORT_STATUSES.SUSPENDED,
  complete: TRAINING_REPORT_STATUSES.COMPLETE,
};

const EVENT_REPORT_STATUSES = {
  IN_PROGRESS: 'In progress',
  COMPLETE: 'Complete',
}

const TARGET_POPULATIONS = [
  'Infants and Toddlers (ages birth to 3)',
  'Preschool (ages 3-5)',
  'Pregnant Women',
  'Affected by Child Welfare Involvement',
  'Affected by Disaster',
  'Affected by Substance Use',
  'Children Experiencing Homelessness',
  'Children with Disabilities',
  'Children with Special Health Care Needs',
  'Dual-Language Learners',
  'Program Staff',
];

const EVENT_TARGET_POPULATIONS = [
  'Children/Families affected by systemic discrimination/bias/exclusion',
  'Children/Families affected by traumatic events',
  'Parents/Families impacted by health disparities'
];

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
];

// TODO: This is the deduped combination of GOAL_CLOSE_REASONS and GOAL_SUSPEND_REASONS
const CLOSE_SUSPEND_REASONS = [
  'Duplicate goal',
  'Key staff turnover / vacancies',
  'Recipient is not responding',
  'Recipient request',
  'Regional Office request',
  'TTA complete',
];

const GOAL_CLOSE_REASONS = [
  'Duplicate goal',
  'Recipient request',
  'Regional Office request',
  'TTA complete',
];

const GOAL_SUSPEND_REASONS = [
  'Key staff turnover / vacancies',
  'Recipient request',
  'Recipient is not responding',
  'Regional Office request',
];

const GOAL_SOURCES = [
  'Federal monitoring issues, including CLASS and RANs',
  'RTTAPA development',
  'Recipient request',
  'Regional office priority',
  'Training event follow-up',
];

const APPROVER_STATUSES = {
  APPROVED: 'approved',
  NEEDS_ACTION: 'needs_action',
};

const SCOPE_IDS = {
  SITE_ACCESS: 1,
  ADMIN: 2,
  READ_WRITE_ACTIVITY_REPORTS: 3,
  READ_ACTIVITY_REPORTS: 4,
  APPROVE_ACTIVITY_REPORTS: 5,
  UNLOCK_APPROVED_REPORTS: 6,
  READ_WRITE_TRAINING_REPORTS: 7,
  READ_TRAINING_REPORTS: 8,
  POC_TRAINING_REPORTS: 9,
};

const DECIMAL_BASE = 10;

const ALERT_STATUSES = {
    UNPUBLISHED: 'Unpublished',
    PUBLISHED: 'Published'
};

const ALERT_VARIANTS = {
    INFO: 'info',
    EMERGENCY: 'emergency'
};

const ALERT_SIZES = {
    STANDARD: 'standard',
    SLIM: 'slim',
    LARGE: 'large'
};

module.exports = {
  RECIPIENT_PARTICIPANTS,
  OTHER_ENTITY_PARTICIPANTS,
  ALL_PARTICIPANTS,
  TOPICS,
  REASONS,
  REPORT_STATUSES,
  TRAINING_REPORT_STATUSES,
  TRAINING_REPORT_STATUSES_URL_PARAMS,
  EVENT_REPORT_STATUSES,
  TARGET_POPULATIONS,
  EVENT_TARGET_POPULATIONS,
  USER_ROLES,
  CLOSE_SUSPEND_REASONS,
  GOAL_CLOSE_REASONS,
  GOAL_SUSPEND_REASONS,
  GOAL_SOURCES,
  APPROVER_STATUSES,
  SCOPE_IDS,
  DECIMAL_BASE,
  ALERT_STATUSES,
  ALERT_VARIANTS,
  ALERT_SIZES,
};
