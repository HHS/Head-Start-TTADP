import React from 'react';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import TrainingReportForm from '../index';
import UserContext from '../../../UserContext';
import AppLoadingContext from '../../../AppLoadingContext';
import { COMPLETE } from '../../../components/Navigator/constants';

const completedForm = {
  regionId: '1',
  reportId: 1,
  id: 1,
  collaboratorIds: [1, 2, 3],
  ownerId: 1,
  owner: {
    id: 1, name: 'Ted User', email: 'ted.user@computers.always',
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
  const sessionsUrl = '/api/session-reports/eventId/1234';

  const renderTrainingReportForm = (
    trainingReportId,
    user = { id: 1, permissions: [], name: 'Ted User' },
  ) => render(
    <Router history={history}>
      <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading: jest.fn() }}>
        <UserContext.Provider value={{ user }}>
          <TrainingReportForm match={{
            params: { trainingReportId },
          }}
          />
        </UserContext.Provider>
      </AppLoadingContext.Provider>
    </Router>,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.reset();

    // the basic app before stuff
    fetchMock.get('/api/alerts', []);
    fetchMock.get('/api/users/statistics', {});
    fetchMock.get('/api/users/training-report-users?regionId=1', {
      pointOfContact: [],
      collaborators: [],
      creators: [],
    });

    // Fetch mocks for trainer endpoints used by EventSummary via useEventAndSessionStaff
    fetchMock.get('/api/users/trainers/regional/region/1', []);
    fetchMock.get('/api/users/trainers/national-center/region/1', []);
  });

  it('renders training report form', async () => {
    fetchMock.get('/api/events/id/1', {
      id: 1,
      name: 'test event',
      regionId: '1',
      reportId: 1,
      collaboratorIds: [],
      ownerId: 1,
      owner: {
        id: 1, name: 'Ted User', email: 'ted.user@computers.always',
      },
    });

    act(() => {
      renderTrainingReportForm('1');
    });

    expect(screen.getByText(/Training report - Event/i)).toBeInTheDocument();
  });

  it('redirects when an error occurs', async () => {
    fetchMock.get('/api/events/id/1', 500);
    const spy = jest.spyOn(history, 'push');
    act(() => {
      renderTrainingReportForm('1');
    });
    await waitFor(() => expect(spy).toHaveBeenCalledWith('/something-went-wrong/500'));
  });

  it('renders training report form if pocId is null', async () => {
    fetchMock.get('/api/events/id/1', {
      id: 1,
      name: 'test event',
      regionId: '1',
      reportId: 1,
      collaboratorIds: [],
      pocIds: null,
      ownerId: 1,
      owner: {
        id: 1, name: 'Ted User', email: 'ted.user@computers.always',
      },
    });

    act(() => {
      renderTrainingReportForm('1');
    });

    expect(screen.getByText(/Training report - Event/i)).toBeInTheDocument();
  });

  it('displays an error when failing to fetch users', async () => {
    fetchMock.reset();
    fetchMock.get('/api/users/training-report-users?regionId=1', 500);

    fetchMock.get('/api/events/id/123', {
      regionId: '1',
      reportId: 1,
      collaboratorIds: [],
      ownerId: 1,
      owner: {
        id: 1, name: 'Ted User', email: 'ted.user@computers.always',
      },
    });
    act(() => {
      renderTrainingReportForm('123', 'event-summary');
    });

    await waitFor(() => expect(screen.getByText(/Error fetching collaborators and points of contact/i)).toBeInTheDocument());
  });

  it('fetches event report data', async () => {
    fetchMock.get('/api/events/id/123', {
      regionId: '1',
      reportId: 1,
      collaboratorIds: [],
      ownerId: 1,
      owner: {
        id: 1, name: 'Ted User', email: 'ted.user@computers.always',
      },
    });
    renderTrainingReportForm('123');

    jest.advanceTimersByTime(30000);
    expect(fetchMock.called('/api/events/id/123')).toBe(true);
  });

  it('displays "no training report id provided" error', async () => {
    fetchMock.get('/api/events/id/123', {
      regionId: '1',
      reportId: 1,
      data: {},
      collaboratorIds: [],
      ownerId: 1,
      owner: {
        id: 1, name: 'Ted User', email: 'ted.user@computers.always',
      },
    });
    act(() => {
      renderTrainingReportForm('');
    });

    expect(screen.getByText(/no training report id provided/i)).toBeInTheDocument();
  });

  it('tests the on save draft event', async () => {
    fetchMock.get('/api/events/id/123', {
      regionId: '1',
      reportId: 1,
      data: {},
      ownerId: 1,
      owner: {
        id: 1, name: 'Ted User', email: 'ted.user@computers.always',
      },
    });
    act(() => {
      renderTrainingReportForm('123');
    });
    expect(fetchMock.called('/api/events/id/123', { method: 'GET' })).toBe(true);

    fetchMock.put('/api/events/id/123', {
      regionId: '1',
      reportId: 1,
      data: {},
      ownerId: 1,
      owner: {
        id: 1, name: 'Ted User', email: 'ted.user@computers.always',
      },
    });
    const onSaveDraftButton = screen.getByText(/save draft/i);
    act(() => {
      userEvent.click(onSaveDraftButton);
    });

    // check that fetch mock was called with a put request
    await waitFor(() => expect(fetchMock.called('/api/events/id/123', { method: 'PUT' })).toBe(true));
  });

  it('shows an error when failing to save', async () => {
    fetchMock.get('/api/events/id/123', {
      regionId: '1',
      reportId: 1,
      data: {},
      ownerId: 1,
      owner: {
        id: 1, name: 'Ted User', email: 'ted.user@computers.always',
      },
    });
    act(() => {
      renderTrainingReportForm('123');
    });
    expect(fetchMock.called('/api/events/id/123', { method: 'GET' })).toBe(true);

    fetchMock.put('/api/events/id/123', 500);
    const onSaveDraftButton = screen.getByText(/save draft/i);
    act(() => {
      userEvent.click(onSaveDraftButton);
    });

    await waitFor(() => expect(screen.getByText(/There was an error saving the training report. Please try again later./i)).toBeInTheDocument());
  });

  it('handles an error submitting the form', async () => {
    fetchMock.get('/api/events/id/1', completedForm);

    fetchMock.put('/api/events/id/1', 500);
    fetchMock.get(sessionsUrl, [
      { id: 2, eventId: 1, data: { sessionName: 'Toothbrushing vol 2', status: 'Complete' } },
      { id: 3, eventId: 1, data: { sessionName: 'Toothbrushing vol 3', status: 'Complete' } },
    ]);

    act(() => {
      renderTrainingReportForm('1');
    });

    await waitFor(() => expect(fetchMock.called('/api/events/id/1', { method: 'GET' })).toBe(true));
    const submitButton = await screen.findByRole('button', { name: /Review and submit/i });
    act(() => {
      userEvent.click(submitButton);
    });

    // Wait for the modal to display.
    await waitFor(() => expect(screen.getByText(/You will not be able to make changes once you save the event./i)).toBeInTheDocument());

    // get the button with the text "Yes, continue".
    const yesContinueButton = screen.getByRole('button', { name: /Yes, continue/i });
    act(() => {
      userEvent.click(yesContinueButton);
    });

    await waitFor(() => expect(fetchMock.called('/api/events/id/1', { method: 'PUT' })).toBe(true));
    await waitFor(() => expect(screen.getByText(/There was an error saving the training report/i)).toBeInTheDocument());
  });

  it('displays the correct report view link', async () => {
    fetchMock.get('/api/events/id/1', completedForm);
    act(() => {
      renderTrainingReportForm('1');
    });

    await waitFor(() => expect(screen.getByText(/: e-1 event/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/r01-pd-1234/i)).toBeInTheDocument());
  });
  it('passes correct values to backend and redirects with success message', async () => {
    fetchMock.get('/api/events/id/1', completedForm);

    // Return successful response with proper data structure
    fetchMock.put('/api/events/id/1', {
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
      renderTrainingReportForm('1');
    });

    await waitFor(() => expect(fetchMock.called('/api/events/id/1', { method: 'GET' })).toBe(true));
    const submitButton = await screen.findByRole('button', { name: /Review and submit/i });
    act(() => {
      userEvent.click(submitButton);
    });

    // Wait for the modal to display.
    await waitFor(() => expect(screen.getByText(/You will not be able to make changes once you save the event./i)).toBeInTheDocument());

    // get the button with the text "Yes, continue".
    const yesContinueButton = screen.getByRole('button', { name: /Yes, continue/i });
    act(() => {
      userEvent.click(yesContinueButton);
    });

    await waitFor(() => expect(fetchMock.called('/api/events/id/1', { method: 'PUT' })).toBe(true));

    // expect the data to contain "eventSubmitted: true"
    expect(fetchMock.lastOptions('/api/events/id/1').body).toContain('"eventSubmitted":true');

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
    fetchMock.get('/api/events/id/1', {
      id: 1,
      name: 'test event',
      regionId: '1',
      reportId: 1,
      collaboratorIds: [],
      ownerId: 1,
      owner: {
        id: 1, name: 'Ted User', email: 'ted.user@computers.always',
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
