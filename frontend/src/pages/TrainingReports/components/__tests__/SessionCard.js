import React from 'react';
import { Router } from 'react-router';
import { render, screen } from '@testing-library/react';
import { SCOPE_IDS } from '@ttahub/common';
import { createMemoryHistory } from 'history';
import SessionCard from '../SessionCard';
import UserContext from '../../../../UserContext';

describe('SessionCard', () => {
  const history = createMemoryHistory();
  const defaultSession = {
    id: 1,
    data: {
      regionId: 1,
      sessionName: 'This is my session title',
      startDate: '01/02/2021',
      endDate: '01/03/2021',
      objective: 'This is my session objective',
      objectiveSupportType: 'Implementing',
      objectiveTopics: ['Topic 1', 'Topic 2'],
      objectiveTrainers: ['Trainer 1', 'Trainer 2'],
      status: 'In progress',
    },
  };

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

  const renderSessionCard = async (session = defaultSession, user = DEFAULT_USER, eventStatus = 'In progress') => {
    render((
      <UserContext.Provider value={{ user }}>
        <Router history={history}>
          <SessionCard
            eventId={1}
            session={session}
            eventStatus={eventStatus}
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

  it('hides edit link', () => {
    renderSessionCard(defaultSession, { ...DEFAULT_USER, permissions: [] });
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.queryByText(/edit session/i)).not.toBeInTheDocument();
  });

  it('shows the edit link with the correct permissions', () => {
    renderSessionCard(defaultSession,
      {
        id: 1,
        permissions: [{
          scopeId: SCOPE_IDS.READ_WRITE_TRAINING_REPORTS,
          regionId: 1,
        }],
      });
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByText(/edit session/i)).toBeInTheDocument();
  });

  it('shows the edit link with the admin permissions', () => {
    renderSessionCard(defaultSession,
      {
        id: 1,
        permissions: [{
          scopeId: SCOPE_IDS.ADMIN,
          regionId: 1,
        }],
      });
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByText(/edit session/i)).toBeInTheDocument();
  });

  it('does not show the the edit link on a complete event', () => {
    renderSessionCard(defaultSession,
      {
        id: 1,
        permissions: [{
          scopeId: SCOPE_IDS.READ_WRITE_TRAINING_REPORTS,
          regionId: 1,
        }],
      }, 'Complete');
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.queryByText(/edit session/i)).toBeNull();
  });

  it('renders complete status', () => {
    renderSessionCard({ id: 1, data: { ...defaultSession.data, status: 'Complete' } });
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByText(/complete/i)).toBeInTheDocument();
  });

  it('renders needs status', () => {
    renderSessionCard({ id: 1, data: { ...defaultSession.data, status: 'blah' } });
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByText(/not started/i)).toBeInTheDocument();
  });
});
