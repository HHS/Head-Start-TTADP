import type { TtaRequestGrant } from '@ttahub/common/src/ttaRequests';

export type {
  TtaRequestGrant,
  TtaRequestPayload,
  TtaRequestResponse,
} from '@ttahub/common/src/ttaRequests';

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

export interface Reviewer {
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
