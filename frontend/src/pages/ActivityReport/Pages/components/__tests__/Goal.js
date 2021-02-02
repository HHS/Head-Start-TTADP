import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import Goal from '../Goal';

const renderGoal = (name) => {
  render(
    <Goal
      name={name}
    />,
  );
};

describe('Goal', () => {
  it('renders name', async () => {
    renderGoal('test goal');
    const goal = await screen.findByText('test goal');
    expect(goal).toBeVisible();
  });
});
