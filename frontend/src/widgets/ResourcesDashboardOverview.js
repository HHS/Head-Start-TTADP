import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLink,
  faCube,
  faUser,
  faUserFriends,
  faFolder,
} from '@fortawesome/free-solid-svg-icons';
import './ResourcesDashboardOverview.css';

import Loader from '../components/Loader';
import Tooltip from '../components/Tooltip';
import colors from '../colors';

export function Field({
  label1,
  label2,
  route,
  data,
  icon,
  iconColor,
  backgroundColor,
  showTooltip,
  tooltipText,
}) {
  return (
    <Grid gap={4} desktop={{ col: 'fill' }} tablet={{ col: 5 }} mobileLg={{ col: 12 }} className="smart-hub--resources-dashboard-overview-field margin-bottom-1 display-flex bg-white shadow-2 padding-y-2 padding-x-1">
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

Field.propTypes = {
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
};

Field.defaultProps = {
  tooltipText: '',
  showTooltip: false,
  label2: '',
  route: null,
};
const DASHBOARD_FIELDS = {
  'Reports with resources': {
    render: (data, showTooltip) => (
      <Field
        key="report-resources"
        icon={faLink}
        showTooltip={showTooltip}
        label1="Reports with resources"
        label2={`${data.report.numResources} of ${data.report.num}`}
        iconColor={colors.success}
        backgroundColor={colors.ttahubDeepTealLight}
        tooltipText="AR's that cite at least one resource"
        data={data.report.percentResources}
      />
    ),
  },
  'ECLKC Resources': {
    render: (data, showTooltip) => (
      <Field
        key="eclkc-resources"
        icon={faCube}
        showTooltip={showTooltip}
        label1="ECLKC resources"
        label2={`${data.resource.numEclkc} of ${data.resource.num}`}
        iconColor={colors.ttahubBlue}
        backgroundColor={colors.ttahubBlueLight}
        tooltipText="Percentage of all cited resources that are from ECLKC"
        data={data.resource.percentEclkc}
      />
    ),
  },
  'Recipients reached': {
    render: (data, showTooltip) => (
      <Field
        key="recipient-reached"
        icon={faUser}
        showTooltip={showTooltip}
        label1="Recipients reached"
        iconColor={colors.ttahubMagenta}
        backgroundColor={colors.ttahubMagentaLight}
        tooltipText="Total recipients of ARs that cite at least one resource"
        data={data.recipient.numResources}
      />
    ),
  },
  'Participants reached': {
    render: (data, showTooltip) => (
      <Field
        key="participants-reached"
        icon={faUserFriends}
        showTooltip={showTooltip}
        label1="Participants reached"
        iconColor={colors.ttahubOrange}
        backgroundColor={colors.ttahubOrangeLight}
        tooltipText="Total participants of ARs that cite at least one resource"
        data={data.participant.numParticipants}
      />
    ),
  },
  'Reports citing iPD courses': {
    render: (data) => (
      <Field
        key="reports-citing-ipd-courses"
        icon={faFolder}
        showTooltip={false}
        label1="Reports citing iPD courses"
        iconColor={colors.baseDark}
        backgroundColor={colors.baseLightest}
        tooltipText="Total participants of ARs that cite at least one resource"
        data={data.ipdCourses.percentReports}
        route={{
          to: '/dashboards/ipd-courses',
          label: 'Display details',
        }}
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
    report: PropTypes.shape({
      percentResources: PropTypes.string,
      numResources: PropTypes.string,
      num: PropTypes.string,
    }),
    resource: PropTypes.shape({
      count: PropTypes.string,
      total: PropTypes.string,
      percent: PropTypes.string,
    }),
    recipient: PropTypes.shape({
      numResources: PropTypes.string,
    }),
    participant: PropTypes.shape({
      numParticipants: PropTypes.string,
    }),

  }),
  loading: PropTypes.bool,
  fields: PropTypes.arrayOf(PropTypes.string),
  showTooltips: PropTypes.bool,
};

ResourcesDashboardOverviewWidget.defaultProps = {
  data: {
    report: {
      numResources: '0',
      num: '0',
      percentResources: '0%',
    },
    resource: {
      numEclkc: '0',
      num: '0',
      percentEclkc: '0%',
    },
    recipient: {
      numResources: '0',
    },
    participant: {
      numParticipants: '0',
    },
    ipdCourses: {
      percentReports: '0%',
    },
  },
  loading: false,
  showTooltips: false,
  fields: [
    'Reports with resources',
    'ECLKC Resources',
    'Recipients reached',
    'Participants reached',
    'Reports citing iPD courses',
  ],
};

export default ResourcesDashboardOverviewWidget;
