import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartColumn, faUserFriends, faUser, faClock, faBuilding,
} from '@fortawesome/free-solid-svg-icons';
import withWidgetData from './withWidgetData';
import './DashboardOverview.css';
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
    <Grid gap={4} desktop={{ col: 'fill' }} tablet={{ col: 5 }} mobileLg={{ col: 12 }} className="smart-hub--dashboard-overview-field margin-bottom-1 display-flex bg-white shadow-2 padding-y-2 padding-x-1">
      <span className="smart-hub--dashboard-overview-field-icon flex-1 display-flex flex-justify-center flex-align-center">
        <span className="smart-hub--dashboard-overview-field-icon-background display-flex flex-justify-center flex-align-center" style={{ backgroundColor }}>
          <FontAwesomeIcon color={iconColor} icon={icon} />
        </span>
      </span>
      <span className="smart-hub--dashboard-overview-field-label display-flex flex-2 flex-column flex-justify-center">
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
  'Activity reports': {
    render: (data, showTooltip) => (
      <Field
        key="activity-reports"
        showTooltip={showTooltip}
        tooltipText="The number of approved activity reports."
        icon={faChartColumn}
        iconColor={colors.success}
        backgroundColor={colors.successLighter}
        label="Activity reports"
        data={data.numReports}
      />
    ),
  },
  'Training reports': {
    render: (data, showTooltip) => (
      <Field
        key="training-reports"
        showTooltip={showTooltip}
        tooltipText="Training reports with a completed session"
        icon={faChartColumn}
        iconColor={colors.success}
        backgroundColor={colors.successLighter}
        label={`across ${data.numReports} Training Reports`}
        data={`${data.numSessions} sessions`}
      />
    ),
  },
  'Grants served': {
    render: (data, showTooltip) => (
      <Field
        key="grants-served"
        showTooltip={showTooltip}
        icon={faBuilding}
        iconColor={colors.ttahubMediumBlue}
        backgroundColor={colors.ttahubBlueLight}
        label="Grants served"
        tooltipText="Each grant is only counted once"
        data={data.numGrants}
      />
    ),
  },
  Participants: {
    render: (data, showTooltip) => (
      <Field
        key="participants"
        showTooltip={showTooltip}
        tooltipText="The number of people in all activities"
        icon={faUserFriends}
        iconColor={colors.ttahubBlue}
        backgroundColor={colors.ttahubBlueLighter}
        label="Participants"
        data={data.numParticipants}
      />
    ),
  },
  'Hours of TTA': {
    render: (data, showTooltip) => (
      <Field
        key="hours-of-tta"
        showTooltip={showTooltip}
        tooltipText="Rounded to the nearest half hour"
        icon={faClock}
        iconColor={colors.ttahubOrange}
        backgroundColor={colors.ttahubOrangeLight}
        label="Hours of TTA"
        data={data.sumDuration}
        decimalPlaces={1}
      />
    ),
  },
  'In person activities': {
    render: (data, showTooltip) => (
      <Field
        key="in-person-activities"
        icon={faUser}
        showTooltip={showTooltip}
        tooltipText="Excludes virtual activities"
        iconColor={colors.ttahubMagenta}
        backgroundColor={colors.ttahubMagentaLight}
        label="In person activities"
        data={data.inPerson}
      />
    ),
  },
  'Recipients served': {
    render: (data, showTooltip) => (
      <Field
        key="recipients-served"
        icon={faUser}
        showTooltip={showTooltip}
        label={`${data.numRecipients} ${data.numRecipients === 1 ? 'Recipient' : 'Recipients'} of ${data.totalRecipients}`}
        iconColor={colors.ttahubMagenta}
        backgroundColor={colors.ttahubMagentaLight}
        tooltipText="Recipients have at least one active grant"
        data={data.recipientPercentage}
      />
    ),
  },
};

export function DashboardOverviewWidget({
  data, loading, fields, showTooltips,
}) {
  return (
    <Grid row className="smart-hub--dashboard-overview margin-bottom-3 position-relative">
      <Loader loading={loading} loadingLabel="Overview loading" />
      { fields.map((field) => DASHBOARD_FIELDS[field].render(data, showTooltips, field)) }
    </Grid>
  );
}

DashboardOverviewWidget.propTypes = {
  data: PropTypes.shape({
    numParticipants: PropTypes.string,
    numReports: PropTypes.string,
    numGrants: PropTypes.string,
    sumDuration: PropTypes.string,
    inPerson: PropTypes.string,
    recipientPercentage: PropTypes.string,
    totalRecipients: PropTypes.string,
  }),
  loading: PropTypes.bool,
  fields: PropTypes.arrayOf(PropTypes.string),
  showTooltips: PropTypes.bool,
};

DashboardOverviewWidget.defaultProps = {
  data: {
    numParticipants: '0',
    numReports: '0',
    numGrants: '0',
    sumDuration: '0',
    inPerson: '0',
    totalRecipients: '0',
    recipientPercentage: '0%',
    numRecipients: '0',
  },
  loading: false,
  showTooltips: false,
  fields: [
    'Activity reports',
    'Grants served',
    'Participants',
    'Hours of TTA',
    'In person activities',
  ],
};

export default withWidgetData(DashboardOverviewWidget, 'overview');
