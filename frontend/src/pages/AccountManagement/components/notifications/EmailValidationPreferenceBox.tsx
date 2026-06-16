import { Alert, Button } from '@trussworks/react-uswds';
import React, { useState } from 'react';
import { useParams } from 'react-router';
import Container from '../../../../components/Container';

import EmailVerifier from '../../EmailVerifier';

export default function EmailValidationPreferenceBox({
  emailVerificationSent,
  emailValidated,
  updateUser,
  sendVerificationEmail,
  verificationEmailSendError,
}: {
  emailVerificationSent: boolean;
  emailValidated: boolean;
  updateUser: (user: { id: number }) => void;
  sendVerificationEmail: () => void;
  verificationEmailSendError: boolean | string;
}): JSX.Element {
  const [showVerifier, _setShowVerifier] = useState(true);

  const { token } = useParams();

  if (emailValidated) {
    return null;
  }

  return (
    <Container>
      {showVerifier && <EmailVerifier token={token} updateUser={updateUser} />}

      {!emailValidated && !emailVerificationSent && (
        <Alert headingLevel="h3" type="warning">
          Your email address isn&apos;t verified. Select &apos;Send verification email&apos; below.
        </Alert>
      )}

      {!emailValidated && emailVerificationSent && (
        <Alert headingLevel="h3" type="info">
          Verification email sent. Check your inbox.
          <br />
          If you don&apos;t receive an email within thirty minutes, check your spam folder,
          then&nbsp;
          <a
            href="https://app.smartsheetgov.com/b/form/f0b4725683f04f349a939bd2e3f5425a"
            target="_blank"
            rel="noopener noreferrer"
          >
            request support
          </a>
          .
        </Alert>
      )}

      {!emailValidated && (
        <>
          <h2 className="font-serif-xl">Verify email address</h2>
          <p>
            To receive TTA Hub email notifications, you must verify your email address.
            <Button
              data-testid="send-verification-email-button"
              className="display-block margin-top-3"
              onClick={sendVerificationEmail}
              type="button"
            >
              {emailVerificationSent ? 'Resend verification email' : 'Send verification email'}
            </Button>
          </p>
        </>
      )}

      {verificationEmailSendError && (
        <Alert headingLevel="h3" type="error">
          {verificationEmailSendError}
        </Alert>
      )}
    </Container>
  );
}
