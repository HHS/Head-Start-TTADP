import React from 'react';
import PropTypes from 'prop-types';
import {
  Link, Alert,
} from '@trussworks/react-uswds';
import Container from '../../components/Container';

function Unauthenticated({ loggedOut, timedOut }) {
  let msg = 'You have successfully logged out of the TTA Smart Hub';
  let type = 'success';
  let heading = 'Logout Successful';

  if (timedOut) {
    msg = 'You have been logged out due to inactivity';
    type = 'info';
    heading = 'Logout due to inactivity';
  }

  return (
    <Container>
      {loggedOut
      && (
      <Alert type={type} heading={heading}>
        {msg}
      </Alert>
      )}
      <h1>
        Welcome to the TTA Smart Hub!
      </h1>
      <p>
        Login via HSES to continue
      </p>
      <Link referrerPolicy="same-origin" className="usa-button" variant="unstyled" href="/api/login">
        HSES Login
      </Link>
    </Container>
  );
}

Unauthenticated.propTypes = {
  loggedOut: PropTypes.bool,
  timedOut: PropTypes.bool,
};

Unauthenticated.defaultProps = {
  loggedOut: false,
  timedOut: false,
};

export default Unauthenticated;
