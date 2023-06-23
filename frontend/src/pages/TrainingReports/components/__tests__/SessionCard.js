import React from 'react';
import { Router } from 'react-router';
import { render, screen } from '@testing-library/react';
import { SCOPE_IDS } from '@ttahub/common';
import { createMemoryHistory } from 'history';
import SessionCard from '../SessionCard';
import UserContext from '../../../../UserContext';

/*
    sessionName,
    startDate,
    endDate,
    objective,
    objectiveSupportType,
    objectiveTopics,
    objectiveTrainers,
    status,
    */

describe('SessionCard', () => {
  const history = createMemoryHistory();
  const defaultSession = {
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

  const renderSessionCard = (session = defaultSession) => {
    render((
      <UserContext.Provider value={{ user: DEFAULT_USER }}>
        <Router history={history}>
          <SessionCard
            eventId={1}
            session={session}
            expanded
          />
        </Router>
      </UserContext.Provider>));
  };

  it('renders correctly', () => {
    renderSessionCard();
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByText(/01\/02\/2021 - 01\/03\/2021/i)).toBeInTheDocument();
    expect(screen.getByText('This is my session objective')).toBeInTheDocument();
    expect(screen.getByText('Implementing')).toBeInTheDocument();
    expect(screen.getByText(/Topic 1, Topic 2/i)).toBeInTheDocument();

    expect(screen.getByText(/trainer 1, trainer 2/i)).toBeInTheDocument();
    expect(screen.getByText(/in progress/i)).toBeInTheDocument();
  });
});
