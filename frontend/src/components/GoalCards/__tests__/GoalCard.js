import React from 'react';
import { render, screen } from '@testing-library/react';
import { SCOPE_IDS } from '@ttahub/common';
import GoalCard from '../GoalCard';
import UserContext from '../../../UserContext';

describe('GoalCard', () => {
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
    collaborators: [
      {
        goalNumber: 'G-1',
        goalCreatorRoles: 'ECS',
        goalCreatorName: 'Test User',
      },
    ],
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

  const renderGoalCard = (props = DEFAULT_PROPS, defaultGoal = goal) => {
    render((
      <UserContext.Provider value={{ user: DEFAULT_USER }}>
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
      </UserContext.Provider>));
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
    renderGoalCard();
    const status = screen.getByText(/In Progress/i);
    expect(status.tagName).toEqual('BUTTON');
  });

  it('can show the goal status as read only', () => {
    renderGoalCard({ ...DEFAULT_PROPS, showReadOnlyStatus: true });
    const status = screen.getByText(/In Progress/i);
    expect(status.tagName).toEqual('DIV');
  });

  it('shows entered by', () => {
    renderGoalCard();
    expect(screen.getByText(/entered by/i)).toBeInTheDocument();
    expect(screen.getByText(/ECS/i)).toBeInTheDocument();

    const tooltip = screen.getByTestId('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip.textContent).toContain('Test User');
  });

  it('shows the goal options by default', () => {
    renderGoalCard();
    expect(screen.getByTestId('ellipsis-button')).toBeInTheDocument();
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
