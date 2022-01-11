import moment from 'moment';

export const CONTAINS = 'Contains';
export const NOT_CONTAINS = 'Does not contain';
export const BEFORE = 'Is before';
export const AFTER = 'Is after';
export const WITHIN = 'Is within';
export const IS = 'Is';
export const IS_NOT = 'Is not';

export const SELECT_CONDITIONS = [CONTAINS, NOT_CONTAINS];
export const FILTER_CONDITIONS = [IS, IS_NOT];

export const QUERY_CONDITIONS = {
  [CONTAINS]: 'ctn[]',
  [NOT_CONTAINS]: 'nctn[]',
  [BEFORE]: 'bef',
  [AFTER]: 'aft',
  [WITHIN]: 'win',
  [IS]: 'in[]',
  [IS_NOT]: 'nin[]',
};

export const DATE_CONDITIONS = [
  BEFORE,
  AFTER,
  WITHIN,
  IS,
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
  'New Grantee',
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
  'Regional Program Manager',
  'COR',
  'Supervisory Program Specialist',
  'Program Specialist',
  'Grants Specialist',
  'Central Office',
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

// Note that if this topic list is changed, it needs also to be changed in
// - src/constants.js
export const TOPICS = [
  'Behavioral / Mental Health / Trauma',
  'Child Assessment, Development, Screening',
  'CLASS: Classroom Organization',
  'CLASS: Emotional Support',
  'CLASS: Instructional Support',
  'Coaching',
  'Communication',
  'Community and Self-Assessment',
  'Culture & Language',
  'Curriculum (Instructional or Parenting)',
  'Data and Evaluation',
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
  'Teaching Practices / Teacher-Child Interactions',
  'Technology and Information Systems',
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

// In Internet Explorer (tested on release 9 and 11) and Firefox 36 and earlier
// the Esc key returns "Esc" instead of "Escape".
export const ESCAPE_KEY_CODES = ['Escape', 'Esc'];

export const DATE_FMT = 'YYYY/MM/DD';
export const DATE_DISPLAY_FORMAT = 'MM/DD/YYYY';
export const EARLIEST_INC_FILTER_DATE = moment('2020-08-31');
