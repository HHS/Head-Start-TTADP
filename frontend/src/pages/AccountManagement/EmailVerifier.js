import { Alert } from '@trussworks/react-uswds';
import React, { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { verifyEmailToken } from '../../fetchers/users';
import UserContext from '../../UserContext';

export default function EmailVerifier({ token, updateUser }) {
  const { user } = useContext(UserContext);
  const [verified, setVerified] = useState(null);

  useEffect(() => {
    if (verified) return;
    if (!token) return;

    verifyEmailToken(token)
      .then(() => {
        setVerified(true);
        // Get the first validationStatus object in user.validationStatus where type is email.
        // There should only ever be one of these anyways.
        const validation = user.validationStatus.find((s) => s.type === 'email');

        // Set the verified field to true. This is hacky because normally this would
        // be a date - but for now this avoids having to making another API call to update the user,
        // and validatedAt (in date form) isn't used by the UI.
        validation.validatedAt = true;

        const newUser = {
          ...user,
          validationStatus: user.validationStatus.filter((s) => s.type !== 'email').concat(validation),
        };

        updateUser(newUser);
      })
      .catch(() => {
        setVerified(false);
      });
  }, [token, updateUser, user, verified]);

  return (
    <>
      {verified === true && (
        <Alert type="success">
          Your email has been verified!
        </Alert>
      )}

      {verified === false && (
        <Alert type="error">
          Your email could not be verified.
          Please return to account management to request a new verification email.
        </Alert>
      )}

      {token && verified === null && (
        <Alert type="info">
          Please wait while your email is being verified...
        </Alert>
      )}
    </>
  );
}

EmailVerifier.propTypes = {
  updateUser: PropTypes.func.isRequired,
  token: PropTypes.string,
};

EmailVerifier.defaultProps = {
  token: null,
};
