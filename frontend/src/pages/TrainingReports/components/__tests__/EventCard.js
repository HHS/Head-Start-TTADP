import React from 'react';
import { render, screen } from '@testing-library/react';
import { SCOPE_IDS } from '@ttahub/common';
import EventCard from '../EventCard';
import UserContext from '../../../../UserContext';

describe('EventCard', () => {
  const defaultEvent = {

    data: {
      'Edit Title': 'This is my event title',
      'Event ID': 'This is my event ID',
      'Event Organizer - Type of Event': 'This is my event organizer',
      'Reason for Activity': 'New Program/Option\nNew Staff/Turnover',
      startDate: '2021-01-02',
      endDate: null,
    },
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
        <EventCard
          event={event}
        />
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
});
