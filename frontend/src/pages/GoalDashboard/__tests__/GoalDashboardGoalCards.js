import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import GoalDashboardGoalCards from '../GoalDashboardGoalCards';

/* eslint-disable react/prop-types */

jest.mock(
  '../../../components/GoalCards/StandardGoalCard',
  () =>
    function MockStandardGoalCard({
      goal,
      handleGoalCheckboxSelect,
      isChecked,
      backLinkState,
      onGoalDeleted,
    }) {
      return (
        <div>
          <label htmlFor={`goal-${goal.id}`}>
            <input
              id={`goal-${goal.id}`}
              type="checkbox"
              value={goal.id}
              checked={isChecked}
              onChange={handleGoalCheckboxSelect}
            />
            {goal.name}
          </label>
          <span data-testid={`back-link-selected-${goal.id}`}>
            {JSON.stringify(
              backLinkState?.backLinkTo?.state?.goalDashboardState?.selectedGoalIds || []
            )}
          </span>
          <button type="button" onClick={() => onGoalDeleted?.([goal.id])}>
            Delete {goal.name}
          </button>
        </div>
      );
    }
);

const goals = Array.from({ length: 10 }).map((_, index) => ({
  id: index + 1,
  name: `Goal ${index + 1}`,
  grant: {
    recipientId: index + 101,
    regionId: 1,
    recipient: {
      name: `Recipient ${index + 1}`,
    },
  },
}));

const dashboardBackLinkState = {
  backLinkTo: {
    pathname: '/dashboards/goal-dashboard',
    state: {
      goalDashboardState: {
        perPage: 10,
        sortConfig: {
          sortBy: 'goalStatus',
          direction: 'asc',
          activePage: 1,
          offset: 0,
        },
      },
    },
  },
  backLinkText: 'Back to Goal Dashboard',
};

const createDeferred = () => {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });

  return { promise, resolve };
};

function GoalDashboardGoalCardsTestHarness({
  initialGoals,
  initialGoalsCount,
  initialAllGoalIds,
  ...props
}) {
  const [currentGoals, setCurrentGoals] = React.useState(initialGoals);
  const [currentGoalsCount, setCurrentGoalsCount] = React.useState(initialGoalsCount);
  const [currentAllGoalIds, setCurrentAllGoalIds] = React.useState(initialAllGoalIds);

  const handleGoalDeleted = (deletedGoalIds) => {
    const deletedGoalIdSet = new Set(deletedGoalIds);
    setCurrentGoals((previousGoals) =>
      previousGoals.filter((goal) => !deletedGoalIdSet.has(goal.id))
    );
    setCurrentAllGoalIds((previousGoalIds) =>
      previousGoalIds.filter((goalId) => !deletedGoalIdSet.has(goalId))
    );
    setCurrentGoalsCount((previousCount) => Math.max(previousCount - deletedGoalIds.length, 0));
  };

  return (
    <GoalDashboardGoalCards
      {...props}
      goals={currentGoals}
      goalsCount={currentGoalsCount}
      allGoalIds={currentAllGoalIds}
      onGoalDeleted={handleGoalDeleted}
    />
  );
}

