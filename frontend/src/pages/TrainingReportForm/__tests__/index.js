import React from 'react';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import {
  TRAINING_REPORT_STATUSES,
} from '@ttahub/common';
import TrainingReportForm from '../index';
import UserContext from '../../../UserContext';
import AppLoadingContext from '../../../AppLoadingContext';
import { COMPLETE } from '../../../components/Navigator/constants';
import SomethingWentWrong from '../../../SomethingWentWrongContext';

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
    setErrorResponseCode = jest.fn,
    user = { id: 1, permissions: [], name: 'Ted User' },
  ) => render(
    <Router history={history}>
      <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading: jest.fn() }}>
        <UserContext.Provider value={{ user }}>
          <SomethingWentWrong.Provider value={{ setErrorResponseCode }}>
            <TrainingReportForm match={{
              params: { trainingReportId },
            }}
            />
          </SomethingWentWrong.Provider>
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

  it('calls setErrorResponseCode when an error occurs', async () => {
    fetchMock.get('/api/events/id/1', 500);
    const setErrorResponseCode = jest.fn();
    act(() => {
      renderTrainingReportForm('1', setErrorResponseCode);
    });
    await waitFor(() => expect(setErrorResponseCode).toHaveBeenCalledWith(500));
  });

  it('redirects to event summary', async () => {
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
      renderTrainingReportForm('1', 'event-summary');
    });

    // this test might not seem too effective, but it fails if the component is not
    // wrapped in a Router

    expect(screen.getByText(/Training report - Event/i)).toBeInTheDocument();
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
    const viewReportLink = screen.getByRole('link', { name: /r01-pd-1234/i });
    expect(viewReportLink).toBeInTheDocument();

    // Verify the href='/' attribute is correct.
    expect(viewReportLink).toHaveAttribute('href', '/training-report/view/1');
  });

  it('sets the status to "In progress" when hitting the save draft button', async () => {
    fetchMock.get('/api/events/id/1', {
      ...completedForm,
      data: {
        ...completedForm.data,
        status: TRAINING_REPORT_STATUSES.NOT_STARTED,
      },
    });

    // Create a fall back put.
    fetchMock.put('/api/events/id/1', {
      ...completedForm,
      data: {
        ...completedForm.data,
        status: TRAINING_REPORT_STATUSES.NOT_STARTED,
      },
    });
    act(() => {
      renderTrainingReportForm('1');
    });

    await waitFor(() => expect(screen.getByText(/: e-1 event/i)).toBeInTheDocument());
    const saveDraftButton = screen.getByRole('button', { name: /save draft/i });
    act(() => {
      userEvent.click(saveDraftButton);
    });

    // Assert fetchMock was called with the correct method and body.
    await waitFor(() => expect(fetchMock.called('/api/events/id/1', { method: 'PUT' })).toBe(true));
    const [url, options] = fetchMock.lastCall('/api/events/id/1', 'PUT');
    expect(url).toBe('/api/events/id/1');
    const body = JSON.parse(options.body);
    expect(body.data.status).toBe(TRAINING_REPORT_STATUSES.IN_PROGRESS);
  });

  it('sets the status to "In progress" when hitting "Review and submit"', async () => {
    fetchMock.get('/api/events/id/1', {
      ...completedForm,
      data: {
        ...completedForm.data,
        status: TRAINING_REPORT_STATUSES.NOT_STARTED,
      },
    });

    // Create a fall back put.
    fetchMock.put('/api/events/id/1', {
      ...completedForm,
      data: {
        ...completedForm.data,
        status: TRAINING_REPORT_STATUSES.NOT_STARTED,
      },
    });
    act(() => {
      renderTrainingReportForm('1');
    });

    await waitFor(() => expect(screen.getByText(/: e-1 event/i)).toBeInTheDocument());
    const saveDraftButton = screen.getByRole('button', { name: /review and submit/i });
    act(() => {
      userEvent.click(saveDraftButton);
    });

    // On the modal click "Yes, continue".
    const yesContinueButton = screen.getByRole('button', { name: /Yes, continue/i });
    act(() => {
      userEvent.click(yesContinueButton);
    });

    // Assert fetchMock was called with the correct method and body.
    await waitFor(() => expect(fetchMock.called('/api/events/id/1', { method: 'PUT' })).toBe(true));
    const [url, options] = fetchMock.lastCall('/api/events/id/1', 'PUT');
    expect(url).toBe('/api/events/id/1');
    const body = JSON.parse(options.body);
    expect(body.data.status).toBe(TRAINING_REPORT_STATUSES.IN_PROGRESS);
  });
});
