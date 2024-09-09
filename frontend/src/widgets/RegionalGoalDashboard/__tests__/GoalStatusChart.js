import '@testing-library/jest-dom';
import React from 'react';
import fetchMock from 'fetch-mock';
import { render, screen, act } from '@testing-library/react';
import GoalStatusChart from '../GoalStatusChart';

describe('GoalStatusChart', () => {
  it('renders', async () => {
    fetchMock.get('/api/widgets/goalsByStatus?', {
      total: 3,
      'Not Started': 1,
      'In Progress': 1,
      Closed: 1,
      'Ceased/Suspended': 0,
    });

    act(() => {
      render(<GoalStatusChart />);
    });

    expect(await screen.findByText('Number of goals by status')).toBeInTheDocument();
    expect(fetchMock.called()).toBe(true);
  });
});
