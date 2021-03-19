export const SCOPE_IDS = {
  SITE_ACCESS: 1,
  ADMIN: 2,
  READ_WRITE_ACTIVITY_REPORTS: 3,
  READ_ACTIVITY_REPORTS: 4,
  APPROVE_ACTIVITY_REPORTS: 5,
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
};

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
  SUBMITTED: 'submitted',
  NEEDS_ACTION: 'needs_action',
  APPROVED: 'approved',
};

export const REPORTS_PER_PAGE = 10;
export const ALERTS_PER_PAGE = 10;
export const GOVERNMENT_HOSTNAME_EXTENSION = '.ohs.acf.hhs.gov';
