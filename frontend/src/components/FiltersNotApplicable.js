import React from 'react';
import {
  faQuestionCircle,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import colors from '../colors';
import Tooltip from './Tooltip';

const FiltersNotApplicable = () => (
  <>
    <span className="ttahub-filters-not-applicable font-sans-xs margin-right-1">
      {' '}
      - Filters not applied
    </span>
    <Tooltip
      displayText={<FontAwesomeIcon icon={faQuestionCircle} color={colors.ttahubMediumBlue} size="lg" />}
      tooltipText="One or more of the selected filters cannot be applied to this data."
      buttonLabel="One or more of the selected filters cannot be applied to this data."
      hideUnderline
      className="smart-hub--overview-tool-tip"
    />
  </>
);

export default FiltersNotApplicable;
