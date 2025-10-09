import React from 'react';
import { Router } from 'react-router';
import { SUPPORT_TYPES, SCOPE_IDS } from '@ttahub/common';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { TRAINING_REPORT_STATUSES } from '@ttahub/common/src/constants';
import SessionCard from '../SessionCard';
import UserContext from '../../../../UserContext';

const defaultUser = {
  id: 1,
  homeRegionId: 1,
  permissions: [{
    regionId: 2,
    scopeId: SCOPE_IDS.READ_WRITE_TRAINING_REPORTS,
  }],
};

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

  const renderSessionCard = async (
    session = defaultSession,
    hasWritePermissions = true,
    eventStatus = TRAINING_REPORT_STATUSES.IN_PROGRESS,
    passedUser = defaultUser,
    isOwner = true,
    isPoc = false,
    isCollaborator = false,
  ) => {
    const user = passedUser || defaultUser;
    render((
      <Router history={history}>
        <UserContext.Provider value={{ user }}>
          <SessionCard
            eventId={1}
            session={session}
            isWriteable={hasWritePermissions}
            onRemoveSession={jest.fn()}
            expanded
            eventStatus={eventStatus}
            isPoc={isPoc}
            isOwner={isOwner}
            isCollaborator={isCollaborator}
            eventOrganizer="Regional PD Event (with National Centers)"
          />
        </UserContext.Provider>
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

  it('hides edit link based on permissions', () => {
    renderSessionCard(defaultSession, false);
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.queryByText(/edit session/i)).not.toBeInTheDocument();
  });

  it('hides edit link if session is complete', () => {
    renderSessionCard({
      id: 1,
      data: {
        ...defaultSession.data,
        pocComplete: true,
        ownerComplete: true,
        status: 'Complete',
      },
    });
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.queryByText(/edit session/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/delete session/i)).not.toBeInTheDocument();
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

  it('correctly renders with missing data', () => {
    renderSessionCard({
      ...defaultSession,
      data: {
        ...defaultSession.data,
        startDate: null,
        endDate: null,
        objectiveTopics: [],
        objectiveTrainers: [],
      },
    });
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByText(/-/i)).toBeInTheDocument();
    expect(screen.getByText(/topics/i)).toBeInTheDocument();
    expect(screen.getByText(/trainers/i)).toBeInTheDocument();
  });

  it('hides the edit session links when the event is complete for admin', () => {
    const adminUser = {
      id: 1,
      homeRegionId: 1,
      permissions: [{
        regionId: 2,
        scopeId: SCOPE_IDS.ADMIN,
      }],
    };
    renderSessionCard(defaultSession, false, TRAINING_REPORT_STATUSES.COMPLETE, adminUser);
    expect(screen.queryByRole('link', { name: /edit session/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete session/i })).not.toBeInTheDocument();
  });

  it('shows the edit session link when the user is an admin and creator and pocComplete and ownerComplete are true', () => {
    const superUser = {
      id: 1,
      homeRegionId: 1,
      permissions: [{
        regionId: 2,
        scopeId: SCOPE_IDS.READ_WRITE_TRAINING_REPORTS,
      },
      {
        regionId: 2,
        scopeId: SCOPE_IDS.ADMIN,
      },
      ],
    };

    renderSessionCard({
      id: 1,
      data: {
        ...defaultSession.data,
        ownerId: 1,
        pocComplete: true,
        ownerComplete: true,
      },
    }, true, TRAINING_REPORT_STATUSES.IN_PROGRESS, superUser);
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit session/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete session/i })).toBeInTheDocument();
  });

  it('shows the edit session link when the user is an admin and poc and pocComplete and ownerComplete are true', () => {
    const superUser = {
      id: 1,
      homeRegionId: 1,
      permissions: [{
        regionId: 2,
        scopeId: SCOPE_IDS.POC_TRAINING_REPORTS,
      },
      {
        regionId: 2,
        scopeId: SCOPE_IDS.ADMIN,
      },
      ],
    };

    renderSessionCard({
      id: 1,
      data: {
        ...defaultSession.data,
        ownerId: 3,
        pocIds: [1],
        pocComplete: true,
        ownerComplete: true,
      },
    }, true, TRAINING_REPORT_STATUSES.IN_PROGRESS, superUser);
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit session/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete session/i })).toBeInTheDocument();
  });

  it('shows the edit session links when the event is not complete for admin', () => {
    const adminUser = {
      id: 1,
      homeRegionId: 1,
      permissions: [{
        regionId: 2,
        scopeId: SCOPE_IDS.ADMIN,
      }],
    };
    renderSessionCard(defaultSession, true, TRAINING_REPORT_STATUSES.IN_PROGRESS, adminUser);
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit session/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete session/i })).toBeInTheDocument();
  });

  it('hides the edit session button if the poc work is complete', () => {
    renderSessionCard({
      id: 1,
      data: {
        ...defaultSession.data,
        pocComplete: true,
        ownerComplete: false,
      },
    }, true, TRAINING_REPORT_STATUSES.IN_PROGRESS, defaultUser, false, true);
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /edit session/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /delete session/i })).not.toBeInTheDocument();
  });

  it('hides the edit session button if the owner work is complete', () => {
    renderSessionCard({
      id: 1,
      data: {
        ...defaultSession.data,
        pocComplete: false,
        ownerComplete: true,
      },
    }, true, TRAINING_REPORT_STATUSES.IN_PROGRESS, defaultUser, true);
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /edit session/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /delete session/i })).not.toBeInTheDocument();
  });

  it('hides the edit session button if the user is a collaborator and the owner work is complete', () => {
    renderSessionCard({
      id: 1,
      data: {
        ...defaultSession.data,
        pocComplete: false,
        ownerComplete: true,
      },
    }, true, TRAINING_REPORT_STATUSES.IN_PROGRESS, defaultUser, false, false, true);
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /edit session/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /delete session/i })).not.toBeInTheDocument();
  });

  it('shows the edit session button if the owner work is not complete', () => {
    renderSessionCard({
      id: 1,
      data: {
        ...defaultSession.data,
        pocComplete: true,
        ownerComplete: false,
      },
    }, true, TRAINING_REPORT_STATUSES.IN_PROGRESS, defaultUser, true);
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit session/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete session/i })).toBeInTheDocument();
  });

  it('shows the edit session button if the poc work is not complete', () => {
    renderSessionCard({
      id: 1,
      data: {
        ...defaultSession.data,
        pocComplete: false,
        ownerComplete: true,
      },
    }, true, TRAINING_REPORT_STATUSES.IN_PROGRESS, defaultUser, false, true);
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit session/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete session/i })).toBeInTheDocument();
  });

  it('shows the edit button if the user is a collaborator and the owner work is not complete', () => {
    renderSessionCard({
      id: 1,
      data: {
        ...defaultSession.data,
        pocComplete: false,
        ownerComplete: false,
      },
    }, true, TRAINING_REPORT_STATUSES.IN_PROGRESS, defaultUser, false, false, true);
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit session/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete session/i })).toBeInTheDocument();
  });
});
