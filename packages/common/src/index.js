Object.defineProperty(exports, '__esModule', { value: true });

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

const OTHER_ENTITY_PARTICIPANTS = [
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
exports.TOPICS = TOPICS;

const REASONS = [
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
exports.REASONS = REASONS;

const REPORT_STATUSES = {
  DRAFT: 'draft',
  DELETED: 'deleted',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  NEEDS_ACTION: 'needs_action',
};
exports.REPORT_STATUSES = REPORT_STATUSES;

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
];
exports.TARGET_POPULATIONS = TARGET_POPULATIONS;

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
exports.USER_ROLES = USER_ROLES;

const CLOSE_SUSPEND_REASONS = [
  'Duplicate goal',
  'Recipient request',
  'TTA complete',
  'Key staff turnover / vacancies',
  'Recipient is not responding',
  'Regional Office request',
];
exports.CLOSE_SUSPEND_REASONS = CLOSE_SUSPEND_REASONS;

const GOAL_CLOSE_REASONS = [
  'Duplicate goal',
  'Recipient request',
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

const APPROVER_STATUSES = {
  APPROVED: 'approved',
  NEEDS_ACTION: 'needs_action',
};
exports.APPROVER_STATUSES = APPROVER_STATUSES;

const SCOPE_IDS = {
  SITE_ACCESS: 1,
  ADMIN: 2,
  READ_WRITE_ACTIVITY_REPORTS: 3,
  READ_ACTIVITY_REPORTS: 4,
  APPROVE_ACTIVITY_REPORTS: 5,
  UNLOCK_APPROVED_REPORTS: 6,
};
exports.SCOPE_IDS = SCOPE_IDS;

const DECIMAL_BASE = 10;
exports.DECIMAL_BASE = DECIMAL_BASE;
