import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import TargetPopulationsTable from '../TargetPopulationsTable';

const renderTargetPopulationTable = ({ data }) => {
  render(
    <TargetPopulationsTable
      data={data}
    />,
  );
};

describe('Target Populations Table', () => {
  it('renders correctly with data', async () => {
    const data = [
      { name: 'population 1', count: 4 },
      { name: 'population 2', count: 2 },
    ];
    renderTargetPopulationTable({ data });

    expect(screen.getByText(/Target Populations in Activity Reports/i)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /target population/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /# of activities/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /reason one/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /4/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /reason two/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /2/i })).toBeInTheDocument();
  });
});
