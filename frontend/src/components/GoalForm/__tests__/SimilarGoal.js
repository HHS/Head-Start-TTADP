import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SimilarGoal from '../SimilarGoal';

describe('SimilarGoal', () => {
  const goal = {
    name: 'Test Goal',
    status: 'Test Status',
    ids: [1, 2, 3],
  };
  const setDismissSimilar = jest.fn();
  const onSelectNudgedGoal = jest.fn();

  it('renders the goal name and status', () => {
    render(
      <SimilarGoal
        goal={goal}
        setDismissSimilar={setDismissSimilar}
        onSelectNudgedGoal={onSelectNudgedGoal}
      />,
    );

    expect(screen.getByText('Test Goal')).toBeInTheDocument();
    expect(screen.getByText(/(Test Status)/i)).toBeInTheDocument();
  });

  it('calls onSelectNudgedGoal when clicked', () => {
    render(
      <SimilarGoal
        goal={goal}
        setDismissSimilar={setDismissSimilar}
        onSelectNudgedGoal={onSelectNudgedGoal}
      />,
    );

    userEvent.click(screen.getByText('Test Goal'));
    expect(onSelectNudgedGoal).toHaveBeenCalledWith(goal);
  });

  it('calls onSelectNudgedGoal when enter is pressed', () => {
    render(
      <SimilarGoal
        goal={goal}
        setDismissSimilar={setDismissSimilar}
        onSelectNudgedGoal={onSelectNudgedGoal}
      />,
    );

    userEvent.type(screen.getByText('Test Goal'), '{enter}');
    expect(onSelectNudgedGoal).toHaveBeenCalledWith(goal);
  });

  it('calls setDismissSimilar when escape is pressed', () => {
    render(
      <SimilarGoal
        goal={goal}
        setDismissSimilar={setDismissSimilar}
        onSelectNudgedGoal={onSelectNudgedGoal}
      />,
    );

    userEvent.type(screen.getByText('Test Goal'), '{esc}');
    expect(setDismissSimilar).toHaveBeenCalled();
  });

  it('calls setDismissSimilar when blurred', () => {
    render(
      <>
        <SimilarGoal
          goal={goal}
          setDismissSimilar={setDismissSimilar}
          onSelectNudgedGoal={onSelectNudgedGoal}
        />
        <input type="text" id="tab-stop" />
      </>,
    );

    for (let i = 0; i < 3; i += 1) {
      act(() => {
        userEvent.tab();
      });
    }

    expect(setDismissSimilar).toHaveBeenCalled();
  });
});
