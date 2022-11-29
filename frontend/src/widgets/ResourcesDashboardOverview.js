import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLink, faLinkSlash,
} from '@fortawesome/free-solid-svg-icons';
import withWidgetData from './withWidgetData';
import './ResourcesDashboardOverview.css';

import Loader from '../components/Loader';
import Tooltip from '../components/Tooltip';
import colors from '../colors';

export function Field({
  label,
  data,
  icon,
  iconColor,
  backgroundColor,
  showTooltip,
  tooltipText,
}) {
  return (
    <Grid gap={4} desktop={{ col: 'fill' }} tablet={{ col: 6 }} mobileLg={{ col: 12 }} className="smart-hub--resources-dashboard-overview-field margin-bottom-1 display-flex bg-white shadow-2 padding-y-2 padding-x-1">
      <span className="smart-hub--resources-dashboard-overview-field-icon flex-1 display-flex flex-justify-center flex-align-center">
        <span className="smart-hub--resources-dashboard-overview-field-icon-background display-flex flex-justify-center flex-align-center" style={{ backgroundColor }}>
          <FontAwesomeIcon color={iconColor} icon={icon} />
        </span>
      </span>
      <span className="smart-hub--resources-dashboard-overview-field-label display-flex flex-2 flex-column flex-justify-center">
        <span className="text-bold smart-hub--overview-font-size">{data}</span>
        {showTooltip ? (
          <Tooltip
            displayText={label}
            screenReadDisplayText={false}
            buttonLabel={`${tooltipText} click to visually reveal this information`}
            tooltipText={tooltipText}
          />
        ) : label}
      </span>
    </Grid>
  );
}

Field.propTypes = {
  label: PropTypes.string.isRequired,
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
};

Field.defaultProps = {
  tooltipText: '',
  showTooltip: false,
};

const DASHBOARD_FIELDS = {
  'ECLKC resources': {
    render: (data, showTooltip) => (
      <Field
        key="eclkc-resources"
        icon={faLink}
        showTooltip={showTooltip}
        label={`${data.numEclkc} ${data.numEclkc === 1 ? 'ECLKC Resource' : 'ECLKC Resources'} of ${data.totalNumEclkc}`}
        iconColor={colors.ttahubMagenta}
        backgroundColor={colors.ttahubMagentaLight}
        tooltipText="ECLKC resources"
        data={data.numEclkcPercentage}
      />
    ),
  },
  'Non ECLKC resources': {
    render: (data, showTooltip) => (
      <Field
        key="non-eclkc-resources"
        icon={faLink}
        showTooltip={showTooltip}
        label={`${data.numNonEclkc} ${data.numNonEclkc === 1 ? 'Non-ECLKC Resource' : 'Non-ECLKC Resources'} of ${data.totalNumNonEclkc}`}
        iconColor={colors.ttahubMagenta}
        backgroundColor={colors.ttahubMagentaLight}
        tooltipText="Non-ECLKC resources"
        data={data.numNonEclkcPercentage}
      />
    ),
  },
  'No resources': {
    render: (data, showTooltip) => (
      <Field
        key="no-resources"
        icon={faLinkSlash}
        showTooltip={showTooltip}
        label={`${data.numNoResources} ${data.numNoResources === 1 ? 'No Resource' : 'No Resources'} of ${data.totalNumNoResources}`}
        iconColor={colors.ttahubMagenta}
        backgroundColor={colors.ttahubMagentaLight}
        tooltipText="No ECLKC resources"
        data={data.numNoResourcesPercentage}
      />
    ),
  },
};

export function ResourcesDashboardOverviewWidget({
  data, loading, fields, showTooltips,
}) {
  return (
    <Grid row className="smart-hub--resources-dashboard-overview margin-bottom-3 position-relative">
      <Loader loading={loading} loadingLabel="Resources Overview loading" />
      { fields.map((field) => DASHBOARD_FIELDS[field].render(data, showTooltips, field)) }
    </Grid>
  );
}

ResourcesDashboardOverviewWidget.propTypes = {
  data: PropTypes.shape({
    numEclkc: PropTypes.string,
    totalNumEclkc: PropTypes.string,
    numEclkcPercentage: PropTypes.string,
    numNonEclkc: PropTypes.string,
    totalNumNonEclkc: PropTypes.string,
    numNonEclkcPercentage: PropTypes.string,
    numNoResources: PropTypes.string,
    totalNumNoResources: PropTypes.string,
    numNoResourcesPercentage: PropTypes.string,
  }),
  loading: PropTypes.bool,
  fields: PropTypes.arrayOf(PropTypes.string),
  showTooltips: PropTypes.bool,
};

ResourcesDashboardOverviewWidget.defaultProps = {
  data: {
    numEclkc: '0',
    totalNumEclkc: '0',
    numEclkcPercentage: '0%',
    numNonEclkc: '0',
    totalNumNonEclkc: '0',
    numNonEclkcPercentage: '0%',
    numNoResources: '0',
    totalNumNoResources: '0',
    numNoResourcesPercentage: '0%',
  },
  loading: false,
  showTooltips: false,
  fields: [
    'ECLKC resources',
    'Non ECLKC resources',
    'No resources',
  ],
};

export default withWidgetData(ResourcesDashboardOverviewWidget, 'resourcesDashboardOverview');
