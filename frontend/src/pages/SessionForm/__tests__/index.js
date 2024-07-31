import React from 'react';
import join from 'url-join';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TRAINING_REPORT_STATUSES } from '@ttahub/common';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import SessionForm from '..';
import UserContext from '../../../UserContext';
import AppLoadingContext from '../../../AppLoadingContext';
import { COMPLETE, IN_PROGRESS } from '../../../components/Navigator/constants';
import { mockRSSData } from '../../../testHelpers';
import SomethingWentWrongContext from '../../../SomethingWentWrongContext';

describe('SessionReportForm', () => {
  const sessionsUrl = join('/', 'api', 'session-reports');
  const history = createMemoryHistory();

  const renderSessionForm = (
    trainingReportId,
    currentPage,
    sessionId,
    setErrorResponseCode = jest.fn,
  ) => render(
    <Router history={history}>
      <AppLoadingContext.Provider value={{ isAppLoading: false, setIsAppLoading: jest.fn() }}>
        <SomethingWentWrongContext.Provider value={{ setErrorResponseCode }}>
          <UserContext.Provider value={{ user: { id: 1, permissions: [], name: 'Ted User' } }}>
            <SessionForm match={{
              params: { currentPage, trainingReportId, sessionId },
              path: currentPage,
              url: currentPage,
            }}
            />
          </UserContext.Provider>
        </SomethingWentWrongContext.Provider>
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
    fetchMock.get('/api/courses', []);
    fetchMock.get('/api/national-center', [
      'DTL',
      'HBHS',
      'PFCE',
      'PFMO',
    ].map((name, id) => ({ id, name })));
    fetchMock.get('/api/feeds/item?tag=ttahub-topic', mockRSSData());
    fetchMock.get('/api/feeds/item?tag=ttahub-tta-support-type', mockRSSData());
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

  it('sets response error', async () => {
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, 500,
    );
    const setErrorResponseCode = jest.fn();
    act(() => {
      renderSessionForm('1', 'session-summary', '1', setErrorResponseCode);
    });
    await waitFor(() => expect(fetchMock.called(url)).toBe(true));
    expect(setErrorResponseCode).toHaveBeenCalledWith(500);
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
      renderSessionForm('1', 'session-summary', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));
    expect(history.location.pathname).toBe('/training-report/view/1');
  });
});
