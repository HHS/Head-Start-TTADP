export type SessionReportShape = {
  id: number;
  eventId: number;
  data: unknown;
  files: unknown[];
  supportingAttachments: unknown[];
  goalTemplates: {
    id: number;
    standard: string;
  }[];
  trainers: {
    id: number,
    name: string,
    fullName: string,
  }[],
  updatedAt: string;
  event: unknown;
  approverId: number | null;
  submitterId: number | null;
  approver: {
    id: number;
    fullName: string;
  } | null;
  submitted: boolean;
  submitter: {
    id: number;
    fullName: string;
  } | null;
};
