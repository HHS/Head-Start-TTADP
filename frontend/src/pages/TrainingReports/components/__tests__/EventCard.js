import React from 'react';
import { Router } from 'react-router';
import { act, render, screen } from '@testing-library/react';
import { SCOPE_IDS, SUPPORT_TYPES } from '@ttahub/common';
import fetchMock from 'fetch-mock';
import userEvent from '@testing-library/user-event';
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
          objectiveSupportType: SUPPORT_TYPES[2],
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

  const renderEventCard = (
    event = defaultEvent,
    user = DEFAULT_USER,
    onDeleteEvent = jest.fn(),
  ) => {
    render((
      <UserContext.Provider value={{ user }}>
        <Router history={history}>
          <EventCard
            event={event}
            onRemoveSession={jest.fn()}
            onDeleteEvent={onDeleteEvent}
            zIndex={0}
          />
        </Router>
      </UserContext.Provider>));
  };

  afterEach(() => {
    fetchMock.restore();
  });

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
    userEvent.click(expBtn);
    expect(document.querySelector('.ttahub-session-card__session-list[hidden]')).not.toBeInTheDocument();

    // Collapse Objectives via click.
    userEvent.click(expBtn);
    expect(document.querySelector('.ttahub-session-card__session-list[hidden]')).toBeInTheDocument();
  });

  it('hides the edit and create options', async () => {
    renderEventCard(defaultEvent, { ...DEFAULT_USER, id: 2, permissions: [] });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    userEvent.click(contextBtn);
    expect(screen.queryByText(/edit event/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/view event/i)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: defaultEvent.data.eventId })).toHaveAttribute('href', '/training-report/view/1234');
  });

  it('hides the edit and create options for completed event with write permissions', () => {
    renderEventCard({ ...defaultEvent, data: { ...defaultEvent.data, status: 'Complete' } });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    userEvent.click(contextBtn);
    expect(screen.queryByText(/edit event/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/view event/i)).toBeInTheDocument();
  });

  it('hides the edit and create options for users with only write permission and no event roles', async () => {
    renderEventCard(defaultEvent, { ...DEFAULT_USER, id: 12 });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    userEvent.click(contextBtn);
    expect(screen.queryByText(/edit event/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/view event/i)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: defaultEvent.data.eventId })).toHaveAttribute('href', '/training-report/view/1234');
  });

  it('only shows the view options with view permission', async () => {
    renderEventCard(defaultEvent,
      {
        ...DEFAULT_USER,
        id: 2,
        permissions: [{ scopeId: SCOPE_IDS.READ_REPORTS, regionId: 1 }],
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
          scopeId: SCOPE_IDS.READ_REPORTS,
          regionId: 1,
        },
      ],
    });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    userEvent.click(contextBtn);
    expect(screen.queryByText(/edit event/i)).toBeInTheDocument();
    expect(screen.queryByText(/create session/i)).toBeNull();
    expect(screen.queryByText(/view event/i)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: defaultEvent.data.eventId })).toHaveAttribute('href', '/training-report/1234/event-summary');
  });

  it('hides the delete for events that arent not started or suspended', async () => {
    renderEventCard({ ...defaultEvent, data: { ...defaultEvent.data, status: 'In progress' } }, DEFAULT_USER);
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    contextBtn.click();
    expect(screen.queryByText(/delete event/i)).not.toBeInTheDocument();
  });

  it('shows the delete for events that are not started or suspended', async () => {
    renderEventCard({ ...defaultEvent, data: { ...defaultEvent.data, status: 'Suspended' } }, {
      ...DEFAULT_USER,
      permissions: [{
        scopeId: SCOPE_IDS.ADMIN,
        regionId: 1,
      },
      ],
    });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    userEvent.click(contextBtn);
    expect(screen.queryByText(/delete event/i)).toBeInTheDocument();
  });

  it('shows the delete modal for events and calls the correct function', async () => {
    const onDeleteEvent = jest.fn();
    renderEventCard({ ...defaultEvent, data: { ...defaultEvent.data, status: 'Suspended' } }, {
      ...DEFAULT_USER,
      permissions: [{
        scopeId: SCOPE_IDS.ADMIN,
        regionId: 1,
      },
      ],
    }, onDeleteEvent);
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    userEvent.click(contextBtn);

    expect(screen.queryByText(/delete event/i)).toBeInTheDocument();
    const deleteBtns = screen.queryAllByRole('button', { name: /delete event/i });
    userEvent.click(deleteBtns[0]);

    expect(await screen.findByText(/are you sure you want to delete this event/i)).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: /delete event/i });
    userEvent.click(confirmBtn);
    expect(onDeleteEvent).toHaveBeenCalledWith('1234', 1);
  });

  it('calls the appropriate context menu paths', () => {
    history.push = jest.fn();
    renderEventCard({ ...defaultEvent, data: { ...defaultEvent.data, status: 'Not started' } });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    userEvent.click(contextBtn);

    // Edit event.
    const editEvent = screen.queryByText(/edit event/i);
    expect(editEvent).toBeInTheDocument();
    userEvent.click(editEvent);
    expect(history.push).toHaveBeenCalledWith('/training-report/1234/event-summary');

    // Create session.
    userEvent.click(contextBtn);
    const createSession = screen.queryByText(/create session/i);
    expect(createSession).toBeInTheDocument();
    userEvent.click(createSession);
    expect(history.push).toHaveBeenCalledWith('/training-report/1234/session/new/');

    // View event.
    contextBtn.click();
    const viewEvent = screen.queryByText(/view event/i);
    expect(viewEvent).toBeInTheDocument();
    userEvent.click(viewEvent);
    expect(history.push).toHaveBeenCalledWith('/training-report/view/1234');
  });

  it('does not show complete event if not owner', async () => {
    renderEventCard({ ...defaultEvent, data: { ...defaultEvent.data, status: 'In progress' } }, { ...DEFAULT_USER, id: 2 });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    userEvent.click(contextBtn);
    const completeEvent = screen.queryByText(/complete event/i);
    expect(completeEvent).not.toBeInTheDocument();
  });

  it('does not show complete event if no sessions', async () => {
    renderEventCard({ ...defaultEvent, data: { ...defaultEvent.data, status: 'In progress', sessionReports: [] } });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    userEvent.click(contextBtn);
    const completeEvent = screen.queryByText(/complete event/i);
    expect(completeEvent).not.toBeInTheDocument();
  });

  it('does not show complete event if complete', async () => {
    renderEventCard({ ...defaultEvent, data: { ...defaultEvent.data, status: 'Complete' } });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    userEvent.click(contextBtn);
    const completeEvent = screen.queryByText(/complete event/i);
    expect(completeEvent).not.toBeInTheDocument();
  });

  it('does not show complete event if sessions not complete', async () => {
    renderEventCard({ ...defaultEvent, data: { ...defaultEvent.data, status: 'In progress' } });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    userEvent.click(contextBtn);
    const completeEvent = screen.queryByText(/complete event/i);
    expect(completeEvent).not.toBeInTheDocument();
  });

  it('does not show complete event if poc not complete', async () => {
    renderEventCard({
      ...defaultEvent,
      sessionReports: [{ ...defaultEvent.sessionReports[0], data: { ...defaultEvent.sessionReports[0].data, status: 'Complete' } }],
      data: { ...defaultEvent.data, status: 'In progress' },
    });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    userEvent.click(contextBtn);
    const completeEvent = screen.queryByText(/complete event/i);
    expect(completeEvent).not.toBeInTheDocument();
  });

  it('does not show complete event if owner not complete', async () => {
    renderEventCard({
      ...defaultEvent,
      sessionReports: [{ ...defaultEvent.sessionReports[0], data: { ...defaultEvent.sessionReports[0].data, status: 'Complete' } }],
      data: { ...defaultEvent.data, status: 'In progress', pocComplete: true },
    });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    userEvent.click(contextBtn);
    const completeEvent = screen.queryByText(/complete event/i);
    expect(completeEvent).not.toBeInTheDocument();
  });

  it('shows complete event if all of the above are true', async () => {
    renderEventCard({
      ...defaultEvent,
      sessionReports: [{ ...defaultEvent.sessionReports[0], data: { ...defaultEvent.sessionReports[0].data, status: 'Complete' } }],
      data: {
        ...defaultEvent.data, status: 'In progress', pocComplete: true, ownerComplete: true,
      },
    });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    userEvent.click(contextBtn);
    const completeEvent = screen.queryByText(/complete event/i);
    expect(completeEvent).toBeInTheDocument();
  });

  it('happy path: async complete event', async () => {
    renderEventCard({
      ...defaultEvent,
      sessionReports: [{ ...defaultEvent.sessionReports[0], data: { ...defaultEvent.sessionReports[0].data, status: 'Complete' } }],
      data: {
        ...defaultEvent.data, status: 'In progress', pocComplete: true, ownerComplete: true,
      },
    });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    userEvent.click(contextBtn);
    const completeEvent = screen.queryByText(/complete event/i);
    expect(completeEvent).toBeInTheDocument();
    fetchMock.put('/api/events/id/1/complete', { message: 'success', id: 1 });
    act(() => {
      userEvent.click(completeEvent);
    });

    expect(fetchMock.called()).toBe(true);
    expect(await screen.findByText(/event completed successfully/i)).toBeInTheDocument();
  });

  it('sad path: async failure to complete event', async () => {
    renderEventCard({
      ...defaultEvent,
      sessionReports: [{ ...defaultEvent.sessionReports[0], data: { ...defaultEvent.sessionReports[0].data, status: 'Complete' } }],
      data: {
        ...defaultEvent.data, status: 'In progress', pocComplete: true, ownerComplete: true,
      },
    });
    expect(screen.getByText('This is my event title')).toBeInTheDocument();
    const contextBtn = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    userEvent.click(contextBtn);
    const completeEvent = screen.queryByText(/complete event/i);
    expect(completeEvent).toBeInTheDocument();
    fetchMock.put('/api/events/id/1/complete', 500);
    act(() => {
      userEvent.click(completeEvent);
    });

    expect(fetchMock.called()).toBe(true);
    expect(await screen.findByText(/error completing event/i)).toBeInTheDocument();
  });
});
