import React from 'react';
import PropTypes from 'prop-types';
import {
  Grid,
} from '@trussworks/react-uswds';

const PrintSummary = ({ reportCreator }) => {
  const { name, role = '' } = reportCreator;

  return (
    <div className="smart-hub-meta-summary grid-container print-only">
      <Grid row>
        <Grid col={6}>
          Report Creator
        </Grid>
        <Grid col={6}>
          <Grid col={12} className="display-flex flex-align-end flex-column flex-justify-center">
            {name}
            {role ? `, ${role}` : ''}
          </Grid>
        </Grid>
      </Grid>
    </div>
  );
};

PrintSummary.propTypes = {
  reportCreator: PropTypes.shape({
    name: PropTypes.string.isRequired,
    role: PropTypes.string.isRequired,
  }).isRequired,
};

export default PrintSummary;
