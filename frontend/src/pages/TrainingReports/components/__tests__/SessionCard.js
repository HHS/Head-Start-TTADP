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
    approverId: 999,
    goalTemplates: [{ id: 1, standard: 'FEI' }, { id: 2, standard: 'CQI and Data' }],
    trainers: [{ fullName: 'Trainer 1' }, { fullName: 'Trainer 2' }],
    data: {
      regionId: 1,
      sessionName: 'This is my session title',
      startDate: '01/02/2021',
      endDate: '01/03/2021',
      objective: 'This is my session objective',
      objectiveSupportType: SUPPORT_TYPES[2],
      status: 'In progress',
      pocComplete: false,
      collabComplete: false,
      submitted: false,
      facilitation: 'national_centers',
    },
  };

  const renderSessionCard = async (
    session = defaultSession,
    eventStatus = TRAINING_REPORT_STATUSES.IN_PROGRESS,
    user = defaultUser,
    isOwner = true,
    isPoc = false,
    isCollaborator = false,
    eventOrganizer = 'Regional PD Event (with National Centers)',
  ) => {
    render((
      <Router history={history}>
        <UserContext.Provider value={{ user }}>
          <SessionCard
            eventId={1}
            session={session}
            onRemoveSession={jest.fn()}
            expanded
            eventStatus={eventStatus}
            isPoc={isPoc}
            isOwner={isOwner}
            isCollaborator={isCollaborator}
            eventOrganizer={eventOrganizer}
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
    expect(screen.getByText(/FEI, CQI and Data/i)).toBeInTheDocument();

    expect(screen.getByText(/trainer 1; trainer 2/i)).toBeInTheDocument();
    expect(screen.getByText(/in progress/i)).toBeInTheDocument();
  });

  it('owner cannot edit but can delete', () => {
    renderSessionCard(
      defaultSession,
      TRAINING_REPORT_STATUSES.IN_PROGRESS,
      defaultUser,
      true, // isOwner
      false, // isPoc
      false, // isCollaborator
    );
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /edit session/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete session/i })).toBeInTheDocument();
  });

  it('hides edit link if session is complete', () => {
    renderSessionCard({
      id: 1,
      approverId: 999,
      data: {
        ...defaultSession.data,
        pocComplete: true,
        collabComplete: true,
        status: 'Complete',
      },
    });
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /edit session/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete session/i })).not.toBeInTheDocument();
  });

  it('collaborator can both edit and delete when session in progress', () => {
    renderSessionCard(
      defaultSession,
      TRAINING_REPORT_STATUSES.IN_PROGRESS,
      defaultUser,
      false, // isOwner
      false, // isPoc
      true, // isCollaborator
    );
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit session/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete session/i })).toBeInTheDocument();
  });

  it('renders complete status', () => {
    renderSessionCard({ id: 1, approverId: 999, data: { ...defaultSession.data, status: 'Complete' } });
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByText(/complete/i)).toBeInTheDocument();
  });

  it('renders needs status', () => {
    renderSessionCard({ id: 1, approverId: 999, data: { ...defaultSession.data, status: 'blah' } });
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByText(/not started/i)).toBeInTheDocument();
  });

  it('correctly renders with empty data', () => {
    renderSessionCard({
      ...defaultSession,
      goalTemplates: [],
      data: {
        ...defaultSession.data,
        startDate: null,
        endDate: null,
        objectiveTrainers: [],
      },
    });
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByText(/-/i)).toBeInTheDocument();
    expect(screen.getByText(/supporting goals/i)).toBeInTheDocument();
    expect(screen.getByText(/trainers/i)).toBeInTheDocument();
  });

  it('correctly renders with null data', () => {
    renderSessionCard({
      ...defaultSession,
      goalTemplates: null,
      data: {
        ...defaultSession.data,
        startDate: null,
        endDate: null,
        objectiveTrainers: null,
      },
    });
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByText(/-/i)).toBeInTheDocument();
    expect(screen.getByText(/supporting goals/i)).toBeInTheDocument();
    expect(screen.getByText(/trainers/i)).toBeInTheDocument();
  });
  it('hides edit and delete when event is complete for admin', () => {
    const adminUser = {
      id: 1,
      homeRegionId: 1,
      permissions: [{
        regionId: 2,
        scopeId: SCOPE_IDS.ADMIN,
      }],
    };
    renderSessionCard(
      defaultSession,
      TRAINING_REPORT_STATUSES.COMPLETE,
      adminUser,
      false,
      false,
      true,
    );
    expect(screen.queryByRole('link', { name: /edit session/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete session/i })).not.toBeInTheDocument();
  });

  it('shows the edit session link when the user is an admin and creator and pocComplete and collabComplete are true', () => {
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
      approverId: 999,
      data: {
        ...defaultSession.data,
        ownerId: 1,
        pocComplete: true,
        collabComplete: true,
      },
    }, TRAINING_REPORT_STATUSES.IN_PROGRESS, superUser, false, false, true);
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit session/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete session/i })).toBeInTheDocument();
  });

  it('shows the edit session link when the user is an admin and poc and pocComplete and collabComplete are true', () => {
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
      approverId: 999,
      data: {
        ...defaultSession.data,
        ownerId: 3,
        pocIds: [1],
        pocComplete: true,
        collabComplete: true,
      },
    }, TRAINING_REPORT_STATUSES.IN_PROGRESS, superUser, false, true);
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit session/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete session/i })).toBeInTheDocument();
  });

  it('admin collaborator can edit and delete when event not complete', () => {
    const adminUser = {
      id: 1,
      homeRegionId: 1,
      permissions: [{
        regionId: 2,
        scopeId: SCOPE_IDS.ADMIN,
      }],
    };
    renderSessionCard(
      defaultSession,
      TRAINING_REPORT_STATUSES.IN_PROGRESS,
      adminUser,
      false,
      false,
      true,
    );
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit session/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete session/i })).toBeInTheDocument();
  });

  it('hides the edit session button if the poc work is complete', () => {
    renderSessionCard({
      id: 1,
      approverId: 999,
      data: {
        ...defaultSession.data,
        pocComplete: true,
        collabComplete: false,
      },
    }, true, TRAINING_REPORT_STATUSES.IN_PROGRESS, defaultUser, false, true);
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /edit session/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete session/i })).toBeInTheDocument();
  });

  it('hides the edit session button if the owner work is complete', () => {
    renderSessionCard({
      id: 1,
      approverId: 999,
      data: {
        ...defaultSession.data,
        pocComplete: false,
        collabComplete: true,
      },
    }, true, TRAINING_REPORT_STATUSES.IN_PROGRESS, defaultUser, true);
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /edit session/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete session/i })).toBeInTheDocument();
  });

  it('hides the edit session button if the user is a collaborator and the owner work is complete', () => {
    renderSessionCard({
      id: 1,
      approverId: 999,
      data: {
        ...defaultSession.data,
        pocComplete: false,
        collabComplete: true,
      },
    }, true, TRAINING_REPORT_STATUSES.IN_PROGRESS, defaultUser, false, false, true);
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /edit session/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete session/i })).toBeInTheDocument();
  });

  it('shows the edit session button if the owner work is not complete', () => {
    renderSessionCard({
      id: 1,
      approverId: 999,
      data: {
        ...defaultSession.data,
        pocComplete: true,
        collabComplete: false,
      },
    }, TRAINING_REPORT_STATUSES.IN_PROGRESS, defaultUser, false, false, true);
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit session/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete session/i })).toBeInTheDocument();
  });

  it('shows the edit session button if the poc work is not complete', () => {
    renderSessionCard({
      id: 1,
      approverId: 999,
      data: {
        ...defaultSession.data,
        pocComplete: false,
        collabComplete: true,
      },
    }, TRAINING_REPORT_STATUSES.IN_PROGRESS, defaultUser, false, true);
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit session/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete session/i })).toBeInTheDocument();
  });

  it('shows the edit button if the user is a collaborator and the owner work is not complete', () => {
    renderSessionCard({
      id: 1,
      approverId: 999,
      data: {
        ...defaultSession.data,
        pocComplete: false,
        collabComplete: false,
      },
    }, TRAINING_REPORT_STATUSES.IN_PROGRESS, defaultUser, false, false, true);
    expect(screen.getByText('This is my session title')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit session/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete session/i })).toBeInTheDocument();
  });

  describe('POC delete permissions based on event organizer', () => {
    it('POC cannot delete with Regional TTA No National Centers', () => {
      renderSessionCard(
        defaultSession,
        TRAINING_REPORT_STATUSES.IN_PROGRESS,
        defaultUser,
        false,
        true, // isPoc
        false,
        'Regional TTA Hosted Event (no National Centers)',
      );
      expect(screen.queryByRole('button', { name: /delete session/i })).not.toBeInTheDocument();
    });

    it('POC cannot delete with Regional PD and National Centers facilitation', () => {
      renderSessionCard(
        {
          ...defaultSession,
          data: {
            ...defaultSession.data,
            facilitation: 'national_center',
          },
        },
        TRAINING_REPORT_STATUSES.IN_PROGRESS,
        defaultUser,
        false,
        true, // isPoc
        false,
        'Regional PD Event (with National Centers)',
      );
      expect(screen.queryByRole('button', { name: /delete session/i })).not.toBeInTheDocument();
    });

    it('POC can delete with Regional PD and Region facilitation', () => {
      renderSessionCard(
        {
          ...defaultSession,
          data: {
            ...defaultSession.data,
            facilitation: 'regional_tta_staff',
          },
        },
        TRAINING_REPORT_STATUSES.IN_PROGRESS,
        defaultUser,
        false,
        true, // isPoc
        false,
        'Regional PD Event (with National Centers)',
      );
      expect(screen.getByRole('button', { name: /delete session/i })).toBeInTheDocument();
    });
  });

  describe('collaborator delete permissions based on facilitation', () => {
    it('collaborator cannot delete when facilitation is regional_tta_staff', () => {
      renderSessionCard(
        {
          ...defaultSession,
          data: {
            ...defaultSession.data,
            facilitation: 'regional_tta_staff',
          },
        },
        TRAINING_REPORT_STATUSES.IN_PROGRESS,
        defaultUser,
        false,
        false,
        true, // isCollaborator
        'Regional PD Event (with National Centers)',
      );
      expect(screen.queryByRole('button', { name: /delete session/i })).not.toBeInTheDocument();
    });

    it('collaborator cannot delete when facilitation is both', () => {
      renderSessionCard(
        {
          ...defaultSession,
          data: {
            ...defaultSession.data,
            facilitation: 'both',
          },
        },
        TRAINING_REPORT_STATUSES.IN_PROGRESS,
        defaultUser,
        false,
        false,
        true, // isCollaborator
        'Regional PD Event (with National Centers)',
      );
      expect(screen.queryByRole('button', { name: /delete session/i })).not.toBeInTheDocument();
    });

    it('collaborator can delete when facilitation is national_centers', () => {
      renderSessionCard(
        {
          ...defaultSession,
          data: {
            ...defaultSession.data,
            facilitation: 'national_centers',
          },
        },
        TRAINING_REPORT_STATUSES.IN_PROGRESS,
        defaultUser,
        false,
        false,
        true, // isCollaborator
        'Regional PD Event (with National Centers)',
      );
      expect(screen.getByRole('button', { name: /delete session/i })).toBeInTheDocument();
    });
  });

  describe('approver permissions', () => {
    it('approver can edit but not delete when session is submitted', () => {
      const approverUser = {
        id: 999, // matches approverId in defaultSession
        homeRegionId: 1,
        permissions: [{
          regionId: 2,
          scopeId: SCOPE_IDS.READ_WRITE_TRAINING_REPORTS,
        }],
      };

      renderSessionCard(
        {
          ...defaultSession,
          data: {
            ...defaultSession.data,
            pocComplete: true,
            ownerComplete: true,
          },
        },
        TRAINING_REPORT_STATUSES.IN_PROGRESS,
        approverUser,
        false,
        false,
        false,
      );
      expect(screen.getByRole('link', { name: /edit session/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /delete session/i })).not.toBeInTheDocument();
    });
  });
});
