"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.ALERT_SIZES = exports.ALERT_VARIANTS = exports.ALERT_STATUSES = exports.DECIMAL_BASE = exports.SCOPE_IDS = exports.APPROVER_STATUSES = exports.GOAL_SUSPEND_REASONS = exports.GOAL_CLOSE_REASONS = exports.CLOSE_SUSPEND_REASONS = exports.USER_ROLES = exports.TARGET_POPULATIONS = exports.REPORT_STATUSES = exports.REASONS = exports.TOPICS = exports.ALL_PARTICIPANTS = exports.OTHER_ENTITY_PARTICIPANTS = exports.RECIPIENT_PARTICIPANTS = void 0;
exports.RECIPIENT_PARTICIPANTS = [
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
exports.OTHER_ENTITY_PARTICIPANTS = [
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
exports.ALL_PARTICIPANTS = __spreadArray(__spreadArray([], exports.RECIPIENT_PARTICIPANTS, true), exports.OTHER_ENTITY_PARTICIPANTS, true);
exports.TOPICS = [
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
exports.REASONS = [
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
exports.REPORT_STATUSES = {
    DRAFT: 'draft',
    DELETED: 'deleted',
    SUBMITTED: 'submitted',
    APPROVED: 'approved',
    NEEDS_ACTION: 'needs_action'
};
exports.TARGET_POPULATIONS = [
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
exports.USER_ROLES = [
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
exports.CLOSE_SUSPEND_REASONS = [
    'Duplicate goal',
    'Recipient request',
    'TTA complete',
    'Key staff turnover / vacancies',
    'Recipient is not responding',
    'Regional Office request',
];
exports.GOAL_CLOSE_REASONS = [
    'Duplicate goal',
    'Recipient request',
    'TTA complete',
];
exports.GOAL_SUSPEND_REASONS = [
    'Key staff turnover / vacancies',
    'Recipient request',
    'Recipient is not responding',
    'Regional Office request',
];
exports.APPROVER_STATUSES = {
    APPROVED: 'approved',
    NEEDS_ACTION: 'needs_action'
};
exports.SCOPE_IDS = {
    SITE_ACCESS: 1,
    ADMIN: 2,
    READ_WRITE_ACTIVITY_REPORTS: 3,
    READ_ACTIVITY_REPORTS: 4,
    APPROVE_ACTIVITY_REPORTS: 5,
    UNLOCK_APPROVED_REPORTS: 6
};
exports.DECIMAL_BASE = 10;
exports.ALERT_STATUSES = {
    UNPUBLISHED: 'Unpublished',
    PUBLISHED: 'Published'
};
exports.ALERT_VARIANTS = {
    INFO: 'info',
    EMERGENCY: 'emergency'
};
exports.ALERT_SIZES = {
    STANDARD: 'standard',
    SLIM: 'slim',
    LARGE: 'large'
};
