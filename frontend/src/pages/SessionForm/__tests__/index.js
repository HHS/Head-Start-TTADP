import React from 'react';
import join from 'url-join';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SUPPORT_TYPES, TRAINING_REPORT_STATUSES } from '@ttahub/common';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import SessionForm from '..';
import UserContext from '../../../UserContext';
import AppLoadingContext from '../../../AppLoadingContext';
import { COMPLETE, IN_PROGRESS } from '../../../components/Navigator/constants';
import { mockRSSData } from '../../../testHelpers';

describe('SessionReportForm', () => {
  const sessionsUrl = join('/', 'api', 'session-reports');
  const history = createMemoryHistory();

  const renderSessionForm = (trainingReportId, currentPage, sessionId) => render(
    <Router history={history}>
      <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading: jest.fn() }}>
        <UserContext.Provider value={{ user: { id: 1, permissions: [], name: 'Ted User' } }}>
          <SessionForm match={{
            params: { currentPage, trainingReportId, sessionId },
            path: currentPage,
            url: currentPage,
          }}
          />
        </UserContext.Provider>
      </AppLoadingContext.Provider>
    </Router>,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    fetchMock.reset();

    // the basic app before stuff
    fetchMock.get('/api/alerts', []);
    fetchMock.get('/api/topic', [{ id: 1, name: 'Behavioral Health' }]);
    fetchMock.get('/api/users/statistics', {});
    fetchMock.get('/api/national-center', [
      'DTL',
      'HBHS',
      'PFCE',
      'PFMO',
    ].map((name, id) => ({ id, name })));
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', mockRSSData());
  });

  it('creates a new session if id is "new"', async () => {
    fetchMock.post(sessionsUrl, { eventId: 1 });

    act(() => {
      renderSessionForm('1', 'session-summary', 'new');
    });

    await waitFor(() => expect(fetchMock.called(sessionsUrl, { method: 'POST' })).toBe(true));

    expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();
  });

  it('handles an error creating a new report', async () => {
    fetchMock.post(sessionsUrl, 500);

    act(() => {
      renderSessionForm('1', 'session-summary', 'new');
    });

    await waitFor(() => expect(fetchMock.called(sessionsUrl, { method: 'POST' })).toBe(true));

    expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();
    expect(screen.getByText(/Error creating session/i)).toBeInTheDocument();
  });

  it('fetches existing session report form', async () => {
    jest.useFakeTimers();
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, { eventId: 1, data: { eventName: 'Tis an event' } },
    );

    act(() => {
      renderSessionForm('1', 'session-summary', '1');
    });

    await waitFor(() => expect(fetchMock.called(url)).toBe(true));
    jest.advanceTimersByTime(30000);

    expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();
  });

  it('handles an error fetching a session', async () => {
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, 500,
    );

    act(() => {
      renderSessionForm('1', 'session-summary', '1');
    });

    await waitFor(() => expect(fetchMock.called(url)).toBe(true));

    expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();
    expect(screen.getByText(/Error fetching session/i)).toBeInTheDocument();
  });

  it('saves draft', async () => {
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, { eventId: 1 },
    );

    act(() => {
      renderSessionForm('1', 'session-summary', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

    expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();

    fetchMock.put(url, { eventId: 1 });
    const saveSession = screen.getByText(/Save draft/i);
    userEvent.click(saveSession);
    await waitFor(() => expect(fetchMock.called(url, { method: 'put' })).toBe(true));
  });

  it('handles error saving draft', async () => {
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, { eventId: 1 },
    );

    act(() => {
      renderSessionForm('1', 'session-summary', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

    expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();

    fetchMock.put(url, 500);
    const saveSession = screen.getByText(/Save draft/i);
    userEvent.click(saveSession);
    await waitFor(() => expect(fetchMock.called(url, { method: 'put' })).toBe(true));
    expect(screen.getByText(/There was an error saving the session/i)).toBeInTheDocument();
  });

  it('saves on save and continue', async () => {
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, { eventId: 1 },
    );

    act(() => {
      renderSessionForm('1', 'session-summary', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

    expect(screen.getByText(/Training report - Session/i)).toBeInTheDocument();

    fetchMock.put(url, { eventId: 1 });
    const saveSession = screen.getByText(/Save and continue/i);
    userEvent.click(saveSession);
    await waitFor(() => expect(fetchMock.called(url, { method: 'put' })).toBe(true));
  });
  it('will not submit if every page is not complete', async () => {
    const url = join(sessionsUrl, 'id', '1');
    const formData = {
      eventId: 1,
      eventDisplayId: 'R-EVENT',
      id: 1,
      ownerId: 1,
      eventName: 'Test event',
      status: 'In progress',
      pageState: {
        1: IN_PROGRESS,
        2: COMPLETE,
        3: COMPLETE,
      },
      sessionName: 'Test session',
      duration: 1,
      context: '', // context missing
      objective: 'test objective',
      objectiveTopics: ['topic'],
      objectiveTrainers: ['DTL'],
      objectiveResources: [],
      files: [],
      objectiveSupportType: SUPPORT_TYPES[1],
      regionId: 1,
      participants: [],
      deliveryMethod: 'In person',
      numberOfParticipants: 1,
      ttaProvided: 'oH YEAH',
      specialistNextSteps: [{ note: 'A', completeDate: '01/01/2024' }],
      recipientNextSteps: [{ note: 'B', completeDate: '01/01/2024' }],
      language: [],
    };

    fetchMock.get(url, formData);

    act(() => {
      renderSessionForm('1', 'complete-session', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

    const statusSelect = await screen.findByRole('combobox', { name: /status/i });
    act(() => {
      userEvent.selectOptions(statusSelect, 'Complete');
    });
    fetchMock.put(url, formData);
    const submit = screen.getByRole('button', { name: /Submit/i });
    act(() => {
      userEvent.click(submit);
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'PUT' })).not.toBe(true));

    expect(await screen.findByText(/This report cannot be submitted until all sections are complete\. Please review the following sections/i)).toBeInTheDocument();
  });
  it('will not submit if status is not complete', async () => {
    const url = join(sessionsUrl, 'id', '1');
    const formData = {
      eventId: 1,
      eventDisplayId: 'R-EVENT',
      id: 1,
      ownerId: 1,
      eventName: 'Test event',
      status: 'In progress',
      pageState: {
        1: IN_PROGRESS,
        2: COMPLETE,
        3: COMPLETE,
      },
      sessionName: 'Test session',
      duration: 1,
      context: '', // context missing
      objective: 'test objective',
      objectiveTopics: ['topic'],
      objectiveTrainers: ['DTL'],
      objectiveResources: [],
      files: [],
      objectiveSupportType: SUPPORT_TYPES[1],
      regionId: 1,
      participants: [],
      deliveryMethod: 'In person',
      numberOfParticipants: 1,
      ttaProvided: 'oH YEAH',
      specialistNextSteps: [{ note: 'A', completeDate: '01/01/2024' }],
      recipientNextSteps: [{ note: 'B', completeDate: '01/01/2024' }],
      language: [],
    };

    fetchMock.get(url, formData);

    act(() => {
      renderSessionForm('1', 'complete-session', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));
    fetchMock.put(url, formData);
    const submit = screen.getByRole('button', { name: /Submit/i });
    act(() => {
      userEvent.click(submit);
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'PUT' })).not.toBe(true));

    expect(await screen.findByText(/Status must be complete to submit session/i)).toBeInTheDocument();
  });
  it('will submit if every page & the status is complete', async () => {
    const url = join(sessionsUrl, 'id', '1');
    const formData = {
      eventId: 1,
      eventDisplayId: 'R-EVENT',
      id: 1,
      ownerId: 1,
      eventName: 'Test event',
      status: 'In progress',
      pageState: {
        1: IN_PROGRESS,
        2: COMPLETE,
        3: COMPLETE,
        4: COMPLETE,
      },
      'pageVisited-supporting-attachments': true,
      sessionName: 'Test session',
      endDate: '01/01/2024',
      startDate: '01/01/2024',
      duration: 1,
      context: 'asasfdsafasdfsdaf',
      objective: 'test objective',
      objectiveTopics: ['topic'],
      objectiveTrainers: ['DTL'],
      objectiveResources: [],
      files: [],
      objectiveSupportType: SUPPORT_TYPES[1],
      regionId: 1,
      participants: [1],
      recipients: [1],
      deliveryMethod: 'In-person',
      numberOfParticipants: 1,
      ttaProvided: 'oH YEAH',
      specialistNextSteps: [{ note: 'A', completeDate: '01/01/2024' }],
      recipientNextSteps: [{ note: 'B', completeDate: '01/01/2024' }],
      language: ['English'],
    };

    fetchMock.get(url, formData);

    act(() => {
      renderSessionForm('1', 'complete-session', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

    const statusSelect = await screen.findByRole('combobox', { name: /status/i });
    act(() => {
      userEvent.selectOptions(statusSelect, 'Complete');
    });

    fetchMock.put(url, formData);

    const submit = screen.getByRole('button', { name: /Submit/i });
    act(() => {
      userEvent.click(submit);
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'PUT' })).toBe(true));
  });
  it('redirects if session is complete', async () => {
    const url = join(sessionsUrl, 'id', '1');
    const formData = {
      eventId: 1,
      eventDisplayId: 'R-EVENT',
      id: 1,
      ownerId: 1,
      eventName: 'Test event',
      status: TRAINING_REPORT_STATUSES.COMPLETE,
      pageState: {
        1: IN_PROGRESS,
        2: COMPLETE,
        3: COMPLETE,
      },
      sessionName: 'Test session',
      endDate: '01/01/2024',
      startDate: '01/01/2024',
      duration: 1,
      context: 'asasfdsafasdfsdaf',
      objective: 'test objective',
      objectiveTopics: ['topic'],
      objectiveTrainers: ['DTL'],
      objectiveResources: [],
      files: [],
      objectiveSupportType: 'Planning',
      regionId: 1,
      participants: [1],
      recipients: [1],
      deliveryMethod: 'In-person',
      numberOfParticipants: 1,
      ttaProvided: 'oH YEAH',
      specialistNextSteps: [{ note: 'A', completeDate: '01/01/2024' }],
      recipientNextSteps: [{ note: 'B', completeDate: '01/01/2024' }],
    };

    fetchMock.get(url, formData);

    act(() => {
      renderSessionForm('1', 'complete-session', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));
    expect(history.location.pathname).toBe('/training-report/view/1');
  });
});
