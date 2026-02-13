import React from 'react'
import PropTypes from 'prop-types'
import { OBJECTIVE_STATUS } from '../Constants'

export default function ObjectiveStatusSuspendReason({ status, closeSuspendReason, closeSuspendContext }) {
  if (status === OBJECTIVE_STATUS.SUSPENDED && closeSuspendReason) {
    return (
      <>
        <p className="usa-prose margin-bottom-0 text-bold">Reason suspended</p>
        <p className="margin-top-0 usa-prose">
          {closeSuspendReason}
          {closeSuspendContext && ` - ${closeSuspendContext}`}
        </p>
      </>
    )
  }
  return null
}

ObjectiveStatusSuspendReason.propTypes = {
  status: PropTypes.string.isRequired,
  closeSuspendReason: PropTypes.string.isRequired,
  closeSuspendContext: PropTypes.string.isRequired,
}
