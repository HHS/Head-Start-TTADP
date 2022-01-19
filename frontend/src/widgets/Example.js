import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';
import withWidgetData from './withWidgetData';
import Container from '../components/Container';

function Field({ label, data, col }) {
  return (
    <Grid col={col}>
      <span className="text-bold">{label}</span>
      <br />
      {data}
    </Grid>
  );
}

Field.propTypes = {
  label: PropTypes.string.isRequired,
  data: PropTypes.string.isRequired,
  col: PropTypes.number,
};

Field.defaultProps = {
  col: 2,
};

/*
  Widgets only have to worry about presenting data. Filtering of the data happens at a
  higher level, which is why this component is wrapped with `withWidgetData`. `withWidgetData`
  takes care of fetching data, flagging the component as loading and handling errors while
  fetching data. Widgets are only rendered after data has been successfully loaded from the
  API. Note the `example` passed as a 2nd parameter to `withWidgetData` must match the widget
  id in the backend `src/widgets/index.js` file or you will get 404s.
*/
function Example({ data }) {
  return (
    <Container>
      <Grid row>
        <Field label="Recipients served" data={data.numRecipients} />
        <Field label="Activity reports" data={data.numReports} />
        <Field label="Recipient requests" data={data.numRecipientRequests} />
        <Field label="Regional Office requests" data={data.numRegionalOfficeRequests} />
        <Field label="Hours of TTA" data={data.sumDuration} />
        <Field label="Complete Objectives" data={data.numCompleteObjectives} />
      </Grid>
    </Container>
  );
}

Example.propTypes = {
  data: PropTypes.shape({
    numReports: PropTypes.string,
    numRecipients: PropTypes.string,
    numRecipientRequests: PropTypes.string,
    numRegionalOfficeRequests: PropTypes.string,
    sumDuration: PropTypes.string,
    numCompleteObjectives: PropTypes.string,
  }).isRequired,
};

export default withWidgetData(Example, 'example');
