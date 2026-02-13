import React from 'react'

export const reasonsToMonitor = ['Monitoring | Deficiency', 'Monitoring | Noncompliance', 'Monitoring | Area of Concern', 'Monitoring Goal']

// Note that if this topic list is changed, it needs also to be changed in
// - src/constants.js
export const reasons = [
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
  'Planning/Coordination',
  'School Readiness Goals',
  ...reasonsToMonitor,
]

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
]

export const otherEntityParticipants = [
  'HSCO',
  'Local or State Agency',
  'OCC Regional Office',
  'OHS Regional Office',
  'Regional Head Start Association',
  'Regional TTA Team / Specialists',
  'State Early Learning System',
  'State Head Start Association',
  'Other',
]

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
  'Emergency Preparedness, Response, and Recovery (EPRR)',
  'Environmental Health and Safety',
  'Equity',
  'Facilities',
  'Family Support Services',
  'Fatherhood / Male Caregiving',
  'Fiscal / Budget',
  'Five-Year Grant',
  'Home Visiting',
  'Human Resources',
  'Leadership / Governance',
  'Learning Environments',
  'Nutrition',
  'Ongoing Monitoring and Continuous Improvement',
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
]

export const MODAL_CONFIG = {
  EMPTY_RECIPIENTS_WITH_GOALS: {
    title: 'You may lose data',
    body: (
      <>
        <p>If you do not select at least one grant, any goals, objectives and TTA provided content will be lost.</p>
        <p>Do you want to proceed?</p>
      </>
    ),
    confirmLabel: 'Yes, continue',
    cancelLabel: 'No, cancel',
  },
  MISSING_MONITORING_GOAL: {
    title: 'You may lose data',
    body: (
      <>
        <p>The recipient you selected does not have the monitoring goal.</p>
        <p>If you change the recipient, the monitoring goal, its objectives and TTA provided content will be lost.</p>
        <p>Do you want to proceed?</p>
      </>
    ),
    confirmLabel: 'Yes, change recipient',
    cancelLabel: 'No, cancel',
  },
  DIFFERENT_CITATIONS: {
    title: 'You may lose data',
    body: (
      <>
        <p>Monitoring goals and their citations are specific to each recipient.</p>
        <p>Changing the recipient will clear all selected citations.</p>
        <p>Do you want to proceed?</p>
      </>
    ),
    confirmLabel: 'Yes, change recipient',
    cancelLabel: 'No, cancel',
  },
}
