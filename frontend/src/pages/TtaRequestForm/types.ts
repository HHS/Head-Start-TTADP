import type { ReactElement } from 'react';
import type { HookFormLike } from './constants';

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

/** the reference data every page needs, handed down from the two entry points */
export interface TtaRequestAdditionalData {
  recipientOptions: TtaRequestRecipient[] | null;
  recipient: TtaRequestRecipient | null;
  regionId: number | null;
}

/** a page descriptor, the same shape Session form and Communication Log pages use */
export interface TtaRequestPage {
  position: number;
  label: string;
  path: string;
  review: boolean;
  fields: string[];
  isPageComplete: (hookForm: HookFormLike) => boolean;
  render: (...args: any[]) => ReactElement; // eslint-disable-line @typescript-eslint/no-explicit-any
}
