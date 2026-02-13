import React from 'react'
import PropTypes from 'prop-types'
import { Alert as USWDSAlert } from '@trussworks/react-uswds'

export default function GroupAlert({ resetGroup }) {
  return (
    <>
      <USWDSAlert type="info">
        You&apos;ve successfully modified the group&apos;s recipients for this report. Changes here do not affect the group itself.
        <button type="button" className="smart-hub-activity-summary-group-info usa-button usa-button--unstyled" onClick={resetGroup}>
          Reset or select a different group.
        </button>
      </USWDSAlert>
    </>
  )
}

GroupAlert.propTypes = {
  resetGroup: PropTypes.func.isRequired,
}
