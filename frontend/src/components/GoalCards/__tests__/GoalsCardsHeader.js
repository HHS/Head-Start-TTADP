import React from 'react';
import { render, act, screen } from '@testing-library/react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import GoalCardsHeader from '../GoalsCardsHeader';
import UserContext from '../../../UserContext';

describe('GoalCardsHeader', () => {
  const DEFAULT_USER = {
    name: '',
    id: 1,
  };

  const REGION_ID = 1;
  const RECIPIENT_ID = 1;

  beforeEach(() => {
    const url = `/api/goals/similar/region/${REGION_ID}/recipient/${RECIPIENT_ID}?cluster=true`;
    fetchMock.get(url, [{ ids: [1], goals: [2] }]);
    fetchMock.get('/api/users/feature-flags', ['manual_mark_goals_similar']);
    fetchMock.put(`/api/recipient/${RECIPIENT_ID}/mark-similar`, { status: 200 });
  });

  afterEach(() => fetchMock.restore());

  const dismissMergeSuccess = jest.fn();
  const selectAllGoalCheckboxSelect = jest.fn();

  const defaultProps = {
    title: 'TTA Goals',
    count: 1,
    activePage: 1,
    offset: 0,
    perPage: 10,
    handlePageChange: jest.fn(),
    hidePagination: true,
    sortConfig: {
      sortBy: 'mergedGoals',
      direction: 'ASC',
      activePage: 1,
      offset: 0,
    },
    requestSort: jest.fn(),
    numberOfSelectedGoals: 0,
    allGoalsChecked: false,
    selectAllGoalCheckboxSelect,
    selectAllGoals: jest.fn(),
    selectedGoalIds: [],
    perPageChange: jest.fn(),
    pageGoalIds: [1],
    showRttapaValidation: false,
    draftSelectedRttapa: [],
    shouldDisplayMergeSuccess: true,
    dismissMergeSuccess,
    filters: [],
    recipientId: String(RECIPIENT_ID),
    regionId: String(REGION_ID),
    hasActiveGrants: true,
    showNewGoals: false,
    canMergeGoals: true,
    allSelectedGoalIds: { 1: true, 2: true },
    goalBuckets: [{ id: 1, goalIds: [1, 2] }, { id: 2, goalIds: [3, 4] }],
  };

  const history = createMemoryHistory();

  const renderTest = (props = {}, locationState = undefined) => {
    history.location.state = locationState;

    render(
      <UserContext.Provider value={{ user: DEFAULT_USER }}>
        <Router history={history}>
          {/* eslint-disable-next-line react/jsx-props-no-spreading */}
          <GoalCardsHeader {...defaultProps} {...props} />
        </Router>
      </UserContext.Provider>,
    );
  };

  it('displays correct message with merged goals', async () => {
    act(() => {
      renderTest(
        {}, // props
        {
          mergedGoals: [1, 2], // location state
        },
      );
    });

    expect(await screen.findByText(/goals g-1, g-2 have been merged/i)).toBeInTheDocument();
    const resetSort = await screen.findByRole('button', { name: 'Reset goal sort order' });
    userEvent.click(resetSort);
    expect(dismissMergeSuccess).toBeCalled();
  });

  it('displays correct singular message with merged goals', async () => {
    act(() => {
      renderTest(
        {}, // props
        {
          mergedGoals: [1], // location state
        },
      );
    });

    expect(await screen.findByText(/goal g-1 has been merged/i)).toBeInTheDocument();
    const resetSort = await screen.findByRole('button', { name: 'Reset goal sort order' });
    userEvent.click(resetSort);
    expect(dismissMergeSuccess).toBeCalled();
  });

  it('calls onMarkSimilarGoals when the button is clicked', async () => {
    // Update props to meet the conditions for displaying the button
    const props = {
      numberOfSelectedGoals: 2,
      allSelectedGoalIds: { 1: true, 2: true },
      pageGoalIds: [1, 2],
      goalBuckets: [{ id: 1, goalIds: [1, 2] }],
      hasManualMarkGoalsSimilar: true,
      canMergeGoals: true, // Ensure this is true
    };

    act(() => {
      renderTest(props);
    });

    const markSimilarButton = screen.getByRole('button', { name: /mark goals as similar/i });
    expect(markSimilarButton).toBeInTheDocument();

    await act(async () => {
      userEvent.click(markSimilarButton);
    });

    // Verify that markSimilarGoals was called with the correct parameters
    const url = `/api/recipient/${RECIPIENT_ID}/mark-similar`;
    expect(fetchMock.calls(url)).toHaveLength(1);
    expect(selectAllGoalCheckboxSelect).toHaveBeenCalledWith({ target: { checked: false } });
  });

  it('does not display "Mark goals as similar" button if numberOfSelectedGoals is 1 or less', () => {
    const props = {
      numberOfSelectedGoals: 1,
      hasManualMarkGoalsSimilar: true,
    };

    renderTest(props);

    const markSimilarButton = screen.queryByText(/Mark goals as similar/i);
    expect(markSimilarButton).not.toBeInTheDocument();
  });

  it('does not display "Mark goals as similar" button if hasManualMarkGoalsSimilar is false', () => {
    const props = {
      numberOfSelectedGoals: 2,
      hasManualMarkGoalsSimilar: false,
    };

    renderTest(props);

    const markSimilarButton = screen.queryByText(/Mark goals as similar/i);
    expect(markSimilarButton).not.toBeInTheDocument();
  });
});
