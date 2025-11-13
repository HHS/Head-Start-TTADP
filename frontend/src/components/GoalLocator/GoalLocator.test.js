import React from 'react';
import { render, screen } from '@testing-library/react';
import GoalViewer from './index';
import useGoalIntersection from '../../hooks/useGoalIntersection';

// Mock the custom hook
jest.mock('../../hooks/useGoalIntersection');

describe('GoalViewer', () => {
  const mockGoals = [
    { id: 1, name: 'Improve program quality (health services)', status: 'In Progress' },
    { id: 2, name: 'Increase enrollment (family engagement)', status: 'Draft' },
    { id: 3, name: 'Enhance staff capacity (professional development)', status: 'In Progress' },
  ];

  beforeEach(() => {
    // Reset mock before each test
    jest.clearAllMocks();
  });

  it('renders when a goal is visible', () => {
    useGoalIntersection.mockReturnValue({
      currentGoalIndex: 2,
      totalGoals: 3,
      goalLabel: 'family engagement',
      isVisible: true,
    });

    const { container } = render(<GoalViewer goals={mockGoals} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Viewing goal')).toBeInTheDocument();
    expect(screen.getByText('family engagement')).toBeInTheDocument();

    // Check the count is displayed in the desktop view
    const desktopCount = container.querySelector('.goal-viewer__count');
    expect(desktopCount).toHaveTextContent('2');
    expect(desktopCount).toHaveTextContent('of');
    expect(desktopCount).toHaveTextContent('3');
  });

  it('displays goal count in mobile view', () => {
    useGoalIntersection.mockReturnValue({
      currentGoalIndex: 1,
      totalGoals: 3,
      goalLabel: 'health services',
      isVisible: true,
    });

    const { container } = render(<GoalViewer goals={mockGoals} />);

    const mobileCount = container.querySelector('.goal-viewer__mobile-count');
    expect(mobileCount).toBeInTheDocument();
    expect(mobileCount).toHaveTextContent('1/3');
  });

  it('renders with 0 of X when no goals are visible', () => {
    useGoalIntersection.mockReturnValue({
      currentGoalIndex: null,
      totalGoals: 3,
      goalLabel: null,
      isVisible: false,
    });

    const { container } = render(<GoalViewer goals={mockGoals} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    const desktopCount = container.querySelector('.goal-viewer__count');
    expect(desktopCount).toHaveTextContent('0 of 3');
  });

  it('renders with 0 of 0 when total goals is 0', () => {
    useGoalIntersection.mockReturnValue({
      currentGoalIndex: null,
      totalGoals: 0,
      goalLabel: null,
      isVisible: false,
    });

    const { container } = render(<GoalViewer goals={[]} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    const desktopCount = container.querySelector('.goal-viewer__count');
    expect(desktopCount).toHaveTextContent('0 of 0');
  });

  it('renders without goal label when label is null', () => {
    useGoalIntersection.mockReturnValue({
      currentGoalIndex: 1,
      totalGoals: 3,
      goalLabel: null,
      isVisible: true,
    });

    const { container } = render(<GoalViewer goals={mockGoals} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Viewing goal')).toBeInTheDocument();
    expect(container.querySelector('.goal-viewer__description')).not.toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    useGoalIntersection.mockReturnValue({
      currentGoalIndex: 2,
      totalGoals: 3,
      goalLabel: 'family engagement',
      isVisible: true,
    });

    render(<GoalViewer goals={mockGoals} />);

    const statusElement = screen.getByRole('status');
    expect(statusElement).toHaveAttribute('aria-live', 'polite');
    expect(statusElement).toHaveAttribute('aria-atomic', 'true');
  });

  it('passes custom options to useGoalIntersection hook', () => {
    const customOptions = {
      threshold: 0.5,
      rootMargin: '-100px 0px 0px 0px',
    };

    useGoalIntersection.mockReturnValue({
      currentGoalIndex: 1,
      totalGoals: 3,
      goalLabel: 'test',
      isVisible: true,
    });

    render(<GoalViewer goals={mockGoals} options={customOptions} />);

    expect(useGoalIntersection).toHaveBeenCalledWith(mockGoals, customOptions);
  });

  it('handles single goal correctly', () => {
    const singleGoal = [mockGoals[0]];

    useGoalIntersection.mockReturnValue({
      currentGoalIndex: 1,
      totalGoals: 1,
      goalLabel: 'health services',
      isVisible: true,
    });

    const { container } = render(<GoalViewer goals={singleGoal} />);

    expect(screen.getByRole('status')).toBeInTheDocument();

    const desktopCount = container.querySelector('.goal-viewer__count');
    expect(desktopCount).toHaveTextContent('1 of 1');
  });

  it('updates when currentGoalIndex changes', () => {
    useGoalIntersection.mockReturnValue({
      currentGoalIndex: 1,
      totalGoals: 3,
      goalLabel: 'health services',
      isVisible: true,
    });

    const { container, rerender } = render(<GoalViewer goals={mockGoals} />);

    let desktopCount = container.querySelector('.goal-viewer__count');
    expect(desktopCount).toHaveTextContent('1 of 3');

    // Simulate scroll to different goal
    useGoalIntersection.mockReturnValue({
      currentGoalIndex: 3,
      totalGoals: 3,
      goalLabel: 'professional development',
      isVisible: true,
    });

    rerender(<GoalViewer goals={mockGoals} />);

    desktopCount = container.querySelector('.goal-viewer__count');
    expect(desktopCount).toHaveTextContent('3 of 3');
    expect(screen.getByText('professional development')).toBeInTheDocument();
  });
});
