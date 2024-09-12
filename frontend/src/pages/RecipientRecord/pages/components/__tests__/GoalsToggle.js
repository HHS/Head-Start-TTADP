import '@testing-library/jest-dom';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import GoalsToggle from '../GoalsToggle';

// Mock the GoalCard component to avoid internal logic that's not relevant to the GoalsToggle tests
// eslint-disable-next-line arrow-body-style
jest.mock('../../../../../components/GoalCards/GoalCard', () => {
  // eslint-disable-next-line max-len
  // eslint-disable-next-line react/jsx-props-no-spreading, react/prop-types, react/jsx-one-expression-per-line
  return ({ goal, ...props }) => <div {...props}>GoalCard {goal.id}</div>;
});

describe('GoalsToggle', () => {
  const mockSetShowGoals = jest.fn();
  const mockOnRemove = jest.fn();

  const baseProps = {
    showGoals: false,
    setShowGoals: mockSetShowGoals,
    goalIds: [1, 2],
    goals: [{ id: 1 }, { id: 2 }],
    recipientId: 1,
    regionId: 1,
    onRemove: mockOnRemove,
  };

  it('renders the toggle button', () => {
    render(
      <GoalsToggle
        showGoals={baseProps.showGoals}
        setShowGoals={baseProps.setShowGoals}
        goalIds={baseProps.goalIds}
        goals={baseProps.goals}
        recipientId={baseProps.recipientId}
        regionId={baseProps.regionId}
        onRemove={baseProps.onRemove}
      />,
    );
    const toggleButton = screen.getByRole('button', { name: /View goals/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('toggles goals on button click', () => {
    render(
      <GoalsToggle
        showGoals={baseProps.showGoals}
        setShowGoals={baseProps.setShowGoals}
        goalIds={baseProps.goalIds}
        goals={baseProps.goals}
        recipientId={baseProps.recipientId}
        regionId={baseProps.regionId}
        onRemove={baseProps.onRemove}
      />,
    );
    const toggleButton = screen.getByRole('button', { name: /View goals/i });
    userEvent.click(toggleButton);
    expect(mockSetShowGoals).toHaveBeenCalledWith(!baseProps.showGoals);
  });

  it('renders the correct number of goals when showGoals is true', () => {
    render(
      <GoalsToggle
        showGoals
        setShowGoals={baseProps.setShowGoals}
        goalIds={baseProps.goalIds}
        goals={baseProps.goals}
        recipientId={baseProps.recipientId}
        regionId={baseProps.regionId}
        onRemove={baseProps.onRemove}
      />,
    );
    const goalCards = screen.getAllByText(/GoalCard/i);
    expect(goalCards).toHaveLength(baseProps.goals.length);
  });

  it('calls onRemove when remove button is clicked', () => {
    render(
      <GoalsToggle
        showGoals
        setShowGoals={baseProps.setShowGoals}
        goalIds={baseProps.goalIds}
        goals={baseProps.goals}
        recipientId={baseProps.recipientId}
        regionId={baseProps.regionId}
        onRemove={baseProps.onRemove}
      />,
    );
    const removeButtons = screen.getAllByLabelText(/^Remove goal/i);
    userEvent.click(removeButtons[0]);
    expect(mockOnRemove).toHaveBeenCalledWith(baseProps.goals[0]);
  });

  it('does not render remove button when onRemove is not provided', () => {
    render(
      <GoalsToggle
        showGoals
        setShowGoals={baseProps.setShowGoals}
        goalIds={baseProps.goalIds}
        goals={baseProps.goals}
        recipientId={baseProps.recipientId}
        regionId={baseProps.regionId}
      />,
    );
    const removeButton = screen.queryByLabelText(/^Remove goal/i);
    expect(removeButton).not.toBeInTheDocument();
  });
});
