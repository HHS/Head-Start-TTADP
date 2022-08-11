import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import ReadOnlyGoal from '../ReadOnlyGoal';

describe('ReadOnlyGoal', () => {
  const createdGoal = {
    goalName: 'Sample goal',
    grant: [],
    objectives: [],
    endDate: null,
  };

  const renderReadOnlyGoal = () => {
    render((
      <ReadOnlyGoal
        onEdit={jest.fn()}
        onRemove={jest.fn()}
        hideEdit={false}
        goal={createdGoal}
        index={0}
      />
    ));
  };

  it('can render with a goal', async () => {
    renderReadOnlyGoal();
    expect(await screen.findByRole('heading', { name: /goal summary/i })).toBeVisible();
    expect(await screen.findByText('Sample goal')).toBeVisible();
  });
});
