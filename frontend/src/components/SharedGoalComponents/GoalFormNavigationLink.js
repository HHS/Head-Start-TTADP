import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import colors from '../../colors';

export default function GoalFormNavigationLink({ recipient, regionId }) {
  const location = useLocation();
  const backLinkTo =
    location.state?.backLinkTo ||
    `/recipient-tta-records/${recipient.id}/region/${regionId}/rttapa`;
  const backLinkText = location.state?.backLinkText || 'Back to RTTAPA';

  return (
    <Link
      className="ttahub-recipient-record--tabs_back-to-search margin-left-2 margin-top-4 margin-bottom-3 display-inline-block"
      to={backLinkTo}
    >
      <FontAwesomeIcon
        className="margin-right-1"
        color={colors.ttahubMediumBlue}
        icon={faArrowLeft}
      />
      <span>{backLinkText}</span>
    </Link>
  );
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
};
