/**
 * FOR FRONTEND TESTING ONLY.
 *
 * There is no backend for TTA requests yet, so the "Active TTA requests" and
 * "Approved TTA requests" tables are rendered from these hard-coded lists. None of
 * this is real data. Delete this file (and its imports in the two table components)
 * once the API exists and the tables are wired up to a fetcher.
 */

/**
 * The recipients these fake requests belong to, with the state their grant is in. The
 * recipient record tab never shows either - it is already scoped to one recipient - but
 * the all regions TTA requests page lists requests across recipients, so every row
 * carries them.
 */
export const RECIPIENTS = {
  childrenAndFamiliesFirst: { id: 4001, name: 'Children and Families First', stateCode: 'DE' },
  childrensCouncil: { id: 4002, name: "Children's Council, Inc.", stateCode: 'CA' },
  communityAssociation: {
    id: 4003,
    name: 'Community Association for Children and Families',
    stateCode: 'NY',
  },
  willowStreet: { id: 4004, name: 'Willow Street Development', stateCode: 'OH' },
  centralDistrict: { id: 4005, name: 'Central District Head Start', stateCode: 'TX' },
  volunteersOfAmerica: { id: 4006, name: 'Volunteers of America of Little Rock', stateCode: 'AR' },
  cnmiPublicSchools: { id: 4007, name: 'CNMI Public School System', stateCode: 'MP' },
} as const;

/** every fake request sits in region 14, matching the R14-REQ- prefix on their ids */
const REGION_ID = 14;

interface TtaRequestRecipient {
  /** the recipient the request was made for */
  recipient: string;
  /** kept alongside the name so the cell can link out once the request pages exist */
  recipientId: number;
  regionId: number;
  /** the two letter state the recipient's grant is in */
  stateCode: string;
}

