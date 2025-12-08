export type SessionReportShape = {
  id: number;
  eventId: number;
  data: unknown;
  files: unknown[];
  supportingAttachments: unknown[];
  updatedAt: string;
  event: unknown;
  approverId: number | null;
  approver: { id: number } | null;
  submitted: boolean;
};
