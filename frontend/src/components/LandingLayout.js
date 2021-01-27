import React from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@trussworks/react-uswds';

function LandingLayout({
  children}) {
  return (
    <Grid row>
      <Grid tablet={{ col: true }}>{children}</Grid>
    </Grid>
  );
}

LandingLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default LandingLayout;
