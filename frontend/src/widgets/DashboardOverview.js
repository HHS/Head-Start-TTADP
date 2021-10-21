import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartBar, faUserFriends, faUser, faClock, faBuilding,
} from '@fortawesome/free-solid-svg-icons';
import withWidgetData from './withWidgetData';
import './DashboardOverview.css';
import FormatNumber from './WidgetHelper';
import Loader from '../components/Loader';

function Field({
  label, labelExt, data, icon, iconColor, backgroundColor, decimalPlaces,
}) {
  return (
    <Grid gap={4} desktop={{ col: 'fill' }} tablet={{ col: 6 }} mobileLg={{ col: 12 }} className="smart-hub--dashboard-overview-field margin-bottom-1 display-flex bg-white shadow-2 padding-2">
      <span className="smart-hub--dashboard-overview-field-icon flex-1 display-flex flex-justify-center flex-align-center">
        <span className="smart-hub--dashboard-overview-field-icon-background display-flex flex-justify-center flex-align-center" style={{ backgroundColor }}>
          <FontAwesomeIcon color={iconColor} icon={icon} />
        </span>
      </span>
      <span className="smart-hub--dashboard-overview-field-label display-flex flex-2 flex-column flex-justify-center">
        <span className="text-bold smart-hub--overview-font-size">{FormatNumber(data, decimalPlaces)}</span>
        {label}
        {' '}
        {labelExt}
      </span>
    </Grid>
  );
}

Field.propTypes = {
  label: PropTypes.string.isRequired,
  labelExt: PropTypes.string,
  data: PropTypes.string.isRequired,
  decimalPlaces: PropTypes.number,
  icon: PropTypes.shape({
    prefix: PropTypes.string,
    iconName: PropTypes.string,
    // eslint-disable-next-line react/forbid-prop-types
    icon: PropTypes.array,
  }).isRequired,
  iconColor: PropTypes.string.isRequired,
  backgroundColor: PropTypes.string.isRequired,
};

Field.defaultProps = {
  labelExt: '',
  decimalPlaces: 0,
};

const DASHBOARD_FIELDS = [
  {
    key: 'Activity reports',
    render: (data) => <Field icon={faChartBar} iconColor="#148439" backgroundColor="#F0FCF4" label="Activity reports" data={data.numReports} />,
  },
  {
    key: 'Grants served',
    render: (data) => <Field icon={faBuilding} iconColor="#2B7FB9" backgroundColor="#E2EFF7" label="Grants served" data={data.numGrants} />,
  },
  {
    key: 'Participants',
    render: (data) => <Field icon={faUserFriends} iconColor="#264A64" backgroundColor="#ECEEF1" label="Participants" data={data.numParticipants} />,
  },
  {
    key: 'Hours of TTA',
    render: (data) => <Field icon={faClock} iconColor="#E29F4D" backgroundColor="#FFF1E0" label="Hours of TTA" data={data.sumDuration} decimalPlaces={1} />,
  },
  {
    key: 'In-person activities',
    render: (data) => <Field icon={faUser} iconColor="#A12854" backgroundColor="#FFE8F0" label="In-person activities" data={data.inPerson} />,
  },
];

export function DashboardOverviewWidget({ data, loading, fields }) {
  return (
    <Grid row className="smart-hub--dashboard-overview margin-bottom-3 position-relative">
      <Loader loading={loading} loadingLabel="Overview loading" />
      { fields.map((field) => {
        const fieldToDisplay = DASHBOARD_FIELDS.find((dbField) => dbField.key === field);
        if (fieldToDisplay) {
          return fieldToDisplay.render(data);
        }

        return null;
      })}
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
  }),
  loading: PropTypes.bool,
  fields: PropTypes.arrayOf(PropTypes.string),
};

DashboardOverviewWidget.defaultProps = {
  data: {
    numParticipants: '0',
    numReports: '0',
    numGrants: '0',
    sumDuration: '0',
    inPerson: '0',
  },
  loading: false,
  fields: [
    'Activity reports',
    'Grants served',
    'Participants',
    'Hours of TTA',
    'In-person activities',
  ],
};

export default withWidgetData(DashboardOverviewWidget, 'dashboardOverview');
