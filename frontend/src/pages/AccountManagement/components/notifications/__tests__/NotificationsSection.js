/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import NotificationsSection from '../NotificationsSection';

jest.mock(
  '../NotificationsGroupController',
  () =>
    function MockNotificationsGroupController({ setDisplayAlert }) {
      return (
        <button
          type="button"
          data-testid="trigger-alert-group"
          onClick={() => setDisplayAlert(true)}
        >
          trigger group alert
        </button>
      );
    }
);

jest.mock(
  '../NotificationsRow',
  () =>
    function MockNotificationsRow({ id, setDisplayAlert }) {
      return (
        <button
          type="button"
          data-testid={`trigger-alert-row-${id}`}
          onClick={() => setDisplayAlert(true)}
        >
          {`trigger row alert ${id}`}
        </button>
      );
    }
);

const ALERT_TEXT = /you must verify your email before setting email preferences/i;

function renderSection(props = {}) {
  const {
    clearAlerts,
    emailVerified = false,
    emailVerificationSent = false,
    sendVerificationEmail = jest.fn(),
    items = [{ id: 'Approved', label: 'Approved reports' }],
    groupController,
    omitClearAlerts = false,
  } = props;

  function Wrapper({ clearAlertsProp }) {
    const methods = useForm();
    const sectionProps = {
      emailVerified,
      emailVerificationSent,
      sendVerificationEmail,
      items,
      groupController,
    };

    if (!omitClearAlerts) {
      sectionProps.clearAlerts = clearAlertsProp;
    }

    return (
      <FormProvider {...methods}>
        <NotificationsSection {...sectionProps} />
      </FormProvider>
    );
  }

  const utils = render(<Wrapper clearAlertsProp={clearAlerts} />);
  return {
    ...utils,
    rerenderWith: (clearAlertsProp) =>
      utils.rerender(<Wrapper clearAlertsProp={clearAlertsProp} />),
  };
}

describe('NotificationsSection alert clearing', () => {
  it('renders the verification alert after a row sets displayAlert to true', () => {
    renderSection({ clearAlerts: false });

    expect(screen.queryByText(ALERT_TEXT)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('trigger-alert-row-Approved'));

    expect(screen.getByText(ALERT_TEXT)).toBeInTheDocument();
  });

  it('renders the verification alert after the group controller sets displayAlert to true', () => {
    renderSection({
      clearAlerts: false,
      groupController: { name: 'ReportUpdates', ids: ['Approved'], label: 'All' },
    });

    fireEvent.click(screen.getByTestId('trigger-alert-group'));

    expect(screen.getByText(ALERT_TEXT)).toBeInTheDocument();
  });

  it('hides a visible alert when clearAlerts transitions from false to true', () => {
    const { rerenderWith } = renderSection({ clearAlerts: false });

    fireEvent.click(screen.getByTestId('trigger-alert-row-Approved'));
    expect(screen.getByText(ALERT_TEXT)).toBeInTheDocument();

    rerenderWith(true);

    expect(screen.queryByText(ALERT_TEXT)).not.toBeInTheDocument();
  });

  it('does not affect alert visibility while clearAlerts remains false', () => {
    const { rerenderWith } = renderSection({ clearAlerts: false });

    fireEvent.click(screen.getByTestId('trigger-alert-row-Approved'));
    expect(screen.getByText(ALERT_TEXT)).toBeInTheDocument();

    rerenderWith(false);

    expect(screen.getByText(ALERT_TEXT)).toBeInTheDocument();
  });

  it('keeps the alert hidden across repeated truthy clearAlerts transitions', () => {
    const { rerenderWith } = renderSection({ clearAlerts: false });

    fireEvent.click(screen.getByTestId('trigger-alert-row-Approved'));
    expect(screen.getByText(ALERT_TEXT)).toBeInTheDocument();

    rerenderWith(true);
    expect(screen.queryByText(ALERT_TEXT)).not.toBeInTheDocument();

    rerenderWith(false);
    expect(screen.queryByText(ALERT_TEXT)).not.toBeInTheDocument();

    rerenderWith(true);
    expect(screen.queryByText(ALERT_TEXT)).not.toBeInTheDocument();
  });

  it('re-hides the alert if displayAlert is re-triggered and clearAlerts cycles again', () => {
    const { rerenderWith } = renderSection({ clearAlerts: false });

    fireEvent.click(screen.getByTestId('trigger-alert-row-Approved'));
    rerenderWith(true);
    expect(screen.queryByText(ALERT_TEXT)).not.toBeInTheDocument();

    rerenderWith(false);
    fireEvent.click(screen.getByTestId('trigger-alert-row-Approved'));
    expect(screen.getByText(ALERT_TEXT)).toBeInTheDocument();

    rerenderWith(true);
    expect(screen.queryByText(ALERT_TEXT)).not.toBeInTheDocument();
  });

  it('treats an omitted clearAlerts prop the same as false', () => {
    renderSection({ omitClearAlerts: true });

    fireEvent.click(screen.getByTestId('trigger-alert-row-Approved'));

    expect(screen.getByText(ALERT_TEXT)).toBeInTheDocument();
  });

  it('shows the "Send verification email" button label when no verification email has been sent', () => {
    renderSection({ clearAlerts: false, emailVerificationSent: false });

    fireEvent.click(screen.getByTestId('trigger-alert-row-Approved'));

    expect(screen.getByRole('button', { name: 'Send verification email' })).toBeInTheDocument();
  });

  it('shows the "Resend verification email" button label after a verification email was sent', () => {
    renderSection({ clearAlerts: false, emailVerificationSent: true });

    fireEvent.click(screen.getByTestId('trigger-alert-row-Approved'));

    expect(screen.getByRole('button', { name: 'Resend verification email' })).toBeInTheDocument();
  });

  it('invokes sendVerificationEmail when the alert button is clicked', () => {
    const sendVerificationEmail = jest.fn();
    renderSection({ clearAlerts: false, sendVerificationEmail });

    fireEvent.click(screen.getByTestId('trigger-alert-row-Approved'));
    fireEvent.click(screen.getByRole('button', { name: 'Send verification email' }));

    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
  });
});
