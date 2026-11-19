import { APPROVER_STATUSES, TTA_REQUEST_STATUSES } from '@ttahub/common';

export const STATUS_LABELS = {
  DRAFT: 'Draft',
  REVIEW_PENDING: 'TTAC/Manager review pending',
  COR_APPROVAL_PENDING: 'COR approval pending',
  PENDING_CHANGES: 'Pending changes',
  NEEDS_ACTION: 'Needs action',
  APPROVED: 'Approved',
};

/** what the label needs to know about a request */
export interface StatusLabelRequest {
  status: string;
  creator: { id: number };
  reviewer: { id: number } | null;
  /** the COR the reviewer sent the request to, once they have */
  approvers?: { userId: number; status: string | null }[];
}

export interface StatusLabel {
  label: string;
  /** whether the request is waiting on the viewing user */
  needsAction: boolean;
}

const label = (text: string): StatusLabel => ({
  label: text,
  needsAction: text === STATUS_LABELS.NEEDS_ACTION,
});

/**
 * How a request's status reads to the user viewing it, per the TTA request status matrix.
 * The stored status says where the request is in its workflow; the label says what that
 * means to the viewer: whoever the request is waiting on sees "Needs action", whoever is
 * waiting on them sees "Pending changes", and everyone else sees whose review is pending.
 * Anyone not on the request reads it as its COR would before the request reaches them.
 */
export default function ttaRequestStatusLabel(
  request: StatusLabelRequest,
  userId: number | null
): StatusLabel {
  const isCreator = userId !== null && request.creator.id === userId;
  const isReviewer = userId !== null && request.reviewer?.id === userId;
  const approver = request.approvers?.[0];
  const isApprover = userId !== null && approver?.userId === userId;

  switch (request.status) {
    case TTA_REQUEST_STATUSES.DRAFT:
      return label(STATUS_LABELS.DRAFT);
    case TTA_REQUEST_STATUSES.SUBMITTED:
      return label(isReviewer ? STATUS_LABELS.NEEDS_ACTION : STATUS_LABELS.REVIEW_PENDING);
    case TTA_REQUEST_STATUSES.NEEDS_ACTION:
      if (isCreator) {
        return label(STATUS_LABELS.NEEDS_ACTION);
      }
      return label(isReviewer ? STATUS_LABELS.PENDING_CHANGES : STATUS_LABELS.REVIEW_PENDING);
    case TTA_REQUEST_STATUSES.AWAITING_APPROVAL: {
      // the COR has sent it back to its reviewer for changes
      if (approver?.status === APPROVER_STATUSES.NEEDS_ACTION) {
        if (isReviewer) {
          return label(STATUS_LABELS.NEEDS_ACTION);
        }
        return label(
          isApprover ? STATUS_LABELS.PENDING_CHANGES : STATUS_LABELS.COR_APPROVAL_PENDING
        );
      }
      return label(isApprover ? STATUS_LABELS.NEEDS_ACTION : STATUS_LABELS.COR_APPROVAL_PENDING);
    }
    case TTA_REQUEST_STATUSES.APPROVED:
      return label(STATUS_LABELS.APPROVED);
    default:
      return label(request.status);
  }
}
