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
    expect(screen.getByText('# of reports')).toBeInTheDocument();

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

  it('shows no results component when data is empty and hides table headers', () => {
    render(<StandardGoalsListTable data={[]} loading={false} />);

    // NoResultsFound component should be visible
    expect(screen.getByText('No results found.')).toBeInTheDocument();
    expect(screen.getByText('Try removing or changing the selected filters.')).toBeInTheDocument();

    // Table headers should not be visible
    expect(screen.queryByText('Goal category')).not.toBeInTheDocument();
    expect(screen.queryByText('# of goals')).not.toBeInTheDocument();
  });

  it('shows no results component when data is null and hides table headers', () => {
    render(<StandardGoalsListTable data={null} loading={false} />);

    // NoResultsFound component should be visible
    expect(screen.getByText('No results found.')).toBeInTheDocument();
    expect(screen.getByText('Try removing or changing the selected filters.')).toBeInTheDocument();

    // Table headers should not be visible
    expect(screen.queryByText('Goal category')).not.toBeInTheDocument();
    expect(screen.queryByText('# of goals')).not.toBeInTheDocument();
  });
});
