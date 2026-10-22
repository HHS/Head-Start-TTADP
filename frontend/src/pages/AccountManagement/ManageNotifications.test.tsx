import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import type { MemoryHistory } from 'history';
import { createMemoryHistory } from 'history';
import React from 'react';
import { MemoryRouter, Router } from 'react-router-dom';
import AppLoadingContext from '../../AppLoadingContext';
import UserContext from '../../UserContext';
import ManageNotifications, { DEFAULT_SETTINGS } from './ManageNotifications';

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
        <label htmlFor="inAppWhenReportSubmittedForReview">In-app submitted for review</label>
        <input
          id="inAppWhenReportSubmittedForReview"
          name="inAppWhenReportSubmittedForReview"
          type="checkbox"
          ref={register}
        />
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
        {[
          'inAppWhenChangeRequested',
          'inAppWhenReportApproval',
          'inAppWhenAppointedCollaborator',
        ].map((name) => (
          <div key={name}>
            <label htmlFor={name}>{name}</label>
            <input id={name} name={name} type="checkbox" ref={register} />
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
        <label htmlFor="inAppWhenRecipientReportApprovedProgramSpecialist">
          In-app recipient report approved
        </label>
        <input
          id="inAppWhenRecipientReportApprovedProgramSpecialist"
          name="inAppWhenRecipientReportApprovedProgramSpecialist"
          type="checkbox"
          ref={register}
        />
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

// fields the other mocks render with labels; OtherNotifications registers the rest so the
// form holds every DEFAULT_SETTINGS field, as the real page does
const mockLabeledFields = [
  'emailWhenReportSubmittedForReview',
  'inAppWhenReportSubmittedForReview',
  'emailWhenChangeRequested',
  'emailWhenReportApproval',
  'emailWhenAppointedCollaborator',
  'inAppWhenChangeRequested',
  'inAppWhenReportApproval',
  'inAppWhenAppointedCollaborator',
  'emailWhenRecipientReportApprovedProgramSpecialist',
  'inAppWhenRecipientReportApprovedProgramSpecialist',
];

jest.mock('./components/notifications/OtherNotifications', () => {
  const { useFormContext } = require('react-hook-form');

  return function MockOtherNotifications(props: { clearAlerts?: boolean }) {
    const { register } = useFormContext();
    const { DEFAULT_SETTINGS } = jest.requireActual('./ManageNotifications');
    mockClearAlertsCaptures.other.push(props.clearAlerts);
    return (
      <div data-testid="other-notifications">
        <span data-testid="other-clear-alerts">{String(props.clearAlerts)}</span>
        {Object.entries(DEFAULT_SETTINGS)
          .filter(([name]) => !mockLabeledFields.includes(name))
          .map(([name, value]) =>
            typeof value === 'boolean' ? (
              <input key={name} name={name} type="checkbox" ref={register} />
            ) : (
              <input key={name} name={name} type="hidden" ref={register} />
            )
          )}
      </div>
    );
  };
});

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
  const settings = [...emailSettings, { key: 'inAppWhenReportSubmittedForReview', value: false }];

  const renderManageNotifications = ({
    user = validatedUser,
    setIsAppLoading = jest.fn(),
    updateUser = jest.fn(),
    history,
  }: {
    user?: { id: number; validationStatus: Array<{ type: string; validatedAt?: string }> };
    setIsAppLoading?: jest.Mock;
    updateUser?: jest.Mock;
    history?: MemoryHistory;
  } = {}) => {
    const page = (
      <>
        <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading }}>
          <UserContext.Provider value={{ user }}>
            <ManageNotifications updateUser={updateUser} />
          </UserContext.Provider>
        </AppLoadingContext.Provider>
      </>
    );

    return render(
      history ? <Router history={history}>{page}</Router> : <MemoryRouter>{page}</MemoryRouter>
    );
  };

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
    fetchMock.get('/api/settings', settings);

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

  it('loads settings on mount and seeds form values from the response', async () => {
    fetchMock.get('/api/settings', settings);

    renderManageNotifications();

    await waitFor(() => expect(fetchMock.called('/api/settings')).toBe(true));

    await waitFor(() => {
      expect(screen.getByLabelText('Submitted for review')).toHaveValue('this week');
      expect(screen.getByLabelText('emailWhenChangeRequested')).toHaveValue('today');
      expect(screen.getByLabelText('emailWhenReportApproval')).toHaveValue('immediately');
      expect(screen.getByLabelText('emailWhenAppointedCollaborator')).toHaveValue('this week');
      expect(screen.getByLabelText('Recipient report approved')).toHaveValue('today');
      expect(screen.getByLabelText('In-app submitted for review')).not.toBeChecked();
    });
  });

  it('requests the combined settings endpoint on mount', async () => {
    fetchMock.get('/api/settings', settings);

    renderManageNotifications();

    await waitFor(() => expect(fetchMock.called('/api/settings')).toBe(true));
  });

  it('keeps defaults when loading settings fails', async () => {
    fetchMock.get('/api/settings', { throws: new Error('unable to load') });

    renderManageNotifications();

    expect(screen.getByRole('heading', { name: 'Notification Preferences' })).toBeInTheDocument();

    await waitFor(() => expect(fetchMock.called('/api/settings')).toBe(true));

    expect(screen.getByLabelText('Submitted for review')).toHaveValue('never');
    expect(screen.getByLabelText('emailWhenChangeRequested')).toHaveValue('never');
    expect(screen.getByLabelText('Recipient report approved')).toHaveValue('never');
    expect(screen.getByLabelText('In-app submitted for review')).toBeChecked();
  });

  it('toggles app loading around the initial fetch', async () => {
    fetchMock.get('/api/settings', settings);
    const setIsAppLoading = jest.fn();

    renderManageNotifications({ setIsAppLoading });

    await waitFor(() => {
      expect(setIsAppLoading).toHaveBeenNthCalledWith(1, true);
      expect(setIsAppLoading).toHaveBeenNthCalledWith(2, false);
    });
  });

  it('submits settings for verified users and shows a success alert', async () => {
    fetchMock.get('/api/settings', settings);
    fetchMock.put('/api/settings', 204);

    renderManageNotifications();

    // Wait for settings to load so in-app values are seeded before submitting
    await waitFor(() => {
      expect(screen.getByLabelText('In-app submitted for review')).not.toBeChecked();
    });

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

    const expected = {
      ...DEFAULT_SETTINGS,
      emailWhenReportSubmittedForReview: 'today',
      emailWhenChangeRequested: 'this week',
      emailWhenReportApproval: 'immediately',
      emailWhenAppointedCollaborator: 'today',
      emailWhenRecipientReportApprovedProgramSpecialist: 'this week',
      inAppWhenReportSubmittedForReview: false,
    };

    expect(Object.fromEntries(payload.map(({ key, value }) => [key, value]))).toEqual(expected);
  });

  it('shows an error alert when updating settings fails', async () => {
    fetchMock.get('/api/settings', settings);
    fetchMock.put('/api/settings', { throws: new Error('Unable to save preferences') });

    renderManageNotifications();

    fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));

    await waitFor(() => {
      expect(
        screen.getByText(/there was an error saving your preferences: unable to save preferences/i)
      ).toBeInTheDocument();
    });
  });

  it('prompts before navigating away from a dirty form and can discard changes', async () => {
    fetchMock.get('/api/settings', settings);
    const history = createMemoryHistory({ initialEntries: ['/account/notifications'] });

    renderManageNotifications({ history });

    await waitFor(() => {
      expect(screen.getByLabelText('Submitted for review')).toHaveValue('this week');
    });

    fireEvent.change(screen.getByLabelText('Submitted for review'), {
      target: { value: 'today' },
    });
    act(() => history.push('/reports'));

    expect(
      screen.getByRole('heading', { name: 'Are you sure you want to leave this page?' })
    ).toBeInTheDocument();
    expect(history.location.pathname).toBe('/account/notifications');

    fireEvent.click(screen.getByRole('button', { name: 'Continue without saving' }));

    expect(history.location.pathname).toBe('/reports');
    expect(fetchMock.called('/api/settings', { method: 'PUT' })).toBe(false);
  });

  it('saves dirty preferences before continuing to the pending destination', async () => {
    fetchMock.get('/api/settings', settings);
    fetchMock.put('/api/settings', 204);
    const history = createMemoryHistory({ initialEntries: ['/account/notifications'] });

    renderManageNotifications({ history });

    await waitFor(() => {
      expect(screen.getByLabelText('Submitted for review')).toHaveValue('this week');
    });

    fireEvent.change(screen.getByLabelText('Submitted for review'), {
      target: { value: 'today' },
    });
    act(() => history.push('/reports'));
    fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));

    await waitFor(() => {
      expect(history.location.pathname).toBe('/reports');
      expect(fetchMock.called('/api/settings', { method: 'PUT' })).toBe(true);
    });
  });

  it('stays on the page and closes the prompt when saving before navigation fails', async () => {
    fetchMock.get('/api/settings', settings);
    fetchMock.put('/api/settings', { throws: new Error('Unable to save preferences') });
    const history = createMemoryHistory({ initialEntries: ['/account/notifications'] });

    renderManageNotifications({ history });

    await waitFor(() => {
      expect(screen.getByLabelText('Submitted for review')).toHaveValue('this week');
    });

    fireEvent.change(screen.getByLabelText('Submitted for review'), {
      target: { value: 'today' },
    });
    act(() => history.push('/reports'));
    fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));

    await waitFor(() => {
      expect(
        screen.getByText(/there was an error saving your preferences: unable to save preferences/i)
      ).toBeInTheDocument();
    });

    expect(history.location.pathname).toBe('/account/notifications');
    await waitFor(() => {
      expect(screen.getByRole('dialog', { hidden: true })).toHaveClass('is-hidden');
    });
  });

  it('allows the Cancel link to leave without showing the prompt', async () => {
    fetchMock.get('/api/settings', settings);
    const history = createMemoryHistory({ initialEntries: ['/account/notifications'] });

    renderManageNotifications({ history });

    await waitFor(() => {
      expect(screen.getByLabelText('Submitted for review')).toHaveValue('this week');
    });

    fireEvent.change(screen.getByLabelText('Submitted for review'), {
      target: { value: 'today' },
    });
    fireEvent.click(screen.getByRole('link', { name: 'Cancel' }));

    expect(history.location.pathname).toBe('/notifications');
    await waitFor(() => {
      expect(screen.getByRole('dialog', { hidden: true })).toHaveClass('is-hidden');
    });
  });

  it.each([
    ['Cmd-click', { metaKey: true }],
    ['Ctrl-click', { ctrlKey: true }],
    ['Shift-click', { shiftKey: true }],
    ['Alt-click', { altKey: true }],
    ['middle-click', { button: 1 }],
    ['right-click', { button: 2 }],
  ])('preserves the next navigation prompt after %s on Cancel', async (_name, clickOptions) => {
    fetchMock.get('/api/settings', settings);
    const history = createMemoryHistory({ initialEntries: ['/account/notifications'] });

    renderManageNotifications({ history });

    await waitFor(() => {
      expect(screen.getByLabelText('Submitted for review')).toHaveValue('this week');
    });

    userEvent.selectOptions(screen.getByLabelText('Submitted for review'), 'today');
    fireEvent.click(screen.getByRole('link', { name: 'Cancel' }), clickOptions);

    expect(history.location.pathname).toBe('/account/notifications');
    expect(screen.getByRole('dialog', { hidden: true })).toHaveClass('is-hidden');

    userEvent.click(screen.getByRole('link', { name: 'Back to Notifications' }));

    expect(history.location.pathname).toBe('/account/notifications');
    expect(
      screen.getByRole('heading', { name: 'Are you sure you want to leave this page?' })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Submitted for review')).toHaveValue('today');
  });

  it('prompts when browser Back is pressed on a dirty form', async () => {
    fetchMock.get('/api/settings', settings);
    const history = createMemoryHistory({
      initialEntries: ['/notifications', '/account/notifications'],
      initialIndex: 1,
    });

    renderManageNotifications({ history });

    await waitFor(() => {
      expect(screen.getByLabelText('Submitted for review')).toHaveValue('this week');
    });

    fireEvent.change(screen.getByLabelText('Submitted for review'), {
      target: { value: 'today' },
    });
    act(() => history.goBack());

    expect(history.location.pathname).toBe('/account/notifications');
    expect(
      screen.getByRole('heading', { name: 'Are you sure you want to leave this page?' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue without saving' }));

    expect(history.location.pathname).toBe('/notifications');
  });

  it('prompts when a loaded value is changed back to the form default', async () => {
    // only one stored value differs from the defaults, so the edited form equals the defaults
    fetchMock.get('/api/settings', [
      { key: 'emailWhenReportSubmittedForReview', value: 'this week' },
    ]);
    const history = createMemoryHistory({ initialEntries: ['/account/notifications'] });

    renderManageNotifications({ history });

    await waitFor(() => {
      expect(screen.getByLabelText('Submitted for review')).toHaveValue('this week');
    });

    fireEvent.change(screen.getByLabelText('Submitted for review'), {
      target: { value: 'never' },
    });
    act(() => history.push('/reports'));

    expect(
      screen.getByRole('heading', { name: 'Are you sure you want to leave this page?' })
    ).toBeInTheDocument();
    expect(history.location.pathname).toBe('/account/notifications');
  });

  it('does not prompt after loading settings when nothing was changed', async () => {
    fetchMock.get('/api/settings', settings);
    const history = createMemoryHistory({ initialEntries: ['/account/notifications'] });

    renderManageNotifications({ history });

    await waitFor(() => {
      expect(screen.getByLabelText('Submitted for review')).toHaveValue('this week');
    });

    act(() => history.push('/reports'));

    expect(history.location.pathname).toBe('/reports');
  });

  it('does not prompt after reverting an edit when the response includes unrendered keys', async () => {
    fetchMock.get('/api/settings', [
      ...settings,
      { key: 'emailWhenNoSessionsPoc', value: 'never' },
      { key: 'inAppWhenNoSessionsPoc', value: true },
      { key: 'inAppWhenAddedAsCoOwner', value: true },
    ]);
    const history = createMemoryHistory({ initialEntries: ['/account/notifications'] });

    renderManageNotifications({ history });

    await waitFor(() => {
      expect(screen.getByLabelText('Submitted for review')).toHaveValue('this week');
    });

    fireEvent.change(screen.getByLabelText('Submitted for review'), {
      target: { value: 'today' },
    });
    fireEvent.change(screen.getByLabelText('Submitted for review'), {
      target: { value: 'this week' },
    });
    act(() => history.push('/reports'));

    expect(history.location.pathname).toBe('/reports');
  });

  it('dismisses from the modal close button without navigating or clearing form values', async () => {
    fetchMock.get('/api/settings', settings);
    const history = createMemoryHistory({ initialEntries: ['/account/notifications'] });

    renderManageNotifications({ history });

    await waitFor(() => {
      expect(screen.getByLabelText('Submitted for review')).toHaveValue('this week');
    });

    fireEvent.change(screen.getByLabelText('Submitted for review'), {
      target: { value: 'today' },
    });
    act(() => history.push('/reports'));
    fireEvent.click(screen.getByRole('button', { name: 'Close this window' }));

    expect(history.location.pathname).toBe('/account/notifications');
    expect(screen.getByLabelText('Submitted for review')).toHaveValue('today');
    await waitFor(() => {
      expect(screen.getByRole('dialog', { hidden: true })).toHaveClass('is-hidden');
    });
  });

  it('reopens the prompt after Escape without losing edits or the next destination', async () => {
    fetchMock.get('/api/settings', settings);
    const history = createMemoryHistory({ initialEntries: ['/account/notifications'] });

    renderManageNotifications({ history });

    await waitFor(() => {
      expect(screen.getByLabelText('Submitted for review')).toHaveValue('this week');
    });

    userEvent.selectOptions(screen.getByLabelText('Submitted for review'), 'today');
    act(() => history.push('/reports'));
    expect(screen.getByRole('dialog')).toHaveClass('is-visible');
    userEvent.keyboard('{Escape}');

    expect(screen.getByRole('dialog', { hidden: true })).toHaveClass('is-hidden');
    expect(history.location.pathname).toBe('/account/notifications');
    expect(screen.getByLabelText('Submitted for review')).toHaveValue('today');

    act(() => history.push('/another-page'));

    expect(screen.getByRole('dialog')).toHaveClass('is-visible');
    expect(history.location.pathname).toBe('/account/notifications');
    userEvent.click(screen.getByRole('button', { name: 'Continue without saving' }));

    expect(history.location.pathname).toBe('/another-page');
    expect(fetchMock.called('/api/settings', { method: 'PUT' })).toBe(false);
  });

  it('requests a verification email and updates the button label on success', async () => {
    fetchMock.get('/api/settings', settings);
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
    fetchMock.get('/api/settings', settings);
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
      fetchMock.get('/api/settings', settings);

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
      fetchMock.get('/api/settings', settings);
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
      fetchMock.get('/api/settings', settings);
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
      fetchMock.get('/api/settings', settings);
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
      fetchMock.get('/api/settings', settings);
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

  describe('unvalidated user email gating', () => {
    it('excludes email-prefixed keys from the payload when email is not validated', async () => {
      fetchMock.get('/api/settings', settings);
      fetchMock.get('/api/settings/email', emailSettings);
      fetchMock.put('/api/settings', 204);

      renderManageNotifications({ user: unvalidatedUser });

      // Change an email field value so it would appear in the payload if not filtered
      fireEvent.change(screen.getByLabelText('Submitted for review'), {
        target: { value: 'immediately' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));

      await waitFor(() => expect(fetchMock.called('/api/settings')).toBe(true));

      const lastCall = fetchMock.lastCall('/api/settings');
      const payload = JSON.parse(String(lastCall?.[1]?.body));

      // No email-prefixed keys should be present for unvalidated users
      const emailKeys = payload.filter(({ key }: { key: string }) => key.startsWith('email'));
      expect(emailKeys).toHaveLength(0);
    });

    it('includes email-prefixed keys when email is validated', async () => {
      fetchMock.get('/api/settings', settings);
      fetchMock.get('/api/settings/email', emailSettings);
      fetchMock.put('/api/settings', 204);

      renderManageNotifications({ user: validatedUser });

      fireEvent.change(screen.getByLabelText('Submitted for review'), {
        target: { value: 'immediately' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Save preferences' }));

      await waitFor(() => expect(fetchMock.called('/api/settings')).toBe(true));

      const lastCall = fetchMock.lastCall('/api/settings');
      const payload = JSON.parse(String(lastCall?.[1]?.body));

      // Email keys should be present for validated users
      const emailKeys = payload.filter(({ key }: { key: string }) => key.startsWith('email'));
      expect(emailKeys.length).toBeGreaterThan(0);
      expect(emailKeys).toContainEqual({
        key: 'emailWhenReportSubmittedForReview',
        value: 'immediately',
      });
    });
  });
});
