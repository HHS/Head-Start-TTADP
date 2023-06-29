import React from 'react';
import { Router } from 'react-router';
import { render, screen } from '@testing-library/react';
import { SCOPE_IDS } from '@ttahub/common';
import { createMemoryHistory } from 'history';
import EventCard from '../EventCard';
import UserContext from '../../../../UserContext';

describe('EventCard', () => {
  const history = createMemoryHistory();
  const defaultEvent = {
    id: 1,
    data: {
      eventName: 'This is my event title',
      eventId: 'This is my event ID',
      eventOrganizer: 'This is my event organizer',
      reasons: ['New Program/Option', 'New Staff/Turnover'],
      startDate: '01/02/2021',
      endDate: null,
    },
    sessionReports: [
      {
        id: 1,
        data: {
          sessionName: 'This is my session title',
          startDate: '01/02/2021',
          endDate: '01/03/2021',
          objective: 'This is my session objective',
          objectiveSupportType: 'Implementing',
          objectiveTopics: ['Topic 1', 'Topic 2'],
          objectiveTrainers: ['Trainer 1', 'Trainer 2'],
          status: 'In Progress',
        },
      },
    ],
  };

  const DEFAULT_USER = {
    name: 'test@test.com',
    homeRegionId: 1,
    permissions: [
      {
        scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
        regionId: 1,
      },
    ],
  };

  const renderEventCard = (event = defaultEvent) => {
    render((
      <UserContext.Provider value={{ user: DEFAULT_USER }}>
        <Router history={history}>
          <EventCard
            event={event}
            onRemoveSession={jest.fn()}
          />
        </Router>
      </UserContext.Provider>));
  };

  it('renders correctly', () => {
    renderEventCard();
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    expect(screen.getByText('This is my event ID')).toBeInTheDocument();
    expect(screen.getByText('This is my event organizer')).toBeInTheDocument();
    expect(screen.getByText('01/02/2021')).toBeInTheDocument();
    expect(screen.getByText('---')).toBeInTheDocument();
    expect(screen.queryAllByText('New Program/Option').length).toBe(2);
  });

  it('displays sessions', () => {
    renderEventCard();
    const expBtn = screen.getByRole('button', { name: /view reports for event this is my event id/i });
    expect(document.querySelector('.ttahub-session-card__session-list[hidden]')).toBeInTheDocument();

    // Expand Objectives via click.
    expBtn.click();
    expect(document.querySelector('.ttahub-session-card__session-list[hidden]')).not.toBeInTheDocument();

    // Collapse Objectives via click.
    expBtn.click();
    expect(document.querySelector('.ttahub-session-card__session-list[hidden]')).toBeInTheDocument();
  });
});
