import moment from 'moment';
import { pickBy } from 'lodash';
import { SCOPE_IDS } from '@ttahub/common';
import { APPROVER_STATUSES } from '@ttahub/common/src/constants';

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

export const EMPTY_TEXT_INPUT = {
  contains: '',
  'does not contain': '',
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
    name: 'READ_REPORTS',
    description: 'Can view reports in the region',
    readOnly: true,
  },
  [SCOPE_IDS.APPROVE_ACTIVITY_REPORTS]: {
    name: 'APPROVE_ACTIVITY_REPORTS',
    description: 'Can approve activity reports in the region',
  },
  [SCOPE_IDS.READ_WRITE_TRAINING_REPORTS]: {
    name: 'READ_WRITE_TRAINING_REPORTS',
    description: 'Can view and create/edit training reports in the region',
  },
  [SCOPE_IDS.POC_TRAINING_REPORTS]: {
    name: 'POC_TRAINING_REPORTS',
    description: 'Can serve as a regional point of contact in the region (A regional POC can create sessions, view and edit reports)',
  },
};

export const READ_WRITE_SCOPES = Object.keys(pickBy(REGIONAL_SCOPES, (scope) => !scope.readOnly));
export const READ_ONLY_SCOPES = Object.keys(pickBy(REGIONAL_SCOPES, (scope) => scope.readOnly));

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

export const CENTRAL_OFFICE = 14;
export const ALL_REGIONS = 15;

export const managerReportStatuses = [
  APPROVER_STATUSES.NEEDS_ACTION,
  APPROVER_STATUSES.APPROVED,
];

export const MODEL_TYPES = {
  ACTIVITY_REPORT: 'activityReport',
  RECIPIENT: 'recipient',
};

export const REPORTS_PER_PAGE = 10;
export const ALERTS_PER_PAGE = 10;
export const RECIPIENTS_PER_PAGE = 12;
export const ECLKC_GOVERNMENT_HOSTNAME_EXTENSION = '.ohs.acf.hhs.gov';
export const HEAD_START_GOVERNMENT_HOSTNAME_EXTENSION = 'headstart.gov';
export const ESCAPE_KEY_CODE = 27;
export const GOALS_PER_PAGE = 10;
export const TOPICS_PER_PAGE = 10;
export const COURSES_PER_PAGE = 10;
export const RECIPIENTS_WITH_NO_TTA_PER_PAGE = 10;
export const RECIPIENTS_WITH_OHS_STANDARD_FEI_GOAL_PER_PAGE = 10;
export const RECIPIENTS_WITH_CLASS_SCORES_AND_GOALS_GOAL_PER_PAGE = 10;

// In Internet Explorer (tested on release 9 and 11) and Firefox 36 and earlier
// the Esc key returns "Esc" instead of "Escape".
export const ESCAPE_KEY_CODES = ['Escape', 'Esc'];

export const DATE_FMT = 'YYYY/MM/DD';
export const DATE_DISPLAY_FORMAT = 'MM/DD/YYYY';
export const DATEPICKER_VALUE_FORMAT = 'YYYY-MM-DD';
export const EARLIEST_INC_FILTER_DATE = moment('2020-08-31');

const LOCAL_STORAGE_CACHE_NUMBER = '0.5';
export const LOCAL_STORAGE_AR_DATA_KEY = (id) => `ar-form-data-${id}-${LOCAL_STORAGE_CACHE_NUMBER}`;
export const LOCAL_STORAGE_CR_DATA_KEY = (id) => `cr-form-data-${id}-${LOCAL_STORAGE_CACHE_NUMBER}`;
export const LOCAL_STORAGE_AR_ADDITIONAL_DATA_KEY = (id) => `ar-additional-data-${id}-${LOCAL_STORAGE_CACHE_NUMBER}`;
export const LOCAL_STORAGE_CR_ADDITIONAL_DATA_KEY = (id) => `cr-additional-data-${id}-${LOCAL_STORAGE_CACHE_NUMBER}`;
export const LOCAL_STORAGE_AR_EDITABLE_KEY = (id) => `ar-can-edit-${id}-${LOCAL_STORAGE_CACHE_NUMBER}`;
export const LOCAL_STORAGE_CR_EDITABLE_KEY = (id) => `cr-can-edit-${id}-${LOCAL_STORAGE_CACHE_NUMBER}`;
export const SESSION_STORAGE_IMPERSONATION_KEY = `auth-impersonation-id-${LOCAL_STORAGE_CACHE_NUMBER}`;
export const REGIONAL_RESOURCE_DASHBOARD_FILTER_KEY = 'regional-resources-dashboard-filters';

