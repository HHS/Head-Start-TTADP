import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import GoalStatusChart from '../GoalStatusChart';

describe('GoalStatusChart', () => {
  it('renders', () => {
    render(<GoalStatusChart />);
    expect(screen.getByText('Number of goals by status')).toBeInTheDocument();
  });
});
