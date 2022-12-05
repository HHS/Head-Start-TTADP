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
  'Recipient With Resources': {
    render: (data, showTooltip) => (
      <Field
        key="recipient-resources"
        icon={faLink}
        showTooltip={showTooltip}
        label={`${data.recipient.numResources} ${data.recipient.numResources === 1 ? 'recipient with resources' : 'recipients with resources'} of ${data.recipient.num}`}
        iconColor={colors.success}
        backgroundColor={colors.successLighter}
        tooltipText={data.recipient.numResources === 1 ? 'recipient with resources' : 'recipients with resources'}
        data={data.recipient.percentResources}
      />
    ),
  },
  'Recipient With ECLKC Resources': {
    render: (data, showTooltip) => (
      <Field
        key="recipient-eclkc"
        icon={faLink}
        showTooltip={showTooltip}
        label={`${data.recipient.numEclkc} ${data.recipient.numEclkc === 1 ? 'recipient with ECLKC resources' : 'recipients with ECLKC resources'} of ${data.recipient.num}`}
        iconColor={colors.success}
        backgroundColor={colors.successLighter}
        tooltipText={data.recipient.numEclkc === 1 ? 'recipient with ECLKC resources' : 'recipients with ECLKC resources'}
        data={data.recipient.percentEclkc}
      />
    ),
  },
  'Recipient With Non ECLKC Resources': {
    render: (data, showTooltip) => (
      <Field
        key="recipient-noneclkc"
        icon={faExternalLink}
        showTooltip={showTooltip}
        label={`${data.recipient.numNonEclkc} ${data.recipient.numNonEclkc === 1 ? 'recipient with non-ECLKC resources' : 'recipients with non-ECLKC resources'} of ${data.recipient.num}`}
        iconColor={colors.ttahubMediumBlue}
        backgroundColor={colors.ttahubBlueLight}
        tooltipText={data.recipient.numNonEclkc === 1 ? 'recipient with non-ECLKC resources' : 'recipients with non-ECLKC resources'}
        data={data.recipient.percentNonEclkc}
      />
    ),
  },
  'Recipient With No Resources': {
    render: (data, showTooltip) => (
      <Field
        key="recipient-noresources"
        icon={faLinkSlash}
        showTooltip={showTooltip}
        label={`${data.recipient.numNoResources} ${data.recipient.numNoResources === 1 ? 'recipient with no resources' : 'recipients with no resources'} of ${data.recipient.num}`}
        iconColor={colors.ttahubOrange}
        backgroundColor={colors.ttahubOrangeLight}
        tooltipText={data.recipient.numNoResources === 1 ? 'recipient with no resources' : 'recipients with no resources'}
        data={data.recipient.percentNoResources}
      />
    ),
  },
  'Reports With Resources': {
    render: (data, showTooltip) => (
      <Field
        key="reports-resources"
        icon={faLink}
        showTooltip={showTooltip}
        label={`${data.report.numResources} ${data.report.numResources === 1 ? 'report with resources' : 'reports with resources'} of ${data.report.num}`}
        iconColor={colors.success}
        backgroundColor={colors.successLighter}
        tooltipText={data.report.numResources === 1 ? 'report with resources' : 'reports with resources'}
        data={data.report.percentResources}
      />
    ),
  },
  'Reports With ECLKC Resources': {
    render: (data, showTooltip) => (
      <Field
        key="reports-eclkc"
        icon={faLink}
        showTooltip={showTooltip}
        label={`${data.report.numEclkc} ${data.report.numEclkc === 1 ? 'report with ECLKC resources' : 'reports with ECLKC resources'} of ${data.report.num}`}
        iconColor={colors.success}
        backgroundColor={colors.successLighter}
        tooltipText={data.report.numEclkc === 1 ? 'report with ECLKC resources' : 'reports with ECLKC resources'}
        data={data.report.percentEclkc}
      />
    ),
  },
  'Reports With Non ECLKC Resources': {
    render: (data, showTooltip) => (
      <Field
        key="reports-noneclkc"
        icon={faExternalLink}
        showTooltip={showTooltip}
        label={`${data.report.numNonEclkc} ${data.report.numNonEclkc === 1 ? 'report with non-ECLKC resources' : 'reports with non-ECLKC resources'} of ${data.report.num}`}
        iconColor={colors.ttahubMediumBlue}
        backgroundColor={colors.ttahubBlueLight}
        tooltipText={data.report.numNonEclkc === 1 ? 'report with non-ECLKC resources' : 'reports with non-ECLKC resources'}
        data={data.report.percentNonEclkc}
      />
    ),
  },
  'Reports With No Resources': {
    render: (data, showTooltip) => (
      <Field
        key="reports-noresources"
        icon={faLinkSlash}
        showTooltip={showTooltip}
        label={`${data.report.numNoResources} ${data.report.numNoResources === 1 ? 'report with no resources' : 'reports with no resources'} of ${data.report.num}`}
        iconColor={colors.ttahubOrange}
        backgroundColor={colors.ttahubOrangeLight}
        tooltipText={data.report.numNoResources === 1 ? 'report with no resources' : 'reports with no resources'}
        data={data.report.percentNoResources}
      />
    ),
  },
  'Resources From ECLKC': {
    render: (data, showTooltip) => (
      <Field
        key="resources-eclkc"
        icon={faLink}
        showTooltip={showTooltip}
        label={`${data.resource.numEclkc} ${data.resource.numEclkc === 1 ? 'ECLKC Resource' : 'ECLKC Resources'} of ${data.resource.num}`}
        iconColor={colors.success}
        backgroundColor={colors.successLighter}
        tooltipText={data.resource.numEclkc === 1 ? 'ECLKC Resource' : 'ECLKC Resources'}
        data={data.resource.percentEclkc}
      />
    ),
  },
  'Resources From Non ECLKC': {
    render: (data, showTooltip) => (
      <Field
        key="resources-noneclkc"
        icon={faExternalLink}
        showTooltip={showTooltip}
        label={`${data.resource.numNonEclkc} ${data.resource.numNonEclkc === 1 ? 'Non-ECLKC Resource' : 'Non-ECLKC Resources'} of ${data.resource.num}`}
        iconColor={colors.ttahubMediumBlue}
        backgroundColor={colors.ttahubBlueLight}
        tooltipText={data.resource.numNonEclkc === 1 ? 'Non-ECLKC Resource' : 'Non-ECLKC Resources'}
        data={data.resource.percentNonEclkc}
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
    report: {
      num: '0',
      numResources: '0',
      percentResources: '0%',
      numNoResources: '0',
      percentNoResources: '0%',
      numEclkc: '0',
      percentEclkc: '0%',
      numNonEclkc: '0',
      percentNonEclkc: '0%',
    },
    recipient: {
      num: '0',
      numResources: '0',
      percentResources: '0%',
      numNoResources: '0',
      percentNoResources: '0%',
      numEclkc: '0',
      percentEclkc: '0%',
      numNonEclkc: '0',
      percentNonEclkc: '0%',
    },
    resource: {
      num: '0',
      numEclkc: '0',
      percentEclkc: '0%',
      numNonEclkc: '0',
      percentNonEclkc: '0%',
    },
  },
  loading: false,
  showTooltips: false,
  fields: [
    'Recipient With Resources',
    'Recipient With ECLKC Resources',
    'Recipient With Non ECLKC Resources',
    'Recipient With No Resources',
    'Reports With Resources',
    'Reports With ECLKC Resources',
    'Reports With Non ECLKC Resources',
    'Reports With No Resources',
    'Resources From ECLKC',
    'Resources From Non ECLKC',
  ],

};

export default withWidgetData(ResourcesDashboardOverviewWidget, 'resourcesDashboardOverview');
