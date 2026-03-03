import React from 'react';
import PropTypes from 'prop-types';
import {
  faQuestionCircle,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import colors from '../colors';
import Tooltip from './Tooltip';

const FiltersNotApplicable = ({ showLeadingDash }) => (
  <>
    <span className="ttahub-filters-not-applicable font-sans-xs margin-right-1">
      {showLeadingDash ? ' - Filters not applied' : 'Filters not applied'}
    </span>
    <Tooltip
      displayText={<FontAwesomeIcon icon={faQuestionCircle} color={colors.ttahubMediumBlue} size="lg" />}
      tooltipText="One or more of the selected filters cannot be applied to this data."
      buttonLabel="Show filter information"
      hideUnderline
      className="smart-hub--overview-tool-tip"
    />
  </>
);

FiltersNotApplicable.defaultProps = {
  showLeadingDash: true,
};

FiltersNotApplicable.propTypes = {
  showLeadingDash: PropTypes.bool,
};

export default FiltersNotApplicable;
