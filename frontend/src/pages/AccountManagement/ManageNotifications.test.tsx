import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import AppLoadingContext from '../../AppLoadingContext';
import UserContext from '../../UserContext';
import ManageNotifications from './ManageNotifications';

jest.mock('./EmailVerifier', () => () => <div data-testid="email-verifier" />);

jest.mock('./components/notifications/ActivityReportNotifications', () => {
  const { useFormContext } = require('react-hook-form');

  return function MockActivityReportNotifications() {
    const { register } = useFormContext();

    return (
      <div data-testid="activity-report-notifications">
        <label htmlFor="emailWhenReportSubmittedForReview">Submitted for review</label>
        <select
          id="emailWhenReportSubmittedForReview"
          name="emailWhenReportSubmittedForReview"
          ref={register}
        >
          <option value="never">Never</option>
          <option value="immediately">Immediately</option>
          <option value="today">Daily digest</option>
          <option value="this week">Weekly digest</option>
          <option value="this month">Monthly digest</option>
        </select>
      </div>
    );
  };
});

jest.mock('./components/notifications/CollabReportNotifications', () => {
  const { useFormContext } = require('react-hook-form');

  return function MockCollabReportNotifications() {
    const { register } = useFormContext();

    return (
      <div data-testid="collab-report-notifications">
        {[
          'emailWhenChangeRequested',
          'emailWhenReportApproval',
          'emailWhenAppointedCollaborator',
        ].map((name) => (
          <div key={name}>
            <label htmlFor={name}>{name}</label>
            <select id={name} name={name} ref={register}>
              <option value="never">Never</option>
              <option value="immediately">Immediately</option>
              <option value="today">Daily digest</option>
              <option value="this week">Weekly digest</option>
              <option value="this month">Monthly digest</option>
            </select>
          </div>
        ))}
      </div>
    );
  };
});

jest.mock('./components/notifications/CommunicationLogNotification', () => () => (
  <div data-testid="communication-log-notifications" />
));

jest.mock('./components/notifications/TrainingReportNotifications', () => {
  const { useFormContext } = require('react-hook-form');

  return function MockTrainingReportNotifications() {
    const { register } = useFormContext();

    return (
      <div data-testid="training-report-notifications">
        <label htmlFor="emailWhenRecipientReportApprovedProgramSpecialist">
          Recipient report approved
        </label>
        <select
          id="emailWhenRecipientReportApprovedProgramSpecialist"
          name="emailWhenRecipientReportApprovedProgramSpecialist"
          ref={register}
        >
          <option value="never">Never</option>
          <option value="immediately">Immediately</option>
          <option value="today">Daily digest</option>
          <option value="this week">Weekly digest</option>
          <option value="this month">Monthly digest</option>
        </select>
      </div>
    );
  };
});

jest.mock('./components/notifications/SystemRelatedNotifications', () => () => (
  <div data-testid="system-related-notifications" />
));

jest.mock('./components/notifications/OtherNotifications', () => () => (
  <div data-testid="other-notifications" />
));

