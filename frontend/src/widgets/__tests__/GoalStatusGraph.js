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

    await screen.findByText('Not started', { selector: 'span' });
    await screen.findByText('In progress', { selector: 'span' });
    await screen.findByText('Suspended', { selector: 'span' });
    await screen.findByText('Closed', { selector: 'span' });

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

  it('you can open and close the modal with goal status info', async () => {
    renderGoalStatusChart(testData);

    const modal = document.querySelector('#modal-goal-status-guide');
    expect(modal.classList.contains('is-hidden')).toBe(true);
    const button = await screen.findByRole('button', { name: /what does each status mean/i });
    userEvent.click(button);
    expect(modal.classList.contains('is-hidden')).toBe(false);
    const closeButton = document.querySelector('.usa-modal__close');
    userEvent.click(closeButton);
    expect(modal.classList.contains('is-hidden')).toBe(true);
  });

  it('falsy data', async () => {
    renderGoalStatusChart(0);
    expect(screen.queryByRole('button', { name: /display goal statuses by number as a table/i })).toBeNull();
  });
});
