import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import colors from '../../colors'

export default function GoalFormNavigationLink({ recipient, regionId }) {
  return (
    <Link
      className="ttahub-recipient-record--tabs_back-to-search margin-left-2 margin-top-4 margin-bottom-3 display-inline-block"
      to={`/recipient-tta-records/${recipient.id}/region/${regionId}/rttapa/`}
    >
      <FontAwesomeIcon className="margin-right-1" color={colors.ttahubMediumBlue} icon={faArrowLeft} />
      <span>Back to RTTAPA</span>
    </Link>
  )
}

GoalFormNavigationLink.propTypes = {
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
