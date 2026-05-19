import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import AriaLiveContext from '../../../AriaLiveContext';
import { fetchGoalDashboardGoalsCsvByIds } from '../../../fetchers/goals';
import UserContext from '../../../UserContext';
import { blobToCsvDownload } from '../../../utils';
import GoalDashboard from '../index';

/* eslint-disable react/prop-types */

let mockGoalDeleteHandler = () => {};

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  blobToCsvDownload: jest.fn(),
}));

jest.mock('../../../fetchers/goals', () => ({
  ...jest.requireActual('../../../fetchers/goals'),
  fetchGoalDashboardGoalsCsvByIds: jest.fn(),
}));

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

jest.mock(
  '../../../components/GoalCards/StandardGoalCard',
  () =>
    function MockStandardGoalCard({ goal, onGoalDeleted, handleGoalCheckboxSelect, isChecked }) {
      return (
        <div>
          <label htmlFor={`goal-${goal.id}`}>
            <input
              id={`goal-${goal.id}`}
              type="checkbox"
              value={goal.id}
              checked={isChecked}
              onChange={handleGoalCheckboxSelect}
            />
            Select {goal.name}
          </label>
          <span>{goal.name}</span>
          <button
            type="button"
            onClick={() => {
              mockGoalDeleteHandler(goal.id);
              onGoalDeleted([goal.id]);
            }}
          >
            Delete {goal.name}
          </button>
        </div>
      );
    }
);

const mockLiveResponse = {
  dataStartDate: '2025-09-09',
  dataStartDateDisplay: '09/09/2025',
  total: 3,
  statusRows: [],
  reasonRows: [],
  sankey: {
    nodes: [
      {
        id: 'goals',
        label: 'Goals',
        count: 3,
        percentage: 100,
      },
      {
        id: 'status:In Progress',
        label: 'In progress',
        count: 3,
        percentage: 100,
      },
    ],
    links: [{ source: 'goals', target: 'status:In Progress', value: 3 }],
  },
};

const mockGoalDashboardGoals = (overrides = {}) => {
  fetchMock.get(/\/api\/widgets\/goalDashboardGoals.*/, {
    goalDashboardGoals: {
      count: mockLiveResponse.total,
      goalRows: [],
      allGoalIds: [],
      ...overrides,
    },
  });
};

const goalRows = Array.from({ length: 10 }).map((_, index) => ({
  id: index + 1,
  name: `Goal ${index + 1}`,
  grant: {
    recipientId: index + 101,
    regionId: 1,
    recipient: {
      name: `Recipient ${index + 1}`,
    },
  },
}));

const goalRowsAcrossTwoPages = Array.from({ length: 11 }).map((_, index) => ({
  id: index + 1,
  name: `Goal ${index + 1}`,
  grant: {
    recipientId: index + 101,
    regionId: 1,
    recipient: {
      name: `Recipient ${index + 1}`,
    },
  },
}));

const goalCardsFetchCount = () =>
  fetchMock.calls().filter((call) => String(call[0]).includes('/api/widgets/goalDashboardGoals'))
    .length;

const waitForGoalCardsFetch = async (expectedCalls = 1) => {
  await waitFor(() => {
    expect(goalCardsFetchCount()).toBeGreaterThanOrEqual(expectedCalls);
  });
  await waitFor(() => {
    expect(screen.queryByLabelText('Goal dashboard goals loading')).not.toBeInTheDocument();
  });
};

const mockUser = {
  homeRegionId: 1,
  permissions: [
    {
      regionId: 1,
      scopeId: 1, // READ_ACTIVITY_REPORTS
    },
  ],
};

const renderGoalDashboard = (state = undefined) => {
  fetchMock.get(
    '/api/feeds/item?tag=ttahub-goal-dash-filters',
    '<feed><entry><summary>Filter guidance</summary></entry></feed>',
    { overwriteRoutes: false }
  );

  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/dashboards/goal-dashboard',
          state,
        },
      ]}
    >
      <AriaLiveContext.Provider value={{ announce: jest.fn() }}>
        <UserContext.Provider value={{ user: mockUser }}>
          <GoalDashboard />
        </UserContext.Provider>
      </AriaLiveContext.Provider>
    </MemoryRouter>
  );
};

