export const REPORT_STATUSES = {
  DRAFT: 'draft',
  DELETED: 'deleted',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  NEEDS_ACTION: 'needs_action',
};

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

export const APPROVER_STATUSES = {
  APPROVED: 'approved',
  NEEDS_ACTION: 'needs_action',
};

// copied from /frontend/src/pages/ActivityReports/constants.js
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

// copied from /frontend/src/pages/ActivityReports/constants.js
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

// copied from /frontend/src/pages/ActivityReports/constants.js
export const TARGET_POPULATIONS = [
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
];

export const USER_ROLES = [
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

export const CLOSE_SUSPEND_REASONS = [
  'Duplicate goal',
  'Recipient request',
  'TTA complete',
  'Key staff turnover / vacancies',
  'Recipient is not responding',
  'Regional Office request',
];
