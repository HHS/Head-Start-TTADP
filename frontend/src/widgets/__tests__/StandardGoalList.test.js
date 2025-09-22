import React from 'react';
import { render, screen } from '@testing-library/react';
import { StandardGoalsListTable } from '../StandardGoalList';

describe('StandardGoalsListTable', () => {
  const mockData = [
    { name: 'School Readiness', count: 10 },
    { name: 'Family Support', count: 5 },
    { name: 'Health Services', count: 3 },
  ];

  it('renders the component with title', () => {
    render(<StandardGoalsListTable data={mockData} loading={false} />);

    expect(screen.getByText('Goals categories in Activity Reports')).toBeInTheDocument();
    expect(screen.getByText('Data reflects activity starting on 09/01/2025.')).toBeInTheDocument();
  });

  it('renders goal data correctly in table', () => {
    render(<StandardGoalsListTable data={mockData} loading={false} />);

    // Check column headers
    expect(screen.getByText('Goal category')).toBeInTheDocument();
    expect(screen.getByText('# of goals')).toBeInTheDocument();

    // Check data rows
    expect(screen.getByText('School Readiness')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Family Support')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Health Services')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<StandardGoalsListTable data={mockData} loading />);
    expect(screen.getByLabelText('Goals list loading')).toBeInTheDocument();
  });

  it('shows no data message when data is empty', () => {
    render(<StandardGoalsListTable data={[]} loading={false} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('shows no data message when data is null', () => {
    render(<StandardGoalsListTable data={null} loading={false} />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });
});
