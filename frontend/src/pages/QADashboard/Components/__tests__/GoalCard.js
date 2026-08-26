import { render, screen } from '@testing-library/react';
import { GOAL_STATUS } from '@ttahub/common';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router';
import GoalCard from '../GoalCard';

describe('GoalCard', () => {
  const history = createMemoryHistory();
  const renderGoalCard = (goal, expanded = true) => {
    render(
      <Router history={history}>
        <GoalCard goal={goal} recipientId={1} regionId={2} expanded={expanded} />
      </Router>
    );
  };

  it('renders correctly', () => {
    const goal = {
      id: 54826,
      goalNumber: 'G-54826',
      status: GOAL_STATUS.IN_PROGRESS,
      creator: 'Jon Doe',
      collaborator: 'Jane Doe',
    };

    renderGoalCard(goal);
    expect(screen.getByText('Goal number')).toBeInTheDocument();
    expect(screen.getByText('Goal status')).toBeInTheDocument();
    expect(screen.getByText('Creator')).toBeInTheDocument();
    expect(screen.getByText('Collaborator')).toBeInTheDocument();

    expect(screen.getByText(goal.goalNumber)).toBeInTheDocument();
    expect(screen.getByText(goal.status)).toBeInTheDocument();
    expect(screen.getByText(goal.creator)).toBeInTheDocument();
    expect(screen.getByText(goal.collaborator)).toBeInTheDocument();
  });

  it('links goals to the goal-id-specific view form', () => {
    const goal = {
      id: 54826,
      goalNumber: 'G-54826',
      status: GOAL_STATUS.IN_PROGRESS,
      creator: 'Jon Doe',
      collaborator: 'Jane Doe',
    };

    renderGoalCard(goal);

    expect(screen.getByRole('link', { name: 'G-54826' })).toHaveAttribute(
      'href',
      '/recipient-tta-records/1/region/2/goals/standard?goalId=54826'
    );
  });
});
