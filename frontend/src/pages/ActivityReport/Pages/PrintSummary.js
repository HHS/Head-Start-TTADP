import React from 'react';
import PropTypes from 'prop-types';
import {
  Grid,
} from '@trussworks/react-uswds';

const PrintSummary = ({ reportCreator = {} }) => {
  const { name = null, roles = null } = reportCreator;
  let creatorText = null;

  if (name && roles && roles.join) {
    creatorText = `${name}, ${roles.map((r) => r.fullName).join(', ')}`;
  } else if (name) {
    creatorText = name;
  }

  return (
    <div className="font-family-sans smart-hub-meta-summary grid-container print-only">
      {creatorText && (
      <Grid row>
        <Grid col={6}>
          Report Creator
        </Grid>
        <Grid col={6}>
          <Grid col={12} className="display-flex flex-align-end flex-column flex-justify-center">
            {creatorText}
          </Grid>
        </Grid>
      </Grid>
      )}
    </div>
  );
};

PrintSummary.propTypes = {
  reportCreator: PropTypes.shape({
    name: PropTypes.string,
    roles: PropTypes.arrayOf(PropTypes.shape({ fullName: PropTypes.string })),
  }),
};
PrintSummary.defaultProps = {
  reportCreator: {
    name: null,
    role: [],
  },
};

export default PrintSummary;
