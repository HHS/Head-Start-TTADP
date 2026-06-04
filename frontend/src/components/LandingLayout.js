import { Grid } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React from 'react';

function LandingLayout({ children }) {
  return (
    <Grid row>
      <Grid tablet={{ col: true }} className="smart-hub--fit-content">
        {children}
      </Grid>
    </Grid>
  );
}

LandingLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default LandingLayout;