export interface ActiveTtaRequest extends TtaRequestRecipient {
  id: number;
  requestId: string;
  /** MM/DD/YYYY, matching how dates are displayed elsewhere in the hub */
  createdDate: string;
  creator: string;
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
    recipient: RECIPIENTS.childrenAndFamiliesFirst.name,
    recipientId: RECIPIENTS.childrenAndFamiliesFirst.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.childrenAndFamiliesFirst.stateCode,
    createdDate: '06/23/2026',
    creator: 'Rachel Green, ECS',
    goal: 'Monitoring',
    reviewer: 'Ross Geller, TTAC',
    approver: 'Phoebe Buffay, COR',
    assignedStaff: 'Rachel Green, ECS',
    status: DRAFT_STATUS,
  },
  {
    id: 2,
    requestId: 'R14-REQ-14234',
    recipient: RECIPIENTS.childrenAndFamiliesFirst.name,
    recipientId: RECIPIENTS.childrenAndFamiliesFirst.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.childrenAndFamiliesFirst.stateCode,
    createdDate: '06/23/2026',
    creator: 'Jim Bottan, ECS',
    goal: 'Mental Health',
    reviewer: 'Monica Geller, TTAC',
    approver: 'Phoebe Buffay, COR',
    assignedStaff: 'Jim Bottan, ECS',
    status: 'COR approval pending',
  },
  {
    id: 3,
    requestId: 'R14-REQ-12259',
    recipient: RECIPIENTS.childrensCouncil.name,
    recipientId: RECIPIENTS.childrensCouncil.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.childrensCouncil.stateCode,
    createdDate: '06/22/2026',
    creator: 'Monica Geller, TTAC',
    goal: 'ERSEA',
    reviewer: 'Ross Geller, TTAC',
    approver: 'Chandler Bing, COR',
    assignedStaff: 'Monica Geller, TTAC',
    status: 'Pending changes',
  },
  {
    id: 4,
    requestId: 'R14-REQ-12343',
    recipient: RECIPIENTS.communityAssociation.name,
    recipientId: RECIPIENTS.communityAssociation.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.communityAssociation.stateCode,
    createdDate: '06/21/2026',
    creator: 'Jason Oliver, ECS',
    goal: 'Disaster Recovery',
    reviewer: 'Monica Geller, TTAC',
    approver: 'Chandler Bing, COR',
    assignedStaff: 'Jason Oliver, ECS',
    status: 'COR approval pending',
  },
  {
    id: 5,
    requestId: 'R14-REQ-12201',
    recipient: RECIPIENTS.willowStreet.name,
    recipientId: RECIPIENTS.willowStreet.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.willowStreet.stateCode,
    createdDate: '06/18/2026',
    creator: 'Phoebe Buffay, PS',
    goal: 'Family Engagement',
    reviewer: 'Ross Geller, TTAC',
    approver: 'Phoebe Buffay, COR',
    assignedStaff: 'Rachel Green, ECS',
    status: DRAFT_STATUS,
  },
  {
    id: 6,
    requestId: 'R14-REQ-12198',
    recipient: RECIPIENTS.centralDistrict.name,
    recipientId: RECIPIENTS.centralDistrict.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.centralDistrict.stateCode,
    createdDate: '06/17/2026',
    creator: 'Amy Connelly, CO',
    goal: 'Health',
    reviewer: 'Monica Geller, TTAC',
    approver: 'Chandler Bing, COR',
    assignedStaff: 'Jim Bottan, ECS',
    status: 'COR approval pending',
  },
  {
    id: 7,
    requestId: 'R14-REQ-12154',
    recipient: RECIPIENTS.volunteersOfAmerica.name,
    recipientId: RECIPIENTS.volunteersOfAmerica.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.volunteersOfAmerica.stateCode,
    createdDate: '06/15/2026',
    creator: 'Ross Geller, GS',
    goal: 'Fiscal',
    reviewer: 'Ross Geller, TTAC',
    approver: 'Phoebe Buffay, COR',
    assignedStaff: 'Monica Geller, TTAC',
    status: 'Pending changes',
  },
  {
    id: 8,
    requestId: 'R14-REQ-12147',
    recipient: RECIPIENTS.cnmiPublicSchools.name,
    recipientId: RECIPIENTS.cnmiPublicSchools.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.cnmiPublicSchools.stateCode,
    createdDate: '06/12/2026',
    creator: 'Julie Anderson, GS',
    goal: 'Monitoring',
    reviewer: 'Monica Geller, TTAC',
    approver: 'Chandler Bing, COR',
    assignedStaff: 'Jason Oliver, ECS',
    status: 'COR approval pending',
  },
  {
    id: 9,
    requestId: 'R14-REQ-12102',
    recipient: RECIPIENTS.childrenAndFamiliesFirst.name,
    recipientId: RECIPIENTS.childrenAndFamiliesFirst.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.childrenAndFamiliesFirst.stateCode,
    createdDate: '06/10/2026',
    creator: 'Allison Albany, HS',
    goal: 'Education',
    reviewer: 'Ross Geller, TTAC',
    approver: 'Phoebe Buffay, COR',
    assignedStaff: 'Rachel Green, ECS',
    status: DRAFT_STATUS,
  },
  {
    id: 10,
    requestId: 'R14-REQ-12088',
    recipient: RECIPIENTS.childrensCouncil.name,
    recipientId: RECIPIENTS.childrensCouncil.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.childrensCouncil.stateCode,
    createdDate: '06/08/2026',
    creator: 'Aaron Davis, TTAC',
    goal: 'ERSEA',
    reviewer: 'Monica Geller, TTAC',
    approver: 'Chandler Bing, COR',
    assignedStaff: 'Jim Bottan, ECS',
    status: 'COR approval pending',
  },
  {
    id: 11,
    requestId: 'R14-REQ-12034',
    recipient: RECIPIENTS.communityAssociation.name,
    recipientId: RECIPIENTS.communityAssociation.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.communityAssociation.stateCode,
    createdDate: '06/04/2026',
    creator: 'Carly Eisenhower, GS',
    goal: 'Mental Health',
    reviewer: 'Ross Geller, TTAC',
    approver: 'Phoebe Buffay, COR',
    assignedStaff: 'Monica Geller, TTAC',
    status: 'Pending changes',
  },
  {
    id: 12,
    requestId: 'R14-REQ-11997',
    recipient: RECIPIENTS.willowStreet.name,
    recipientId: RECIPIENTS.willowStreet.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.willowStreet.stateCode,
    createdDate: '06/01/2026',
    creator: 'Amy Bloom, ECM',
    goal: 'Family Engagement',
    reviewer: 'Monica Geller, TTAC',
    approver: 'Chandler Bing, COR',
    assignedStaff: 'Jason Oliver, ECS',
    status: DRAFT_STATUS,
  },
];

