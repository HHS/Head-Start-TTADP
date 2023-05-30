import React from 'react';
import { render, screen } from '@testing-library/react';
import { SCOPE_IDS } from '@ttahub/common';
import EventCards from '../EventCards';
import UserContext from '../../../../UserContext';

describe('EventCards', () => {
  const defaultEvents = [{
    startDate: '2021-01-02',
    endDate: '2021-01-03',
    data: {
      'Edit Title': 'Sample event 1',
      'Event ID': 'Sample event ID 1',
      'Event Organizer - Type of Event': 'Sample event organizer 1',
    },
  },
  {
    startDate: '2021-02-02',
    endDate: '2021-02-03',
    data: {
      'Edit Title': 'Sample event 2',
      'Event ID': 'Sample event ID 2',
      'Event Organizer - Type of Event': 'Sample event organizer 2',
    },
  },
  {
    startDate: '2021-03-02',
    endDate: '2021-03-03',
    data: {
      'Edit Title': 'Sample event 3',
      'Event ID': 'Sample event ID 3',
      'Event Organizer - Type of Event': 'Sample event organizer 3',
    },
  },
  ];

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

  const renderEventCards = (events = defaultEvents) => {
    render((
      <UserContext.Provider value={{ user: DEFAULT_USER }}>
        <EventCards
          events={events}
        />
      </UserContext.Provider>));
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
});
