/* eslint-disable jest/no-disabled-tests */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DashboardOverviewWidget } from '../DashboardOverview';

const renderDashboardOverview = (props) => (
  render(<DashboardOverviewWidget loading={props.loading} data={props.data} />)
);

describe('Dashboard Overview Widget', () => {
  it('handles undefined data', async () => {
    renderDashboardOverview({ data: undefined });

    expect(screen.getByText('Activity reports')).toBeInTheDocument();
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

  it('renders loading when loading', async () => {
    renderDashboardOverview({ loading: true });

    expect(screen.getByLabelText('loading')).toBeInTheDocument();
  });
});
