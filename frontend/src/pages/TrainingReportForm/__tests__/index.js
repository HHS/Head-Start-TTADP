import React from 'react';
import moment from 'moment';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import { MemoryRouter } from 'react-router';
import TrainingReportForm from '../index';
import UserContext from '../../../UserContext';
import AppLoadingContext from '../../../AppLoadingContext';
import { COMPLETE } from '../../../components/Navigator/constants';

describe('TrainingReportForm', () => {
  const sessionsUrl = '/api/session-reports/eventId/1234';

  const renderTrainingReportForm = (trainingReportId, currentPage) => render(
    <MemoryRouter>
      <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading: jest.fn() }}>
        <UserContext.Provider value={{ user: { id: 1, permissions: [], name: 'Ted User' } }}>
          <TrainingReportForm match={{
            params: { currentPage, trainingReportId },
            path: currentPage,
            url: currentPage,
          }}
          />
        </UserContext.Provider>
      </AppLoadingContext.Provider>
    </MemoryRouter>,
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
      renderTrainingReportForm('1', 'event-summary');
    });

    expect(screen.getByText(/Training report - Event/i)).toBeInTheDocument();
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
      renderTrainingReportForm('1', 'event-summary');
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
    renderTrainingReportForm('123', 'event-summary');

    jest.advanceTimersByTime(30000);
    expect(fetchMock.called('/api/events/id/123')).toBe(true);
  });

  it('displays error when event report fails to load', async () => {
    fetchMock.get('/api/events/id/123', 500);
    act(() => {
      renderTrainingReportForm('123', 'event-summary');
    });

    expect(fetchMock.called('/api/events/id/123')).toBe(true);
    expect(await screen.findByText(/error fetching training report/i)).toBeInTheDocument();
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
      renderTrainingReportForm('', 'event-summary');
    });

    expect(screen.getByText(/no training report id provided/i)).toBeInTheDocument();
  });

  it('tests the on save & continue button', async () => {
    fetchMock.get('/api/events/id/123', {
      regionId: '1',
      reportId: 1,
      data: {
        eventId: 'R01-PD-1234',
        eventIntendedAudience: 'recipients',
        eventOrganizer: 'Regional PD Event (with National Centers)',
        targetPopulations: ['Infants and Toddlers (ages birth to 3)'],
        reasons: ['School Readiness Goals'],
        startDate: '01/01/2021',
        endDate: '01/01/2021',
      },
      collaboratorIds: [1],
      ownerId: 1,
      pocIds: [1],
      owner: {
        id: 1, name: 'Ted User', email: 'ted.user@computers.always',
      },
    });

    act(() => {
      renderTrainingReportForm('123', 'event-summary');
    });
    expect(fetchMock.called('/api/events/id/123', { method: 'GET' })).toBe(true);

    await screen.findAllByRole('radio', { checked: true });

    const updatedAt = moment();

    fetchMock.put('/api/events/id/123', {
      regionId: '1',
      reportId: 1,
      data: {},
      updatedAt,
      owner: {
        id: 1, name: 'Ted User', email: 'ted.user@computers.always',
      },
    });
    expect(fetchMock.called('/api/events/id/123', { method: 'PUT' })).toBe(false);
    const onSaveAndContinueButton = screen.getByText(/save and continue/i);
    act(() => {
      userEvent.click(onSaveAndContinueButton);
    });

    // check that fetch mock was called with a put request
    await waitFor(() => expect(fetchMock.called('/api/events/id/123', { method: 'PUT' })).toBe(true));
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
      renderTrainingReportForm('123', 'event-summary');
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
      renderTrainingReportForm('123', 'event-summary');
    });
    expect(fetchMock.called('/api/events/id/123', { method: 'GET' })).toBe(true);

    fetchMock.put('/api/events/id/123', 500);
    const onSaveDraftButton = screen.getByText(/save draft/i);
    act(() => {
      userEvent.click(onSaveDraftButton);
    });

    await waitFor(() => expect(screen.getByText(/There was an error saving the training report. Please try again later./i)).toBeInTheDocument());
  });

  it('updates the page via the side menu', async () => {
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

    fetchMock.put('/api/events/id/1', {
      regionId: '1',
      reportId: 1,
      data: {},
      ownerId: 1,
      owner: {
        id: 1, name: 'Ted User', email: 'ted.user@computers.always',
      },
    });

    act(() => {
      renderTrainingReportForm('1', 'event-summary');
    });

    expect(screen.getByText(/Training report - Event/i)).toBeInTheDocument();

    const visionGoal = await screen.findByRole('button', { name: /vision and goal/i });

    act(() => {
      userEvent.click(visionGoal);
    });

    await waitFor(() => expect(fetchMock.called('/api/events/id/1', { method: 'PUT' })).toBe(true));
  });

  it('will update status on submit if the updated status is not complete', async () => {
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
      data: {
        eventId: 'R01-PD-1234',
      },
    });

    fetchMock.put('/api/events/id/1', {
      regionId: '1',
      reportId: 1,
      data: {},
      ownerId: 1,
      owner: {
        id: 1, name: 'Ted User', email: 'ted.user@computers.always',
      },
    });

    fetchMock.get(sessionsUrl, [
      { id: 2, eventId: 1, data: { sessionName: 'Toothbrushing vol 2', status: 'Complete' } },
      { id: 3, eventId: 1, data: { sessionName: 'Toothbrushing vol 3', status: 'Complete' } },
    ]);

    act(() => {
      renderTrainingReportForm('1', 'complete-event');
    });

    expect(screen.getByText(/Training report - Event/i)).toBeInTheDocument();

    const statusSelect = await screen.findByRole('combobox', { name: /status/i });
    expect(statusSelect).toHaveValue('In progress');

    const submitButton = await screen.findByRole('button', { name: /submit/i });
    act(() => {
      userEvent.click(submitButton);
    });

    await waitFor(() => expect(screen.getByText('Event must be complete to submit')).toBeInTheDocument());
    await waitFor(() => expect(fetchMock.called('/api/events/id/1', { method: 'PUT' })).toBe(false));
  });

  it('will not complete the form if the form is not complete', async () => {
    fetchMock.get('/api/events/id/1', {
      id: 1,
      name: 'test event',
      regionId: '1',
      reportId: 1,
      collaboratorIds: [],
      ownerId: 1,
      data: {
        eventId: 'R01-PD-1234',
      },
      owner: {
        id: 1, name: 'Ted User', email: 'ted.user@computers.always',
      },
    });

    fetchMock.put('/api/events/id/1', {
      regionId: '1',
      reportId: 1,
      data: {
        eventId: 'R01-PD-1234',
      },
      ownerId: 1,
      owner: {
        id: 1, name: 'Ted User', email: 'ted.user@computers.always',
      },
    });

    fetchMock.get(sessionsUrl, [
      { id: 2, eventId: 1, data: { sessionName: 'Toothbrushing vol 2', status: 'Complete' } },
      { id: 3, eventId: 1, data: { sessionName: 'Toothbrushing vol 3', status: 'Complete' } },
    ]);

    act(() => {
      renderTrainingReportForm('1', 'complete-event');
    });

    expect(screen.getByText(/Training report - Event/i)).toBeInTheDocument();

    const statusSelect = await screen.findByRole('combobox', { name: /status/i });
    act(() => {
      userEvent.selectOptions(statusSelect, 'Complete');
    });
    expect(statusSelect).toHaveValue('Complete');

    const submitButton = await screen.findByRole('button', { name: /submit/i });
    act(() => {
      userEvent.click(submitButton);
    });

    await waitFor(() => expect(fetchMock.called('/api/events/id/1', { method: 'PUT' })).not.toBe(true));
  });

  it('will complete the form if the form is complete', async () => {
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

    fetchMock.get('/api/events/id/1', completedForm);
    fetchMock.put('/api/events/id/1', completedForm);
    fetchMock.get(sessionsUrl, [
      { id: 2, eventId: 1, data: { sessionName: 'Toothbrushing vol 2', status: 'Complete' } },
      { id: 3, eventId: 1, data: { sessionName: 'Toothbrushing vol 3', status: 'Complete' } },
    ]);

    act(() => {
      renderTrainingReportForm('1', 'complete-event');
    });

    await waitFor(() => expect(fetchMock.called(sessionsUrl, { method: 'GET' })).toBe(true));
    await waitFor(() => expect(fetchMock.called('/api/events/id/1', { method: 'GET' })).toBe(true));
    await waitFor(async () => expect(await screen.findByRole('button', { name: /Event summary complete/i })).toBeInTheDocument());

    const statusSelect = await screen.findByRole('combobox', { name: /status/i });
    act(() => {
      userEvent.selectOptions(statusSelect, 'Complete');
    });
    expect(statusSelect).toHaveValue('Complete');

    const submitButton = await screen.findByRole('button', { name: /submit/i });
    act(() => {
      userEvent.click(submitButton);
    });

    await waitFor(() => expect(fetchMock.called('/api/events/id/1', { method: 'PUT' })).toBe(true));
    const lastBody = JSON.parse(fetchMock.lastOptions().body);
    expect(lastBody.data.status).toEqual('Complete');
  });

  it('shows an error if saving a draft as complete', async () => {
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
        eventId: 'R01-PD-1234',
        eventName: 'E-1 Event',
        pageState: {
          1: COMPLETE,
          2: COMPLETE,
        },
      },
    };

    fetchMock.get('/api/events/id/1', completedForm);
    fetchMock.put('/api/events/id/1', completedForm);
    fetchMock.get(sessionsUrl, [
      { id: 2, eventId: 1, data: { sessionName: 'Toothbrushing vol 2', status: 'Complete' } },
      { id: 3, eventId: 1, data: { sessionName: 'Toothbrushing vol 3', status: 'Complete' } },
    ]);

    act(() => {
      renderTrainingReportForm('1', 'complete-event');
    });

    await waitFor(() => expect(fetchMock.called(sessionsUrl, { method: 'GET' })).toBe(true));
    await waitFor(() => expect(fetchMock.called('/api/events/id/1', { method: 'GET' })).toBe(true));
    await waitFor(async () => expect(await screen.findByRole('button', { name: /Event summary complete/i })).toBeInTheDocument());

    const statusSelect = await screen.findByRole('combobox', { name: /status/i });
    act(() => {
      userEvent.selectOptions(statusSelect, 'Complete');
    });
    expect(statusSelect).toHaveValue('Complete');

    const submitButton = await screen.findByRole('button', { name: /save draft/i });

    act(() => {
      userEvent.click(submitButton);
    });

    await waitFor(() => expect(screen.getByText('To complete event, submit it')).toBeInTheDocument());
    await waitFor(() => expect(fetchMock.called('/api/events/id/1', { method: 'PUT' })).not.toBe(true));
  });

  it('you can suspend a report', async () => {
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
        eventId: 'R01-PD-1234',
        eventName: 'E-1 Event',
        pageState: {
          1: COMPLETE,
          2: COMPLETE,
        },
      },
    };

    fetchMock.get('/api/events/id/1', completedForm);
    fetchMock.put('/api/events/id/1', completedForm);
    fetchMock.get(sessionsUrl, [
      { id: 2, eventId: 1, data: { sessionName: 'Toothbrushing vol 2', status: 'Complete' } },
      { id: 3, eventId: 1, data: { sessionName: 'Toothbrushing vol 3', status: 'Complete' } },
    ]);

    act(() => {
      renderTrainingReportForm('1', 'complete-event');
    });

    await waitFor(() => expect(fetchMock.called(sessionsUrl, { method: 'GET' })).toBe(true));
    await waitFor(() => expect(fetchMock.called('/api/events/id/1', { method: 'GET' })).toBe(true));
    await waitFor(async () => expect(await screen.findByRole('button', { name: /Event summary complete/i })).toBeInTheDocument());

    const statusSelect = await screen.findByRole('combobox', { name: /status/i });
    act(() => {
      userEvent.selectOptions(statusSelect, 'Suspended');
    });
    expect(statusSelect).toHaveValue('Suspended');

    const submitButton = await screen.findByRole('button', { name: /save draft/i });

    act(() => {
      userEvent.click(submitButton);
    });

    await waitFor(() => expect(fetchMock.called('/api/events/id/1', { method: 'PUT' })).toBe(true));
    const lastBody = JSON.parse(fetchMock.lastOptions().body);
    expect(lastBody.data.status).toEqual('Suspended');
  });

  it('handles an error submitting the form', async () => {
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

    fetchMock.get('/api/events/id/1', completedForm);

    fetchMock.put('/api/events/id/1', 500);
    fetchMock.get(sessionsUrl, [
      { id: 2, eventId: 1, data: { sessionName: 'Toothbrushing vol 2', status: 'Complete' } },
      { id: 3, eventId: 1, data: { sessionName: 'Toothbrushing vol 3', status: 'Complete' } },
    ]);

    act(() => {
      renderTrainingReportForm('1', 'complete-event');
    });

    await waitFor(() => expect(fetchMock.called(sessionsUrl, { method: 'GET' })).toBe(true));
    await waitFor(() => expect(fetchMock.called('/api/events/id/1', { method: 'GET' })).toBe(true));
    await waitFor(async () => expect(await screen.findByRole('button', { name: /Event summary complete/i })).toBeInTheDocument());

    const statusSelect = await screen.findByRole('combobox', { name: /status/i });
    act(() => {
      userEvent.selectOptions(statusSelect, 'Complete');
    });
    expect(statusSelect).toHaveValue('Complete');

    const submitButton = await screen.findByRole('button', { name: /submit/i });
    act(() => {
      userEvent.click(submitButton);
    });

    await waitFor(() => expect(fetchMock.called('/api/events/id/1', { method: 'PUT' })).toBe(true));
    const lastBody = JSON.parse(fetchMock.lastOptions().body);
    expect(lastBody.data.status).toEqual('Complete');
    await waitFor(() => expect(screen.getByText(/There was an error saving the training report/i)).toBeInTheDocument());
  });
});
