import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import useFetch from '../../../hooks/useFetch';
import GoalDashboardGoalsSection from '../GoalDashboardGoalsSection';

jest.mock('../../../hooks/useFetch');

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
