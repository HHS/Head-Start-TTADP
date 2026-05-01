import '@testing-library/jest-dom';
import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import GoalDashboardGoalCards from '../GoalDashboardGoalCards';

/* eslint-disable react/prop-types */

jest.mock('../../../components/GoalCards/StandardGoalCard', () => function MockStandardGoalCard({
  goal,
  handleGoalCheckboxSelect,
  isChecked,
}) {
  return (
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
  );
});

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

describe('GoalDashboardGoalCards', () => {
  it('selects individual goals without selecting the page', () => {
    render(<GoalDashboardGoalCards goals={goals} goalsCount={15} allGoalIds={[1, 2, 3]} />);

    fireEvent.click(screen.getByLabelText('Goal 1'));

    expect(screen.getByText('1 selected')).toBeVisible();
    expect(screen.queryByText('All 10 goals on this page are selected.')).not.toBeInTheDocument();
  });

  it('supports selecting the page and then all dashboard goals', async () => {
    const onSelectAllGoals = jest.fn().mockResolvedValue(
      Array.from({ length: 15 }).map((_, index) => index + 1),
    );
    render(
      <GoalDashboardGoalCards
        goals={goals}
        goalsCount={15}
        allGoalIds={[]}
        onSelectAllGoals={onSelectAllGoals}
      />,
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

    fireEvent.click(screen.getByText('Clear selection'));

    expect(screen.queryByText('selected')).not.toBeInTheDocument();
  });

  it('prunes selections after selected IDs disappear from allGoalIds', async () => {
    const { rerender } = render(
      <GoalDashboardGoalCards
        goals={goals.slice(0, 3)}
        goalsCount={3}
        allGoalIds={[1, 2, 3]}
      />,
    );

    fireEvent.click(screen.getByLabelText('Select all'));

    expect(screen.getByText('3 selected')).toBeVisible();

    rerender(
      <GoalDashboardGoalCards
        goals={[goals[0], goals[2]]}
        goalsCount={2}
        allGoalIds={[1, 3]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('2 selected')).toBeVisible();
    });
    expect(screen.queryByText('3 selected')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Goal 2')).not.toBeInTheDocument();
  });
});
