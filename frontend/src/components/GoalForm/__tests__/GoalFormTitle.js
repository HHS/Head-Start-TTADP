import React from 'react';
import { render, screen } from '@testing-library/react';
import GoalFormTitle from '../GoalFormTitle';

describe('GoalFormTitle', () => {
  test('renders the correct form title when goalNumbers is provided', () => {
    const goalNumbers = ['1', '2', '3'];
    const isReopenedGoal = false;
    render(<GoalFormTitle goalNumbers={goalNumbers} isReopenedGoal={isReopenedGoal} />);
    const formTitle = screen.getByText('Goal 1, 2, 3');
    expect(formTitle).toBeInTheDocument();
  });

  test('renders the correct form title when goalNumbers is empty', () => {
    const goalNumbers = [];
    const isReopenedGoal = true;
    render(<GoalFormTitle goalNumbers={goalNumbers} isReopenedGoal={isReopenedGoal} />);
    const formTitle = screen.getByText('Recipient TTA goal');
    expect(formTitle).toBeInTheDocument();
  });

  test('renders the correct form title when goalNumbers not empty on a reopen', () => {
    const goalNumbers = ['1', '2', '3'];
    const isReopenedGoal = true;
    render(<GoalFormTitle goalNumbers={goalNumbers} isReopenedGoal={isReopenedGoal} />);
    const formTitle = screen.getByText('Recipient TTA goal');
    expect(formTitle).toBeInTheDocument();
  });

  test('renders the correct form title when isReopenedGoal is true', () => {
    const goalNumbers = ['1', '2', '3'];
    const isReopenedGoal = false;
    render(<GoalFormTitle goalNumbers={goalNumbers} isReopenedGoal={isReopenedGoal} />);
    const formTitle = screen.getByText('Goal 1, 2, 3');
    expect(formTitle).toBeInTheDocument();
  });
});
