/**
 * FOR FRONTEND TESTING ONLY.
 *
 * There is no backend for TTA requests yet, so the "Active TTA requests" table is
 * rendered from this hard-coded list. None of this is real data. Delete this file
 * (and its import in `ActiveTtaRequestsTable.tsx`) once the API exists and the
 * table is wired up to a fetcher.
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
