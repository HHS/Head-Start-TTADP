/* eslint-disable jest/no-disabled-tests */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DashboardOverviewWidget } from '../DashboardOverview';

const renderDashboardOverview = (props) => (render(<DashboardOverviewWidget data={props.data} />));

describe('Dashboard Overview Widget', () => {
  it.skip('handles null data', async () => {
    const data = null;
    renderDashboardOverview({ data });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows the correct data', async () => {
    const data = {
      numReports: '5',
      numGrants: '2',
      numTotalGrants: '2',
      numParticipants: '10',
      sumDuration: '2623.0',
      inPerson: '1.0',
    };

    renderDashboardOverview({ data });

    expect(screen.getByText(/5/i)).toBeInTheDocument();
    expect(screen.getByText(/activity reports/i)).toBeInTheDocument();
    expect(screen.getByText(/participants/i)).toBeInTheDocument();
    expect(screen.getByText(/10/i)).toBeInTheDocument();
    expect(screen.getByText(/2,623.0/i)).toBeInTheDocument();
    expect(screen.getByText(/hours of tta/i)).toBeInTheDocument();
    expect(screen.getByText(/in-person activities/i)).toBeInTheDocument();
  });

  it.skip('renders loading when data is not present', async () => {
    renderDashboardOverview({ data: {} });

    expect(screen.getByText(/loading.../i)).toBeInTheDocument();
  });
});
