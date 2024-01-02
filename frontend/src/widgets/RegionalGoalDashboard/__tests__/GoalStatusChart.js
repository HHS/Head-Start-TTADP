import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import { GoalStatusChart } from '../../GoalStatusGraph';

const TEST_DATA = {
  total: 15,
  'Not started': 1,
  'In progress': 2,
  Suspended: 3,
  Closed: 4,
  Draft: 5,
};

const renderGoalStatusChart = async () => (
  render(<GoalStatusChart loading={false} data={TEST_DATA} />)
);

describe('GoalStatusChart', () => {
  it('shows not started count', async () => {
    renderGoalStatusChart();
    const count = await screen.findByText('1/15');
    expect(count).toBeInTheDocument();
  });
  it('shows in progress count', async () => {
    renderGoalStatusChart();
    const count = await screen.findByText('2/15');
    expect(count).toBeInTheDocument();
  });
  it('shows suspended count', async () => {
    renderGoalStatusChart();
    const count = await screen.findByText('3/15');
    expect(count).toBeInTheDocument();
  });
  it('shows closed count', async () => {
    renderGoalStatusChart();
    const count = await screen.findByText('4/15');
    expect(count).toBeInTheDocument();
  });
});