describe('GoalDashboard page', () => {
  afterEach(() => {
    mockGoalDeleteHandler = () => {};
    fetchMock.restore();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('shows the graph using live data fetch', async () => {
    fetchMock.get('/api/widgets/goalDashboard', { goalStatusWithReasons: mockLiveResponse });
    mockGoalDashboardGoals();

    renderGoalDashboard();

    expect(await screen.findByText('Goal Sankey Graph')).toBeVisible();
    await waitForGoalCardsFetch();
    expect(fetchMock.called('/api/widgets/goalDashboard')).toBe(true);
  });

  it('shows the goals section with sort options and default pagination controls', async () => {
    fetchMock.get('/api/widgets/goalDashboard', { goalStatusWithReasons: mockLiveResponse });
    mockGoalDashboardGoals();

    renderGoalDashboard();

    expect(await screen.findByText('TTA goals and objectives')).toBeVisible();
    await waitForGoalCardsFetch();
    expect(screen.getByText('Data reflects activity starting on 09/09/2025.')).toBeVisible();

    const sort = screen.getByLabelText('Sort by');
    expect(sort).toHaveValue('goalStatus-asc');
    expect(
      within(sort)
        .getAllByRole('option')
        .map((option) => option.textContent)
    ).toEqual([
      'Date added (newest to oldest)',
      'Date added (oldest to newest)',
      'Goal status (not started first)',
      'Goal status (closed first)',
      'Goal category (A-Z)',
      'Goal category (Z-A)',
    ]);

    expect(screen.getByLabelText('Show')).toHaveDisplayValue('10');
  });

  it('exports all goal rows from the actions menu', async () => {
    const csvBlob = new Blob(['Recipient name,Grant Number'], { type: 'text/csv' });
    fetchMock.get('/api/widgets/goalDashboard', { goalStatusWithReasons: mockLiveResponse });
    mockGoalDashboardGoals({
      count: goalRows.length,
      goalRows,
      allGoalIds: goalRows.map(({ id }) => id),
    });
    fetchGoalDashboardGoalsCsvByIds.mockResolvedValue(csvBlob);

    renderGoalDashboard();

    await waitForGoalCardsFetch();

    fireEvent.click(screen.getByLabelText('Open Actions for TTA goals and objectives'));
    fireEvent.click(await screen.findByRole('button', { name: 'Export table' }));

    await waitFor(() => {
      expect(fetchGoalDashboardGoalsCsvByIds).toHaveBeenCalledWith(
        'sortBy=goalStatus&direction=asc&skipCache=true&format=csv',
        []
      );
      expect(blobToCsvDownload).toHaveBeenCalledWith(csvBlob, 'goal-dashboard-goals.csv');
    });
  });

  it('exports selected goal rows from the actions menu', async () => {
    const csvBlob = new Blob(['Recipient name,Grant Number'], { type: 'text/csv' });
    fetchMock.get('/api/widgets/goalDashboard', { goalStatusWithReasons: mockLiveResponse });
    mockGoalDashboardGoals({
      count: goalRows.length,
      goalRows,
      allGoalIds: goalRows.map(({ id }) => id),
    });
    fetchGoalDashboardGoalsCsvByIds.mockResolvedValue(csvBlob);

    renderGoalDashboard();

    await waitForGoalCardsFetch();

    fireEvent.click(screen.getByLabelText('Select Goal 2'));
    fireEvent.click(screen.getByLabelText('Open Actions for TTA goals and objectives'));
    fireEvent.click(await screen.findByRole('button', { name: 'Export selected' }));

    await waitFor(() => {
      expect(fetchGoalDashboardGoalsCsvByIds).toHaveBeenCalledWith(
        'sortBy=goalStatus&direction=asc&skipCache=true&format=csv',
        [2]
      );
      expect(blobToCsvDownload).toHaveBeenCalledWith(csvBlob, 'goal-dashboard-goals.csv');
    });
  });

  it('shows an error alert when the export request fails', async () => {
    fetchMock.get('/api/widgets/goalDashboard', { goalStatusWithReasons: mockLiveResponse });
    mockGoalDashboardGoals({
      count: goalRows.length,
      goalRows,
      allGoalIds: goalRows.map(({ id }) => id),
    });
    fetchGoalDashboardGoalsCsvByIds.mockRejectedValue(new Error('Export failed'));

    renderGoalDashboard();

    await waitForGoalCardsFetch();

    fireEvent.click(screen.getByLabelText('Open Actions for TTA goals and objectives'));
    fireEvent.click(await screen.findByRole('button', { name: 'Export table' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Unable to export goal dashboard goals. Please try again.');
  });

  it('disables selected preview and export until restored selections are validated', async () => {
    fetchMock.get('/api/widgets/goalDashboard', { goalStatusWithReasons: mockLiveResponse });

    let resolveAllGoalIds;
    const allGoalIdsPromise = new Promise((resolve) => {
      resolveAllGoalIds = resolve;
    });

    fetchMock.get(/\/api\/widgets\/goalDashboardGoals.*/, (url) => {
      const parsedUrl = new URL(String(url), 'http://localhost');
      if (parsedUrl.searchParams.get('includeAllGoalIds') === 'true') {
        return allGoalIdsPromise.then(() => ({
          goalDashboardGoals: {
            count: 30,
            goalRows,
            allGoalIds: [1, 2],
          },
        }));
      }

      return {
        goalDashboardGoals: {
          count: 30,
          goalRows,
          allGoalIds: [],
        },
      };
    });

    renderGoalDashboard({
      goalDashboardState: {
        perPage: 10,
        selectedGoalIds: [1, 2, 999],
        sortConfig: {
          sortBy: 'goalStatus',
          direction: 'asc',
          activePage: 1,
          offset: 0,
        },
      },
    });

    await waitForGoalCardsFetch();

    const previewButton = screen.getByRole('button', { name: 'Preview and print selected' });
    expect(previewButton).toBeDisabled();
    expect(screen.getByText('3 selected')).toBeVisible();

    fireEvent.click(screen.getByLabelText('Open Actions for TTA goals and objectives'));
    expect(screen.getByRole('button', { name: 'Export table' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Export selected' })).toBeNull();

    resolveAllGoalIds();

    await waitFor(() => {
      expect(previewButton).not.toBeDisabled();
    });
    await waitFor(() => {
      expect(screen.getByText('2 selected')).toBeVisible();
    });
    expect(await screen.findByRole('button', { name: 'Export selected' })).toBeVisible();
  });

  it('restores dashboard sort and pagination state from location state', async () => {
    fetchMock.get('/api/widgets/goalDashboard', { goalStatusWithReasons: mockLiveResponse });
    mockGoalDashboardGoals({
      count: 30,
      allGoalIds: Array.from({ length: 30 }, (_, index) => index + 1),
    });

    renderGoalDashboard({
      goalDashboardState: {
        perPage: 25,
        selectedGoalIds: [1, 2, 3],
        sortConfig: {
          sortBy: 'createdOn',
          direction: 'desc',
          activePage: 2,
          offset: 25,
        },
      },
    });

    await waitForGoalCardsFetch();

    expect(screen.getByLabelText('Sort by')).toHaveValue('createdOn-desc');
    expect(screen.getByLabelText('Show')).toHaveDisplayValue('25');
    expect(screen.getByText('3 selected')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');

    const goalCardsCalls = fetchMock
      .calls()
      .filter((call) => String(call[0]).includes('/api/widgets/goalDashboardGoals'));
    const latestGoalCardsCall = String(goalCardsCalls[goalCardsCalls.length - 1][0]);
    expect(latestGoalCardsCall).toContain('sortBy=createdOn');
    expect(latestGoalCardsCall).toContain('direction=desc');
    expect(latestGoalCardsCall).toContain('offset=25');
    expect(latestGoalCardsCall).toContain('perPage=25');
  });

  it('does not render cards or pagination when the goal cards fetch fails', async () => {
    jest.spyOn(console, 'error').mockImplementation();
    fetchMock.get('/api/widgets/goalDashboard', { goalStatusWithReasons: mockLiveResponse });
    fetchMock.get(/\/api\/widgets\/goalDashboardGoals.*/, 500);

    renderGoalDashboard();

    expect(await screen.findByText('TTA goals and objectives')).toBeVisible();
    await waitForGoalCardsFetch();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Unable to fetch goal dashboard goals');
    expect(
      screen.queryByRole('navigation', {
        name: 'TTA goals and objectives pagination',
      })
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Select all')).not.toBeInTheDocument();
  });

  it('removes deleted goals from the cards and updates pagination count', async () => {
    // 11 goals so deleting one triggers a refetch to backfill from the second page
    let serverGoalRows = [...goalRowsAcrossTwoPages];

    mockGoalDeleteHandler = (deletedGoalId) => {
      serverGoalRows = serverGoalRows.filter((goal) => goal.id !== deletedGoalId);
    };

    fetchMock.get('/api/widgets/goalDashboard', {
      goalStatusWithReasons: { ...mockLiveResponse, total: 11 },
    });
    fetchMock.get(/\/api\/widgets\/goalDashboardGoals.*/, () => ({
      goalDashboardGoals: {
        count: serverGoalRows.length,
        goalRows: serverGoalRows.slice(0, 10),
        allGoalIds: serverGoalRows.map((g) => g.id),
      },
    }));

    renderGoalDashboard();

    await waitForGoalCardsFetch();
    expect(screen.getByText('Goal 1')).toBeVisible();
    expect(screen.getByTestId('pagination-card-count-header')).toHaveTextContent('1-10 of 11');

    fireEvent.click(screen.getByRole('button', { name: 'Delete Goal 1' }));

    await waitForGoalCardsFetch(2);
    expect(screen.queryByText('Goal 1')).not.toBeInTheDocument();
    expect(screen.getByTestId('pagination-card-count-header')).toHaveTextContent('1-10 of 10');
  });

  it('returns to the previous valid page after deleting the only goal on the last page', async () => {
    let remainingGoalRows = [...goalRowsAcrossTwoPages];
    let remainingGoalIds = goalRowsAcrossTwoPages.map((goal) => goal.id);

    mockGoalDeleteHandler = (deletedGoalId) => {
      remainingGoalRows = remainingGoalRows.filter((goal) => goal.id !== deletedGoalId);
      remainingGoalIds = remainingGoalIds.filter((goalId) => goalId !== deletedGoalId);
    };

    fetchMock.get('/api/widgets/goalDashboard', {
      goalStatusWithReasons: {
        ...mockLiveResponse,
        total: 11,
      },
    });
    fetchMock.get(/\/api\/widgets\/goalDashboardGoals.*/, (url) => {
      const parsedUrl = new URL(String(url), 'http://localhost');
      const offset = parseInt(parsedUrl.searchParams.get('offset') || '0', 10);
      const perPage = parseInt(parsedUrl.searchParams.get('perPage') || '10', 10);
      const pageGoalRows = remainingGoalRows.slice(offset, offset + perPage);

      return {
        goalDashboardGoals: {
          count: remainingGoalRows.length,
          goalRows: pageGoalRows,
          allGoalIds: remainingGoalIds,
        },
      };
    });

    renderGoalDashboard();

    const pagination = await screen.findByRole('navigation', {
      name: 'TTA goals and objectives pagination',
    });
    await waitForGoalCardsFetch();

    fireEvent.click(within(pagination).getByRole('button', { name: 'Page 2' }));
    await waitForGoalCardsFetch(2);
    expect(screen.getByText('Goal 11')).toBeVisible();
    expect(within(pagination).getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete Goal 11' }));
    await waitForGoalCardsFetch(3);

    expect(screen.queryByText('Goal 11')).not.toBeInTheDocument();
    expect(screen.getByText('Goal 1')).toBeVisible();
    expect(screen.getByTestId('pagination-card-count-header')).toHaveTextContent('1-10 of 10');
    expect(within(pagination).queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument();
  });

  it('resets pagination when changing sort or per-page count', async () => {
    fetchMock.get('/api/widgets/goalDashboard', {
      goalStatusWithReasons: {
        ...mockLiveResponse,
        total: 30,
      },
    });
    mockGoalDashboardGoals({ count: 30 });

    renderGoalDashboard();

    const pagination = await screen.findByRole('navigation', {
      name: 'TTA goals and objectives pagination',
    });
    await waitForGoalCardsFetch();
    fireEvent.click(within(pagination).getByRole('button', { name: 'Page 2' }));
    await waitForGoalCardsFetch(2);
    expect(within(pagination).getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page'
    );

    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'createdOn-desc' } });
    await waitForGoalCardsFetch(3);
    expect(within(pagination).getByRole('button', { name: 'Page 1' })).toHaveAttribute(
      'aria-current',
      'page'
    );

    fireEvent.click(within(pagination).getByRole('button', { name: 'Page 2' }));
    await waitForGoalCardsFetch(4);
    expect(within(pagination).getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page'
    );

    fireEvent.change(screen.getByLabelText('Show'), { target: { value: '25' } });
    await waitForGoalCardsFetch(5);
    expect(within(pagination).getByRole('button', { name: 'Page 1' })).toHaveAttribute(
      'aria-current',
      'page'
    );
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
    mockGoalDashboardGoals({ count: 0 });

    renderGoalDashboard();

    expect(await screen.findByText('No results found.')).toBeVisible();
    await waitForGoalCardsFetch();
    expect(screen.getByText('TTA goals and objectives')).toBeVisible();
  });

  it('does not render the goals section while dashboard data is loading', async () => {
    fetchMock.get('/api/widgets/goalDashboard', { goalStatusWithReasons: mockLiveResponse });
    mockGoalDashboardGoals();

    renderGoalDashboard();

    expect(screen.queryByText('TTA goals and objectives')).not.toBeInTheDocument();
    expect(await screen.findByText('TTA goals and objectives')).toBeVisible();
    await waitForGoalCardsFetch();
  });

  it('refetches to backfill when deleting a goal from a non-last page', async () => {
    const allGoalRows = Array.from({ length: 21 }).map((_, index) => ({
      id: index + 1,
      name: `Goal ${index + 1}`,
      grant: {
        recipientId: index + 101,
        regionId: 1,
        recipient: { name: `Recipient ${index + 1}` },
      },
    }));
    let serverRows = [...allGoalRows];

    mockGoalDeleteHandler = (deletedGoalId) => {
      serverRows = serverRows.filter((goal) => goal.id !== deletedGoalId);
    };

    fetchMock.get('/api/widgets/goalDashboard', {
      goalStatusWithReasons: { ...mockLiveResponse, total: 21 },
    });
    fetchMock.get(/\/api\/widgets\/goalDashboardGoals.*/, (url) => {
      const parsedUrl = new URL(String(url), 'http://localhost');
      const offset = parseInt(parsedUrl.searchParams.get('offset') || '0', 10);
      const perPage = parseInt(parsedUrl.searchParams.get('perPage') || '10', 10);
      return {
        goalDashboardGoals: {
          count: serverRows.length,
          goalRows: serverRows.slice(offset, offset + perPage),
          allGoalIds: serverRows.map((g) => g.id),
        },
      };
    });

    renderGoalDashboard();

    await waitForGoalCardsFetch();
    expect(screen.getByText('Goal 1')).toBeVisible();
    expect(screen.getByTestId('pagination-card-count-header')).toHaveTextContent('1-10 of 21');

    fireEvent.click(screen.getByRole('button', { name: 'Delete Goal 1' }));
    await waitForGoalCardsFetch(2);

    // Page 1 should still show 10 goals, backfilled from the server
    expect(screen.queryByText('Goal 1')).not.toBeInTheDocument();
    expect(screen.getByText('Goal 11')).toBeVisible();
    expect(screen.getByTestId('pagination-card-count-header')).toHaveTextContent('1-10 of 20');
  });

  it('keeps optimistic rows and shows an error alert when the backfill refetch fails', async () => {
    jest.spyOn(console, 'error').mockImplementation();

    const allGoalRows = Array.from({ length: 21 }).map((_, index) => ({
      id: index + 1,
      name: `Goal ${index + 1}`,
      grant: {
        recipientId: index + 101,
        regionId: 1,
        recipient: { name: `Recipient ${index + 1}` },
      },
    }));

    fetchMock.get('/api/widgets/goalDashboard', {
      goalStatusWithReasons: { ...mockLiveResponse, total: 21 },
    });

    let goalsFetchCallCount = 0;
    fetchMock.get(/\/api\/widgets\/goalDashboardGoals.*/, () => {
      goalsFetchCallCount += 1;
      // First fetch (initial load) succeeds; subsequent fetches (backfill) fail.
      if (goalsFetchCallCount === 1) {
        return {
          goalDashboardGoals: {
            count: allGoalRows.length,
            goalRows: allGoalRows.slice(0, 10),
            allGoalIds: allGoalRows.map((g) => g.id),
          },
        };
      }
      return 500;
    });

    renderGoalDashboard();

    await waitForGoalCardsFetch();
    expect(screen.getByText('Goal 1')).toBeVisible();
    expect(screen.getByTestId('pagination-card-count-header')).toHaveTextContent('1-10 of 21');

    fireEvent.click(screen.getByRole('button', { name: 'Delete Goal 1' }));
    await waitForGoalCardsFetch(2);

    // The deleted goal is removed from the optimistic state.
    expect(screen.queryByText('Goal 1')).not.toBeInTheDocument();

    // The error alert from the failed backfill refetch is shown.
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Unable to fetch goal dashboard goals');

    // Optimistic rows and pagination remain visible — the user keeps their
    // context instead of seeing the entire goals area collapse to an alert.
    expect(screen.getByText('Goal 2')).toBeVisible();
    expect(screen.getByText('Goal 10')).toBeVisible();
    expect(
      screen.getByRole('navigation', { name: 'TTA goals and objectives pagination' })
    ).toBeVisible();
    expect(screen.getByTestId('pagination-card-count-header')).toHaveTextContent('1-10 of 20');
  });

  it('shows an error alert when live fetch fails', async () => {
    jest.spyOn(console, 'error').mockImplementation();
    fetchMock.get('/api/widgets/goalDashboard', 500);

    renderGoalDashboard();

    const alert = await screen.findByRole('alert');
    expect(alert).toBeVisible();
    expect(alert).toHaveTextContent('Unable to fetch goal dashboard data');
  });
});
