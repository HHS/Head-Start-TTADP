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

const CollabReportApproverTableDisplay = ({ approvers }) => {
  if (!approvers) {
    return null
  }
  const approverNames = approvers.sort((a, b) => a.user.fullName.localeCompare(b.user.fullName))

  return approverNames.map((a) => (
    <div key={uniqueId('approver-table-display-')}>
      <ProperIcon approvalStatus={a.status} />
      {a.user.fullName}
    </div>
  ))
}

CollabReportApproverTableDisplay.propTypes = {
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

export default CollabReportApproverTableDisplay
