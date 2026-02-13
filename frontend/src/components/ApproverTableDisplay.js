/* eslint-disable react/forbid-prop-types */
/* eslint-disable jsx-a11y/anchor-is-valid */
import React from 'react'
import PropTypes from 'prop-types'
import { uniqueId } from 'lodash'
import { APPROVER_STATUSES } from '@ttahub/common'
import { PendingApprovalIcon, Closed as ApprovedIcon, NeedsActionIcon } from './icons'

const ProperIcon = ({ approvalStatus }) => {
  switch (approvalStatus) {
    case APPROVER_STATUSES.APPROVED:
      return <ApprovedIcon />
    case APPROVER_STATUSES.NEEDS_ACTION:
      return <NeedsActionIcon />
    case APPROVER_STATUSES.PENDING:
    default:
      return <PendingApprovalIcon />
  }
}

ProperIcon.propTypes = {
  approvalStatus: PropTypes.string,
}

ProperIcon.defaultProps = {
  approvalStatus: APPROVER_STATUSES.PENDING,
}

const ApproverTableDisplay = ({ approvers }) => {
  if (!approvers) {
    return null
  }
  const approverNames = approvers.sort((a, b) => a.user.fullName.localeCompare(b.user.fullName))

  return approverNames.map((a) => (
    <span key={uniqueId('approver-table-display-')}>
      <ProperIcon approvalStatus={a.status} />
      {a.user.fullName}
    </span>
  ))
}

ApproverTableDisplay.propTypes = {
  approvers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      status: PropTypes.string,
      user: PropTypes.shape({
        fullName: PropTypes.string,
      }),
    })
  ).isRequired,
}

export default ApproverTableDisplay