describe('GoalDashboardGoalCards', () => {
  it('selects individual goals without selecting the page', () => {
    render(<GoalDashboardGoalCards goals={goals} goalsCount={15} allGoalIds={[1, 2, 3]} />);

    fireEvent.click(screen.getByLabelText('Goal 1'));

    expect(screen.getByText('1 selected')).toBeVisible();
    expect(screen.queryByText('All 10 goals on this page are selected.')).not.toBeInTheDocument();
  });

  it('supports selecting the page and then all dashboard goals', async () => {
    const onSelectAllGoals = jest
      .fn()
      .mockResolvedValue(Array.from({ length: 15 }).map((_, index) => index + 1));
    render(
      <GoalDashboardGoalCards
        goals={goals}
        goalsCount={15}
        allGoalIds={[]}
        onSelectAllGoals={onSelectAllGoals}
        backLinkState={dashboardBackLinkState}
      />
    );

    fireEvent.click(screen.getByLabelText('Select all'));

    expect(screen.getByText('10 selected')).toBeVisible();
    expect(screen.getByText('All 10 goals on this page are selected.')).toBeVisible();

    fireEvent.click(screen.getByText('Select all 15 goals'));

    await waitFor(() => {
      expect(onSelectAllGoals).toHaveBeenCalledTimes(1);
      expect(screen.getByText('15 selected')).toBeVisible();
    });
    expect(screen.getByText('All 15 goals are selected.')).toBeVisible();
    expect(screen.getByTestId('back-link-selected-1')).toHaveTextContent(
      JSON.stringify(Array.from({ length: 15 }).map((_, index) => index + 1))
    );

    fireEvent.click(screen.getByRole('button', { name: 'deselect all goals' }));

    expect(screen.queryByText('selected')).not.toBeInTheDocument();
  });

  it('shows an error alert and resets loading when onSelectAllGoals rejects', async () => {
    jest.spyOn(console, 'error').mockImplementation();
    const onSelectAllGoals = jest.fn().mockRejectedValue(new Error('Network error'));
    render(
      <GoalDashboardGoalCards
        goals={goals}
        goalsCount={15}
        allGoalIds={[]}
        onSelectAllGoals={onSelectAllGoals}
      />
    );

    fireEvent.click(screen.getByLabelText('Select all'));
    fireEvent.click(screen.getByText('Select all 15 goals'));

    expect(await screen.findByText('Unable to select all goals. Please try again.')).toBeVisible();
    expect(screen.getByText('Select all 15 goals')).not.toBeDisabled();
  });

  it('falls back to visible restored goal IDs when initial selection validation fails', async () => {
    const onSelectAllGoals = jest.fn().mockRejectedValue(new Error('Network error'));

    render(
      <GoalDashboardGoalCards
        goals={goals.slice(0, 2)}
        goalsCount={4}
        allGoalIds={[]}
        initialSelectedGoalIds={[1, 30]}
        onSelectAllGoals={onSelectAllGoals}
        backLinkState={dashboardBackLinkState}
      />
    );

    await waitFor(() => {
      expect(onSelectAllGoals).toHaveBeenCalledTimes(1);
      expect(screen.getByText('1 selected')).toBeVisible();
    });

    expect(screen.getByLabelText('Goal 1')).toBeChecked();
    expect(screen.getByLabelText('Goal 2')).not.toBeChecked();
    expect(screen.getByTestId('back-link-selected-1')).toHaveTextContent(JSON.stringify([1]));
  });

  it('prunes selections after selected IDs disappear from allGoalIds', async () => {
    const { rerender } = render(
      <GoalDashboardGoalCards goals={goals.slice(0, 3)} goalsCount={3} allGoalIds={[1, 2, 3]} />
    );

    fireEvent.click(screen.getByLabelText('Select all'));

    expect(screen.getByText('3 selected')).toBeVisible();

    rerender(
      <GoalDashboardGoalCards goals={[goals[0], goals[2]]} goalsCount={2} allGoalIds={[1, 3]} />
    );

    await waitFor(() => {
      expect(screen.getByText('2 selected')).toBeVisible();
    });
    expect(screen.queryByText('3 selected')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Goal 2')).not.toBeInTheDocument();
  });

  it('restores selected goals from initialSelectedGoalIds', async () => {
    render(
      <GoalDashboardGoalCards
        goals={goals.slice(0, 3)}
        goalsCount={3}
        allGoalIds={[1, 2, 3]}
        initialSelectedGoalIds={[1, 3]}
        backLinkState={dashboardBackLinkState}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('2 selected')).toBeVisible();
    });
    expect(screen.getByLabelText('Goal 1')).toBeChecked();
    expect(screen.getByLabelText('Goal 3')).toBeChecked();
    expect(screen.getByLabelText('Goal 2')).not.toBeChecked();
    expect(screen.getByTestId('back-link-selected-1')).toHaveTextContent(JSON.stringify([1, 3]));
  });

  it('drops stale restored goal IDs after fetching all goal IDs', async () => {
    const onSelectAllGoals = jest.fn().mockResolvedValue([1, 2, 3, 4]);

    render(
      <GoalDashboardGoalCards
        goals={goals.slice(0, 2)}
        goalsCount={4}
        allGoalIds={[]}
        initialSelectedGoalIds={[1, 30]}
        onSelectAllGoals={onSelectAllGoals}
        backLinkState={dashboardBackLinkState}
      />
    );

    await waitFor(() => {
      expect(onSelectAllGoals).toHaveBeenCalledTimes(1);
      expect(screen.getByText('1 selected')).toBeVisible();
    });

    expect(screen.getByLabelText('Goal 1')).toBeChecked();
    expect(screen.getByLabelText('Goal 2')).not.toBeChecked();
    expect(screen.getByTestId('back-link-selected-1')).toHaveTextContent(JSON.stringify([1]));
  });

  it('does not overwrite user selection when delayed restore finishes later', async () => {
    const deferredGoalIds = createDeferred();
    const onSelectAllGoals = jest.fn().mockReturnValue(deferredGoalIds.promise);

    render(
      <GoalDashboardGoalCards
        goals={goals.slice(0, 2)}
        goalsCount={4}
        allGoalIds={[]}
        initialSelectedGoalIds={[1, 30]}
        onSelectAllGoals={onSelectAllGoals}
        backLinkState={dashboardBackLinkState}
      />
    );

    await waitFor(() => {
      expect(onSelectAllGoals).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByLabelText('Goal 2'));

    expect(screen.getByText('1 selected')).toBeVisible();
    expect(screen.getByLabelText('Goal 2')).toBeChecked();
    expect(screen.getByLabelText('Goal 1')).not.toBeChecked();

    deferredGoalIds.resolve([1, 2, 3, 4]);

    await waitFor(() => {
      expect(screen.getByTestId('back-link-selected-1')).toHaveTextContent(JSON.stringify([2]));
    });

    expect(screen.getByLabelText('Goal 2')).toBeChecked();
    expect(screen.getByLabelText('Goal 1')).not.toBeChecked();
    expect(screen.getByText('1 selected')).toBeVisible();
  });

  it('removes deleted selected goals from the badge and return state', async () => {
    render(
      <GoalDashboardGoalCardsTestHarness
        initialGoals={goals.slice(0, 3)}
        initialGoalsCount={3}
        initialAllGoalIds={[1, 2, 3]}
        initialSelectedGoalIds={[1, 3]}
        backLinkState={dashboardBackLinkState}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('2 selected')).toBeVisible();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete Goal 1' }));

    await waitFor(() => {
      expect(screen.queryByLabelText('Goal 1')).not.toBeInTheDocument();
      expect(screen.getByText('1 selected')).toBeVisible();
    });

    expect(screen.getByTestId('back-link-selected-3')).toHaveTextContent(JSON.stringify([3]));
  });
});
