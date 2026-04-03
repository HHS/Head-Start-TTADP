import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import GoalDashboard from '../index';

describe('GoalDashboard page', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  it('fetches and displays total goals', async () => {
    fetchMock.get('/api/goals/dashboard', {
      goalStatusWithReasons: {
        total: 3,
        statusRows: [],
        reasonRows: [],
        sankey: { nodes: [], links: [] },
      },
    });

    render(<GoalDashboard />);

    expect(await screen.findByText('Total goals: 3')).toBeVisible();
  });

  it('shows an error alert when the fetch fails', async () => {
    fetchMock.get('/api/goals/dashboard', 500);

    render(<GoalDashboard />);

    const alert = await screen.findByRole('alert');
    expect(alert).toBeVisible();
    expect(alert).toHaveTextContent('Unable to fetch goal dashboard data');
  });
});
