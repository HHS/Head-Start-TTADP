/**
 * Tests that the GoalDashboard page wires active filters from useFilters into
 * both the Sankey widget API call and the goals-section API call.
 *
 * Both widgets should respond to the date filter — the Sankey shows the
 * distribution of the filtered goal set, and the goals table shows the
 * filtered rows.
 *
 * The stale-closure color fix ensures Plotly always uses the latest
 * linkPatternIds via a ref, so re-rendering with filtered data preserves
 * the correct status colors.
 *
 * useFilters is mocked so we can control exactly which filters are "active"
 * without having to interact with the FilterPanel UI or sessionStorage.
 */
import '@testing-library/jest-dom';
import { render, waitFor } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import AriaLiveContext from '../../../AriaLiveContext';
import useFilters from '../../../hooks/useFilters';
import UserContext from '../../../UserContext';
import GoalDashboard from '../index';

jest.mock('../../../hooks/useFilters');

jest.mock('../../../widgets/GoalStatusReasonSankeyWidget', () =>
  function MockSankeyWidget() {
    return <div>Goal Sankey Graph</div>;
  }
);

jest.mock('../../../components/GoalCards/StandardGoalCard', () =>
  function MockStandardGoalCard() {
    return <div>Goal Card</div>;
  }
);

const mockUser = {
  homeRegionId: 1,
  permissions: [{ regionId: 1, scopeId: 1 }],
};

const mockSankeyResponse = {
  dataStartDate: '2025-09-09',
  dataStartDateDisplay: '09/09/2025',
  total: 0,
  statusRows: [],
  reasonRows: [],
  sankey: {
    nodes: [
      { id: 'goals', label: 'Goals', count: 0, percentage: 0 },
      { id: 'status:Not Started', label: 'Not started', count: 0, percentage: 0 },
    ],
    links: [{ source: 'goals', target: 'status:Not Started', value: 0 }],
  },
};

const mockEmptyGoals = {
  goalDashboardGoals: { count: 0, goalRows: [], allGoalIds: [] },
};

const DATE_FILTER = {
  id: 'f1',
  topic: 'createDate',
  condition: 'is within',
  query: '2026/01/01-2026/01/31',
};

const makeUseFiltersReturn = (filters) => ({
  filters,
  onApplyFilters: jest.fn(),
  onRemoveFilter: jest.fn(),
  filterConfig: [],
  regions: [1],
  setFilters: jest.fn(),
  userHasOnlyOneRegion: true,
  defaultRegion: 1,
  hasMultipleRegions: false,
  allRegionsFilters: [],
  defaultFilters: [],
});

const renderGoalDashboard = () =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/dashboards/goal-dashboard' }]}>
      <AriaLiveContext.Provider value={{ announce: jest.fn() }}>
        <UserContext.Provider value={{ user: mockUser }}>
          <GoalDashboard />
        </UserContext.Provider>
      </AriaLiveContext.Provider>
    </MemoryRouter>
  );

describe('GoalDashboard - createDate filter propagation', () => {
  afterEach(() => {
    fetchMock.restore();
    jest.clearAllMocks();
  });

  describe('when a createDate filter is active', () => {
    beforeEach(() => {
      useFilters.mockReturnValue(makeUseFiltersReturn([DATE_FILTER]));
    });

    it('passes the createDate filter query param to the Sankey widget API call', async () => {
      fetchMock.get(/\/api\/widgets\/goalDashboardGoals.*/, mockEmptyGoals);
      fetchMock.get(/\/api\/widgets\/goalDashboard.*/, { goalStatusWithReasons: mockSankeyResponse });

      renderGoalDashboard();

      await waitFor(() => {
        const sankeyCalls = fetchMock
          .calls()
          .map((call) => String(call[0]))
          .filter((url) => url.includes('/api/widgets/goalDashboard') && !url.includes('goalDashboardGoals'));
        expect(sankeyCalls.some((url) => url.includes('createDate.win='))).toBe(true);
      });
    });

    it('passes the createDate filter query param to the goals section API call', async () => {
      fetchMock.get(/\/api\/widgets\/goalDashboardGoals.*/, mockEmptyGoals);
      fetchMock.get(/\/api\/widgets\/goalDashboard.*/, { goalStatusWithReasons: mockSankeyResponse });

      renderGoalDashboard();

      await waitFor(() => {
        const goalsCalls = fetchMock
          .calls()
          .map((call) => String(call[0]))
          .filter((url) => url.includes('/api/widgets/goalDashboardGoals'));
        expect(goalsCalls.some((url) => url.includes('createDate.win='))).toBe(true);
      });
    });
  });

  describe('when no filters are active', () => {
    beforeEach(() => {
      useFilters.mockReturnValue(makeUseFiltersReturn([]));
    });

    it('calls the Sankey API without any createDate param', async () => {
      fetchMock.get(/\/api\/widgets\/goalDashboardGoals.*/, mockEmptyGoals);
      fetchMock.get(/\/api\/widgets\/goalDashboard.*/, { goalStatusWithReasons: mockSankeyResponse });

      renderGoalDashboard();

      await waitFor(() => {
        const sankeyCalls = fetchMock
          .calls()
          .map((call) => String(call[0]))
          .filter((url) => url.includes('/api/widgets/goalDashboard') && !url.includes('goalDashboardGoals'));
        expect(sankeyCalls.every((url) => !url.includes('createDate'))).toBe(true);
      });
    });
  });
});

