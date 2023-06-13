import React from 'react';
import { render, screen } from '@testing-library/react';
import { SCOPE_IDS } from '@ttahub/common';
import EventCards from '../EventCards';
import UserContext from '../../../../UserContext';
import { EVENT_STATUS } from '../../constants';

describe('EventCards', () => {
  const defaultEvents = [{

    data: {
      'Edit Title': 'Sample event 1',
      'Event ID': 'Sample event ID 1',
      'Event Organizer - Type of Event': 'Sample event organizer 1',
      'Reason for Activity': 'New Program/Option',
      startDate: '2021-01-02',
      endDate: '2021-01-03',
    },
  },
  {

    data: {
      'Edit Title': 'Sample event 2',
      'Event ID': 'Sample event ID 2',
      'Event Organizer - Type of Event': 'Sample event organizer 2',
      'Reason for Activity': 'New Staff/Turnover',
      startDate: '2021-02-02',
      endDate: '2021-02-03',
    },
  },
  {

    data: {
      'Edit Title': 'Sample event 3',
      'Event ID': 'Sample event ID 3',
      'Event Organizer - Type of Event': 'Sample event organizer 3',
      'Reason for Activity': null,
      startDate: '2021-03-02',
      endDate: '2021-03-03',
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

  const renderEventCards = (events = defaultEvents, eventType = EVENT_STATUS.NOT_STARTED) => {
    render((
      <UserContext.Provider value={{ user: DEFAULT_USER }}>
        <EventCards
          events={events}
          eventType={eventType}
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

  it('renders correctly if there are no in progress events', () => {
    renderEventCards([], EVENT_STATUS.IN_PROGRESS);
    expect(screen.getByText('You have no events in progress.')).toBeInTheDocument();
  });

  it('renders correctly if there are no in unknown events', () => {
    renderEventCards([], 'blah');
    expect(screen.getByText('You have no events.')).toBeInTheDocument();
  });
});
