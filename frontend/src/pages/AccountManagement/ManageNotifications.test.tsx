import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import AppLoadingContext from '../../AppLoadingContext';
import UserContext from '../../UserContext';
import ManageNotifications from './ManageNotifications';

const mockClearAlertsCaptures: Record<string, Array<unknown>> = {
  activityReport: [],
  collabReport: [],
  communicationLog: [],
  trainingReport: [],
  systemRelated: [],
  other: [],
};

jest.mock('./EmailVerifier', () => () => <div data-testid="email-verifier" />);

jest.mock('./components/notifications/ActivityReportNotifications', () => {
  const { useFormContext } = require('react-hook-form');

  return function MockActivityReportNotifications(props: { clearAlerts?: boolean }) {
    const { register } = useFormContext();
    mockClearAlertsCaptures.activityReport.push(props.clearAlerts);

    return (
      <div data-testid="activity-report-notifications">
        <span data-testid="activity-report-clear-alerts">{String(props.clearAlerts)}</span>
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

  return function MockCollabReportNotifications(props: { clearAlerts?: boolean }) {
    const { register } = useFormContext();
    mockClearAlertsCaptures.collabReport.push(props.clearAlerts);

    return (
      <div data-testid="collab-report-notifications">
        <span data-testid="collab-report-clear-alerts">{String(props.clearAlerts)}</span>
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

jest.mock(
  './components/notifications/CommunicationLogNotification',
  () =>
    function MockCommunicationLogNotifications(props: { clearAlerts?: boolean }) {
      mockClearAlertsCaptures.communicationLog.push(props.clearAlerts);
      return (
        <div data-testid="communication-log-notifications">
          <span data-testid="communication-log-clear-alerts">{String(props.clearAlerts)}</span>
        </div>
      );
    }
);

jest.mock('./components/notifications/TrainingReportNotifications', () => {
  const { useFormContext } = require('react-hook-form');

  return function MockTrainingReportNotifications(props: { clearAlerts?: boolean }) {
    const { register } = useFormContext();
    mockClearAlertsCaptures.trainingReport.push(props.clearAlerts);

    return (
      <div data-testid="training-report-notifications">
        <span data-testid="training-report-clear-alerts">{String(props.clearAlerts)}</span>
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

jest.mock(
  './components/notifications/SystemRelatedNotifications',
  () =>
    function MockSystemRelatedNotifications(props: { clearAlerts?: boolean }) {
      mockClearAlertsCaptures.systemRelated.push(props.clearAlerts);
      return (
        <div data-testid="system-related-notifications">
          <span data-testid="system-related-clear-alerts">{String(props.clearAlerts)}</span>
        </div>
      );
    }
);

jest.mock(
  './components/notifications/OtherNotifications',
  () =>
    function MockOtherNotifications(props: { clearAlerts?: boolean }) {
      mockClearAlertsCaptures.other.push(props.clearAlerts);
      return (
        <div data-testid="other-notifications">
          <span data-testid="other-clear-alerts">{String(props.clearAlerts)}</span>
        </div>
      );
    }
);

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

  beforeEach(() => {
    Object.keys(mockClearAlertsCaptures).forEach((key) => {
      mockClearAlertsCaptures[key] = [];
    });
  });

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

  describe('clearAlerts propagation', () => {
    const recipientSections = [
      'activityReport',
      'collabReport',
      'communicationLog',
      'trainingReport',
    ] as const;

    const nonRecipientSections = ['systemRelated', 'other'] as const;

    it('starts with clearAlerts === false on every section that accepts the prop', async () => {
      fetchMock.get('/api/settings/email', emailSettings);

      renderManageNotifications();

      await waitFor(() => {
        expect(screen.getByTestId('activity-report-notifications')).toBeInTheDocument();
      });

      recipientSections.forEach((section) => {
        expect(mockClearAlertsCaptures[section]).not.toHaveLength(0);
        expect(mockClearAlertsCaptures[section].every((value) => value === false)).toBe(true);
      });
    });

    it('never forwards clearAlerts to SystemRelated or Other notifications', async () => {
      fetchMock.get('/api/settings/email', emailSettings);
      fetchMock.post('/api/users/send-verification-email', 200);

      renderManageNotifications({ user: unvalidatedUser });

      fireEvent.click(screen.getByTestId('send-verification-email-button'));

      await waitFor(() => {
        expect(fetchMock.called('/api/users/send-verification-email')).toBe(true);
      });

      nonRecipientSections.forEach((section) => {
        expect(mockClearAlertsCaptures[section]).not.toHaveLength(0);
        expect(mockClearAlertsCaptures[section].every((value) => value === undefined)).toBe(true);
      });
    });

    it('toggles clearAlerts true and resets it back to false (one-shot) on each verification request', async () => {
      fetchMock.get('/api/settings/email', emailSettings);
      fetchMock.post('/api/users/send-verification-email', 200);

      renderManageNotifications({ user: unvalidatedUser });

      await waitFor(() => {
        expect(screen.getByTestId('activity-report-notifications')).toBeInTheDocument();
      });

      recipientSections.forEach((section) => {
        mockClearAlertsCaptures[section] = [];
      });

      fireEvent.click(screen.getByTestId('send-verification-email-button'));

      await waitFor(() => {
        recipientSections.forEach((section) => {
          expect(mockClearAlertsCaptures[section]).toContain(true);
        });
      });

      await waitFor(() => {
        recipientSections.forEach((section) => {
          const history = mockClearAlertsCaptures[section];
          expect(history[history.length - 1]).toBe(false);
        });
      });

      recipientSections.forEach((section) => {
        const history = mockClearAlertsCaptures[section];
        const lastTrueIdx = history.lastIndexOf(true);
        expect(lastTrueIdx).toBeGreaterThanOrEqual(0);
        expect(history.slice(lastTrueIdx + 1).every((value) => value === false)).toBe(true);
      });
    });

    it('re-fires the clearAlerts cycle when the verification button is clicked again', async () => {
      fetchMock.get('/api/settings/email', emailSettings);
      fetchMock.post('/api/users/send-verification-email', 200);

      renderManageNotifications({ user: unvalidatedUser });

      await waitFor(() => {
        expect(screen.getByTestId('activity-report-notifications')).toBeInTheDocument();
      });

      recipientSections.forEach((section) => {
        mockClearAlertsCaptures[section] = [];
      });

      fireEvent.click(screen.getByTestId('send-verification-email-button'));

      await waitFor(() => {
        const history = mockClearAlertsCaptures.activityReport;
        expect(history.lastIndexOf(true)).toBeGreaterThanOrEqual(0);
        expect(history[history.length - 1]).toBe(false);
      });

      const trueCountsAfterFirst = recipientSections.map(
        (section) => mockClearAlertsCaptures[section].filter((value) => value === true).length
      );

      fireEvent.click(screen.getByTestId('send-verification-email-button'));

      await waitFor(() => {
        recipientSections.forEach((section, idx) => {
          const totalTrueCount = mockClearAlertsCaptures[section].filter(
            (value) => value === true
          ).length;
          expect(totalTrueCount).toBeGreaterThan(trueCountsAfterFirst[idx]);
        });
      });

      await waitFor(() => {
        recipientSections.forEach((section) => {
          const history = mockClearAlertsCaptures[section];
          expect(history[history.length - 1]).toBe(false);
        });
      });
    });

    it('reflects the current clearAlerts value through the child data-testid after the reset settles', async () => {
      fetchMock.get('/api/settings/email', emailSettings);
      fetchMock.post('/api/users/send-verification-email', 200);

      renderManageNotifications({ user: unvalidatedUser });

      await waitFor(() => {
        expect(screen.getByTestId('activity-report-clear-alerts')).toHaveTextContent('false');
      });

      fireEvent.click(screen.getByTestId('send-verification-email-button'));

      await waitFor(() => {
        expect(screen.getByTestId('activity-report-clear-alerts')).toHaveTextContent('false');
        expect(screen.getByTestId('collab-report-clear-alerts')).toHaveTextContent('false');
        expect(screen.getByTestId('communication-log-clear-alerts')).toHaveTextContent('false');
        expect(screen.getByTestId('training-report-clear-alerts')).toHaveTextContent('false');
      });
    });
  });
});
