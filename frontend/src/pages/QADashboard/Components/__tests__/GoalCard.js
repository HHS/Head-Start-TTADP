import React from 'react';
import { Router } from 'react-router';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { GOAL_STATUS } from '@ttahub/common';
import GoalCard from '../GoalCard';

describe('GoalCard', () => {
  const history = createMemoryHistory();
  const renderGoalCard = async (goal, expanded = true) => {
    render((
      <Router history={history}>
        <GoalCard
          goal={goal}
          expanded={expanded}
        />
      </Router>));
  };

  it('renders correctly', () => {
    const goal = {
      goalNumber: 'G-54826',
      status: GOAL_STATUS.IN_PROGRESS,
      creator: 'Jon Doe',
      collaborator: 'Jane Doe',
      recipientId: 1,
      regionId: 2,
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
});
