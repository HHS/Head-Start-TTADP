import React from 'react';
import { Router } from 'react-router';
import { SUPPORT_TYPES } from '@ttahub/common';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import SessionCard from '../SessionCard';

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
      objectiveSupportType: SUPPORT_TYPES[2],
      objectiveTopics: ['Topic 1', 'Topic 2'],
      objectiveTrainers: ['Trainer 1', 'Trainer 2'],
      status: 'In progress',
    },
  };

  const renderSessionCard = async (session = defaultSession, hasWritePermissions = true) => {
    render((
      <Router history={history}>
        <SessionCard
          eventId={1}
          session={session}
          isWriteable={hasWritePermissions}
          onRemoveSession={jest.fn()}
          expanded
        />
      </Router>));
  };

  it('renders correctly', () => {
    renderSessionCard();
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByText(/01\/02\/2021 - 01\/03\/2021/i)).toBeInTheDocument();
    expect(screen.getByText('This is my session objective')).toBeInTheDocument();
    expect(screen.getByText(SUPPORT_TYPES[2])).toBeInTheDocument();
    expect(screen.getByText(/Topic 1, Topic 2/i)).toBeInTheDocument();

    expect(screen.getByText(/trainer 1, trainer 2/i)).toBeInTheDocument();
    expect(screen.getByText(/in progress/i)).toBeInTheDocument();
  });

  it('hides edit link', () => {
    renderSessionCard(defaultSession, false);
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.queryByText(/edit session/i)).not.toBeInTheDocument();
  });

  it('shows the edit link with the correct permissions', () => {
    renderSessionCard(defaultSession);
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByText(/edit session/i)).toBeInTheDocument();
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
