import '@testing-library/jest-dom';
import { SCOPE_IDS } from '@ttahub/common';
import React from 'react';
import {
  render, screen, act,
} from '@testing-library/react';
import join from 'url-join';
import fetchMock from 'fetch-mock';
import { MemoryRouter } from 'react-router';
import UserContext from '../../UserContext';
import TrainingReportAlerts from '../TrainingReportAlerts';

describe('TrainingReportAlerts', () => {
  const eventsUrl = join('/', 'api', 'events', 'alerts');
  const DEFAULT_USER = {
    id: 1,
    permissions: [{
      regionId: 1,
      userId: 1,
      scopeId: SCOPE_IDS.READ_WRITE_TRAINING_REPORTS,
    }],
  };

  const renderTest = (user = DEFAULT_USER) => {
    render(
      <MemoryRouter>
        <UserContext.Provider value={{ user }}>
          <TrainingReportAlerts />
        </UserContext.Provider>
      </MemoryRouter>,
    );
  };

  afterEach(() => {
    fetchMock.restore();
  });

  it('does not fetch if the user lacks permissions', async () => {
    fetchMock.get(eventsUrl, []);
    const user = {
      id: 1,
      permissions: [{
        regionId: 1,
        userId: 1,
        scopeId: SCOPE_IDS.READ_REPORTS,
      }],
    };

    act(() => {
      renderTest(user);
    });

    expect(fetchMock.called(eventsUrl)).toBe(false);
  });

  it('shows a message when there are no alerts', async () => {
    fetchMock.get(eventsUrl, []);
    act(() => {
      renderTest();
    });

    expect(await screen.findByText('You do not have any overdue tasks.')).toBeInTheDocument();
  });

  it('shows the alerts in a table', async () => {
    fetchMock.get(eventsUrl, [
      {
        id: 1,
        eventId: 'event-1',
        eventName: 'Event 1',
        sessionName: 'Session 1',
        alertType: 'noSessionsCreated',
      },
      {
        id: 2,
        eventId: 'event-2',
        eventName: 'Event 2',
        sessionName: 'Session 2',
        alertType: 'missingEventInfo',
      },
      {
        id: 3,
        eventId: 'event-3',
        eventName: 'Event 3',
        sessionName: 'Session 3',
        alertType: 'missingSessionInfo',
      },
      {
        id: 4,
        eventId: 'event-4',
        eventName: 'Event 4',
        sessionName: 'Session 4',
        alertType: 'eventNotCompleted',
      },
    ]);

    act(() => {
      renderTest();
    });

    expect(await screen.findByText('Event 1')).toBeInTheDocument();
    expect(await screen.findByText('Session 1')).toBeInTheDocument();

    for (let i = 2; i <= 4; i += 1) {
      expect(screen.getByText(`Event ${i}`)).toBeInTheDocument();
      expect(screen.getByText(`Session ${i}`)).toBeInTheDocument();
    }
  });

  it('handles a weird "alertType" key', async () => {
    fetchMock.get(eventsUrl, [
      {
        id: 1,
        eventId: 'event-1',
        eventName: 'Event 1',
        sessionName: 'Session 1',
        alertType: 'weird',
      },
    ]);

    act(() => {
      renderTest();
    });

    expect(await screen.findByText('Event 1')).toBeInTheDocument();
    expect(await screen.findByText('Session 1')).toBeInTheDocument();
    expect(document.querySelector('[data-label="Action needed"]')).toHaveTextContent('');
  });

  it('handles an error fetching alerts', async () => {
    fetchMock.get(eventsUrl, {
      status: 500,
      body: 'Internal server error',
    });

    act(() => {
      renderTest();
    });

    expect(await screen.findByText('You do not have any overdue tasks.')).toBeInTheDocument();
  });
});
