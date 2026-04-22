import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import GoalDashboard from '../index';

/* eslint-disable react/prop-types */

jest.mock('../../../widgets/GoalStatusReasonSankeyWidget', () => {
  const Mock = ({ data }) => {
    const hasSankeyData = Boolean(data?.sankey?.nodes?.length && data?.sankey?.links?.length);
    if (!hasSankeyData) {
      return <div>No results found.</div>;
    }

    return <div>Goal Sankey Graph</div>;
  };

  return Mock;
});

const mockLiveResponse = {
  total: 3,
  statusRows: [],
  reasonRows: [],
  sankey: {
    nodes: [
      {
        id: 'goals', label: 'Goals', count: 3, percentage: 100,
      },
      {
        id: 'status:In Progress', label: 'In progress', count: 3, percentage: 100,
      },
    ],
    links: [{ source: 'goals', target: 'status:In Progress', value: 3 }],
  },
};

describe('GoalDashboard page', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  it('shows the graph using live data fetch', async () => {
    fetchMock.get('/api/widgets/goalDashboard', mockLiveResponse);

    render(<GoalDashboard />);

    expect(await screen.findByText('Goal Sankey Graph')).toBeVisible();
    expect(fetchMock.called('/api/widgets/goalDashboard')).toBe(true);
  });

  it('shows no results when API returns empty sankey data', async () => {
    fetchMock.get('/api/widgets/goalDashboard', {
      total: 0,
      sankey: {
        nodes: [],
        links: [],
      },
    });

    render(<GoalDashboard />);

    expect(await screen.findByText('No results found.')).toBeVisible();
  });

  it('shows an error alert when live fetch fails', async () => {
    fetchMock.get('/api/widgets/goalDashboard', 500);

    render(<GoalDashboard />);

    const alert = await screen.findByRole('alert');
    expect(alert).toBeVisible();
    expect(alert).toHaveTextContent('Unable to fetch goal dashboard data');
  });
});
