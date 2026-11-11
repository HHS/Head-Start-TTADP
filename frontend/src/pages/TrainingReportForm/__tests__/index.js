import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SCOPE_IDS } from '@ttahub/common';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router';
import AppLoadingContext from '../../../AppLoadingContext';
import { COMPLETE } from '../../../components/Navigator/constants';
import UserContext from '../../../UserContext';
import { LOCAL_STORAGE_ADDITIONAL_DATA_KEY } from '../constants';
import TrainingReportForm from '../index';

const completedForm = {
  regionId: '1',
  reportId: 1,
  id: 1,
  eventId: 'R01-PD-1234',
  collaboratorIds: [1, 2, 3],
  ownerId: 1,
  owner: {
    id: 1,
    name: 'Ted User',
    email: 'ted.user@computers.always',
  },
  pocIds: [1],
  data: {
    eventId: 'R01-PD-1234',
    eventOrganizer: 'IST TTA/Visit',
    eventIntendedAudience: 'recipients',
    startDate: '01/01/2021',
    endDate: '01/01/2021',
    trainingType: 'Series',
    reasons: ['Reason'],
    targetPopulations: ['Target'],
    status: 'In progress',
    vision: 'asdf',
    goal: 'afdf',
    eventName: 'E-1 Event',
    pageState: {
      1: COMPLETE,
      2: COMPLETE,
    },
  },
};

