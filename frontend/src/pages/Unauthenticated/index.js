import React from 'react';
import PropTypes from 'prop-types';
import {
  Link, Alert,
} from '@trussworks/react-uswds';
import Container from '../../components/Container';

function Unauthenticated({ loggedOut }) {
  return (
    <Container>
      {loggedOut
      && (
      <Alert type="success" heading="Logout Successful">
        You have successfully logged out of the TTA Smart Hub
      </Alert>
      )}
      <h1>
        Welcome to the TTA Smart Hub!
      </h1>
      <p>
        Login via HSES to continue
      </p>
      <Link className="usa-button" variant="unstyled" href="api/login">
        HSES Login
      </Link>
    </Container>
  );
}

Unauthenticated.propTypes = {
  loggedOut: PropTypes.bool,
};

Unauthenticated.defaultProps = {
  loggedOut: false,
};

export default Unauthenticated;
