import React from 'react';
import PropTypes from 'prop-types';
import { Grid, Tooltip as TrussWorksToolTip } from '@trussworks/react-uswds';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faQuestionCircle,
} from '@fortawesome/free-solid-svg-icons';
import './OverviewWidgetField.scss';

import Tooltip from '../components/Tooltip';
import colors from '../colors';

export function OverviewWidgetField({
  label1,
  label2,
  route,
  data,
  icon,
  iconColor,
  backgroundColor,
  showTooltip,
  tooltipText,
  filterApplicable,
  iconSize,
}) {
  const smallIconClass = iconSize === 'sm' ? 'smart-hub--dashboard-overview-widget-field-icon-background-sm' : 'smart-hub--dashboard-overview-widget-field-icon-background-lg';
  return (
    <Grid gap={4} desktop={{ col: 'fill' }} tablet={{ col: 5 }} mobileLg={{ col: 12 }} className="smart-hub--dashboard-overview-widget-field margin-bottom-1 display-flex bg-white shadow-2 padding-y-2 padding-x-1">
      <span className="smart-hub--dashboard-overview-widget-field-icon flex-1 display-flex flex-justify-center flex-align-center">
        <span className={`${smallIconClass} display-flex flex-justify-center flex-align-center`} style={{ backgroundColor }}>
          <FontAwesomeIcon color={iconColor} icon={icon} size={iconSize} />
        </span>
      </span>
      <span className="smart-hub--dashboard-overview-widget-field-label display-flex flex-2 flex-column flex-justify-center">
        <div>
          <span className="text-bold smart-hub--overview-widget-field-data-font-size">{data}</span>
          { !filterApplicable && (
            <>
              <span className="smart-hub--overview-widget-field-font-size margin-right-1"> - Filters not applied</span>
              <TrussWorksToolTip className="usa-button--unstyled smart-hub--overview-tool-tip" id="filter-not-applicable" label="One or more of the selected filters cannot be applied to this data.">
                <FontAwesomeIcon icon={faQuestionCircle} className="margin-left-1" color={colors.ttahubMediumBlue} />
              </TrussWorksToolTip>
            </>
          )}
        </div>

        {showTooltip ? (
          <Tooltip
            displayText={label1}
            screenReadDisplayText={false}
            buttonLabel={`${tooltipText} click to visually reveal this information`}
            tooltipText={tooltipText}
          />
        ) : (
          <span className="margin-top-1">{label1}</span>
        )}
        {label2}
        {route && (
          <Link to={route.to} className="margin-top-1">
            {route.label}
          </Link>
        )}
      </span>
    </Grid>
  );
}

OverviewWidgetField.propTypes = {
  label1: PropTypes.string.isRequired,
  label2: PropTypes.string,
  data: PropTypes.string.isRequired,
  icon: PropTypes.shape({
    prefix: PropTypes.string,
    iconName: PropTypes.string,
    // eslint-disable-next-line react/forbid-prop-types
    icon: PropTypes.array,
  }).isRequired,
  iconColor: PropTypes.string.isRequired,
  backgroundColor: PropTypes.string.isRequired,
  tooltipText: PropTypes.string,
  showTooltip: PropTypes.bool,
  route: PropTypes.shape({
    to: PropTypes.string,
    label: PropTypes.string,
  }),
  filterApplicable: PropTypes.bool,
  iconSize: PropTypes.string,
};

OverviewWidgetField.defaultProps = {
  tooltipText: '',
  showTooltip: false,
  label2: '',
  route: null,
  filterApplicable: true,
  iconSize: 'sm',
};

export default OverviewWidgetField;
