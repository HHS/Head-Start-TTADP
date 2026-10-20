import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route } from 'react-router-dom';
import EmailValidationPreferenceBox from '../EmailValidationPreferenceBox';

jest.mock('../../../EmailVerifier', () => () => <div data-testid="email-verifier" />);

describe('EmailValidationPreferenceBox', () => {
  const defaultProps = {
    emailVerificationSent: false,
    emailValidated: false,
    updateUser: jest.fn(),
    sendVerificationEmail: jest.fn(),
    verificationEmailSendError: false,
  };

  const renderBox = (props = {}, initialEntry = '/account/notifications') =>
    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Route path="/account/notifications/:token?">
          <EmailValidationPreferenceBox {...defaultProps} {...props} />
        </Route>
      </MemoryRouter>
    );

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when email is already validated', () => {
    const { container } = renderBox({ emailValidated: true });

    expect(container.firstChild).toBeNull();
  });

  it('shows a warning alert when email is unverified and no verification email has been sent', () => {
    renderBox();

    expect(screen.getByText(/your email address isn't verified/i)).toBeInTheDocument();
  });

  it('shows an info alert when a verification email has been sent', () => {
    renderBox({ emailVerificationSent: true });

    expect(screen.getByText(/verification email sent\. check your inbox\./i)).toBeInTheDocument();
  });

  it('shows a send verification email button before an email has been sent', () => {
    renderBox();

    expect(screen.getByRole('button', { name: /send verification email/i })).toBeInTheDocument();
  });

  it('shows a resend verification email button after an email has been sent', () => {
    renderBox({ emailVerificationSent: true });

    expect(screen.getByRole('button', { name: /resend verification email/i })).toBeInTheDocument();
  });

  it('invokes sendVerificationEmail when the button is clicked', () => {
    const sendVerificationEmail = jest.fn();
    renderBox({ sendVerificationEmail });

    fireEvent.click(screen.getByRole('button', { name: /send verification email/i }));

    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  it('renders an error alert when verificationEmailSendError contains a message', () => {
    renderBox({ verificationEmailSendError: 'Unable to send verification email.' });

    expect(screen.getByText('Unable to send verification email.')).toBeInTheDocument();
  });

  it('does not render an error alert when verificationEmailSendError is false', () => {
    renderBox({ verificationEmailSendError: false });

    expect(
      screen.queryByRole('alert', { name: /unable to send verification email/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Unable to send verification email.')).not.toBeInTheDocument();
  });

  it('renders EmailVerifier when a token route param is present', () => {
    renderBox({}, '/account/notifications/token123');

    expect(screen.getByTestId('email-verifier')).toBeInTheDocument();
  });
});
