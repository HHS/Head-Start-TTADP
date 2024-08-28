import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import {
  faLink,
  faCube,
  faUser,
  faUserFriends,
  faFolder,
} from '@fortawesome/free-solid-svg-icons';
import './ResourcesDashboardOverview.css';
import { OverviewWidgetField } from './OverviewWidgetField';

import Loader from '../components/Loader';
import colors from '../colors';

const DASHBOARD_FIELDS = {
  'Reports with resources': {
    render: (data, showTooltip) => (
      <OverviewWidgetField
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
      <OverviewWidgetField
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
      <OverviewWidgetField
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
      <OverviewWidgetField
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
      <OverviewWidgetField
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
