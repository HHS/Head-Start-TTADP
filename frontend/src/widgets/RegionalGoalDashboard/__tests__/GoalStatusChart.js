import '@testing-library/jest-dom';
import React from 'react';
import fetchMock from 'fetch-mock';
import { render, screen, act } from '@testing-library/react';
import { GOAL_STATUS } from '@ttahub/common/src/constants';
import GoalStatusChart from '../GoalStatusChart';

describe('GoalStatusChart', () => {
  it('renders', async () => {
    fetchMock.get('/api/widgets/goalsByStatus?', {
      total: 3,
      [GOAL_STATUS.NOT_STARTED]: 1,
      [GOAL_STATUS.IN_PROGRESS]: 1,
      [GOAL_STATUS.CLOSED]: 1,
      [GOAL_STATUS.SUSPENDED]: 0,
    });

    act(() => {
      render(<GoalStatusChart />);
    });

    expect(await screen.findByText('Number of goals by status')).toBeInTheDocument();
    expect(fetchMock.called()).toBe(true);
  });
});
