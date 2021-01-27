import React from 'react';
import PropTypes from 'prop-types';
import { GridContainer } from '@trussworks/react-uswds';

function MainLayout({
  children}) {
  return (
    <GridContainer>
      {children}
    </GridContainer>
  );
}

MainLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default MainLayout;
