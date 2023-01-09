import moment from 'moment';

export const CONTAINS = 'contains';
export const NOT_CONTAINS = 'does not contain';
export const BEFORE = 'is on or before';
export const AFTER = 'is on or after';
export const WITHIN = 'is within';
export const IS = 'is';
export const IS_NOT = 'is not';
export const WHERE_IM_THE = 'where I\'m the';
export const WHERE_IM_NOT_THE = 'where I\'m not the';

export const SELECT_CONDITIONS = [CONTAINS, NOT_CONTAINS];
export const FILTER_CONDITIONS = [IS, IS_NOT];
export const MY_REPORTS_FILTER_CONDITIONS = [WHERE_IM_THE, WHERE_IM_NOT_THE];
export const REGION_CONDITIONS = [IS];

export const QUERY_CONDITIONS = {
  [CONTAINS]: 'ctn[]',
  [NOT_CONTAINS]: 'nctn[]',
  [BEFORE]: 'bef',
  [AFTER]: 'aft',
  [WITHIN]: 'win',
  [IS]: 'in[]',
  [IS_NOT]: 'nin[]',
  [WHERE_IM_THE]: 'in[]',
  [WHERE_IM_NOT_THE]: 'nin[]',
};

export const DATE_CONDITIONS = [
  IS,
  AFTER,
  BEFORE,
  WITHIN,
];

export const DATE_FORMAT = 'MM/DD/YYYY';

export const SCOPE_IDS = {
  SITE_ACCESS: 1,
  ADMIN: 2,
  READ_WRITE_ACTIVITY_REPORTS: 3,
  READ_ACTIVITY_REPORTS: 4,
  APPROVE_ACTIVITY_REPORTS: 5,
  UNLOCK_APPROVED_REPORTS: 6,
};

export const REGIONAL_SCOPES = {
  [SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS]: {
    name: 'READ_WRITE_ACTIVITY_REPORTS',
    description: 'Can view and create/edit activity reports in the region',
  },
  [SCOPE_IDS.READ_ACTIVITY_REPORTS]: {
    name: 'READ_ACTIVITY_REPORTS',
    description: 'Can view reports activity in the region',
  },
  [SCOPE_IDS.APPROVE_ACTIVITY_REPORTS]: {
    name: 'APPROVE_ACTIVITY_REPORTS',
    description: 'Can approve activity reports in the region',
  },
};

export const GLOBAL_SCOPES = {
  [SCOPE_IDS.SITE_ACCESS]: {
    name: 'SITE_ACCESS',
    description: 'User can login and view the TTAHUB site',
  },
  [SCOPE_IDS.ADMIN]: {
    name: 'ADMIN',
    description: 'User can view the admin panel and change user permissions (including their own)',
  },
  [SCOPE_IDS.UNLOCK_APPROVED_REPORTS]: {
    name: 'UNLOCK_APPROVED_REPORTS',
    description: 'User can unlock approved reports.',
  },
};

// Note that if this reasons list is changed, it needs also to be changed in
// - src/constants.js
export const REASONS = [
  'Below Competitive Threshold (CLASS)',
  'Below Quality Threshold (CLASS)',
  'Change in Scope',
  'Child Incidents',
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

export const MY_REPORT_ROLES = [
  'Creator',
  'Collaborator',
  'Approver',
];

// Note that if this topic list is changed, it needs also to be changed in
// - src/constants.js
export const TARGET_POPULATIONS = [
  'Infants and Toddlers (ages birth to 3)',
  'Preschool (ages 3-5)',
  'Pregnant Women',
  '--------------------',
  'Affected by Child Welfare Involvement',
  'Affected by Disaster',
  'Affected by Substance Use',
  'Children Experiencing Homelessness',
  'Children with Disabilities',
  'Children with Special Health Care Needs',
  'Dual-Language Learners',
];

export const ROLES = [
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

export const OTHER_ENTITY_TYPES = [
  'CCDF / Child Care Administrator',
  'Head Start Collaboration Office',
  'QRIS System',
  'Regional Head Start Association',
  'Regional TTA / Other Specialists',
  'State CCR&R',
  'State Early Learning Standards',
  'State Education System',
  'State Head Start Association',
  'State Health System',
  'State Professional Development / Continuing Education',
];

// Note that if this topic list is changed, it needs also to be changed in
// - src/constants.js
export const TOPICS = [
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

export const REGIONS = [
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
];

export const DECIMAL_BASE = 10;

export const managerReportStatuses = [
  'needs_action',
  'approved',
];

export const REPORT_STATUSES = {
  DRAFT: 'draft',
  DELETED: 'deleted',
  SUBMITTED: 'submitted',
  NEEDS_ACTION: 'needs_action',
  APPROVED: 'approved',
};

export const MODEL_TYPES = {
  ACTIVITY_REPORT: 'activityReport',
  RECIPIENT: 'recipient',
};

export const REPORTS_PER_PAGE = 10;
export const ALERTS_PER_PAGE = 10;
export const RECIPIENTS_PER_PAGE = 12;
export const GOVERNMENT_HOSTNAME_EXTENSION = '.ohs.acf.hhs.gov';
export const ESCAPE_KEY_CODE = 27;
export const GOALS_PER_PAGE = 10;

// In Internet Explorer (tested on release 9 and 11) and Firefox 36 and earlier
// the Esc key returns "Esc" instead of "Escape".
export const ESCAPE_KEY_CODES = ['Escape', 'Esc'];

export const DATE_FMT = 'YYYY/MM/DD';
export const DATE_DISPLAY_FORMAT = 'MM/DD/YYYY';
export const DATEPICKER_VALUE_FORMAT = 'YYYY-MM-DD';
export const EARLIEST_INC_FILTER_DATE = moment('2020-08-31');

const LOCAL_STORAGE_CACHE_NUMBER = '0.2';
export const LOCAL_STORAGE_DATA_KEY = (id) => `ar-form-data-${id}-${LOCAL_STORAGE_CACHE_NUMBER}`;
export const LOCAL_STORAGE_ADDITIONAL_DATA_KEY = (id) => `ar-additional-data-${id}-${LOCAL_STORAGE_CACHE_NUMBER}`;
export const LOCAL_STORAGE_EDITABLE_KEY = (id) => `ar-can-edit-${id}-${LOCAL_STORAGE_CACHE_NUMBER}`;

export const GOAL_CLOSE_REASONS = [
  'Duplicate goal',
  'Recipient request',
  'Regional Office request',
  'TTA complete',
];

export const GOAL_SUSPEND_REASONS = [
  'Key staff turnover / vacancies',
  'Recipient request',
  'Recipient is not responding',
  'Regional Office request',
];

/*
  Please keep in sync with:
  frontend > src > pages > ActivityReport > constants.js
  src > constants.js
*/
export const RECIPIENT_PARTICIPANTS = [
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

export const OTHER_ENTITY_PARTICIPANTS = [
  'HSCO',
  'Local/State Agency(ies)',
  'OCC Regional Office',
  'OHS Regional Office',
  'Regional Head Start Association',
  'Regional TTA Team / Specialists',
  'State Early Learning System',
  'State Head Start Association',
  'Other',
];

export const ALL_PARTICIPANTS = [
  ...RECIPIENT_PARTICIPANTS,
  ...OTHER_ENTITY_PARTICIPANTS,
];
