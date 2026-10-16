import { Alert } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React, { useContext, useEffect, useState } from 'react';
import { verifyEmailToken } from '../../fetchers/users';
import UserContext from '../../UserContext';

export default function EmailVerifier({ token, updateUser }) {
  const { user } = useContext(UserContext);
  const [verified, setVerified] = useState(null);

  useEffect(() => {
    if (verified) return;
    if (!token) return;

    const validationStatus = user.validationStatus || [];
    const emailValidation = validationStatus.find((status) => status.type === 'email');
    if (emailValidation?.validatedAt) {
      setVerified(true);
      return;
    }

    verifyEmailToken(token)
      .then(() => {
        setVerified(true);
        const validation = { ...emailValidation, type: 'email', validatedAt: true };

        const newUser = {
          ...user,
          validationStatus: validationStatus
            .filter((status) => status.type !== 'email')
            .concat(validation),
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
        <Alert type="success" className="margin-bottom-3">
          Your email has been verified!
        </Alert>
      )}

      {verified === false && (
        <Alert type="error" className="margin-bottom-3">
          Your email could not be verified. Please request a new verification email.
        </Alert>
      )}

      {token && verified === null && (
        <Alert type="info" className="margin-bottom-3">
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
