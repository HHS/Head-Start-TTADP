import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import withWidgetData from './withWidgetData';
import Container from '../components/Container';
import './Overview.css';
import FormatNumber from './WidgetHelper';

function Field({
  label, labelExt, data, col, decimalPlaces,
}) {
  return (
    <Grid col={col} className="smart-hub--overview">
      <span className="text-bold smart-hub--overview-font-size">{FormatNumber(data, decimalPlaces)}</span>
      <br />
      {label}
      <span className="smart-hub--overview-nowrap">{labelExt}</span>
    </Grid>
  );
}

Field.propTypes = {
  label: PropTypes.string.isRequired,
  labelExt: PropTypes.string,
  data: PropTypes.string,
  decimalPlaces: PropTypes.number,
  col: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
};

Field.defaultProps = {
  labelExt: '',
  col: 2,
  data: '',
  decimalPlaces: 0,
};

/*
  Widgets only have to worry about presenting data. Filtering of the data happens at a
  higher level, which is why this component is wrapped with `withWidgetData`. `withWidgetData`
  takes care of fetching data, flagging the component as loading and handling errors while
  fetching data. Widgets are only rendered after data has been successfully loaded from the
  API. Note the `example` passed as a 2nd parameter to `withWidgetData` must match the widget
  id in the backend `src/widgets/index.js` file or you will get 404s.
*/
function Overview({ data, regionLabel, loading }) {
  return (
    <Container className="smart-hub--overview-border" loading={loading} loadingLabel="Overview loading">
      <Grid row className="smart-hub--overview-header">
        <h2>
          Region
          {' '}
          {regionLabel}
          {' '}
          TTA Overview
        </h2>
        <span className="smart-hub--overview-period"> 9/15/2020 to Today</span>
      </Grid>
      <Grid row gap className="smart-hub--overview-data">
        <Field col="fill" tablet={{ col: true }} label="Grants served " data={data.numGrants} />
        <Field col="fill" label="Non-grantee entities served" data={data.numNonGrantees} />
        <Field col="fill" label="Activity reports" data={data.numReports} />
        <Field col="fill" label="Participants" data={data.numParticipants} />
        <Field col={2} label="Hours of TTA" data={data.sumDuration} decimalPlaces={1} />
      </Grid>
    </Container>
  );
}

Overview.propTypes = {
  data: PropTypes.shape({
    numReports: PropTypes.string,
    numGrants: PropTypes.string,
    numNonGrantees: PropTypes.string,
    numTotalGrants: PropTypes.string,
    numParticipants: PropTypes.string,
    sumDuration: PropTypes.string,
  }),
  regionLabel: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  loading: PropTypes.bool.isRequired,
};

Overview.defaultProps = {
  data: {
    numReports: '0',
    numGrants: '0',
    numNonGrantees: '0',
    numTotalGrants: '0',
    numParticipants: '0',
    sumDuration: '0',
  },
};

export default withWidgetData(Overview, 'overview');
