export interface TtaRequestCitationData {
  citation: string;
  findingType?: string | null;
}

/** what the TTA request API takes; drafts may send any part of it */
export interface TtaRequestPayload {
  regionId?: number;
  recipientId: number | null;
  grantIds: number[];
  recipientAware: boolean | null;
  originator: string | null;
  goalTemplateId: number | null;
  citations: TtaRequestCitationData[];
  context: string | null;
  creatorNotes: string | null;
  reviewerId: number | null;
}

export interface TtaRequestGrant {
  id: number;
  regionId: number;
  status?: string;
  /** e.g. "14HP1234 - EHS" */
  numberWithProgramTypes: string;
  /** the full name, including the recipient, e.g. "Children and Families First - 14HP1234 - EHS" */
  name: string;
}

/**
 * what the reviewer sends back: the staff they assign, and either needs action, which returns
 * the request to its creator, or approved, which sends it on to the approving COR
 */
export interface TtaRequestReviewPayload {
  status: 'needs_action' | 'approved';
  note?: string | null;
  assignedStaffIds: number[];
  /** the approving COR, only when the status is approved */
  approverId?: number;
}

/** a COR who can approve requests in a region; the primary COR has no backup flag */
export interface TtaRequestApprovingCor {
  id: number;
  name: string;
  fullName?: string;
  isBackup: boolean;
}

/** a user as they appear on a request's notes and approvers */
export interface TtaRequestUser {
  id: number;
  name: string;
  /** the name with the user's roles, e.g. "Tom Geller, TTAC" */
  fullName?: string;
  roles?: { name: string }[];
}

/** one entry in a request's history: what was done at which step, and the note left with it */
export interface TtaRequestNoteData {
  id: number;
  step: 'creator' | 'reviewer' | 'approver';
  action: 'submitted' | 'needs_action' | 'sent_for_approval';
  note: string | null;
  createdAt: string;
  user: TtaRequestUser | null;
}

/**
 * someone on a step of the request - its reviewer, or the approving COR the reviewer sent it
 * to - and where they stand; a null status is pending
 */
interface TtaRequestStepUserData {
  id: number;
  userId: number;
  status: 'needs_action' | 'approved' | null;
  user: TtaRequestUser | null;
}

/** the reviewer the request was submitted to */
export type TtaRequestReviewerData = TtaRequestStepUserData;

/** the approving COR the reviewer sent the request to */
export type TtaRequestApproverData = TtaRequestStepUserData;

/** a saved TTA request, as the API returns it */
export interface TtaRequestResponse {
  id: number;
  displayId: string;
  regionId: number;
  status: string;
  recipientAware: boolean | null;
  originator: string | null;
  context: string | null;
  creatorNotes: string | null;
  recipient: { id: number; name: string } | null;
  grants: TtaRequestGrant[];
  goalTemplate: { id: number; templateName: string; standard?: string | null } | null;
  citations: { citation: string; findingType: string | null }[];
  /** fullName is the name with the user's roles, e.g. "Tom Geller, TTAC" */
  reviewer: { id: number; name: string; fullName?: string } | null;
  creator?: { id: number; name: string; fullName?: string };
  createdAt?: string;
  submittedAt?: string | null;
  /** the request's history, oldest first */
  notes?: TtaRequestNoteData[];
  reviewers?: TtaRequestReviewerData[];
  approvers?: TtaRequestApproverData[];
  /** the staff the reviewer assigned */
  assignedStaff?: TtaRequestUser[];
}
