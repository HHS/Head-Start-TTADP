import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SimilarGoals from '../SimilarGoals';

describe('SimilarGoal', () => {
  const similar = [
    {
      id: 1,
      name: 'Similar goal 1',
      description: 'Similar goal 1 description',
    },
    {
      id: 2,
      name: 'Similar goal 2',
      description: 'Similar goal 2 description',
    },
  ];
  const setDismissSimilar = jest.fn();
  const onSelectNudgedGoal = jest.fn();

  it('renders similar goals', () => {
    render(
      <SimilarGoals
        similar={similar}
        setDismissSimilar={setDismissSimilar}
        onSelectNudgedGoal={onSelectNudgedGoal}
      />,
    );

    expect(screen.getByText('Similar goals (2)')).toBeInTheDocument();
    expect(screen.getByText('Similar goal 1')).toBeInTheDocument();
    expect(screen.getByText('Similar goal 2')).toBeInTheDocument();
  });

  it('calls setDismissSimilar when close button is clicked', () => {
    render(
      <SimilarGoals
        similar={similar}
        setDismissSimilar={setDismissSimilar}
        onSelectNudgedGoal={onSelectNudgedGoal}
      />,
    );

    userEvent.click(screen.getByLabelText('Dismiss similar goals'));
    expect(setDismissSimilar).toHaveBeenCalledTimes(1);
  });

  it('calls onSelectNudgedGoal when a similar goal is clicked', () => {
    render(
      <SimilarGoals
        similar={similar}
        setDismissSimilar={setDismissSimilar}
        onSelectNudgedGoal={onSelectNudgedGoal}
      />,
    );

    userEvent.click(screen.getByText('Similar goal 1'));
    expect(onSelectNudgedGoal).toHaveBeenCalledTimes(1);
  });
});