export interface ApprovedTtaRequest extends TtaRequestRecipient {
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
    recipient: RECIPIENTS.childrenAndFamiliesFirst.name,
    recipientId: RECIPIENTS.childrenAndFamiliesFirst.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.childrenAndFamiliesFirst.stateCode,
    approvedDate: '06/18/2026',
    creator: 'Rachel Green, ECS',
    assignedStaff: ['Amy Bloom, ECM'],
    goal: 'Monitoring',
  },
  {
    id: 102,
    requestId: 'R14-REQ-13567',
    recipient: RECIPIENTS.childrenAndFamiliesFirst.name,
    recipientId: RECIPIENTS.childrenAndFamiliesFirst.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.childrenAndFamiliesFirst.stateCode,
    approvedDate: '06/17/2026',
    creator: 'Jim Bottan, ECS',
    assignedStaff: ['Carly Eisenhower, GS'],
    goal: 'Mental Health',
  },
  {
    id: 103,
    requestId: 'R14-REQ-14233',
    recipient: RECIPIENTS.willowStreet.name,
    recipientId: RECIPIENTS.willowStreet.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.willowStreet.stateCode,
    approvedDate: '06/16/2026',
    creator: 'Phoebe Buffay, PS',
    assignedStaff: ['Adam Scott, HS', 'Ross Geller, GS'],
    goal: 'Family Support',
  },
  {
    id: 104,
    requestId: 'R14-REQ-12213',
    recipient: RECIPIENTS.centralDistrict.name,
    recipientId: RECIPIENTS.centralDistrict.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.centralDistrict.stateCode,
    approvedDate: '06/16/2026',
    creator: 'Amy Connelly, CO',
    assignedStaff: ['Aaron Davis, TTAC'],
    goal: 'Disaster Recovery',
  },
  {
    id: 105,
    requestId: 'R14-REQ-12145',
    recipient: RECIPIENTS.volunteersOfAmerica.name,
    recipientId: RECIPIENTS.volunteersOfAmerica.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.volunteersOfAmerica.stateCode,
    approvedDate: '06/16/2026',
    creator: 'Ross Geller, GS',
    assignedStaff: ['Julie Anderson, GS'],
    goal: 'Program Structure',
  },
  {
    id: 106,
    requestId: 'R14-REQ-12268',
    recipient: RECIPIENTS.childrenAndFamiliesFirst.name,
    recipientId: RECIPIENTS.childrenAndFamiliesFirst.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.childrenAndFamiliesFirst.stateCode,
    approvedDate: '06/15/2026',
    creator: 'Phoebe Buffay, PS',
    assignedStaff: ['Allison Albany, HS'],
    goal: 'Family Engagement',
  },
  {
    id: 107,
    requestId: 'R14-REQ-12291',
    recipient: RECIPIENTS.childrensCouncil.name,
    recipientId: RECIPIENTS.childrensCouncil.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.childrensCouncil.stateCode,
    approvedDate: '06/15/2026',
    creator: 'Monica Geller, TTAC',
    assignedStaff: ['Monica Geller, TTAC'],
    goal: 'ERSEA',
  },
  {
    id: 108,
    requestId: 'R14-REQ-12265',
    recipient: RECIPIENTS.willowStreet.name,
    recipientId: RECIPIENTS.willowStreet.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.willowStreet.stateCode,
    approvedDate: '06/15/2025',
    creator: 'Allison Albany, HS',
    assignedStaff: ['Carly Eisenhower, GS'],
    goal: 'Family Support',
  },
  {
    id: 109,
    requestId: 'R14-REQ-12341',
    recipient: RECIPIENTS.cnmiPublicSchools.name,
    recipientId: RECIPIENTS.cnmiPublicSchools.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.cnmiPublicSchools.stateCode,
    approvedDate: '05/15/2025',
    creator: 'Julie Anderson, GS',
    assignedStaff: ['Allison Albany, GS'],
    goal: 'Child Safety',
  },
  {
    id: 110,
    requestId: 'R14-REQ-12187',
    recipient: RECIPIENTS.communityAssociation.name,
    recipientId: RECIPIENTS.communityAssociation.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.communityAssociation.stateCode,
    approvedDate: '05/14/2025',
    creator: 'Jason Oliver, ECS',
    assignedStaff: ['Amy Bloom, ECM'],
    goal: 'Disaster Recovery',
  },
  {
    id: 111,
    requestId: 'R14-REQ-12099',
    recipient: RECIPIENTS.centralDistrict.name,
    recipientId: RECIPIENTS.centralDistrict.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.centralDistrict.stateCode,
    approvedDate: '05/12/2025',
    creator: 'Rachel Green, ECS',
    assignedStaff: ['Aaron Davis, TTAC', 'Amy Bloom, ECM'],
    goal: 'Health',
  },
  {
    id: 112,
    requestId: 'R14-REQ-12044',
    recipient: RECIPIENTS.volunteersOfAmerica.name,
    recipientId: RECIPIENTS.volunteersOfAmerica.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.volunteersOfAmerica.stateCode,
    approvedDate: '05/08/2025',
    creator: 'Monica Geller, TTAC',
    assignedStaff: ['Julie Anderson, GS'],
    goal: 'Education',
  },
  {
    id: 113,
    requestId: 'R14-REQ-11982',
    recipient: RECIPIENTS.childrensCouncil.name,
    recipientId: RECIPIENTS.childrensCouncil.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.childrensCouncil.stateCode,
    approvedDate: '05/05/2025',
    creator: 'Jim Bottan, ECS',
    assignedStaff: ['Carly Eisenhower, GS'],
    goal: 'Fiscal',
  },
  {
    id: 114,
    requestId: 'R14-REQ-11930',
    recipient: RECIPIENTS.cnmiPublicSchools.name,
    recipientId: RECIPIENTS.cnmiPublicSchools.id,
    regionId: REGION_ID,
    stateCode: RECIPIENTS.cnmiPublicSchools.stateCode,
    approvedDate: '05/01/2025',
    creator: 'Ross Geller, GS',
    assignedStaff: ['Adam Scott, HS'],
    goal: 'Monitoring',
  },
];
