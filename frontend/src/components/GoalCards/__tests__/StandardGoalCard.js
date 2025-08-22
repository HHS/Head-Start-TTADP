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
    goalTemplateId: 123,
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
    renderStandardGoalCard({ }, { ...goal, standard: 'Monitoring' });
    const monitoringToolTip = screen.getByRole('button', {
      name: /reason for flag on goal g-1 is monitoring\. click button to visually reveal this information\./i,
    });
    expect(monitoringToolTip).toBeInTheDocument();
  });

  it('shows started by with user from statusChanges', () => {
    const goalWithStatusChanges = {
      ...goal,
      statusChanges: [
        {
          user: {
            name: 'Test User',
            roles: [
              { name: 'ECS' },
              { name: 'GS' },
            ],
          },
        },
      ],
    };

    renderStandardGoalCard({}, goalWithStatusChanges);
    expect(screen.getByText(/started by/i)).toBeInTheDocument();

    expect(screen.getByText(/ECS/i)).toBeInTheDocument();
    expect(screen.getByText(/GS/i)).toBeInTheDocument();

    const tooltips = screen.getAllByTestId('tooltip');
    expect(tooltips.length).toBe(2);
    tooltips.forEach((tooltip) => {
      expect(tooltip.textContent).toContain('Test User');
    });
  });

  it('shows system-generated tag for monitoring goals', () => {
    const monitoringGoal = {
      ...goal,
      standard: 'Monitoring',
    };

    renderStandardGoalCard({}, monitoringGoal);
    expect(screen.getByText(/started by/i)).toBeInTheDocument();

    expect(screen.getByText(/System-generated/i)).toBeInTheDocument();
    expect(screen.getByText(/OHS/i)).toBeInTheDocument();

    const tooltips = screen.getAllByTestId('tooltip');
    const tooltip = tooltips.find((t) => t.classList.contains('ttahub-goal-card__entered-by-tooltip'));
    expect(tooltip).toBeInTheDocument();
    expect(tooltip.textContent).toContain('System-generated');
  });

  it('renders nothing when statusChanges has no user data', () => {
    const goalWithEmptyStatusChanges = {
      ...goal,
      statusChanges: [{}],
    };

    renderStandardGoalCard({}, goalWithEmptyStatusChanges);
    expect(screen.getByText(/started by/i)).toBeInTheDocument();

    // Should not render any specialist tags
    expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();
  });

  it('renders nothing when statusChanges is empty', () => {
    const legacyGoal = {
      ...goal,
      statusChanges: [],
    };

    renderStandardGoalCard({}, legacyGoal);
    expect(screen.getByText(/started by/i)).toBeInTheDocument();

    // Should not render any specialist tags
    expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument();
  });

  it('renders nothing when statusChanges has user but no roles', () => {
    const goalWithUserNoRoles = {
      ...goal,
      statusChanges: [
        {
          user: {
            name: 'Test User',
            roles: [],
          },
        },
      ],
    };

    renderStandardGoalCard({}, goalWithUserNoRoles);
    expect(screen.getByText(/started by/i)).toBeInTheDocument();

    // Should still render specialist tags even with empty roles
    const tooltip = screen.getByTestId('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip.textContent).toContain('Test User');
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

  it('monitoring goal can be deleted by admin user', async () => {
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
    renderStandardGoalCard(
      DEFAULT_PROPS,
      {
        ...goal,
        status: 'Draft',
        onAR: false,
        standard: 'Monitoring',
      },
      user,
    );
    userEvent.click(screen.getByTestId('context-menu-actions-btn'));
    const button = await screen.findByText(/Edit/i);
    expect(button).toBeInTheDocument();
    const deleteButton = screen.queryByText(/Delete/i);
    expect(deleteButton).toBeInTheDocument();
  });

  it('monitoring goal cannot be deleted by non-admin user with approver permissions', async () => {
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
    renderStandardGoalCard(
      DEFAULT_PROPS,
      {
        ...goal,
        status: 'Draft',
        onAR: false,
        standard: 'Monitoring',
      },
      user,
    );
    userEvent.click(screen.getByTestId('context-menu-actions-btn'));
    const button = await screen.findByText(/Edit/i);
    expect(button).toBeInTheDocument();
    // The Delete option should not be present for approvers with monitoring goals
    const deleteButton = screen.queryByText(/Delete/i);
    expect(deleteButton).not.toBeInTheDocument();
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

  it('shows different status change labels based on current status', () => {
    const closedGoal = { ...goal, status: 'Closed' };
    renderStandardGoalCard({}, closedGoal);
    expect(screen.getByText(/closed on/i)).toBeInTheDocument();

    const suspendedGoal = { ...goal, status: 'Suspended' };
    renderStandardGoalCard({}, suspendedGoal);
    expect(screen.getByText(/suspended on/i)).toBeInTheDocument();

    const notStartedGoal = { ...goal, status: 'Not Started' };
    renderStandardGoalCard({}, notStartedGoal);
    expect(screen.getByText(/added on/i)).toBeInTheDocument();
  });

  it('shows reopened label when goal is reopened', () => {
    const reopenedGoal = {
      ...goal,
      statusChanges: [{ oldStatus: 'Closed' }],
      isReopened: true,
    };
    renderStandardGoalCard({}, reopenedGoal);
    expect(screen.getByText(/reopened on/i)).toBeInTheDocument();
    expect(screen.getByText(/reopened by/i)).toBeInTheDocument();
  });

  it('renders reopen button for closed goals with edit permissions', async () => {
    const closedGoal = { ...goal, status: 'Closed' };
    renderStandardGoalCard({}, closedGoal);

    userEvent.click(screen.getByTestId('context-menu-actions-btn'));
    const reopenButton = await screen.findByText(/Reopen/i);
    expect(reopenButton).toBeInTheDocument();
    expect(screen.queryByText(/Edit/i)).not.toBeInTheDocument();
  });

  it('always shows view details option in context menu', async () => {
    renderStandardGoalCard();

    userEvent.click(screen.getByTestId('context-menu-actions-btn'));
    const viewButton = await screen.findByText(/View details/i);
    expect(viewButton).toBeInTheDocument();
  });

  it('monitoring goal can be reopened by admin user', async () => {
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
    renderStandardGoalCard(
      DEFAULT_PROPS,
      {
        ...goal,
        status: 'Closed',
        onAR: false,
        standard: 'Monitoring',
      },
      user,
    );
    userEvent.click(screen.getByTestId('context-menu-actions-btn'));
    const reopenButton = await screen.findByText(/Reopen/i);
    expect(reopenButton).toBeInTheDocument();
    expect(screen.queryByText(/Edit/i)).not.toBeInTheDocument();
  });

  it('monitoring goal cannot be reopened by non-admin user with edit permissions', async () => {
    const user = {
      name: 'test@test.com',
      homeRegionId: 1,
      permissions: [
        {
          scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
          regionId: 1,
        },
      ],
    };
    renderStandardGoalCard(
      DEFAULT_PROPS,
      {
        ...goal,
        status: 'Closed',
        onAR: false,
        standard: 'Monitoring',
      },
      user,
    );
    userEvent.click(screen.getByTestId('context-menu-actions-btn'));
    // The Reopen option should not be present for non-admin users with monitoring goals
    const reopenButton = screen.queryByText(/Reopen/i);
    expect(reopenButton).not.toBeInTheDocument();

    // View details should still be available
    const viewButton = await screen.findByText(/View details/i);
    expect(viewButton).toBeInTheDocument();

  it('shows objectives as suspended when goal status is suspended', async () => {
    const suspendedGoal = {
      ...goal,
      status: 'In progress',
      objectives: [
        {
          id: 1,
          ids: [1],
          endDate: '2022-01-01',
          title: 'Objective 1',
          arNumber: 'AR-1',
          ttaProvided: 'TTA 1',
          reasons: ['Reason 1', 'Reason 2'],
          status: 'In Progress',
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
          status: 'Not Started',
          activityReports: [],
          grantNumbers: ['G-1'],
          topics: [{ name: 'Topic 1' }],
          citations: [],
        },
      ],
    };

    renderStandardGoalCard({}, suspendedGoal);
    const changeStatusBtn = await screen.findByRole('button', { name: /Change status for goal 1/i });

    act(() => {
      userEvent.click(changeStatusBtn);
    });

    const url = '/api/goals/changeStatus';
    fetchMock.put(url, {
      ...suspendedGoal,
      status: 'Suspended',
    });

    const suspended = await screen.findByRole('button', { name: /suspended/i });
    act(() => {
      userEvent.click(suspended);
    });

    const regionalOfficeRequest = await screen.findByText(/regional office request/i, { selector: '[for=suspending-reason-3-modal_1]' });
    const submit = await screen.findByRole('button', { name: /Change goal status/i });

    act(() => {
      userEvent.click(regionalOfficeRequest);
    });

    act(() => {
      userEvent.click(submit);
    });

    await waitFor(() => {
      expect(fetchMock.called(url)).toBe(true);
    });

    const suspendedObjectives = (await screen.findAllByText('Suspended')).filter((v) => v.getAttribute('aria-label').includes('Change status for objective'));

    expect(suspendedObjectives.length).toBe(2);
  });
});
