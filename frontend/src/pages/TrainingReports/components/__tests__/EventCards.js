import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    pocIds: [],
    data: {
      eventName: 'Sample event 1',
      eventId: 'Sample event ID 1',
      eventOrganizer: 'Sample event organizer 1',
      startDate: '01/02/2021',
      endDate: '01/03/2021',
    },
    sessionReports: [],
  },
  {
    id: 2,
    ownerId: 1,
    collaboratorIds: [],
    pocIds: [],
    data: {
      eventName: 'Sample event 2',
      eventId: 'Sample event ID 2',
      eventOrganizer: 'Sample event organizer 2',
      startDate: '02/02/2021',
      endDate: '02/03/2021',
    },
    sessionReports: [],
  },
  {
    id: 3,
    ownerId: 1,
    collaboratorIds: [],
    pocIds: [],
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
    onDeleteEvent = jest.fn(),
  ) => {
    render((
      <MemoryRouter>
        <UserContext.Provider value={{ user }}>
          <EventCards
            events={events}
            eventType={eventType}
            onRemoveSession={jest.fn()}
            onDeleteEvent={onDeleteEvent}
            removeEventFromDisplay={jest.fn()}
            alerts={{
              message: null,
              setMessage: jest.fn(),
              setParentMessage: jest.fn(),
            }}
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

    expect(screen.getByText('Sample event 2')).toBeInTheDocument();
    expect(screen.getByText('Sample event ID 2')).toBeInTheDocument();
    expect(screen.getByText('Sample event organizer 2')).toBeInTheDocument();
    expect(screen.getByText('02/02/2021')).toBeInTheDocument();
    expect(screen.getByText('02/03/2021')).toBeInTheDocument();

    expect(screen.getByText('Sample event 3')).toBeInTheDocument();
    expect(screen.getByText('Sample event ID 3')).toBeInTheDocument();
    expect(screen.getByText('Sample event organizer 3')).toBeInTheDocument();
    expect(screen.getByText('03/02/2021')).toBeInTheDocument();
    expect(screen.getByText('03/03/2021')).toBeInTheDocument();
  });

  it('renders correctly if there are no not started events', () => {
    renderEventCards([], EVENT_STATUS.NOT_STARTED);
    expect(screen.getByText('There are no events.')).toBeInTheDocument();
  });

  it('renders correctly if there are no complete events', () => {
    renderEventCards([], EVENT_STATUS.COMPLETE);
    expect(screen.getByText('There are no events.')).toBeInTheDocument();
  });

  it('renders correctly if there are no suspended events', () => {
    renderEventCards([], EVENT_STATUS.SUSPENDED);
    expect(screen.getByText('There are no events.')).toBeInTheDocument();
  });

  it('renders correctly if there are no in progress events', () => {
    renderEventCards([], EVENT_STATUS.IN_PROGRESS);
    expect(screen.getByText('There are no events.')).toBeInTheDocument();
  });

  it('renders correctly if there are no in unknown events', () => {
    renderEventCards([], 'blah');
    expect(screen.getByText('There are no events.')).toBeInTheDocument();
  });

  it('collaborator can edit reports they collaborate on and view reports in their region', () => {
    const collaboratorEvents = [{
      id: 1,
      ownerId: 2,
      regionId: 1,
      collaboratorIds: [],
      pocIds: [2],
      data: {
        eventName: 'Collab Event 1',
        eventId: 'TR-R01-1234',
        eventOrganizer: 'Sample Collab event organizer 1',
        startDate: '01/02/2021',
        endDate: '01/03/2021',
      },
      sessionReports: [],
    },
    {
      id: 2,
      regionId: 1,
      ownerId: 12,
      collaboratorIds: [],
      pocIds: [3],
      data: {
        eventName: 'Region event 2',
        eventId: 'TR-R02-1235',
        eventOrganizer: 'Sample Region event organizer 2',
        startDate: '02/02/2021',
        endDate: '02/03/2021',
      },
      sessionReports: [],
    }];

    const COLLABORATOR_USER = {
      id: 2,
      name: 'test@test.com',
      homeRegionId: 1,
      permissions: [
        {
          scopeId: SCOPE_IDS.READ_WRITE_TRAINING_REPORTS,
          regionId: 1,
        },
      ],
    };

    renderEventCards(collaboratorEvents, EVENT_STATUS.NOT_STARTED, COLLABORATOR_USER);

    // Collaborator Event.
    expect(screen.getByText('Collab Event 1')).toBeInTheDocument();
    expect(screen.getByText('TR-R01-1234')).toBeInTheDocument();
    expect(screen.getByText('Sample Collab event organizer 1')).toBeInTheDocument();
    expect(screen.getByText('01/02/2021')).toBeInTheDocument();
    expect(screen.getByText('01/03/2021')).toBeInTheDocument();

    // Region Event.
    expect(screen.getByText('Region event 2')).toBeInTheDocument();
    expect(screen.getByText('TR-R02-1235')).toBeInTheDocument();
    expect(screen.getByText('Sample Region event organizer 2')).toBeInTheDocument();
    expect(screen.getByText('02/02/2021')).toBeInTheDocument();
    expect(screen.getByText('02/03/2021')).toBeInTheDocument();

    // Show correct actions for collaborator event.
    let button = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    button.click(button);
    expect(screen.queryByText(/create session/i)).toBeInTheDocument();
    expect(screen.queryByText(/edit event/i)).toBeInTheDocument();
    expect(screen.queryByText(/view\/print event/i)).toBeInTheDocument();
    button.click(button);

    // Show correct actions for region event.
    button = screen.getByRole('button', { name: /actions for event TR-R02-1235/i });
    button.click(button);
    expect(screen.queryByText(/edit event/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/create session/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/view\/print event/i)).toBeInTheDocument();
  });

  it('POC cannot create sessions', () => {
    const collaboratorEvents = [{
      id: 1,
      ownerId: 3,
      regionId: 1,
      collaboratorIds: [],
      pocIds: [2],
      data: {
        eventName: 'Collab Event 1',
        eventId: 'TR-R01-1234',
        eventOrganizer: 'Sample Collab event organizer 1',
        startDate: '01/02/2021',
        endDate: '01/03/2021',
      },
      sessionReports: [],
    }];

    const COLLABORATOR_USER = {
      id: 2,
      name: 'test@test.com',
      homeRegionId: 1,
      permissions: [
        {
          scopeId: SCOPE_IDS.READ_WRITE_TRAINING_REPORTS,
          regionId: 1,
        },
      ],
    };

    renderEventCards(collaboratorEvents, EVENT_STATUS.NOT_STARTED, COLLABORATOR_USER);

    // Collaborator Event.
    expect(screen.getByText('Collab Event 1')).toBeInTheDocument();
    expect(screen.getByText('TR-R01-1234')).toBeInTheDocument();
    expect(screen.getByText('Sample Collab event organizer 1')).toBeInTheDocument();
    expect(screen.getByText('01/02/2021')).toBeInTheDocument();
    expect(screen.getByText('01/03/2021')).toBeInTheDocument();

    // Show correct actions for collaborator event.
    const button = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    button.click(button);
    expect(screen.queryByText(/create session/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/edit event/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/view\/print event/i)).toBeInTheDocument();
    button.click(button);
  });

  it('collaborators cannot edit training', () => {
    const collaboratorEvents = [{
      id: 1,
      ownerId: 3,
      regionId: 1,
      collaboratorIds: [2],
      pocIds: [4],
      data: {
        eventName: 'Collab Event 1',
        eventId: 'TR-R01-1234',
        eventOrganizer: 'Sample Collab event organizer 1',
        startDate: '01/02/2021',
        endDate: '01/03/2021',
      },
      sessionReports: [],
    }];

    const COLLABORATOR_USER = {
      id: 2,
      name: 'test@test.com',
      homeRegionId: 1,
      permissions: [
        {
          scopeId: SCOPE_IDS.READ_WRITE_TRAINING_REPORTS,
          regionId: 1,
        },
      ],
    };

    renderEventCards(collaboratorEvents, EVENT_STATUS.NOT_STARTED, COLLABORATOR_USER);

    // Collaborator Event.
    expect(screen.getByText('Collab Event 1')).toBeInTheDocument();
    expect(screen.getByText('TR-R01-1234')).toBeInTheDocument();
    expect(screen.getByText('Sample Collab event organizer 1')).toBeInTheDocument();
    expect(screen.getByText('01/02/2021')).toBeInTheDocument();
    expect(screen.getByText('01/03/2021')).toBeInTheDocument();

    // Show correct actions for collaborator event.
    const button = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    button.click(button);
    expect(screen.queryByText(/create session/i)).toBeInTheDocument();
    expect(screen.queryByText(/edit event/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/view\/print event/i)).toBeInTheDocument();
    button.click(button);
  });

  it('viewers unattached see no buttons', () => {
    const collaboratorEvents = [{
      id: 1,
      ownerId: 2,
      regionId: 1,
      collaboratorIds: [3],
      pocIds: [4],
      data: {
        eventName: 'Collab Event 1',
        eventId: 'TR-R01-1234',
        eventOrganizer: 'Sample Collab event organizer 1',
        startDate: '01/02/2021',
        endDate: '01/03/2021',
      },
      sessionReports: [],
    }];

    const COLLABORATOR_USER = {
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

    renderEventCards(collaboratorEvents, EVENT_STATUS.NOT_STARTED, COLLABORATOR_USER);

    // Collaborator Event.
    expect(screen.getByText('Collab Event 1')).toBeInTheDocument();
    expect(screen.getByText('TR-R01-1234')).toBeInTheDocument();
    expect(screen.getByText('Sample Collab event organizer 1')).toBeInTheDocument();
    expect(screen.getByText('01/02/2021')).toBeInTheDocument();
    expect(screen.getByText('01/03/2021')).toBeInTheDocument();

    // Show correct actions for collaborator event.
    const button = screen.getByRole('button', { name: /actions for event TR-R01-1234/i });
    button.click(button);
    expect(screen.queryByText(/create session/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/edit event/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/delete event/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/view\/print event/i)).toBeInTheDocument();
    button.click(button);
  });

  it('admins see edit and delete event', () => {
    const deleteFunction = jest.fn();
    const collaboratorEvents = [{
      id: 1,
      ownerId: 2,
      regionId: 1,
      collaboratorIds: [3],
      pocIds: [4],
      data: {
        eventName: 'Collab Event 1',
        eventId: '-1234',
        eventOrganizer: 'Sample Collab event organizer 1',
        startDate: '01/02/2021',
        endDate: '01/03/2021',
        status: 'Not started',
      },
      sessionReports: [],
    }];

    const COLLABORATOR_USER = {
      id: 1,
      name: 'test@test.com',
      homeRegionId: 1,
      permissions: [
        {
          scopeId: SCOPE_IDS.ADMIN,
          regionId: 1,
        },
      ],
    };

    renderEventCards(
      collaboratorEvents,
      EVENT_STATUS.NOT_STARTED,
      COLLABORATOR_USER,
      deleteFunction,
    );

    // Collaborator Event.
    expect(screen.getByText('Collab Event 1')).toBeInTheDocument();
    expect(screen.getByText('-1234')).toBeInTheDocument();
    expect(screen.getByText('Sample Collab event organizer 1')).toBeInTheDocument();
    expect(screen.getByText('01/02/2021')).toBeInTheDocument();
    expect(screen.getByText('01/03/2021')).toBeInTheDocument();

    // Show correct actions for collaborator event.
    const button = screen.getByRole('button', { name: /actions for event -1234/i });
    userEvent.click(button);
    expect(screen.queryByText(/create session/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/edit event/i)).toBeInTheDocument();
    expect(screen.queryByText(/delete event/i)).toBeInTheDocument();
    expect(screen.queryByText(/view\/print event/i)).toBeInTheDocument();

    // Click delete.
    expect(screen.queryByText(/delete event/i)).toBeInTheDocument();
    const deleteBtns = screen.queryAllByRole('button', { name: /delete event/i });
    userEvent.click(deleteBtns[0]);

    expect(screen.getByText(/are you sure you want to delete this event/i)).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: /delete event/i });
    userEvent.click(confirmBtn);
    expect(deleteFunction).toHaveBeenCalledWith('1234', 1);
  });

  it('renders an Alert message if there is one', () => {
    const renderECWithAlert = (
      events = defaultEvents,
      eventType = EVENT_STATUS.NOT_STARTED,
      user = DEFAULT_USER,
      onDeleteEvent = jest.fn(),
    ) => {
      render((
        <MemoryRouter>
          <UserContext.Provider value={{ user }}>
            <EventCards
              events={events}
              eventType={eventType}
              onRemoveSession={jest.fn()}
              onDeleteEvent={onDeleteEvent}
              removeEventFromDisplay={jest.fn()}
              alerts={{
                message: { type: 'info', text: 'Test Alert' },
                setMessage: jest.fn(),
                setParentMessage: jest.fn(),
              }}
            />
          </UserContext.Provider>
        </MemoryRouter>));
    };
    renderECWithAlert();
    expect(screen.getByText('Test Alert')).toBeInTheDocument();
  });
});