describe('ManageNotifications', () => {
  const validatedUser = {
    id: 1,
    validationStatus: [{ type: 'email', validatedAt: '2024-01-01T00:00:00.000Z' }],
  };

  const unvalidatedUser = {
    id: 1,
    validationStatus: [],
  };

  const emailSettings = [
    { key: 'emailWhenReportSubmittedForReview', value: 'this week' },
    { key: 'emailWhenChangeRequested', value: 'today' },
    { key: 'emailWhenReportApproval', value: 'immediately' },
    { key: 'emailWhenAppointedCollaborator', value: 'this week' },
    { key: 'emailWhenRecipientReportApprovedProgramSpecialist', value: 'today' },
  ];

  const renderManageNotifications = ({
    user = validatedUser,
    setIsAppLoading = jest.fn(),
    updateUser = jest.fn(),
  }: {
    user?: { id: number; validationStatus: Array<{ type: string; validatedAt?: string }> };
    setIsAppLoading?: jest.Mock;
    updateUser?: jest.Mock;
  } = {}) =>
    render(
      <MemoryRouter>
        <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading }}>
          <UserContext.Provider value={{ user }}>
            <ManageNotifications updateUser={updateUser} />
          </UserContext.Provider>
        </AppLoadingContext.Provider>
      </MemoryRouter>
    );

  afterEach(() => {
    fetchMock.restore();
    jest.restoreAllMocks();
  });

  it('renders the heading, back link, and all accordion sections', async () => {
    fetchMock.get('/api/settings/email', emailSettings);

    renderManageNotifications();

    expect(screen.getByRole('heading', { name: 'Notification Preferences' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Notifications' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Activity Reports')).toBeInTheDocument();
    });

    [
      'Collaboration Reports',
      'Communication Logs',
      'Training Reports',
      'System Related',
      'Other',
    ].forEach((section) => {
      expect(screen.getByText(section)).toBeInTheDocument();
    });
  });

  it('loads email settings on mount and seeds form values from the response', async () => {
    fetchMock.get('/api/settings/email', emailSettings);

    renderManageNotifications();

    await waitFor(() => expect(fetchMock.called('/api/settings/email')).toBe(true));

    await waitFor(() => {
      expect(screen.getByLabelText('Submitted for review')).toHaveValue('this week');
      expect(screen.getByLabelText('emailWhenChangeRequested')).toHaveValue('today');
      expect(screen.getByLabelText('emailWhenReportApproval')).toHaveValue('immediately');
      expect(screen.getByLabelText('emailWhenAppointedCollaborator')).toHaveValue('this week');
      expect(screen.getByLabelText('Recipient report approved')).toHaveValue('today');
    });
  });

  it('keeps defaults when loading email settings fails', async () => {
    fetchMock.get('/api/settings/email', { throws: new Error('unable to load') });

    renderManageNotifications();

    expect(screen.getByRole('heading', { name: 'Notification Preferences' })).toBeInTheDocument();

    await waitFor(() => expect(fetchMock.called('/api/settings/email')).toBe(true));

    expect(screen.getByLabelText('Submitted for review')).toHaveValue('never');
    expect(screen.getByLabelText('emailWhenChangeRequested')).toHaveValue('never');
    expect(screen.getByLabelText('Recipient report approved')).toHaveValue('never');
  });

  it('toggles app loading around the initial fetch', async () => {
    fetchMock.get('/api/settings/email', emailSettings);
    const setIsAppLoading = jest.fn();

    renderManageNotifications({ setIsAppLoading });

    await waitFor(() => {
      expect(setIsAppLoading).toHaveBeenNthCalledWith(1, true);
      expect(setIsAppLoading).toHaveBeenNthCalledWith(2, false);
    });
  });

  it('shows the activity reports validation alert and does not save when email is unverified', async () => {
    fetchMock.get('/api/settings/email', emailSettings);
    fetchMock.put('/api/settings', 204);

    renderManageNotifications({ user: unvalidatedUser });

    expect(
      screen.getByText(/you must verify your email before setting email preferences/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));

    await waitFor(() => expect(fetchMock.called('/api/settings')).toBe(false));
  });

  it('submits settings for verified users and shows a success alert', async () => {
    fetchMock.get('/api/settings/email', emailSettings);
    fetchMock.put('/api/settings', 204);

    renderManageNotifications();

    fireEvent.change(screen.getByLabelText('Submitted for review'), {
      target: { value: 'today' },
    });
    fireEvent.change(screen.getByLabelText('emailWhenChangeRequested'), {
      target: { value: 'this week' },
    });
    fireEvent.change(screen.getByLabelText('emailWhenReportApproval'), {
      target: { value: 'immediately' },
    });
    fireEvent.change(screen.getByLabelText('emailWhenAppointedCollaborator'), {
      target: { value: 'today' },
    });
    fireEvent.change(screen.getByLabelText('Recipient report approved'), {
      target: { value: 'this week' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));

    await waitFor(() => expect(fetchMock.called('/api/settings')).toBe(true));
    await waitFor(() => {
      expect(screen.getByText('Your preferences have been saved.')).toBeInTheDocument();
    });

    const lastCall = fetchMock.lastCall('/api/settings');
    const payload = JSON.parse(String(lastCall?.[1]?.body));

    expect(payload).toEqual([
      { key: 'emailWhenReportSubmittedForReview', value: 'today' },
      { key: 'emailWhenChangeRequested', value: 'this week' },
      { key: 'emailWhenReportApproval', value: 'immediately' },
      { key: 'emailWhenAppointedCollaborator', value: 'today' },
      { key: 'emailWhenRecipientReportApprovedProgramSpecialist', value: 'this week' },
    ]);
  });

  it('shows an error alert when updating settings fails', async () => {
    fetchMock.get('/api/settings/email', emailSettings);
    fetchMock.put('/api/settings', { throws: new Error('Unable to save preferences') });

    renderManageNotifications();

    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));

    await waitFor(() => {
      expect(
        screen.getByText(/there was an error saving your preferences: unable to save preferences/i)
      ).toBeInTheDocument();
    });
  });

  it('requests a verification email and updates the button label on success', async () => {
    fetchMock.get('/api/settings/email', emailSettings);
    fetchMock.post('/api/users/send-verification-email', 200);

    renderManageNotifications({ user: unvalidatedUser });

    fireEvent.click(screen.getByTestId('send-verification-email-button'));

    await waitFor(() => {
      expect(fetchMock.called('/api/users/send-verification-email')).toBe(true);
      expect(screen.getByTestId('send-verification-email-button')).toHaveTextContent(
        'Resend verification email'
      );
    });
  });

  it('surfaces verification email errors through EmailValidationPreferenceBox', async () => {
    fetchMock.get('/api/settings/email', emailSettings);
    fetchMock.post('/api/users/send-verification-email', {
      throws: new Error('Unable to send verification email'),
    });

    renderManageNotifications({ user: unvalidatedUser });

    fireEvent.click(screen.getByTestId('send-verification-email-button'));

    await waitFor(() => {
      expect(screen.getByText('Unable to send verification email')).toBeInTheDocument();
    });
  });
});
