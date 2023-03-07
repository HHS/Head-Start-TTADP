import React from 'react';
import { render, screen } from '@testing-library/react';

import GoalCard from '../GoalCard';
import UserContext from '../../../UserContext';
import { SCOPE_IDS } from '../../../Constants';

describe('GoalCard', () => {
  const goal = {
    id: 1,
    ids: [1],
    goalStatus: 'In Progress',
    createdOn: '2021-01-01',
    goalText: 'Goal text',
    goalTopics: ['Topic 1', 'Topic 2'],
    reasons: ['Reason 1', 'Reason 2'],
    objectiveCount: 1,
    goalNumbers: ['G-1'],
    objectives: [
      {
        id: 1,
        title: 'Objective 1',
        arNumber: 'AR-1',
        ttaProvided: 'TTA 1',
        endDate: '2021-01-01',
        reasons: ['Reason 1', 'Reason 2'],
        status: 'Closed',
        activityReports: [],
        grantNumbers: ['G-1'],
      },
    ],
    previousStatus: null,
    isRttapa: 'No',
  };

  const DEFAULT_USER = {
    name: 'test@test.com',
    homeRegionId: 1,
    permissions: [
      {
        scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
        regionId: 1,
      },
    ],
  };

  const DEFAULT_PROPS = {
    hideCheckbox: false,
    showReadOnlyStatus: false,
    hideGoalOptions: false,
  };

  const renderGoalCard = (props = DEFAULT_PROPS) => {
    render((
      <UserContext.Provider value={{ user: DEFAULT_USER }}>
        <GoalCard
          goal={goal}
          recipientId="1"
          regionId="1"
          showCloseSuspendGoalModal={() => {}}
          performGoalStatusUpdate={() => {}}
          handleGoalCheckboxSelect={() => {}}
          isChecked={false}
          marginX={3}
          marginY={2}
        // eslint-disable-next-line react/jsx-props-no-spreading
          {...props}
        />
      </UserContext.Provider>));
  };

  it('shows the checkbox by default', () => {
    renderGoalCard();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('hides the checkbox when hideCheckbox is true', () => {
    renderGoalCard({ ...DEFAULT_PROPS, hideCheckbox: true });
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('shows the goal status as a button by default', () => {
    renderGoalCard();
    const status = screen.getByText(/In Progress/i);
    expect(status.tagName).toEqual('BUTTON');
  });

  it('can show the goal status as read only', () => {
    renderGoalCard({ ...DEFAULT_PROPS, showReadOnlyStatus: true });
    const status = screen.getByText(/In Progress/i);
    expect(status.tagName).toEqual('DIV');
  });

  it('shows the goal options by default', () => {
    renderGoalCard();
    expect(screen.getByTestId('ellipsis-button')).toBeInTheDocument();
  });

  it('can hide the goal options', () => {
    renderGoalCard({ ...DEFAULT_PROPS, hideGoalOptions: true });
    expect(screen.queryByTestId('ellipsis-button')).not.toBeInTheDocument();
  });
});
