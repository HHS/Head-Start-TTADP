import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { SCOPE_IDS } from '@ttahub/common';
import EventCards from '../EventCards';
import UserContext from '../../../../UserContext';
import { EVENT_STATUS } from '../../constants';

describe('EventCards', () => {
  const defaultEvents = [{
    id: 1,
    ownerId: 1,
    collaboratorIds: [],
    pocId: [],
    data: {
      eventName: 'Sample event 1',
      eventId: 'Sample event ID 1',
      eventOrganizer: 'Sample event organizer 1',
      reasons: ['New Program/Option'],
      startDate: '01/02/2021',
      endDate: '01/03/2021',
    },
    sessionReports: [],
  },
  {
    id: 2,
    ownerId: 1,
    collaboratorIds: [],
    pocId: [],
    data: {
      eventName: 'Sample event 2',
      eventId: 'Sample event ID 2',
      eventOrganizer: 'Sample event organizer 2',
      reasons: ['New Staff/Turnover'],
      startDate: '02/02/2021',
      endDate: '02/03/2021',
    },
    sessionReports: [],
  },
  {
    id: 3,
    ownerId: 1,
    collaboratorIds: [],
    pocId: [],
    data: {
      eventName: 'Sample event 3',
      eventId: 'Sample event ID 3',
      eventOrganizer: 'Sample event organizer 3',
      reasons: null,
      startDate: '03/02/2021',
      endDate: '03/03/2021',
    },
    sessionReports: [],
  },
  ];

  const DEFAULT_USER = {
    id: 1,
    name: 'test@test.com',
    homeRegionId: 1,
    permissions: [
      {
        scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
        regionId: 1,
      },
    ],
  };

  const renderEventCards = (
    events = defaultEvents,
    eventType = EVENT_STATUS.NOT_STARTED,
    user = DEFAULT_USER,
  ) => {
    render((
      <MemoryRouter>
        <UserContext.Provider value={{ user }}>
          <EventCards
            events={events}
            eventType={eventType}
            onRemoveSession={jest.fn()}
          />
        </UserContext.Provider>
      </MemoryRouter>));
  };

  it('renders correctly', () => {
    renderEventCards();

    expect(screen.getByText('Sample event 1')).toBeInTheDocument();
    expect(screen.getByText('Sample event ID 1')).toBeInTheDocument();
    expect(screen.getByText('Sample event organizer 1')).toBeInTheDocument();
    expect(screen.getByText('01/02/2021')).toBeInTheDocument();
    expect(screen.getByText('01/03/2021')).toBeInTheDocument();
    expect(screen.queryAllByText('New Program/Option').length).toBe(1);

    expect(screen.getByText('Sample event 2')).toBeInTheDocument();
    expect(screen.getByText('Sample event ID 2')).toBeInTheDocument();
    expect(screen.getByText('Sample event organizer 2')).toBeInTheDocument();
    expect(screen.getByText('02/02/2021')).toBeInTheDocument();
    expect(screen.getByText('02/03/2021')).toBeInTheDocument();
    expect(screen.queryAllByText('New Staff/Turnover').length).toBe(1);

    expect(screen.getByText('Sample event 3')).toBeInTheDocument();
    expect(screen.getByText('Sample event ID 3')).toBeInTheDocument();
    expect(screen.getByText('Sample event organizer 3')).toBeInTheDocument();
    expect(screen.getByText('03/02/2021')).toBeInTheDocument();
    expect(screen.getByText('03/03/2021')).toBeInTheDocument();
  });

  it('renders correctly if there are no not started events', () => {
    renderEventCards([], EVENT_STATUS.NOT_STARTED);
    expect(screen.getByText('You have no events with a “not started” status.')).toBeInTheDocument();
  });

  it('renders correctly if there are no complete events', () => {
    renderEventCards([], EVENT_STATUS.COMPLETE);
    expect(screen.getByText('You have no completed events.')).toBeInTheDocument();
  });

  it('renders correctly if there are no suspended events', () => {
    renderEventCards([], EVENT_STATUS.SUSPENDED);
    expect(screen.getByText('You have no suspended events.')).toBeInTheDocument();
  });

  it('renders correctly if there are no in progress events', () => {
    renderEventCards([], EVENT_STATUS.IN_PROGRESS);
    expect(screen.getByText('You have no events in progress.')).toBeInTheDocument();
  });

  it('renders correctly if there are no in unknown events', () => {
    renderEventCards([], 'blah');
    expect(screen.getByText('You have no events.')).toBeInTheDocument();
  });

  it('collaborator can edit reports they collaborate on and view reports in their region', () => {
    const collaboratorEvents = [{
      id: 1,
      ownerId: 2,
      collaboratorIds: [],
      pocId: [2],
      data: {
        eventName: 'Collab Event 1',
        eventId: 'Collab Event ID 1',
        eventOrganizer: 'Sample Collab event organizer 1',
        reasons: ['New Program/Option'],
        startDate: '01/02/2021',
        endDate: '01/03/2021',
      },
      sessionReports: [],
    },
    {
      id: 2,
      ownerId: 2,
      collaboratorIds: [],
      pocId: [3],
      data: {
        eventName: 'Region event 2',
        eventId: 'Region event ID 2',
        eventOrganizer: 'Sample Region event organizer 2',
        reasons: ['New Staff/Turnover'],
        startDate: '02/02/2021',
        endDate: '02/03/2021',
      },
      sessionReports: [],
    }];

    const COLLABORATOR_USER = {
      id: 2,
      name: 'test@test.com',
      homeRegionId: 1,
      permissions: [],
    };

    renderEventCards(collaboratorEvents, EVENT_STATUS.NOT_STARTED, COLLABORATOR_USER);

    // Collaborator Event.
    expect(screen.getByText('Collab Event 1')).toBeInTheDocument();
    expect(screen.getByText('Collab Event ID 1')).toBeInTheDocument();
    expect(screen.getByText('Sample Collab event organizer 1')).toBeInTheDocument();
    expect(screen.getByText('01/02/2021')).toBeInTheDocument();
    expect(screen.getByText('01/03/2021')).toBeInTheDocument();
    expect(screen.queryAllByText('New Program/Option').length).toBe(1);

    // Region Event.
    expect(screen.getByText('Region event 2')).toBeInTheDocument();
    expect(screen.getByText('Region event ID 2')).toBeInTheDocument();
    expect(screen.getByText('Sample Region event organizer 2')).toBeInTheDocument();
    expect(screen.getByText('02/02/2021')).toBeInTheDocument();
    expect(screen.getByText('02/03/2021')).toBeInTheDocument();
    expect(screen.queryAllByText('New Staff/Turnover').length).toBe(1);

    // Show correct actions for collaborator event.
    let button = screen.getByRole('button', { name: /actions for event 1/i });
    button.click(button);
    expect(screen.queryByText(/create session/i)).toBeInTheDocument();
    expect(screen.queryByText(/edit event/i)).toBeInTheDocument();
    expect(screen.queryByText(/view event/i)).toBeInTheDocument();
    button.click(button);

    // Show correct actions for region event.
    button = screen.getByRole('button', { name: /actions for event 2/i });
    button.click(button);
    expect(screen.queryByText(/edit event/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/create session/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/view event/i)).toBeInTheDocument();
  });
});
