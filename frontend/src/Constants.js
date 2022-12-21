import moment from 'moment';
import { SCOPE_IDS } from '@ttahub/common';

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

export const managerReportStatuses = [
  'needs_action',
  'approved',
];

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
