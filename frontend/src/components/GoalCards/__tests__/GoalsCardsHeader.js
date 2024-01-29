import React from 'react';
import { render, act, screen } from '@testing-library/react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import GoalCardsHeader from '../GoalsCardsHeader';
import UserContext from '../../../UserContext';

describe('GoalDataController', () => {
  const DEFAULT_USER = {
    name: '',
    id: 1,
    flags: ['merge_goals'],
  };

  const REGION_ID = 1;
  const RECIPIENT_ID = 1;

  beforeEach(() => {
    const url = `/api/goals/similar/region/${REGION_ID}/recipient/${RECIPIENT_ID}?cluster=true`;
    fetchMock.get(url, [{ ids: [1], goals: [2] }]);
  });

  afterEach(() => fetchMock.restore());

  const dismissMergeSuccess = jest.fn();

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
    selectAllGoalCheckboxSelect: jest.fn(),
    selectAllGoals: jest.fn(),
    selectedGoalIds: [],
    perPageChange: jest.fn(),
    pageGoalIds: 1,
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
});
