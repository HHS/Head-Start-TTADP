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

    expect(screen.getByText(/reports with resources/i)).toBeInTheDocument();
    expect(screen.getByText(/eclkc resources/i)).toBeInTheDocument();
    expect(screen.getByText(/recipients reached/i)).toBeInTheDocument();
    expect(screen.getByText(/participants reached/i)).toBeInTheDocument();
  });

  it('shows the correct data', async () => {
    const data = {
      reports: {
        count: '8,135',
        total: '19,914',
        percent: '40.85%',
      },
      eclkc: {
        count: '1,819',
        total: '2,365',
        percent: '79.91%',
      },
      recipients: {
        count: '248',
      },
      participants: {
        count: '765',
      },
    };

    renderResourcesDashboardOverview({ data });
    expect(await screen.findByText(/^[ \t]*reports with resources\r?\n?[ \t]*8,135 of 19,914/i)).toBeVisible();
    expect(await screen.findByText(/^[ \t]*eclkc resources\n?[ \t]*1,819 of 2,365/i)).toBeVisible();
    expect(await screen.findByText(/248/i)).toBeVisible();
    expect(await screen.findByText(/recipients reached/i)).toBeVisible();
    expect(await screen.findByText(/765/i)).toBeVisible();
    expect(await screen.findByText(/participants reached/i)).toBeVisible();
  });
});
