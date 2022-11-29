/* eslint-disable jest/no-disabled-tests */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResourcesDashboardOverviewWidget } from '../ResourcesDashboardOverview';

const renderResourcesDashboardOverview = (props) => (
  render(<ResourcesDashboardOverviewWidget loading={props.loading} data={props.data} />)
);

describe('Resource Dashboard Overview Widget', () => {
  it('handles undefined data', async () => {
    renderResourcesDashboardOverview({ data: undefined });

    expect(screen.getByText(/0 eclkc resources of 0/i)).toBeInTheDocument();
    expect(screen.getByText(/0 non-eclkc resources of 0/i)).toBeInTheDocument();
    expect(screen.getByText(/0 no resources of 0/i)).toBeInTheDocument();
  });

  it('shows the correct data', async () => {
    const data = {
      numEclkc: '50',
      totalNumEclkc: '100',
      numEclkcPercentage: '50%',
      numNonEclkc: '40',
      totalNumNonEclkc: '200',
      numNonEclkcPercentage: '20%',
      numNoResources: '30',
      totalNumNoResources: '300',
      numNoResourcesPercentage: '10%',
    };

    renderResourcesDashboardOverview({ data });

    expect(screen.getByText(/50 eclkc resources of 100/i)).toBeInTheDocument();
    expect(screen.getByText(/40 non-eclkc resources of 200/i)).toBeInTheDocument();
    expect(screen.getByText(/30 no resources of 300/i)).toBeInTheDocument();
  });

  it('renders loading when loading', async () => {
    renderResourcesDashboardOverview({ loading: true });

    expect(await screen.findByText('Loading')).toBeInTheDocument();
  });
});
