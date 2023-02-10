import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLink, faExternalLink, faLinkSlash,
} from '@fortawesome/free-solid-svg-icons';
import withWidgetData from './withWidgetData';
import './ResourcesDashboardOverview.css';

import Loader from '../components/Loader';
import Tooltip from '../components/Tooltip';
import colors from '../colors';

export function Field({
  label1,
  label2,
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
            displayText={label1}
            screenReadDisplayText={false}
            buttonLabel={`${tooltipText} click to visually reveal this information`}
            tooltipText={tooltipText}
          />
        ) : label1}
        {label2}
      </span>
    </Grid>
  );
}

Field.propTypes = {
  label1: PropTypes.string.isRequired,
  label2: PropTypes.string.isRequired,
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
  'Reports with resources': {
    render: (data, showTooltip) => (
      <Field
        key="report-resources"
        icon={faLink}
        showTooltip={showTooltip}
        label1="Reports with resources"
        label2={`${data.reports.count} of ${data.reports.total}`}
        iconColor={colors.success}
        backgroundColor={colors.ttahubDeepTealLight}
        tooltipText="Reports with resources"
        data={data.reports.percent}
      />
    ),
  },
  'ECLKC Resources': {
    render: (data, showTooltip) => (
      <Field
        key="eclkc-resources"
        icon={faLink}
        showTooltip={showTooltip}
        label1="ECLKC resources"
        label2={`${data.eclkc.count} of ${data.eclkc.total}`}
        iconColor={colors.success}
        backgroundColor={colors.ttahubBlueLight}
        tooltipText="ECLKC resources"
        data={data.eclkc.percent}
      />
    ),
  },
  'Recipients reached': {
    render: (data, showTooltip) => (
      <Field
        key="recipient-reached"
        icon={faExternalLink}
        showTooltip={showTooltip}
        label1="Recipients reached"
        iconColor={colors.ttahubMediumBlue}
        backgroundColor={colors.ttahubMagentaLight}
        tooltipText="Recipients reached"
        data={data.recipients.count}
      />
    ),
  },
  'Participants reached': {
    render: (data, showTooltip) => (
      <Field
        key="participants-reached"
        icon={faLinkSlash}
        showTooltip={showTooltip}
        label1="Participants reached"
        iconColor={colors.ttahubOrange}
        backgroundColor={colors.ttahubOrangeLight}
        tooltipText="Participants reached"
        data={data.participants.count}
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
    reports: PropTypes.shape({
      count: PropTypes.string,
      total: PropTypes.string,
      percent: PropTypes.string,
    }),
    eclkc: PropTypes.shape({
      count: PropTypes.string,
      total: PropTypes.string,
      percent: PropTypes.string,
    }),
    recipients: PropTypes.shape({
      count: PropTypes.string,
    }),
    participants: PropTypes.shape({
      count: PropTypes.string,
    }),

  }),
  loading: PropTypes.bool,
  fields: PropTypes.arrayOf(PropTypes.string),
  showTooltips: PropTypes.bool,
};

ResourcesDashboardOverviewWidget.defaultProps = {
  data: {
    reports: {
      count: '0',
      total: '0',
      percent: '0%',
    },
    eclkc: {
      count: '0',
      total: '0',
      percent: '0%',
    },
    recipients: {
      count: '0',
    },
    participants: {
      count: '0',
    },
  },
  loading: false,
  showTooltips: false,
  fields: [
    'Reports with resources',
    'ECLKC Resources',
    'Recipients reached',
    'Participants reached',
  ],

};

export default withWidgetData(ResourcesDashboardOverviewWidget, 'resourcesDashboardOverview');
