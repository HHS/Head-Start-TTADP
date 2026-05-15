import '@testing-library/jest-dom';
import { render, waitFor } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import GoalDashboardGoalsSection from '../GoalDashboardGoalsSection';

jest.mock('../../../components/GoalCards/StandardGoalCard', () =>
  function MockStandardGoalCard({ goal }) {
    return <div>{goal.name}</div>;
  }
);

const emptyGoalsResponse = {
  goalDashboardGoals: {
    count: 0,
    goalRows: [],
    allGoalIds: [],
  },
};

const renderSection = (filters = []) =>
  render(
    <MemoryRouter>
      <GoalDashboardGoalsSection dataStartDateDisplay="09/09/2025" filters={filters} />
    </MemoryRouter>
  );

const goalsDashboardCalls = () =>
  fetchMock.calls().map((call) => String(call[0]));

describe('GoalDashboardGoalsSection filter wiring', () => {
  afterEach(() => {
    fetchMock.restore();
  });

  it('sends no createDate params when filters prop is empty', async () => {
    fetchMock.get(/\/api\/widgets\/goalDashboardGoals.*/, emptyGoalsResponse);

    renderSection([]);

    await waitFor(() => expect(fetchMock.called()).toBe(true));

    expect(goalsDashboardCalls().every((url) => !url.includes('createDate'))).toBe(true);
  });

  it('includes createDate.win in the API request when "is within" filter is applied', async () => {
    fetchMock.get(/\/api\/widgets\/goalDashboardGoals.*/, emptyGoalsResponse);

    renderSection([
      {
        id: 'f1',
        topic: 'createDate',
        condition: 'is within',
        query: '2026/01/01-2026/01/31',
      },
    ]);

    await waitFor(() => {
      expect(goalsDashboardCalls().some((url) => url.includes('createDate.win='))).toBe(true);
    });
  });

  it('includes createDate.aft in the API request when "is on or after" filter is applied', async () => {
    fetchMock.get(/\/api\/widgets\/goalDashboardGoals.*/, emptyGoalsResponse);

    renderSection([
      {
        id: 'f2',
        topic: 'createDate',
        condition: 'is on or after',
        query: '2026/01/01',
      },
    ]);

    await waitFor(() => {
      expect(goalsDashboardCalls().some((url) => url.includes('createDate.aft='))).toBe(true);
    });
  });

  it('includes createDate.bef in the API request when "is on or before" filter is applied', async () => {
    fetchMock.get(/\/api\/widgets\/goalDashboardGoals.*/, emptyGoalsResponse);

    renderSection([
      {
        id: 'f3',
        topic: 'createDate',
        condition: 'is on or before',
        query: '2026/12/31',
      },
    ]);

    await waitFor(() => {
      expect(goalsDashboardCalls().some((url) => url.includes('createDate.bef='))).toBe(true);
    });
  });

  it('re-fetches with updated filter params when the filters prop changes', async () => {
    fetchMock.get(/\/api\/widgets\/goalDashboardGoals.*/, emptyGoalsResponse);

    const { rerender } = renderSection([]);

    await waitFor(() => expect(fetchMock.called()).toBe(true));

    rerender(
      <MemoryRouter>
        <GoalDashboardGoalsSection
          dataStartDateDisplay="09/09/2025"
          filters={[
            {
              id: 'f1',
              topic: 'createDate',
              condition: 'is within',
              query: '2026/01/01-2026/01/31',
            },
          ]}
        />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(goalsDashboardCalls().some((url) => url.includes('createDate.win='))).toBe(true);
    });
  });

  it('preserves all region.in filter values in the API request', async () => {
    fetchMock.get(/\/api\/widgets\/goalDashboardGoals.*/, emptyGoalsResponse);

    renderSection([
      {
        id: 'region-filter',
        topic: 'region',
        condition: 'is',
        query: ['4', '12'],
      },
    ]);

    await waitFor(() => expect(fetchMock.called()).toBe(true));

    const [lastCallUrl] = fetchMock.lastCall();
    const parsedUrl = new URL(String(lastCallUrl), 'http://localhost');

    expect(parsedUrl.searchParams.getAll('region.in[]')).toEqual(['4', '12']);
  });
});
