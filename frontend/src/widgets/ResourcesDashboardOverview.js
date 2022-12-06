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
  'Recipient With Resources': {
    render: (data, showTooltip) => (
      <Field
        key="recipient-resources"
        icon={faLink}
        showTooltip={showTooltip}
        label1={`${data.recipient.numResources === 1 ? 'Recipients rec\'d resource' : 'Recipients rec\'d resources'}`}
        label2={`${data.recipient.numResources} of ${data.recipient.num}`}
        iconColor={colors.success}
        backgroundColor={colors.successLighter}
        tooltipText={data.recipient.numResources === 1 ? 'Recipients rec\'d resource' : 'Recipients rec\'d resources'}
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
        label1={`${data.recipient.numEclkc === 1 ? 'Recipients rec\'d ECLKC resource' : 'Recipients rec\'d ECLKC resources'}`}
        label2={`${data.recipient.numEclkc} of ${data.recipient.num}`}
        iconColor={colors.success}
        backgroundColor={colors.successLighter}
        tooltipText={data.recipient.numEclkc === 1 ? 'Recipients rec\'d ECLKC resource' : 'Recipients rec\'d ECLKC resources'}
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
        label1={`${data.recipient.numNonEclkc === 1 ? 'Recipients rec\'d non-ECLKC resource' : 'Recipients rec\'d non-ECLKC resources'}`}
        label2={`${data.recipient.numNonEclkc} of ${data.recipient.num}`}
        iconColor={colors.ttahubMediumBlue}
        backgroundColor={colors.ttahubBlueLight}
        tooltipText={data.recipient.numNonEclkc === 1 ? 'Recipients rec\'d non-ECLKC resource' : 'Recipients rec\'d non-ECLKC resources'}
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
        label1={`${data.recipient.numNoResources === 1 ? 'Recipients rec\'d no resource' : 'Recipients rec\'d no resources'}`}
        label2={`${data.recipient.numNoResources} of ${data.recipient.num}`}
        iconColor={colors.ttahubOrange}
        backgroundColor={colors.ttahubOrangeLight}
        tooltipText={data.recipient.numNoResources === 1 ? 'Recipients rec\'d no resource' : 'Recipients rec\'d no resources'}
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
        label1={`${data.report.numResources === 1 ? 'Report include resources' : 'Reports include resources'}`}
        label2={`${data.report.numResources} of ${data.report.num}`}
        iconColor={colors.success}
        backgroundColor={colors.successLighter}
        tooltipText={data.report.numResources === 1 ? 'Report include resources' : 'Reports include resources'}
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
        label1={`${data.report.numEclkc === 1 ? 'Report include ECLKC resources' : 'Reports include ECLKC resources'}`}
        label2={`${data.report.numEclkc} of ${data.report.num}`}
        iconColor={colors.success}
        backgroundColor={colors.successLighter}
        tooltipText={data.report.numEclkc === 1 ? 'Report include ECLKC resources' : 'Reports include ECLKC resources'}
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
        label1={`${data.report.numNonEclkc === 1 ? 'Report include non-ECLKC resources' : 'Reports include non-ECLKC resources'}`}
        label2={`${data.report.numNonEclkc} of ${data.report.num}`}
        iconColor={colors.ttahubMediumBlue}
        backgroundColor={colors.ttahubBlueLight}
        tooltipText={data.report.numNonEclkc === 1 ? 'Report include non-ECLKC resources' : 'reports include non-ECLKC resources'}
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
        label1={`${data.report.numNoResources === 1 ? 'Report include no resources' : 'Reports include no resources'}`}
        label2={`${data.report.numNoResources} of ${data.report.num}`}
        iconColor={colors.ttahubOrange}
        backgroundColor={colors.ttahubOrangeLight}
        tooltipText={data.report.numNoResources === 1 ? 'Report include no resources' : 'Reports include no resources'}
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
        label1={`${data.resource.numEclkc === 1 ? 'ECLKC Resource' : 'ECLKC Resources'}`}
        label2={`${data.resource.numEclkc} of ${data.resource.num}`}
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
        label1={`${data.resource.numNonEclkc === 1 ? 'Non-ECLKC Resource' : 'Non-ECLKC Resources'}`}
        label2={`${data.resource.numNonEclkc} of ${data.resource.num}`}
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
