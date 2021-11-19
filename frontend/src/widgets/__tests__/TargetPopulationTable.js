import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TargetPopulationTable } from '../TargetPopulationsTable';

const renderTargetPopulationTable = ({ data }) => {
  render(
    <TargetPopulationTable
      data={data}
      loading={false}
    />,
  );
};

describe('Target Populations Table', () => {
  it('renders correctly with data', async () => {
    const data = [
      { name: 'population 1', count: 4 },
      { name: 'population 2', count: 3 },
    ];
    renderTargetPopulationTable({ data });

    expect(screen.getByText(/Target Populations in Activity Reports/i)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /target population/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /# of activities/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /population 1/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /4/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /population 2/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /3/i })).toBeInTheDocument();
  });
});
