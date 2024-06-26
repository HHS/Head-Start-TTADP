/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { render, act, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import GoalCardsHeader from '../GoalsCardsHeader';
import UserContext from '../../../UserContext';

describe('GoalDataController', () => {
  const DEFAULT_USER = {
    name: '',
    id: 1,
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

  let navigate;

  const Test = (props) => {
    navigate = useNavigate();
    return <GoalCardsHeader {...defaultProps} {...props} />;
  };

  const renderTest = (props = {}) => {
    render(
      <UserContext.Provider value={{ user: DEFAULT_USER }}>
        <MemoryRouter>
          {/* eslint-disable-next-line react/jsx-props-no-spreading */}
          <Test {...props} />
        </MemoryRouter>
      </UserContext.Provider>,
    );
  };

  it('displays correct message with merged goals', async () => {
    act(() => {
      renderTest(
        {}, // props
      );
    });

    act(() => navigate('/', { state: { mergedGoals: [1, 2] } }));

    expect(await screen.findByText(/goals g-1, g-2 have been merged/i)).toBeInTheDocument();
    const resetSort = await screen.findByRole('button', { name: 'Reset goal sort order' });
    userEvent.click(resetSort);
    expect(dismissMergeSuccess).toHaveBeenCalled();
  });

  it('displays correct singular message with merged goals', async () => {
    act(() => {
      renderTest(
        {}, // props
      );
    });

    act(() => navigate('/', { state: { mergedGoals: [1] } }));

    expect(await screen.findByText(/goal g-1 has been merged/i)).toBeInTheDocument();
    const resetSort = await screen.findByRole('button', { name: 'Reset goal sort order' });
    userEvent.click(resetSort);
    expect(dismissMergeSuccess).toHaveBeenCalled();
  });
});
