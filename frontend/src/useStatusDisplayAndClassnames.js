import { REPORT_STATUSES, APPROVER_STATUSES } from '@ttahub/common/src/constants';

export default function useStatusDisplayAndClassnames(
  calculatedStatus,
  approvers = [],
  justSubmitted = false,
) {
  let statusClassName = `smart-hub--table-tag-status smart-hub--status-${calculatedStatus}`;
  let displayStatus = calculatedStatus;

  if (justSubmitted) {
    displayStatus = 'Submitted';
    statusClassName = `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.SUBMITTED}`;
  }

  if (calculatedStatus === REPORT_STATUSES.NEEDS_ACTION) {
    displayStatus = 'Needs action';
    statusClassName = `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.NEEDS_ACTION}`;
  }

  if (
    calculatedStatus !== REPORT_STATUSES.NEEDS_ACTION
      && approvers && approvers.length > 0
      && approvers.some((a) => a.status === APPROVER_STATUSES.APPROVED)
  ) {
    displayStatus = 'Reviewed';
    statusClassName = 'smart-hub--table-tag-status smart-hub--status-reviewed';
  }

  if (
    calculatedStatus !== REPORT_STATUSES.NEEDS_ACTION
      && approvers && approvers.length > 0
      && approvers.some((a) => a.status === APPROVER_STATUSES.NEEDS_ACTION)
  ) {
    displayStatus = 'Needs action';
    statusClassName = `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.NEEDS_ACTION}`;
  }

  if (
    calculatedStatus !== REPORT_STATUSES.APPROVED
      && approvers && approvers.length > 0
      && approvers.every((a) => a.status === APPROVER_STATUSES.APPROVED)
  ) {
    displayStatus = REPORT_STATUSES.APPROVED;
    statusClassName = `smart-hub--table-tag-status smart-hub--status-${REPORT_STATUSES.APPROVED}`;
  }

  return {
    displayStatus,
    statusClassName,
  };
}
