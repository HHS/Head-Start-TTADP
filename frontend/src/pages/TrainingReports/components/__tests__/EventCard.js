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
    pocId: [],
    regionId: 1,
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
    expect(screen.getByText('This is my event ID')).toBeInTheDocument();
    expect(screen.getByText('This is my event organizer')).toBeInTheDocument();
    expect(screen.getByText('01/02/2021')).toBeInTheDocument();
    expect(screen.getByText('---')).toBeInTheDocument();
    expect(screen.queryAllByText('New Program/Option').length).toBe(2);
  });

  it('displays sessions', () => {
    renderEventCard();
    const expBtn = screen.getByRole('button', { name: /view sessions for event this is my event id/i });
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
    const contextBtn = screen.getByRole('button', { name: /actions for event 1/i });
    contextBtn.click();
    expect(screen.queryByText(/edit event/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/view event/i)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: defaultEvent.data.eventId })).toHaveAttribute('href', '/training-report/view/1');
  });

  it('hides the edit and create options for completed event with write permissions', () => {
    renderEventCard({ ...defaultEvent, data: { ...defaultEvent.data, status: 'Complete' } });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event 1/i });
    contextBtn.click();
    expect(screen.queryByText(/edit event/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/view event/i)).toBeInTheDocument();
  });

  it('hides the edit and create options for users with only write permission and no event roles', async () => {
    renderEventCard(defaultEvent, { ...DEFAULT_USER, id: 12 });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event 1/i });
    contextBtn.click();
    expect(screen.queryByText(/edit event/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/view event/i)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: defaultEvent.data.eventId })).toHaveAttribute('href', '/training-report/view/1');
  });

  it('only shows the view options with view permission', async () => {
    renderEventCard(defaultEvent,
      {
        ...DEFAULT_USER,
        id: 2,
        permissions: [{ scopeId: SCOPE_IDS.READ_TRAINING_REPORTS, regionId: 1 }],
      });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event 1/i });
    contextBtn.click();
    expect(screen.queryByText(/edit event/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/view event/i)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: defaultEvent.data.eventId })).toHaveAttribute('href', '/training-report/view/1');
  });

  it('shows the edit and create options for a poc with write permission', async () => {
    renderEventCard({
      ...defaultEvent,
      pocId: [2],
    },
    { ...DEFAULT_USER, id: 2 });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event 1/i });
    contextBtn.click();
    expect(screen.queryByText(/edit event/i)).toBeInTheDocument();
    expect(screen.queryByText(/view event/i)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: defaultEvent.data.eventId })).toHaveAttribute('href', '/training-report/1/event-summary');
  });

  it('shows the edit and create options for a collaborator with write permission', async () => {
    renderEventCard({
      ...defaultEvent,
      collaboratorIds: [2],
    },
    { ...DEFAULT_USER, id: 2 });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event 1/i });
    contextBtn.click();
    expect(screen.queryByText(/edit event/i)).toBeInTheDocument();
    expect(screen.queryByText(/view event/i)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: defaultEvent.data.eventId })).toHaveAttribute('href', '/training-report/1/event-summary');
  });

  it('shows the edit and create options for a owner with write permission', async () => {
    renderEventCard({
      ...defaultEvent,
      ownerId: 2,
    },
    { ...DEFAULT_USER, id: 2 });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event 1/i });
    contextBtn.click();
    expect(screen.queryByText(/edit event/i)).toBeInTheDocument();
    expect(screen.queryByText(/view event/i)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: defaultEvent.data.eventId })).toHaveAttribute('href', '/training-report/1/event-summary');
  });

  it('shows the create session option for poc without write permission', () => {
    renderEventCard({
      ...defaultEvent,
      pocId: [2],
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
    const contextBtn = screen.getByRole('button', { name: /actions for event 1/i });
    contextBtn.click();
    expect(screen.queryByText(/edit event/i)).toBeInTheDocument();
    expect(screen.queryByText(/create session/i)).toBeInTheDocument();
    expect(screen.queryByText(/view event/i)).toBeInTheDocument();
  });
});
