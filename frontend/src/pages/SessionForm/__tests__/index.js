import React from 'react';
import join from 'url-join';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import SessionForm from '..';
import UserContext from '../../../UserContext';
import AppLoadingContext from '../../../AppLoadingContext';

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
    fetchMock.reset();

    // the basic app before stuff
    fetchMock.get('/api/alerts', []);
    fetchMock.get('/api/topic', [{ id: 1, name: 'Behavioral Health' }]);
    fetchMock.get('/api/users/statistics', {});
  });

  it('creates a new session if id is "new"', async () => {
    fetchMock.post(sessionsUrl, { eventId: 1 });

    act(() => {
      renderSessionForm('1', 'session-summary', 'new');
    });

    await waitFor(() => expect(fetchMock.called(sessionsUrl, { method: 'POST' })).toBe(true));

    expect(screen.getByText(/Regional\/National Training Report/i)).toBeInTheDocument();
  });

  it('fetches existing session report form', async () => {
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, { eventId: 1 },
    );

    act(() => {
      renderSessionForm('1', 'session-summary', '1');
    });

    await waitFor(() => expect(fetchMock.called(url)).toBe(true));

    expect(screen.getByText(/Regional\/National Training Report/i)).toBeInTheDocument();
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

    expect(screen.getByText(/Regional\/National Training Report/i)).toBeInTheDocument();

    fetchMock.put(url, { eventId: 1 });
    const saveSession = screen.getByText(/Save Session/i);
    userEvent.click(saveSession);
    await waitFor(() => expect(fetchMock.called(url, { method: 'put' })).toBe(true));
  });

  it('triggers validation on save and continue', async () => {
    const url = join(sessionsUrl, 'id', '1');

    fetchMock.get(
      url, { eventId: 1 },
    );

    act(() => {
      renderSessionForm('1', 'session-summary', '1');
    });

    await waitFor(() => expect(fetchMock.called(url, { method: 'get' })).toBe(true));

    expect(screen.getByText(/Regional\/National Training Report/i)).toBeInTheDocument();

    fetchMock.put(url, { eventId: 1 });
    const saveSession = screen.getByText(/Save and continue/i);
    userEvent.click(saveSession);
    await waitFor(() => expect(fetchMock.called(url, { method: 'put' })).toBe(true));
  });
});
