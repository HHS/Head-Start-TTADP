import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import FiltersNotApplicable from '../components/FiltersNotApplicable';
import DrawerTriggerButton from '../components/DrawerTriggerButton';
import Drawer from '../components/Drawer';
import ContentFromFeedByTag from '../components/ContentFromFeedByTag';

import './OverviewWidgetField.scss';

import Tooltip from '../components/Tooltip';

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
  showNoResults,
  maxToolTipWidth,
  drawerTagName,
}) {
  const drawerTriggerRef = useRef(null);
  const aboutThisDataRef = useRef(null);
  const noData = data === '0%';
  return (
    <Grid desktop={{ col: 'fill' }} tablet={{ col: 5 }} mobileLg={{ col: 12 }} className="smart-hub--dashboard-overview-widget-field display-flex bg-white shadow-2 padding-2 gap-0">
      <span className="smart-hub--dashboard-overview-widget-field-icon display-flex flex-justify-center flex-align-center margin-right-2">
        <span className="smart-hub--dashboard-overview-widget-field-icon__background-sm smart-hub--dashboard-overview-widget-field-icon display-flex flex-justify-center flex-align-center margin-right-0" style={{ backgroundColor }}>
          <FontAwesomeIcon color={iconColor} icon={icon} size={iconSize} />
        </span>
      </span>
      <span className="smart-hub--dashboard-overview-widget-field-label display-flex flex-column flex-justify-center flex-align-start">
        <div>
          {showNoResults && noData ? (
            <>
              <span className="text-bold font-sans-xs margin-right-1">No results</span>
              <DrawerTriggerButton drawerTriggerRef={drawerTriggerRef}>
                Get help using filters
              </DrawerTriggerButton>
              <Drawer title="QA dashboard filters" triggerRef={drawerTriggerRef}>
                <ContentFromFeedByTag tagName="ttahub-qa-dash-filters" />
              </Drawer>
            </>
          ) : (
            <>
              <span className="text-bold font-sans-sm">{data}</span>
              {!filterApplicable ? <FiltersNotApplicable /> : null}
            </>
          )}
        </div>

        {showTooltip ? (
          <Tooltip
            displayText={label1}
            screenReadDisplayText={false}
            buttonLabel={`${tooltipText} click to visually reveal this information`}
            tooltipText={tooltipText}
            maxWidth={maxToolTipWidth}
            buttonClassName="font-sans-sm"
          />
        ) : (
          <span className="margin-top-1 font-sans-sm">{label1}</span>
        )}
        {label2 && <span className="font-sans-2xs">{label2}</span>}
        {drawerTagName && (
          <>
            <DrawerTriggerButton drawerTriggerRef={aboutThisDataRef} customClass="margin-top-1">
              About this data
            </DrawerTriggerButton>
            <Drawer triggerRef={aboutThisDataRef} title={label1} stickyHeader stickyFooter>
              <ContentFromFeedByTag tagName={drawerTagName} />
            </Drawer>
          </>
        )}
        {route && (!showNoResults || !noData) && (
          <Link
            to={route.to}
            className="margin-top-1"
            aria-label={route.ariaLabel}
          >
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
    ariaLabel: PropTypes.string,
  }),
  filterApplicable: PropTypes.bool,
  iconSize: PropTypes.string,
  showNoResults: PropTypes.bool,
  maxToolTipWidth: PropTypes.number,
  drawerTagName: PropTypes.string,
};

OverviewWidgetField.defaultProps = {
  tooltipText: '',
  showTooltip: false,
  label2: '',
  route: null,
  filterApplicable: true,
  iconSize: 'lg',
  showNoResults: false,
  maxToolTipWidth: null,
  drawerTagName: null,
};

export default OverviewWidgetField;
