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
}
