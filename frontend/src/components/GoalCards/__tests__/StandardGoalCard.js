import React from 'react';
import join from 'url-join';
import {
  render, screen, waitFor, act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SCOPE_IDS } from '@ttahub/common';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import StandardGoalCard from '../StandardGoalCard';
import UserContext from '../../../UserContext';
import AppLoadingContext from '../../../AppLoadingContext';

describe('StandardGoalCard', () => {
  afterEach(() => fetchMock.restore());
  const goalApi = join('/', 'api', 'goals');
  const goal = {
    id: 1,
    ids: [1],
    status: 'In Progress',
    createdAt: '2021-01-01',
    name: 'Goal text',
    goalTopics: ['Topic 1', 'Topic 2'],
    reasons: ['Reason 1', 'Reason 2'],
    objectiveCount: 1,
    goalNumbers: ['G-1'],
    source: 'The inferno',
    createdVia: 'rtr',
    onAR: true,
    responses: [],
    statusChanges: [],
    objectives: [
      {
        id: 1,
        ids: [1],
        endDate: '2022-01-01',
        title: 'Objective 1',
        arNumber: 'AR-1',
        ttaProvided: 'TTA 1',
        reasons: ['Reason 1', 'Reason 2'],
        status: 'Closed',
        activityReports: [],
        grantNumbers: ['G-1'],
        topics: [{ name: 'Topic 1' }],
        citations: [],
      },
      {
        id: 2,
        ids: [2],
        endDate: '2022-01-01',
        title: 'Objective 2',
        arNumber: 'AR-1',
        ttaProvided: 'TTA 1',
        reasons: ['Reason 1', 'Reason 2'],
        status: 'Closed',
        activityReports: [],
        grantNumbers: ['G-1'],
        topics: [{ name: 'Topic 1' }],
        citations: [],
      },
    ],
    previousStatus: null,
    goalCollaborators: [
      {
        user: {
          name: 'Test User',
          userRoles: ['ECS'],
        },
      },
    ],
    grant: {
      number: 'G-1',
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

  const DEFAULT_PROPS = {
    readonly: false,
    erroneouslySelected: false,
  };

  const history = createMemoryHistory();

  // eslint-disable-next-line max-len
  const renderStandardGoalCard = (props = DEFAULT_PROPS, defaultGoal = goal, user = DEFAULT_USER) => {
    render((
      <Router history={history}>
        <AppLoadingContext.Provider value={{ setIsAppLoading: () => {} }}>
          <UserContext.Provider value={{ user }}>
            <StandardGoalCard
              goal={defaultGoal}
              recipientId="1"
              regionId="1"
              showCloseSuspendGoalModal={() => {}}
              performGoalStatusUpdate={() => {}}
              handleGoalCheckboxSelect={() => {}}
              isChecked={false}
              // eslint-disable-next-line react/jsx-props-no-spreading
              {...props}
            />
          </UserContext.Provider>
        </AppLoadingContext.Provider>
      </Router>));
  };

  it('shows the checkbox by default', () => {
    renderStandardGoalCard();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('hides the checkbox when readonly is true', () => {
    renderStandardGoalCard({ ...DEFAULT_PROPS, readonly: true });
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('shows the goal status as a button by default', () => {
    renderStandardGoalCard();
    const status = screen.getByText(/In Progress/i);
    expect(status.tagName).toEqual('BUTTON');
  });

  it('shows the goal status as read only when readonly is true', () => {
    renderStandardGoalCard({ ...DEFAULT_PROPS, readonly: true });
    const status = screen.getByText(/In Progress/i);
    expect(status.tagName).toEqual('DIV');
  });

  it('shows the monitoring flag when the goal createdVia is monitoring', () => {
    renderStandardGoalCard({ }, { ...goal, createdVia: 'monitoring' });
    const monitoringToolTip = screen.getByRole('button', {
      name: /reason for flag on goal g-1 is monitoring\. click button to visually reveal this information\./i,
    });
    expect(monitoringToolTip).toBeInTheDocument();
  });

  it('shows started by with multiple roles as separate tags', () => {
    const goalWithMultipleRoles = {
      ...goal,
      goalCollaborators: [
        {
          goalNumber: 'G-1',
          goalCreatorRoles: ['ECS', 'GS'],
          goalCreatorName: 'Test User',
        },
      ],
    };

    renderStandardGoalCard({}, goalWithMultipleRoles);
    expect(screen.getByText(/started by/i)).toBeInTheDocument();

    expect(screen.getByText(/ECS/i)).toBeInTheDocument();
    expect(screen.getByText(/GS/i)).toBeInTheDocument();

    const tooltips = screen.getAllByTestId('tooltip');
    expect(tooltips.length).toBe(2);
    tooltips.forEach((tooltip) => {
      expect(tooltip.textContent).toContain('Test User');
    });
  });

  it('shows started by with multiple roles as separate tags when roles are a comma-separated string', () => {
    const goalWithMultipleRolesAsString = {
      ...goal,
      goalCollaborators: [
        {
          goalNumber: 'G-1',
          goalCreatorRoles: 'ECS, GS',
          goalCreatorName: 'Test User',
        },
      ],
    };

    renderStandardGoalCard({}, goalWithMultipleRolesAsString);
    expect(screen.getByText(/started by/i)).toBeInTheDocument();

    expect(screen.getByText(/ECS/i)).toBeInTheDocument();
    expect(screen.getByText(/GS/i)).toBeInTheDocument();

    const tooltips = screen.getAllByTestId('tooltip');
    expect(tooltips.length).toBe(2);
    tooltips.forEach((tooltip) => {
      expect(tooltip.textContent).toContain('Test User');
    });
  });

  it('shows "Unavailable" when goal creator has no roles', () => {
    const goalWithNoRoles = {
      ...goal,
      goalCollaborators: [
        {
          goalNumber: 'G-1',
          goalCreatorRoles: [],
          goalCreatorName: 'Test User',
        },
      ],
    };

    renderStandardGoalCard({}, goalWithNoRoles);
    expect(screen.getByText(/started by/i)).toBeInTheDocument();
    expect(screen.getByText(/Unavailable/i)).toBeInTheDocument();

    const tooltip = screen.getByTestId('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip.textContent).toContain('Test User');
  });

  it('shows "Unavailable" for legacy goal with no creator data', () => {
    const legacyGoal = {
      ...goal,
      goalCollaborators: [],
    };

    renderStandardGoalCard({}, legacyGoal);
    expect(screen.getByText(/started by/i)).toBeInTheDocument();
    expect(screen.getByText(/Unavailable/i)).toBeInTheDocument();

    const tooltip = screen.getByTestId('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip.textContent).toContain('Unknown');
  });

  it('shows "Unavailable" for goal with collaborators but no creator name', () => {
    const goalWithNoCreatorName = {
      ...goal,
      goalCollaborators: [
        {
          goalNumber: 'G-1',
          goalCreatorRoles: 'ECS',
          goalCreatorName: '',
        },
      ],
    };

    renderStandardGoalCard({}, goalWithNoCreatorName);
    expect(screen.getByText(/started by/i)).toBeInTheDocument();
    expect(screen.getByText(/Unavailable/i)).toBeInTheDocument();
  });

  it('shows the goal options by default', () => {
    renderStandardGoalCard();
    expect(screen.getByTestId('context-menu-actions-btn')).toBeInTheDocument();
  });

  it('hides the goal options when readonly is true', () => {
    renderStandardGoalCard({ ...DEFAULT_PROPS, readonly: true });
    expect(screen.queryByTestId('context-menu-actions-btn')).not.toBeInTheDocument();
  });

  it('shows only edit option by default', async () => {
    renderStandardGoalCard();
    userEvent.click(screen.getByTestId('context-menu-actions-btn'));
    const button = await screen.findByText(/Edit/i);
    expect(button).toBeInTheDocument();
  });

  it('shows only edit option if the goal is not "draft" or "not started"', async () => {
    const user = {
      name: 'test@test.com',
      homeRegionId: 1,
      permissions: [
        {
          scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
          regionId: 1,
        },
        {
          scopeId: SCOPE_IDS.APPROVE_ACTIVITY_REPORTS,
          regionId: 1,
        },
      ],
    };
    renderStandardGoalCard(DEFAULT_PROPS, { ...goal, onAR: false }, user);
    userEvent.click(screen.getByTestId('context-menu-actions-btn'));
    const button = await screen.findByText(/Edit/i);
    expect(button).toBeInTheDocument();
    const deleteButton = screen.queryByText(/Delete/i);
    expect(deleteButton).not.toBeInTheDocument();
  });

  it('shows only edit option if the goal is on AR', async () => {
    const user = {
      name: 'test@test.com',
      homeRegionId: 1,
      permissions: [
        {
          scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
          regionId: 1,
        },
        {
          scopeId: SCOPE_IDS.APPROVE_ACTIVITY_REPORTS,
          regionId: 1,
        },
      ],
    };
    renderStandardGoalCard(DEFAULT_PROPS, { ...goal, status: 'Draft' }, user);
    userEvent.click(screen.getByTestId('context-menu-actions-btn'));
    const button = await screen.findByText(/Edit/i);
    expect(button).toBeInTheDocument();
    const deleteButton = screen.queryByText(/Delete/i);
    expect(deleteButton).not.toBeInTheDocument();
  });

  it('can delete if user is approver and goal is Draft and not on AR', async () => {
    const user = {
      name: 'test@test.com',
      homeRegionId: 1,
      permissions: [
        {
          scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
          regionId: 1,
        },
        {
          scopeId: SCOPE_IDS.APPROVE_ACTIVITY_REPORTS,
          regionId: 1,
        },
      ],
    };
    renderStandardGoalCard(DEFAULT_PROPS, { ...goal, status: 'Draft', onAR: false }, user);
    userEvent.click(screen.getByTestId('context-menu-actions-btn'));
    const button = await screen.findByText(/Edit/i);
    expect(button).toBeInTheDocument();
    const deleteButton = screen.queryByText(/Delete/i);
    expect(deleteButton).toBeInTheDocument();
  });

  it('can delete if user is approver and goal is Not Started and not on AR', async () => {
    const user = {
      name: 'test@test.com',
      homeRegionId: 1,
      permissions: [
        {
          scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
          regionId: 1,
        },
        {
          scopeId: SCOPE_IDS.APPROVE_ACTIVITY_REPORTS,
          regionId: 1,
        },
      ],
    };
    renderStandardGoalCard(DEFAULT_PROPS, { ...goal, status: 'Not Started', onAR: false }, user);
    userEvent.click(screen.getByTestId('context-menu-actions-btn'));
    const button = await screen.findByText(/Edit/i);
    expect(button).toBeInTheDocument();
    const deleteButton = screen.queryByText(/Delete/i);
    expect(deleteButton).toBeInTheDocument();
  });

  it('can delete if user is admin and goal is Draft and not on AR', async () => {
    const user = {
      name: 'test@test.com',
      homeRegionId: 1,
      permissions: [
        {
          scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
          regionId: 1,
        },
        {
          scopeId: SCOPE_IDS.ADMIN,
          regionId: 14,
        },
      ],
    };
    renderStandardGoalCard(DEFAULT_PROPS, { ...goal, status: 'Draft', onAR: false }, user);
    userEvent.click(screen.getByTestId('context-menu-actions-btn'));
    const button = await screen.findByText(/Edit/i);
    expect(button).toBeInTheDocument();
    const deleteButton = screen.queryByText(/Delete/i);
    expect(deleteButton).toBeInTheDocument();
  });

  it('calls delete function on click', async () => {
    const user = {
      name: 'test@test.com',
      homeRegionId: 1,
      permissions: [
        {
          scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
          regionId: 1,
        },
        {
          scopeId: SCOPE_IDS.ADMIN,
          regionId: 14,
        },
      ],
    };
    renderStandardGoalCard(DEFAULT_PROPS, { ...goal, status: 'Not Started', onAR: false }, user);
    userEvent.click(screen.getByTestId('context-menu-actions-btn'));
    const deleteButton = screen.queryByText(/Delete/i);
    const url = `${goalApi}?goalIds=1`;
    fetchMock.delete(url, {});
    history.push = jest.fn();
    userEvent.click(deleteButton);
    await waitFor(() => expect(fetchMock.called(url)).toBe(true));
    expect(history.push).toHaveBeenCalledWith('/recipient-tta-records/1/region/1/rttapa', { message: 'Goal deleted successfully' });
    expect(document.querySelector('.smart-hub-border-base-error')).toBeNull();
  });

  it('handles an error on delete', async () => {
    const user = {
      name: 'test@test.com',
      homeRegionId: 1,
      permissions: [
        {
          scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
          regionId: 1,
        },
        {
          scopeId: SCOPE_IDS.ADMIN,
          regionId: 14,
        },
      ],
    };
    renderStandardGoalCard(DEFAULT_PROPS, { ...goal, status: 'Not Started', onAR: false }, user);
    userEvent.click(screen.getByTestId('context-menu-actions-btn'));
    const deleteButton = screen.queryByText(/Delete/i);
    const url = `${goalApi}?goalIds=1`;
    fetchMock.delete(url, 500);
    userEvent.click(deleteButton);
    history.push = jest.fn();
    await waitFor(() => expect(fetchMock.called(url)).toBe(true));
    expect(history.push).not.toHaveBeenCalled();
    expect(document.querySelector('.smart-hub-border-base-error')).not.toBeNull();
  });

  it('displays correct last tta date', () => {
    const goalsWithMultipleObjectives = {
      ...goal,
      objectives: [
        {
          id: 1,
          title: 'Objective 1',
          arNumber: 'AR-1',
          ttaProvided: 'TTA 1',
          endDate: '2023-01-01',
          reasons: ['Reason 1', 'Reason 2'],
          status: 'Closed',
          activityReports: [],
          grantNumbers: ['G-1'],
          topics: [{ name: 'Topic 1' }],
          citations: [],
        },
        {
          id: 2,
          title: 'Objective 2',
          arNumber: 'AR-2',
          ttaProvided: 'TTA 2',
          endDate: '2022-09-13',
          reasons: ['Reason 3'],
          status: 'Closed',
          activityReports: [],
          grantNumbers: ['G-2'],
          topics: [{ name: 'Topic 1' }],
          citations: [],
        },
      ],
    };

    renderStandardGoalCard({ ...DEFAULT_PROPS }, goalsWithMultipleObjectives);
    expect(screen.getByText(/last tta/i)).toBeInTheDocument();
    expect(screen.getByText(/2023-01-01/i)).toBeInTheDocument();
  });

  it('properly shows objectives', async () => {
    renderStandardGoalCard();
    const expandObjectives = await screen.findByRole('button', { name: /View objectives for goal/i });
    act(() => {
      userEvent.click(expandObjectives);
    });

    const objectives = document.querySelectorAll('.ttahub-goal-card__objective-list');
    expect(objectives.length).toBe(2);
  });
});
