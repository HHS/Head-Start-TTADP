import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoalStatusChart } from '../GoalStatusGraph';

describe('GoalStatusChart', () => {
  const testData = {
    total: 300,
    'Not started': 150,
    'In progress': 25,
    Closed: 100,
    Suspended: 25,
  };

  const renderGoalStatusChart = (data) => render(<GoalStatusChart data={data} loading={false} />);

  it('renders the bar graph', async () => {
    renderGoalStatusChart(testData);
    expect(await screen.findByText('300 goals')).toBeVisible();

    await screen.findByText('Not started');
    await screen.findByText('In progress');
    await screen.findByText('Suspended');
    await screen.findByText('Closed');

    const twentyFives = await screen.findAllByText(/25\/300/i);
    expect(twentyFives.length).toBe(2);
    await screen.findByText(/100\/300/i);
    await screen.findByText(/150\/300/i);

    const bars = document.querySelectorAll('.ttahub-goal-bar');
    expect(bars.length).toBe(4);
  });

  it('switches to accessible data', async () => {
    renderGoalStatusChart(testData);
    const button = await screen.findByRole('button', { name: /display goal statuses by number as a table/i });
    userEvent.click(button);
    expect(await screen.findByRole('columnheader', { name: /status/i })).toBeVisible();
  });
});
