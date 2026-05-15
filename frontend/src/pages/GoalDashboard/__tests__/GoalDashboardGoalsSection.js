import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import useFetch from '../../../hooks/useFetch';
import GoalDashboardGoalsSection from '../GoalDashboardGoalsSection';

jest.mock('../../../hooks/useFetch');

jest.mock(
  '../../../components/GoalCards/StandardGoalCard',
  () =>
    function MockStandardGoalCard({ goal }) {
      return <div>{goal.name}</div>;
    }
);

let mockGoalCardsRenderCount = 0;

jest.mock(
  '../GoalDashboardGoalCards',
  () =>
    function MockGoalDashboardGoalCards({ onSelectionChange }) {
      mockGoalCardsRenderCount += 1;

      return (
        <div>
          <span data-testid="goal-cards-render-count">{mockGoalCardsRenderCount}</span>
          <button type="button" onClick={() => onSelectionChange([2, 1])}>
            Select goals in one order
          </button>
          <button type="button" onClick={() => onSelectionChange([1, 2])}>
            Select goals in another order
          </button>
        </div>
      );
    }
);

const emptyGoalsResponse = {
  goalDashboardGoals: {
    count: 0,
    goalRows: [],
    allGoalIds: [],
  },
};

describe('GoalDashboardGoalsSection', () => {
  beforeEach(() => {
    mockGoalCardsRenderCount = 0;
    useFetch.mockReturnValue({
      data: {
        count: 2,
        goalRows: [
          { id: 1, name: 'Goal 1' },
          { id: 2, name: 'Goal 2' },
        ],
        allGoalIds: [1, 2],
      },
      setData: jest.fn(),
      error: '',
      loading: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not update selected goal state when the same ids are reported in a different order', () => {
    render(
      <MemoryRouter>
        <GoalDashboardGoalsSection dataStartDateDisplay="09/09/2025" filters={[]} />
      </MemoryRouter>
    );

    expect(screen.getByTestId('goal-cards-render-count')).toHaveTextContent('1');

    fireEvent.click(screen.getByRole('button', { name: 'Select goals in one order' }));

    expect(screen.getByTestId('goal-cards-render-count')).toHaveTextContent('2');

    fireEvent.click(screen.getByRole('button', { name: 'Select goals in another order' }));

    expect(screen.getByTestId('goal-cards-render-count')).toHaveTextContent('2');
  });
});

const renderSection = (filters = []) =>
  render(
    <MemoryRouter>
      <GoalDashboardGoalsSection dataStartDateDisplay="09/09/2025" filters={filters} />
    </MemoryRouter>
  );

const goalsDashboardCalls = () => fetchMock.calls().map((call) => String(call[0]));

describe('GoalDashboardGoalsSection filter wiring', () => {
  beforeEach(() => {
    useFetch.mockImplementation((_url, fetcher) => {
      if (fetcher) fetcher().catch(() => {});
      return { data: null, setData: jest.fn(), error: '', loading: false };
    });
  });

  afterEach(() => {
    fetchMock.restore();
    jest.clearAllMocks();
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
});
