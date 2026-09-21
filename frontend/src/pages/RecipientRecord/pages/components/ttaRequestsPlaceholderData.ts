/**
 * FOR FRONTEND TESTING ONLY.
 *
 * There is no backend for TTA requests yet, so the "Active TTA requests" and
 * "Approved TTA requests" tables are rendered from these hard-coded lists. None of
 * this is real data. Delete this file (and its imports in the two table components)
 * once the API exists and the tables are wired up to a fetcher.
 */

export interface ActiveTtaRequest {
  id: number;
  requestId: string;
  /** MM/DD/YYYY, matching how dates are displayed elsewhere in the hub */
  createdDate: string;
  goal: string;
  reviewer: string;
  approver: string;
  assignedStaff: string;
  status: string;
}

/** Drafts are the only status that links back into the request itself. */
export const DRAFT_STATUS = 'Draft';

// FOR FRONTEND TESTING ONLY - see the note at the top of this file.
export const ACTIVE_TTA_REQUESTS_PLACEHOLDER_DATA: ActiveTtaRequest[] = [
  {
    id: 1,
    requestId: 'R14-REQ-14322',
    createdDate: '06/23/2026',
    goal: 'Monitoring',
    reviewer: 'Ross Geller, TTAC',
    approver: 'Phoebe Buffay, COR',
    assignedStaff: 'Rachel Green, ECS',
    status: DRAFT_STATUS,
  },
  {
    id: 2,
    requestId: 'R14-REQ-14234',
    createdDate: '06/23/2026',
    goal: 'Mental Health',
    reviewer: 'Monica Geller, TTAC',
    approver: 'Phoebe Buffay, COR',
    assignedStaff: 'Jim Bottan, ECS',
    status: 'COR approval pending',
  },
  {
    id: 3,
    requestId: 'R14-REQ-12259',
    createdDate: '06/22/2026',
    goal: 'ERSEA',
    reviewer: 'Ross Geller, TTAC',
    approver: 'Chandler Bing, COR',
    assignedStaff: 'Monica Geller, TTAC',
    status: 'Pending changes',
  },
  {
    id: 4,
    requestId: 'R14-REQ-12343',
    createdDate: '06/21/2026',
    goal: 'Disaster Recovery',
    reviewer: 'Monica Geller, TTAC',
    approver: 'Chandler Bing, COR',
    assignedStaff: 'Jason Oliver, ECS',
    status: 'COR approval pending',
  },
  {
    id: 5,
    requestId: 'R14-REQ-12201',
    createdDate: '06/18/2026',
    goal: 'Family Engagement',
    reviewer: 'Ross Geller, TTAC',
    approver: 'Phoebe Buffay, COR',
    assignedStaff: 'Rachel Green, ECS',
    status: DRAFT_STATUS,
  },
  {
    id: 6,
    requestId: 'R14-REQ-12198',
    createdDate: '06/17/2026',
    goal: 'Health',
    reviewer: 'Monica Geller, TTAC',
    approver: 'Chandler Bing, COR',
    assignedStaff: 'Jim Bottan, ECS',
    status: 'COR approval pending',
  },
  {
    id: 7,
    requestId: 'R14-REQ-12154',
    createdDate: '06/15/2026',
    goal: 'Fiscal',
    reviewer: 'Ross Geller, TTAC',
    approver: 'Phoebe Buffay, COR',
    assignedStaff: 'Monica Geller, TTAC',
    status: 'Pending changes',
  },
  {
    id: 8,
    requestId: 'R14-REQ-12147',
    createdDate: '06/12/2026',
    goal: 'Monitoring',
    reviewer: 'Monica Geller, TTAC',
    approver: 'Chandler Bing, COR',
    assignedStaff: 'Jason Oliver, ECS',
    status: 'COR approval pending',
  },
  {
    id: 9,
    requestId: 'R14-REQ-12102',
    createdDate: '06/10/2026',
    goal: 'Education',
    reviewer: 'Ross Geller, TTAC',
    approver: 'Phoebe Buffay, COR',
    assignedStaff: 'Rachel Green, ECS',
    status: DRAFT_STATUS,
  },
  {
    id: 10,
    requestId: 'R14-REQ-12088',
    createdDate: '06/08/2026',
    goal: 'ERSEA',
    reviewer: 'Monica Geller, TTAC',
    approver: 'Chandler Bing, COR',
    assignedStaff: 'Jim Bottan, ECS',
    status: 'COR approval pending',
  },
  {
    id: 11,
    requestId: 'R14-REQ-12034',
    createdDate: '06/04/2026',
    goal: 'Mental Health',
    reviewer: 'Ross Geller, TTAC',
    approver: 'Phoebe Buffay, COR',
    assignedStaff: 'Monica Geller, TTAC',
    status: 'Pending changes',
  },
  {
    id: 12,
    requestId: 'R14-REQ-11997',
    createdDate: '06/01/2026',
    goal: 'Family Engagement',
    reviewer: 'Monica Geller, TTAC',
    approver: 'Chandler Bing, COR',
    assignedStaff: 'Jason Oliver, ECS',
    status: DRAFT_STATUS,
  },
];