describe('TrainingReportForm', () => {
  const history = createMemoryHistory();
  const trainingReportDisplayId = 'R01-PD-1234';
  const sessionsUrl = `/api/session-reports/eventId/${trainingReportDisplayId}`;

  const renderTrainingReportForm = (
    trainingReportId,
    user = { id: 1, permissions: [], name: 'Ted User' }
  ) =>
    render(
      <Router history={history}>
        <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading: jest.fn() }}>
          <UserContext.Provider value={{ user }}>
            <TrainingReportForm
              match={{
                params: { trainingReportId },
              }}
            />
          </UserContext.Provider>
        </AppLoadingContext.Provider>
      </Router>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.reset();

    // the basic app before stuff
    fetchMock.get('/api/alerts', []);
    fetchMock.get('/api/users/statistics', {});
    fetchMock.get(/\/api\/users\/training-report-users\?regionId=1(&eventId=.*)?$/, {
      pointOfContact: [],
      collaborators: [],
      creators: [],
    });

    // Fetch mocks for trainer endpoints used by EventSummary via useEventAndSessionStaff
    fetchMock.get('/api/users/trainers/regional/region/1', []);
    fetchMock.get('/api/users/trainers/national-center/region/1', []);
  });

  it('renders training report form', async () => {
    fetchMock.get('/api/events/id/1?includeSessions=false', {
      id: 1,
      name: 'test event',
      regionId: '1',
      reportId: 1,
      collaboratorIds: [],
      ownerId: 1,
      owner: {
        id: 1,
        name: 'Ted User',
        email: 'ted.user@computers.always',
      },
    });

    act(() => {
      renderTrainingReportForm('1');
    });

    expect(screen.getByText(/Training report - Event/i)).toBeInTheDocument();
  });

  it('disables user selects until fresh users replace the cached ones', async () => {
    window.localStorage.clear();
    // cached users are missing the event's current POC
    window.localStorage.setItem(
      LOCAL_STORAGE_ADDITIONAL_DATA_KEY('R01-PD-1234'),
      JSON.stringify({
        users: {
          pointOfContact: [{ id: 2, fullName: 'Old POC' }],
          collaborators: [],
          creators: [],
        },
      })
    );
    const admin = { id: 1, permissions: [{ regionId: 1, scopeId: SCOPE_IDS.ADMIN }], name: 'Ted' };
    fetchMock.get('/api/events/id/R01-PD-1234?includeSessions=false', {
      ...completedForm,
      regionId: 1,
      pocIds: [7],
    });
    fetchMock.get(
      /\/api\/users\/training-report-users\?regionId=1(&eventId=.*)?$/,
      {
        pointOfContact: [{ id: 7, fullName: 'Current POC' }],
        collaborators: [],
        creators: [{ id: 1, fullName: 'Ted User' }],
      },
      { overwriteRoutes: true, delay: 100 }
    );

    act(() => {
      renderTrainingReportForm('R01-PD-1234', admin);
    });

    await waitFor(() => expect(fetchMock.called(/\/api\/events\/id/)).toBe(true));
    expect(document.querySelector('#pocIds')).toBeDisabled();
    expect(document.querySelector('#ownerId')).toBeDisabled();

    expect(await screen.findByText('Current POC')).toBeInTheDocument();
    expect(document.querySelector('#pocIds')).not.toBeDisabled();
    expect(document.querySelector('#ownerId')).not.toBeDisabled();
  });

  it('disables the collaborator select until trainer options load', async () => {
    window.localStorage.clear();
    fetchMock.get('/api/events/id/R01-PD-1234?includeSessions=false', {
      ...completedForm,
      regionId: 1,
      collaboratorIds: [3],
      data: {
        ...completedForm.data,
        eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
      },
    });
    fetchMock.get(
      '/api/users/trainers/regional/region/1',
      [{ id: 3, fullName: 'Saved Collaborator' }],
      { overwriteRoutes: true, delay: 100 }
    );

    act(() => {
      renderTrainingReportForm('R01-PD-1234');
    });

    await waitFor(() => expect(fetchMock.called(/\/api\/events\/id/)).toBe(true));
    expect(document.querySelector('#collaboratorIds')).toBeDisabled();

    expect(await screen.findByText('Saved Collaborator')).toBeInTheDocument();
    expect(document.querySelector('#collaboratorIds')).not.toBeDisabled();
  });

  it('keeps the collaborator select disabled when trainer options fail to load', async () => {
    window.localStorage.clear();
    fetchMock.get('/api/events/id/R01-PD-1234?includeSessions=false', {
      ...completedForm,
      regionId: 1,
      collaboratorIds: [3],
      data: {
        ...completedForm.data,
        eventOrganizer: 'Regional TTA Hosted Event (no National Centers)',
      },
    });
    fetchMock.get('/api/users/trainers/regional/region/1', 500, { overwriteRoutes: true });

    act(() => {
      renderTrainingReportForm('R01-PD-1234');
    });

    expect(await screen.findByText(/unable to load event collaborators/i)).toBeInTheDocument();
    expect(document.querySelector('#collaboratorIds')).toBeDisabled();
  });

  it('keeps the creator and POC selects disabled when users fail to load', async () => {
    window.localStorage.clear();
    const admin = { id: 1, permissions: [{ regionId: 1, scopeId: SCOPE_IDS.ADMIN }], name: 'Ted' };
    fetchMock.get('/api/events/id/R01-PD-1234?includeSessions=false', {
      ...completedForm,
      regionId: 1,
    });
    fetchMock.get(/\/api\/users\/training-report-users\?regionId=1(&eventId=.*)?$/, 500, {
      overwriteRoutes: true,
    });

    act(() => {
      renderTrainingReportForm('R01-PD-1234', admin);
    });

    expect(
      await screen.findByText(/error fetching collaborators and points of contact/i)
    ).toBeInTheDocument();
    expect(document.querySelector('#pocIds')).toBeDisabled();
    expect(document.querySelector('#ownerId')).toBeDisabled();
  });

  it('only fetches the event and users once', async () => {
    fetchMock.get('/api/events/id/R01-PD-1234?includeSessions=false', {
      id: 1,
      eventId: 'R01-PD-1234',
      regionId: 1,
      collaboratorIds: [],
      ownerId: 1,
      data: {},
    });

    act(() => {
      renderTrainingReportForm('R01-PD-1234');
    });

    await waitFor(() => {
      expect(fetchMock.calls('/api/events/id/R01-PD-1234?includeSessions=false')).toHaveLength(1);
    });
    // let any follow-up renders settle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(fetchMock.calls('/api/events/id/R01-PD-1234?includeSessions=false')).toHaveLength(1);
    expect(fetchMock.calls(/\/api\/users\/training-report-users/)).toHaveLength(1);
  });

  it('redirects when an error occurs', async () => {
    fetchMock.get('/api/events/id/1?includeSessions=false', 500);
    const spy = jest.spyOn(history, 'push');
    act(() => {
      renderTrainingReportForm('1');
    });
    await waitFor(() => expect(spy).toHaveBeenCalledWith('/something-went-wrong/500'));
  });

  it('renders training report form if pocId is null', async () => {
    fetchMock.get('/api/events/id/1?includeSessions=false', {
      id: 1,
      name: 'test event',
      regionId: '1',
      reportId: 1,
      collaboratorIds: [],
      pocIds: null,
      ownerId: 1,
      owner: {
        id: 1,
        name: 'Ted User',
        email: 'ted.user@computers.always',
      },
    });

    act(() => {
      renderTrainingReportForm('1');
    });

    expect(screen.getByText(/Training report - Event/i)).toBeInTheDocument();
  });

  it('displays an error when failing to fetch users', async () => {
    fetchMock.reset();
    fetchMock.get(/\/api\/users\/training-report-users\?regionId=1(&eventId=.*)?$/, 500);

    fetchMock.get('/api/events/id/123?includeSessions=false', {
      regionId: '1',
      reportId: 1,
      collaboratorIds: [],
      ownerId: 1,
      owner: {
        id: 1,
        name: 'Ted User',
        email: 'ted.user@computers.always',
      },
    });
    act(() => {
      renderTrainingReportForm('123', 'event-summary');
    });

    await waitFor(() =>
      expect(
        screen.getByText(/Error fetching collaborators and points of contact/i)
      ).toBeInTheDocument()
    );
  });

  it('fetches event report data', async () => {
    fetchMock.get('/api/events/id/123?includeSessions=false', {
      regionId: '1',
      reportId: 1,
      collaboratorIds: [],
      ownerId: 1,
      owner: {
        id: 1,
        name: 'Ted User',
        email: 'ted.user@computers.always',
      },
    });
    renderTrainingReportForm('123');

    jest.advanceTimersByTime(30000);
    expect(fetchMock.called('/api/events/id/123?includeSessions=false')).toBe(true);
  });

  it('displays "no training report id provided" error', async () => {
    fetchMock.get('/api/events/id/123?includeSessions=false', {
      regionId: '1',
      reportId: 1,
      data: {},
      collaboratorIds: [],
      ownerId: 1,
      owner: {
        id: 1,
        name: 'Ted User',
        email: 'ted.user@computers.always',
      },
    });
    act(() => {
      renderTrainingReportForm('');
    });

    expect(screen.getByText(/no training report id provided/i)).toBeInTheDocument();
  });

  it('tests the on save draft event', async () => {
    fetchMock.get('/api/events/id/123?includeSessions=false', {
      regionId: '1',
      reportId: 1,
      data: {},
      ownerId: 1,
      owner: {
        id: 1,
        name: 'Ted User',
        email: 'ted.user@computers.always',
      },
    });
    act(() => {
      renderTrainingReportForm('123');
    });
    expect(fetchMock.called('/api/events/id/123?includeSessions=false', { method: 'GET' })).toBe(
      true
    );

    fetchMock.put('/api/events/id/123', {
      regionId: '1',
      reportId: 1,
      data: {},
      ownerId: 1,
      owner: {
        id: 1,
        name: 'Ted User',
        email: 'ted.user@computers.always',
      },
    });

    const onSaveDraftButton = await screen.findByText(/save draft/i);
    act(() => {
      userEvent.click(onSaveDraftButton);
    });

    // check that fetch mock was called with a put request
    await waitFor(() =>
      expect(fetchMock.called('/api/events/id/123', { method: 'PUT' })).toBe(true)
    );
  });

  it('shows an error when failing to save', async () => {
    fetchMock.get('/api/events/id/123?includeSessions=false', {
      regionId: '1',
      reportId: 1,
      data: {},
      ownerId: 1,
      owner: {
        id: 1,
        name: 'Ted User',
        email: 'ted.user@computers.always',
      },
    });
    act(() => {
      renderTrainingReportForm('123');
    });
    expect(fetchMock.called('/api/events/id/123?includeSessions=false', { method: 'GET' })).toBe(
      true
    );

    fetchMock.put('/api/events/id/123', 500);

    const onSaveDraftButton = await screen.findByText(/save draft/i);
    act(() => {
      userEvent.click(onSaveDraftButton);
    });

    await waitFor(() =>
      expect(
        screen.getByText(/There was an error saving the training report. Please try again later./i)
      ).toBeInTheDocument()
    );
  });

  it('handles an error submitting the form', async () => {
    fetchMock.get(`/api/events/id/${trainingReportDisplayId}?includeSessions=false`, completedForm);

    fetchMock.put(`/api/events/id/${trainingReportDisplayId}`, 500);
    fetchMock.get(sessionsUrl, [
      { id: 2, eventId: 1, data: { sessionName: 'Toothbrushing vol 2', status: 'Complete' } },
      { id: 3, eventId: 1, data: { sessionName: 'Toothbrushing vol 3', status: 'Complete' } },
    ]);

    act(() => {
      renderTrainingReportForm(trainingReportDisplayId);
    });

    await waitFor(() =>
      expect(
        fetchMock.called(`/api/events/id/${trainingReportDisplayId}?includeSessions=false`, {
          method: 'GET',
        })
      ).toBe(true)
    );
    const submitButton = await screen.findByRole('button', { name: /Review and submit/i });
    act(() => {
      userEvent.click(submitButton);
    });

    // Wait for the modal to display.
    await waitFor(() =>
      expect(
        screen.getByText(/You will not be able to make changes once you save the event./i)
      ).toBeInTheDocument()
    );

    // get the button with the text "Yes, continue".
    const yesContinueButton = screen.getByRole('button', { name: /Yes, continue/i });
    act(() => {
      userEvent.click(yesContinueButton);
    });

    await waitFor(() =>
      expect(fetchMock.called(`/api/events/id/${trainingReportDisplayId}`, { method: 'PUT' })).toBe(
        true
      )
    );
    await waitFor(() =>
      expect(screen.getByText(/There was an error saving the training report/i)).toBeInTheDocument()
    );
  });

  it('displays the correct report view link', async () => {
    fetchMock.get(`/api/events/id/${trainingReportDisplayId}?includeSessions=false`, completedForm);
    act(() => {
      renderTrainingReportForm(trainingReportDisplayId);
    });

    await waitFor(() => expect(screen.getByText(/: e-1 event/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/r01-pd-1234/i)).toBeInTheDocument());
  });
  it('passes correct values to backend and redirects with success message', async () => {
    fetchMock.get(`/api/events/id/${trainingReportDisplayId}?includeSessions=false`, completedForm);

    // Return successful response with proper data structure
    fetchMock.put(`/api/events/id/${trainingReportDisplayId}`, {
      ...completedForm,
      data: {
        ...completedForm.data,
        status: 'In progress',
        eventId: 'R01-PD-1234',
      },
    });
    fetchMock.get(sessionsUrl, [
      { id: 2, eventId: 1, data: { sessionName: 'Toothbrushing vol 2', status: 'Complete' } },
      { id: 3, eventId: 1, data: { sessionName: 'Toothbrushing vol 3', status: 'Complete' } },
    ]);

    const pushSpy = jest.spyOn(history, 'push');

    act(() => {
      renderTrainingReportForm(trainingReportDisplayId);
    });

    await waitFor(() =>
      expect(
        fetchMock.called(`/api/events/id/${trainingReportDisplayId}?includeSessions=false`, {
          method: 'GET',
        })
      ).toBe(true)
    );
    const submitButton = await screen.findByRole('button', { name: /Review and submit/i });
    act(() => {
      userEvent.click(submitButton);
    });

    // Wait for the modal to display.
    await waitFor(() =>
      expect(
        screen.getByText(/You will not be able to make changes once you save the event./i)
      ).toBeInTheDocument()
    );

    // get the button with the text "Yes, continue".
    const yesContinueButton = screen.getByRole('button', { name: /Yes, continue/i });
    act(() => {
      userEvent.click(yesContinueButton);
    });

    await waitFor(() =>
      expect(fetchMock.called(`/api/events/id/${trainingReportDisplayId}`, { method: 'PUT' })).toBe(
        true
      )
    );

    // expect the data to contain "eventSubmitted: true"
    expect(fetchMock.lastOptions(`/api/events/id/${trainingReportDisplayId}`).body).toContain(
      '"eventSubmitted":true'
    );

    // Verify redirect with message after successful submission
    await waitFor(() => expect(pushSpy).toHaveBeenCalled());

    expect(pushSpy).toHaveBeenCalledWith('/training-reports/in-progress', {
      message: expect.objectContaining({
        eventId: 'R01-PD-1234',
        dateStr: expect.stringMatching(/\d{2}\/\d{2}\/\d{4} at \d{1,2}:\d{2} [ap]m/),
      }),
    });
  });
  it('saves and updates local storage', async () => {
    fetchMock.get('/api/events/id/1?includeSessions=false', {
      id: 1,
      name: 'test event',
      regionId: '1',
      reportId: 1,
      collaboratorIds: [],
      ownerId: 1,
      owner: {
        id: 1,
        name: 'Ted User',
        email: 'ted.user@computers.always',
      },
    });

    jest.spyOn(Storage.prototype, 'setItem');

    act(() => {
      renderTrainingReportForm('1');
    });

    expect(screen.getByText(/Training report - Event/i)).toBeInTheDocument();
    expect(Storage.prototype.setItem).toHaveBeenCalled();
  });
});
