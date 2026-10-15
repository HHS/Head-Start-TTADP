export interface TtaRequestGrant {
  id: number;
  regionId: number;
  status?: string;
  /** e.g. "14HP1234 - EHS" */
  numberWithProgramTypes: string;
  /** the full name, including the recipient, e.g. "Children and Families First - 14HP1234 - EHS" */
  name: string;
}

export interface TtaRequestRecipient {
  id: number;
  name: string;
  grants: TtaRequestGrant[];
}

export interface GoalTemplateOption {
  id: number;
  name: string;
  /** 'Monitoring' for the monitoring goal, which is the one that takes citations */
  standard?: string;
}

/** a citation option as react-select sees it, inside a finding type group */
export interface CitationOption {
  label: string;
  value: string;
  name: string;
  findingType: string;
  standardIds: number[];
}

export interface CitationOptionGroup {
  label: string;
  options: CitationOption[];
}

export interface SelectOption {
  label: string;
  value: number | string;
}

export interface Approver {
  id: number;
  name: string;
}

/** the form's values, as react-hook-form holds them */
export interface TtaRequestFormValues {
  recipient: TtaRequestRecipient | null;
  grants: TtaRequestGrant[];
  /** the radio's value: 'yes', 'no', or '' before either is chosen */
  recipientAware: string;
  originator: SelectOption | null;
  goal: GoalTemplateOption | null;
  citations: CitationOption[];
  context: string;
  creatorNotes: string;
  reviewer: SelectOption | null;
}

/** what the TTA request API takes */
export interface TtaRequestPayload {
  regionId?: number;
  recipientId: number | null;
  grantIds: number[];
  recipientAware: boolean | null;
  originator: string | null;
  goalTemplateId: number | null;
  citations: { citation: string; findingType: string | null }[];
  context: string;
  creatorNotes: string;
  reviewerId: number | null;
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
