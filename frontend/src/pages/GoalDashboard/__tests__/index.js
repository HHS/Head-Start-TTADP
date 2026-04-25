import '@testing-library/jest-dom';
import React from 'react';
import {
  fireEvent,
  render,
  screen,
  within,
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
  dataStartDate: '2025-09-09',
  dataStartDateDisplay: '09/09/2025',
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
    fetchMock.get('/api/widgets/goalDashboard', { goalStatusWithReasons: mockLiveResponse });

    render(<GoalDashboard />);

    expect(await screen.findByText('Goal Sankey Graph')).toBeVisible();
    expect(fetchMock.called('/api/widgets/goalDashboard')).toBe(true);
  });

  it('shows the goals section with sort options and default pagination controls', async () => {
    fetchMock.get('/api/widgets/goalDashboard', { goalStatusWithReasons: mockLiveResponse });

    render(<GoalDashboard />);

    expect(await screen.findByText('TTA goals and objectives')).toBeVisible();
    expect(screen.getByText('Data reflects activity starting on 09/09/2025.')).toBeVisible();

    const sort = screen.getByLabelText('Sort by');
    expect(sort).toHaveValue('goalStatus-asc');
    expect(within(sort).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Date added (newest to oldest)',
      'Date added (oldest to newest)',
      'Goal status (not started first)',
      'Goal status (closed first)',
      'Goal category (A-Z)',
      'Goal category (Z-A)',
    ]);

    expect(screen.getByLabelText('Show')).toHaveDisplayValue('10');
  });

  it('resets pagination when changing sort or per-page count', async () => {
    fetchMock.get('/api/widgets/goalDashboard', {
      goalStatusWithReasons: {
        ...mockLiveResponse,
        total: 30,
      },
    });

    render(<GoalDashboard />);

    const pagination = await screen.findByRole('navigation', {
      name: 'TTA goals and objectives pagination',
    });
    fireEvent.click(within(pagination).getByRole('button', { name: 'Page 2' }));
    expect(within(pagination).getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');

    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'createdOn-desc' } });
    expect(within(pagination).getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(within(pagination).getByRole('button', { name: 'Page 2' }));
    expect(within(pagination).getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');

    fireEvent.change(screen.getByLabelText('Show'), { target: { value: '25' } });
    expect(within(pagination).getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByLabelText('Show')).toHaveDisplayValue('25');
  });

  it('shows no results when API returns empty sankey data', async () => {
    fetchMock.get('/api/widgets/goalDashboard', {
      goalStatusWithReasons: {
        dataStartDate: '2025-09-09',
        dataStartDateDisplay: '09/09/2025',
        total: 0,
        sankey: {
          nodes: [],
          links: [],
        },
      },
    });

    render(<GoalDashboard />);

    expect(await screen.findByText('No results found.')).toBeVisible();
    expect(screen.getByText('TTA goals and objectives')).toBeVisible();
  });

  it('does not render the goals section while dashboard data is loading', async () => {
    fetchMock.get('/api/widgets/goalDashboard', { goalStatusWithReasons: mockLiveResponse });

    render(<GoalDashboard />);

    expect(screen.queryByText('TTA goals and objectives')).not.toBeInTheDocument();
    expect(await screen.findByText('TTA goals and objectives')).toBeVisible();
  });

  it('shows an error alert when live fetch fails', async () => {
    fetchMock.get('/api/widgets/goalDashboard', 500);

    render(<GoalDashboard />);

    const alert = await screen.findByRole('alert');
    expect(alert).toBeVisible();
    expect(alert).toHaveTextContent('Unable to fetch goal dashboard data');
  });
});
