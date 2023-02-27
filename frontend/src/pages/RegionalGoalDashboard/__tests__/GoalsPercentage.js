import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import { GoalsPercentageWidget } from '../../../widgets/RegionalGoalDashboard/GoalsPercentage';

const TEST_DATA = {
  numerator: 100,
  denominator: 1000,
  percentage: 10,
};

const renderGoalsPercentage = async () => (
  render(<GoalsPercentageWidget loading={false} data={TEST_DATA} />)
);

describe('Goals Percentage', () => {
  it('shows the percentage', async () => {
    renderGoalsPercentage();
    const percentage = await screen.findByText('10%');
    expect(percentage).toBeInTheDocument();
  });

  it('shows the numerator', async () => {
    renderGoalsPercentage();
    const numerator = await screen.findByText('100');
    expect(numerator).toBeInTheDocument();
  });

  it('shows the denominator', async () => {
    renderGoalsPercentage();
    const denominator = await screen.findByText('1000');
    expect(denominator).toBeInTheDocument();
  });
});
