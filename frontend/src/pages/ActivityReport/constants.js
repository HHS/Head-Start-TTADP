export const reasonsToMonitor = [
  'Monitoring | Deficiency',
  'Monitoring | Noncompliance',
  'Monitoring | Area of Concern',
];

// Note that if this topic list is changed, it needs also to be changed in
// - src/constants.js
export const reasons = [
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
  ...reasonsToMonitor,
];

/*
  Please keep in sync with:
  frontend > src > constants.js
  src > constants.js
*/
export const recipientParticipants = [
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

export const otherEntityParticipants = [
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

// Note that if this topic list is changed, it needs also to be changed in
// - src/constants.js
export const topics = [
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
