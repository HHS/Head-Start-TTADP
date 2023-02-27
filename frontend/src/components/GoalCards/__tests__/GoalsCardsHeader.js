import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GoalCardsHeader from '../GoalsCardsHeader';
import UserContext from '../../../UserContext';
import { SCOPE_IDS } from '../../../Constants';

const DEFAULT_PROPS = {
  selectedGoalIds: [],
};

const user = {
  name: 'test@test.com',
  homeRegionId: 1,
  permissions: [
    {
      scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
      regionId: 1,
    },
  ],
};

describe('GoalsCardsHeader', () => {
  const renderGoalCardsHeader = (props = DEFAULT_PROPS) => {
    render(
      <MemoryRouter>
        <UserContext.Provider value={{ user }}>
          <GoalCardsHeader
            title="Goals"
            hidePagination
            count={0}
            activePage={1}
            offset={0}
            perPage={10}
            handlePageChange={() => {}}
            regionId="1"
            recipientId="1"
            hasActiveGrants
            requestSort={() => {}}
            sortConfig={{
              sortBy: 'createdOn',
              direction: 'desc',
              activePage: 1,
              offset: 0,
            }}
            selectAllGoalCheckboxSelect={() => {}}
            allGoalsChecked={false}
            numberOfSelectedGoals={0}
            selectAllGoals={() => {}}
            perPageChange={() => {}}
            pageGoalIds={0}
        /* eslint-disable-next-line react/jsx-props-no-spreading */
            {...props}
          />
        </UserContext.Provider>
      </MemoryRouter>,
    );
  };

  it('shows the default rttapa link', () => {
    renderGoalCardsHeader();
    const link = screen.getByText(/Create RTTAPA/i);
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/recipient-tta-records/1/region/1/rttapa/new');
  });

  it('adds the correct query params to the rttapa link', () => {
    renderGoalCardsHeader({
      ...DEFAULT_PROPS,
      selectedGoalIds: ['1', '2', '3'],
      recipientId: '2',
      regionId: '3',
    });
    const link = screen.getByText(/Create RTTAPA/i);
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/recipient-tta-records/2/region/3/rttapa/new?goalId[]=1&goalId[]=2&goalId[]=3');
  });
});
