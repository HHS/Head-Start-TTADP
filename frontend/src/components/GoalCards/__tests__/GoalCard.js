import React from 'react';
import join from 'url-join';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SCOPE_IDS } from '@ttahub/common';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import GoalCard from '../GoalCard';
import UserContext from '../../../UserContext';
import AppLoadingContext from '../../../AppLoadingContext';

describe('GoalCard', () => {
  afterEach(() => fetchMock.restore());
  const goalApi = join('/', 'api', 'goals');
  const goal = {
    id: 1,
    ids: [1],
    goalStatus: 'In Progress',
    createdOn: '2021-01-01',
    goalText: 'Goal text',
    goalTopics: ['Topic 1', 'Topic 2'],
    reasons: ['Reason 1', 'Reason 2'],
    objectiveCount: 1,
    goalNumbers: ['G-1'],
    source: 'The inferno',
    createdVia: 'rtr',
    onAR: true,
    objectives: [
      {
        id: 1,
        title: 'Objective 1',
        arNumber: 'AR-1',
        ttaProvided: 'TTA 1',
        endDate: '2021-01-01',
        reasons: ['Reason 1', 'Reason 2'],
        status: 'Closed',
        activityReports: [],
        grantNumbers: ['G-1'],
        topics: [],
      },
    ],
    previousStatus: null,
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
    hideCheckbox: false,
    showReadOnlyStatus: false,
    hideGoalOptions: false,
  };

  const history = createMemoryHistory();

  const renderGoalCard = (props = DEFAULT_PROPS, defaultGoal = goal, user = DEFAULT_USER) => {
    render((
      <Router history={history}>
        <AppLoadingContext.Provider value={{ setIsAppLoading: () => {} }}>
          <UserContext.Provider value={{ user }}>
            <GoalCard
              goal={defaultGoal}
              recipientId="1"
              regionId="1"
              showCloseSuspendGoalModal={() => {}}
              performGoalStatusUpdate={() => {}}
              handleGoalCheckboxSelect={() => {}}
              isChecked={false}
              marginX={3}
              marginY={2}
          // eslint-disable-next-line react/jsx-props-no-spreading
              {...props}
            />
          </UserContext.Provider>
        </AppLoadingContext.Provider>
      </Router>));
  };

  it('shows the checkbox by default', () => {
    renderGoalCard();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('shows goal source', () => {
    renderGoalCard();

    expect(screen.getByText(/goal source/i)).toBeInTheDocument();
    expect(screen.getByText(/The inferno/i)).toBeInTheDocument();
  });

  it('hides the checkbox when hideCheckbox is true', () => {
    renderGoalCard({ ...DEFAULT_PROPS, hideCheckbox: true });
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('shows the goal status as a button by default', () => {
    renderGoalCard({ });
    const status = screen.getByText(/In Progress/i);
    expect(status.tagName).toEqual('BUTTON');
  });

  it('can show the goal status as read only', () => {
    renderGoalCard({ ...DEFAULT_PROPS, showReadOnlyStatus: true });
    const status = screen.getByText(/In Progress/i);
    expect(status.tagName).toEqual('DIV');
  });

  it('shows the goal options by default', () => {
    renderGoalCard();
    expect(screen.getByTestId('ellipsis-button')).toBeInTheDocument();
  });

  it('shows only one options by default', async () => {
    renderGoalCard();
    userEvent.click(screen.getByTestId('ellipsis-button'));
    const button = await screen.findByText(/Edit/i);
    expect(button).toBeInTheDocument();
  });

  it('shows only one options by if the goal is not "draft" or "not started"', async () => {
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
    renderGoalCard(DEFAULT_PROPS, { ...goal, onAR: false }, user);
    userEvent.click(screen.getByTestId('ellipsis-button'));
    const button = await screen.findByText(/Edit/i);
    expect(button).toBeInTheDocument();
    const deleteButton = screen.queryByText(/Delete/i);
    expect(deleteButton).not.toBeInTheDocument();
  });

  it('shows only one options by if the goal is on AR', async () => {
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
    renderGoalCard(DEFAULT_PROPS, { ...goal, goalStatus: 'Draft' }, user);
    userEvent.click(screen.getByTestId('ellipsis-button'));
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
    renderGoalCard(DEFAULT_PROPS, { ...goal, goalStatus: 'Draft', onAR: false }, user);
    userEvent.click(screen.getByTestId('ellipsis-button'));
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
    renderGoalCard(DEFAULT_PROPS, { ...goal, goalStatus: 'Not Started', onAR: false }, user);
    userEvent.click(screen.getByTestId('ellipsis-button'));
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
    renderGoalCard(DEFAULT_PROPS, { ...goal, goalStatus: 'Draft', onAR: false }, user);
    userEvent.click(screen.getByTestId('ellipsis-button'));
    const button = await screen.findByText(/Edit/i);
    expect(button).toBeInTheDocument();
    const deleteButton = screen.queryByText(/Delete/i);
    expect(deleteButton).toBeInTheDocument();
  });

  it('can delete if user is admin and goal is Not Started and not on AR', async () => {
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
    renderGoalCard(DEFAULT_PROPS, { ...goal, goalStatus: 'Not Started', onAR: false }, user);
    userEvent.click(screen.getByTestId('ellipsis-button'));
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
    renderGoalCard(DEFAULT_PROPS, { ...goal, goalStatus: 'Not Started', onAR: false }, user);
    userEvent.click(screen.getByTestId('ellipsis-button'));
    const button = await screen.findByText(/Edit/i);
    expect(button).toBeInTheDocument();
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
    renderGoalCard(DEFAULT_PROPS, { ...goal, goalStatus: 'Not Started', onAR: false }, user);
    userEvent.click(screen.getByTestId('ellipsis-button'));
    const button = await screen.findByText(/Edit/i);
    expect(button).toBeInTheDocument();
    const deleteButton = screen.queryByText(/Delete/i);
    const url = `${goalApi}?goalIds=1`;
    fetchMock.delete(url, 500);
    userEvent.click(deleteButton);
    history.push = jest.fn();
    await waitFor(() => expect(fetchMock.called(url)).toBe(true));
    expect(history.push).not.toHaveBeenCalled();
    expect(document.querySelector('.smart-hub-border-base-error')).not.toBeNull();
  });

  it('can hide the goal options', () => {
    renderGoalCard({ ...DEFAULT_PROPS, hideGoalOptions: true });
    expect(screen.queryByTestId('ellipsis-button')).not.toBeInTheDocument();
  });

  it('display correct last tta date', () => {
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
          topics: [],
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
          topics: [],
        },
      ],
    };

    renderGoalCard({ ...DEFAULT_PROPS }, goalsWithMultipleObjectives);
    expect(screen.getByText(/last tta/i)).toBeInTheDocument();
    expect(screen.queryAllByText(/2023-01-01/i).length).toBe(2);
  });

  it('renders a merged goal', () => {
    const mergedGoal = {
      ...goal,
      createdVia: 'merge',
    };

    renderGoalCard({ ...DEFAULT_PROPS }, mergedGoal);
    const tags = document.querySelectorAll('.usa-tag');
    expect(tags.length).toBe(1);
    expect(tags[0].textContent).toBe('Merged');
    expect(tags[0]).toBeVisible();
  });
});
