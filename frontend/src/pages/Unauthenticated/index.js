import React from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Link,
} from '@trussworks/react-uswds';

import logo1x from '../../images/eclkc-blocks-logo-78.png';
import logo2x from '../../images/eclkc-blocks-logo-156.png';

import HubIdentifier from '../../components/HubIdentifier';

function Unauthenticated({ loggedOut, timedOut }) {
  let msg = 'You have successfully logged out of the TTA Hub';
  let type = 'success';
  let heading = <>Logout Successful</>;

  if (timedOut) {
    msg = 'You have been logged out due to inactivity';
    type = 'info';
    heading = 'Logout due to inactivity';
  }

  return (
    <div className="display-flex flex-column height-viewport">
      <div role="dialog" aria-labelledby="welcome-message" aria-describedby="login-description" className="position-relative margin-x-auto margin-top-7 z-top flex-1">
        <div className="maxw-mobile margin-x-auto padding-y-7">
          <img src={logo1x} srcSet={`${logo2x} 2x`} width="78" height="78" alt="ECLKC Blocks Logo" className="smart-hub-logo display-block margin-x-auto" />
          <h1 id="welcome-message" className="font-serif-xl text-center margin-4">
            Welcome to the TTA Hub
          </h1>
          {loggedOut ? (
            <Alert type={type} heading={heading} headingLevel="h2">
              {msg}
            </Alert>
          ) : null}
          <div className="text-center margin-top-4">
            <p id="login-description">
              You must log in with HSES in order to access the Office of Head Start TTA Hub.
            </p>
            <Link referrerPolicy="same-origin" className="usa-button display-block margin-x-1 margin-top-4" variant="unstyled" href="/api/login">
              Log In with HSES
            </Link>
          </div>
        </div>
      </div>
      <HubIdentifier />
    </div>
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
