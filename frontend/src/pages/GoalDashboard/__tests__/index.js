import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, fireEvent, act,
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

  it('shows the graph and five data source radio buttons by default', () => {
    fetchMock.get('/api/goals/dashboard', mockLiveResponse);

    render(<GoalDashboard />);

    expect(screen.getByText('Goal Sankey Graph')).toBeVisible();
    expect(screen.getByRole('radio', { name: 'Current fake data' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Max reasons fake data' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Balanced fake data' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'No results fake data' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Actual data' })).not.toBeChecked();
  });

  it('switches to max reasons fake data when that radio is selected', async () => {
    fetchMock.get('/api/goals/dashboard', mockLiveResponse);

    render(<GoalDashboard />);

    const maxReasonsRadio = screen.getByRole('radio', { name: 'Max reasons fake data' });
    await act(async () => {
      fireEvent.click(maxReasonsRadio);
    });

    expect(maxReasonsRadio).toBeChecked();
    expect(screen.getByText('Goal Sankey Graph')).toBeVisible();
  });

  it('switches to live data when actual data radio is selected', async () => {
    fetchMock.get('/api/goals/dashboard', mockLiveResponse);

    render(<GoalDashboard />);

    const liveRadio = screen.getByRole('radio', { name: 'Actual data' });
    await act(async () => {
      fireEvent.click(liveRadio);
    });

    expect(liveRadio).toBeChecked();
    expect(await screen.findByText('Goal Sankey Graph')).toBeVisible();
  });

  it('switches to balanced fake data when that radio is selected', async () => {
    fetchMock.get('/api/goals/dashboard', mockLiveResponse);

    render(<GoalDashboard />);

    const balancedRadio = screen.getByRole('radio', { name: 'Balanced fake data' });
    await act(async () => {
      fireEvent.click(balancedRadio);
    });

    expect(balancedRadio).toBeChecked();
    expect(screen.getByText('Goal Sankey Graph')).toBeVisible();
  });

  it('shows no results when no results fake data radio is selected', async () => {
    fetchMock.get('/api/goals/dashboard', mockLiveResponse);

    render(<GoalDashboard />);

    const noResultsRadio = screen.getByRole('radio', { name: 'No results fake data' });
    await act(async () => {
      fireEvent.click(noResultsRadio);
    });

    expect(noResultsRadio).toBeChecked();
    expect(screen.getByText('No results found.')).toBeVisible();
  });

  it('shows an error alert when live fetch fails', async () => {
    fetchMock.get('/api/goals/dashboard', 500);

    render(<GoalDashboard />);

    const liveRadio = screen.getByRole('radio', { name: 'Actual data' });
    await act(async () => {
      fireEvent.click(liveRadio);
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toBeVisible();
    expect(alert).toHaveTextContent('Unable to fetch goal dashboard data');
  });
});