export const SUPPORT_LINK = 'https://app.smartsheetgov.com/b/form/f0b4725683f04f349a939bd2e3f5425a';
export const mustBeQuarterHalfOrWhole = (value) => {
  if (value % 0.25 !== 0) {
    return 'Duration must be rounded to the nearest quarter hour';
  }
  return true;
};

export const parseCheckboxEvent = (event) => {
  const { target: { checked = null, value = null } = {} } = event;
  return {
    checked,
    value,
  };
};

export const arrayExistsAndHasLength = (array) => array && Array.isArray(array) && array.length > 0;

export const NOOP = () => {};
export const EMPTY_ARRAY = [];

export const ROUTES = {
  SOMETHING_WENT_WRONG: '/something-went-wrong',
};

export const STATES = {
  MA: 'Massachusetts',
  ME: 'Maine',
  CT: 'Connecticut',
  RI: 'Rhode Island',
  VT: 'Vermont',
  NH: 'New Hampshire',
  NY: 'New York',
  NJ: 'New Jersey',
  PR: 'Puerto Rico',
  PA: 'Pennsylvania',
  WV: 'West Virginia',
  MD: 'Maryland',
  DE: 'Delaware',
  VA: 'Virginia',
  DC: 'District of Columbia',
  KY: 'Kentucky',
  TN: 'Tennessee',
  NC: 'North Carolina',
  AL: 'Alabama',
  MS: 'Mississippi',
  GA: 'Georgia',
  SC: 'South Carolina',
  FL: 'Florida',
  MN: 'Minnesota',
  WI: 'Wisconsin',
  IL: 'Illinois',
  IN: 'Indiana',
  MI: 'Michigan',
  OH: 'Ohio',
  NM: 'New Mexico',
  OK: 'Oklahoma',
  AR: 'Arkansas',
  TX: 'Texas',
  LA: 'Louisiana',
  NE: 'Nebraska',
  IA: 'Iowa',
  KS: 'Kansas',
  MO: 'Missouri',
  MT: 'Montana',
  ND: 'North Dakota',
  SD: 'South Dakota',
  WY: 'Wyoming',
  UT: 'Utah',
  CO: 'Colorado',
  NV: 'Nevada',
  CA: 'California',
  AZ: 'Arizona',
  HI: 'Hawaii',
  GU: 'Guam',
  AS: 'American Samoa',
  VI: 'Virgin Islands',
  MP: 'Northern Mariana Islands',
  FM: 'Federated States of Micronesia',
  MH: 'Marshall Islands',
  PW: 'Republic of Palau',
  WA: 'Washington',
  OR: 'Oregon',
  ID: 'Idaho',
  AK: 'Alaska',
};

export const COLLAB_REPORT_CONDUCT_METHODS = [
  { label: 'Email', value: 'email' },
  { label: 'Phone', value: 'phone' },
  { label: 'In person', value: 'in_person' },
  { label: 'Virtual', value: 'virtual' },
];

export const COLLAB_REPORT_REASONS = {
  participate_work_groups: 'Participate in national, regional, state, and local work groups and meetings',
  support_coordination: 'Support partnerships, coordination, and collaboration with state/regional partners',
  agg_regional_data: 'Aggregate, analyze, and/or present regional data',
  develop_presentations: 'Develop and provide presentations, training, and resources to RO and/or state/regional partners',
};

export const COLLAB_REPORT_DATA = {
  census_data: 'Census data',
  child_abuse_and_neglect: 'Child abuse and neglect',
  child_safety: 'Child safety',
  child_family_health: 'Child/family health',
  disabilities: 'Disabilities',
  foster_care: 'Foster care',
  homelessness: 'Homelessness',
  kids_count: 'Kids Count',
  licensing_data: 'Licensing data',
  ohs_monitoring: 'OHS Monitoring',
  pir: 'PIR',
  tta_hub: 'TTA Hub',
  other: 'Other',
};

export const OBJECTIVE_STATUS = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  SUSPENDED: 'Suspended',
  COMPLETE: 'Complete',
};

export const TRAINING_EVENT_ORGANIZER = {
  REGIONAL_PD_WITH_NATIONAL_CENTERS: 'Regional PD Event (with National Centers)',
  REGIONAL_TTA_NO_NATIONAL_CENTERS: 'Regional TTA Hosted Event (no National Centers)',
};

export const EVENT_PARTNERSHIP = {
  REGIONAL_HSA: 'regional_hsa',
  STATE_HSA: 'state_hsa',
  NO: 'no',
};
