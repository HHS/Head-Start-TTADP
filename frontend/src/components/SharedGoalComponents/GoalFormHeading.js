import React from 'react'
import PropTypes from 'prop-types'

export default function GoalFormHeading({ recipient, regionId }) {
  return (
    <h1 className="page-heading margin-top-0 margin-bottom-0 margin-left-2">
      TTA Goals for {recipient.name} - Region {regionId}
    </h1>
  )
}

GoalFormHeading.propTypes = {
  recipient: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    grants: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
        numberWithProgramTypes: PropTypes.string,
      })
    ),
  }).isRequired,
  regionId: PropTypes.string.isRequired,
}