export interface ApprovedTtaRequest {
  id: number;
  requestId: string;
  /** MM/DD/YYYY, matching how dates are displayed elsewhere in the hub */
  approvedDate: string;
  creator: string;
  /** a request can be assigned to more than one person */
  assignedStaff: string[];
  goal: string;
}

// FOR FRONTEND TESTING ONLY - see the note at the top of this file.
export const APPROVED_TTA_REQUESTS_PLACEHOLDER_DATA: ApprovedTtaRequest[] = [
  {
    id: 101,
    requestId: 'R14-REQ-13221',
    approvedDate: '06/18/2026',
    creator: 'Rachel Green, ECS',
    assignedStaff: ['Amy Bloom, ECM'],
    goal: 'Monitoring',
  },
  {
    id: 102,
    requestId: 'R14-REQ-13567',
    approvedDate: '06/17/2026',
    creator: 'Jim Bottan, ECS',
    assignedStaff: ['Carly Eisenhower, GS'],
    goal: 'Mental Health',
  },
  {
    id: 103,
    requestId: 'R14-REQ-14233',
    approvedDate: '06/16/2026',
    creator: 'Phoebe Buffay, PS',
    assignedStaff: ['Adam Scott, HS', 'Ross Geller, GS'],
    goal: 'Family Support',
  },
  {
    id: 104,
    requestId: 'R14-REQ-12213',
    approvedDate: '06/16/2026',
    creator: 'Amy Connelly, CO',
    assignedStaff: ['Aaron Davis, TTAC'],
    goal: 'Disaster Recovery',
  },
  {
    id: 105,
    requestId: 'R14-REQ-12145',
    approvedDate: '06/16/2026',
    creator: 'Ross Geller, GS',
    assignedStaff: ['Julie Anderson, GS'],
    goal: 'Program Structure',
  },
  {
    id: 106,
    requestId: 'R14-REQ-12268',
    approvedDate: '06/15/2026',
    creator: 'Phoebe Buffay, PS',
    assignedStaff: ['Allison Albany, HS'],
    goal: 'Family Engagement',
  },
  {
    id: 107,
    requestId: 'R14-REQ-12291',
    approvedDate: '06/15/2026',
    creator: 'Monica Geller, TTAC',
    assignedStaff: ['Monica Geller, TTAC'],
    goal: 'ERSEA',
  },
  {
    id: 108,
    requestId: 'R14-REQ-12265',
    approvedDate: '06/15/2025',
    creator: 'Allison Albany, HS',
    assignedStaff: ['Carly Eisenhower, GS'],
    goal: 'Family Support',
  },
  {
    id: 109,
    requestId: 'R14-REQ-12341',
    approvedDate: '05/15/2025',
    creator: 'Julie Anderson, GS',
    assignedStaff: ['Allison Albany, GS'],
    goal: 'Child Safety',
  },
  {
    id: 110,
    requestId: 'R14-REQ-12187',
    approvedDate: '05/14/2025',
    creator: 'Jason Oliver, ECS',
    assignedStaff: ['Amy Bloom, ECM'],
    goal: 'Disaster Recovery',
  },
  {
    id: 111,
    requestId: 'R14-REQ-12099',
    approvedDate: '05/12/2025',
    creator: 'Rachel Green, ECS',
    assignedStaff: ['Aaron Davis, TTAC', 'Amy Bloom, ECM'],
    goal: 'Health',
  },
  {
    id: 112,
    requestId: 'R14-REQ-12044',
    approvedDate: '05/08/2025',
    creator: 'Monica Geller, TTAC',
    assignedStaff: ['Julie Anderson, GS'],
    goal: 'Education',
  },
  {
    id: 113,
    requestId: 'R14-REQ-11982',
    approvedDate: '05/05/2025',
    creator: 'Jim Bottan, ECS',
    assignedStaff: ['Carly Eisenhower, GS'],
    goal: 'Fiscal',
  },
  {
    id: 114,
    requestId: 'R14-REQ-11930',
    approvedDate: '05/01/2025',
    creator: 'Ross Geller, GS',
    assignedStaff: ['Adam Scott, HS'],
    goal: 'Monitoring',
  },
];
