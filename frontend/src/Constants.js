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
export const IS_COLLABORATOR = 'is collaborator';
export const IS_CREATOR = 'is creator';
export const IS_BOTH = 'is both';

export const EMPTY_MULTI_SELECT = {
  is: [],
  'is not': [],
};

export const SPECIALIST_NAME_CONDITIONS = [IS_COLLABORATOR, IS_CREATOR, IS_BOTH];
export const SELECT_CONDITIONS = [CONTAINS, NOT_CONTAINS];
export const FILTER_CONDITIONS = [IS, IS_NOT];
export const MY_REPORTS_FILTER_CONDITIONS = [WHERE_IM_THE, WHERE_IM_NOT_THE];
export const REGION_CONDITIONS = [IS];
export const SINGLE_OR_MULTI_RECIPIENT_CONDITIONS = [IS];
export const SINGLE_CREATOR_OR_COLLABORATOR_CONDITIONS = [IS];

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
  [IS_COLLABORATOR]: 'collaborator[]',
  [IS_CREATOR]: 'creator[]',
  [IS_BOTH]: 'both[]',
};

export const DATE_CONDITIONS = [
  IS,
  AFTER,
  BEFORE,
  WITHIN,
];

export const WITHOUT_ACTIVITY_DATE_CONDITIONS = [
  IS,
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
  [SCOPE_IDS.READ_WRITE_TRAINING_REPORTS]: {
    name: 'READ_WRITE_TRAINING_REPORTS',
    description: 'Can view and create/edit training reports in the region',
  },
  [SCOPE_IDS.READ_TRAINING_REPORTS]: {
    name: 'READ_TRAINING_REPORTS',
    description: 'Can view training reports in the region',
  },
  [SCOPE_IDS.POC_TRAINING_REPORTS]: {
    name: 'POC_TRAINING_REPORTS',
    description: 'Can serve as a regional point of contact in the region (A regional POC can create sessions, view and edit reports)',
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
export const TOPICS_PER_PAGE = 10;

// In Internet Explorer (tested on release 9 and 11) and Firefox 36 and earlier
// the Esc key returns "Esc" instead of "Escape".
export const ESCAPE_KEY_CODES = ['Escape', 'Esc'];

export const DATE_FMT = 'YYYY/MM/DD';
export const DATE_DISPLAY_FORMAT = 'MM/DD/YYYY';
export const DATEPICKER_VALUE_FORMAT = 'YYYY-MM-DD';
export const EARLIEST_INC_FILTER_DATE = moment('2020-08-31');

const LOCAL_STORAGE_CACHE_NUMBER = '0.3';
export const LOCAL_STORAGE_DATA_KEY = (id) => `ar-form-data-${id}-${LOCAL_STORAGE_CACHE_NUMBER}`;
export const LOCAL_STORAGE_ADDITIONAL_DATA_KEY = (id) => `ar-additional-data-${id}-${LOCAL_STORAGE_CACHE_NUMBER}`;
export const LOCAL_STORAGE_EDITABLE_KEY = (id) => `ar-can-edit-${id}-${LOCAL_STORAGE_CACHE_NUMBER}`;
export const SESSION_STORAGE_IMPERSONATION_KEY = `auth-impersonation-id-${LOCAL_STORAGE_CACHE_NUMBER}`;
