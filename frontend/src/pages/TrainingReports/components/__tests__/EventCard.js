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
    ownerId: 1,
    collaboratorIds: [],
    pocIds: [],
    regionId: 1,
    data: {
      eventName: 'This is my event title',
      eventId: 'TR-R01-1234',
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
    id: 1,
    name: 'test@test.com',
    homeRegionId: 1,
    permissions: [
      {
        scopeId: SCOPE_IDS.READ_WRITE_TRAINING_REPORTS,
        regionId: 1,
      },
    ],
  };

  const renderEventCard = (event = defaultEvent, user = DEFAULT_USER) => {
    render((
      <UserContext.Provider value={{ user }}>
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
    expect(screen.getByText('TR-R01-1234')).toBeInTheDocument();
    expect(screen.getByText('This is my event organizer')).toBeInTheDocument();
    expect(screen.getByText('01/02/2021')).toBeInTheDocument();
    expect(screen.getByText('---')).toBeInTheDocument();
    expect(screen.queryAllByText('New Program/Option').length).toBe(2);
  });

  it('displays sessions', () => {
    renderEventCard();
    const expBtn = screen.getByRole('button', { name: /view sessions for event TR-R01-1234/i });
    expect(document.querySelector('.ttahub-session-card__session-list[hidden]')).toBeInTheDocument();

    // Expand Objectives via click.
    expBtn.click();
    expect(document.querySelector('.ttahub-session-card__session-list[hidden]')).not.toBeInTheDocument();

    // Collapse Objectives via click.
    expBtn.click();
    expect(document.querySelector('.ttahub-session-card__session-list[hidden]')).toBeInTheDocument();
  });

  it('hides the edit and create options', async () => {
    renderEventCard(defaultEvent, { ...DEFAULT_USER, id: 2, permissions: [] });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    contextBtn.click();
    expect(screen.queryByText(/edit event/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/view event/i)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: defaultEvent.data.eventId })).toHaveAttribute('href', '/training-report/view/1234');
  });

  it('hides the edit and create options for completed event with write permissions', () => {
    renderEventCard({ ...defaultEvent, data: { ...defaultEvent.data, status: 'Complete' } });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    contextBtn.click();
    expect(screen.queryByText(/edit event/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/view event/i)).toBeInTheDocument();
  });

  it('hides the edit and create options for users with only write permission and no event roles', async () => {
    renderEventCard(defaultEvent, { ...DEFAULT_USER, id: 12 });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    contextBtn.click();
    expect(screen.queryByText(/edit event/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/view event/i)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: defaultEvent.data.eventId })).toHaveAttribute('href', '/training-report/view/1234');
  });

  it('only shows the view options with view permission', async () => {
    renderEventCard(defaultEvent,
      {
        ...DEFAULT_USER,
        id: 2,
        permissions: [{ scopeId: SCOPE_IDS.READ_TRAINING_REPORTS, regionId: 1 }],
      });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    contextBtn.click();
    expect(screen.queryByText(/edit event/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/view event/i)).toBeInTheDocument();
  });

  it('does not show the create session option for poc without write permission', async () => {
    renderEventCard({
      ...defaultEvent,
      pocIds: [2],
    },
    {
      ...DEFAULT_USER,
      id: 2,
      permissions: [
        {
          scopeId: SCOPE_IDS.READ_TRAINING_REPORTS,
          regionId: 1,
        },
      ],
    });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    contextBtn.click();
    expect(screen.queryByText(/edit event/i)).toBeInTheDocument();
    expect(screen.queryByText(/create session/i)).toBeNull();
    expect(screen.queryByText(/view event/i)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: defaultEvent.data.eventId })).toHaveAttribute('href', '/training-report/1234/event-summary');
  });
});
