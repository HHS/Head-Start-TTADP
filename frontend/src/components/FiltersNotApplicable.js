import React from 'react';
import { Tooltip as TrussWorksToolTip } from '@trussworks/react-uswds';
import {
  faQuestionCircle,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import colors from '../colors';

const FiltersNotApplicable = () => (
  <>
    <span className="ttahub-filters-not-applicable font-sans-xs margin-right-1"> - Filters not applied</span>
    <TrussWorksToolTip className="usa-button--unstyled smart-hub--overview-tool-tip" id="filter-not-applicable" label="One or more of the selected filters cannot be applied to this data.">
      <FontAwesomeIcon icon={faQuestionCircle} color={colors.ttahubMediumBlue} />
    </TrussWorksToolTip>
  </>
);

export default FiltersNotApplicable;
