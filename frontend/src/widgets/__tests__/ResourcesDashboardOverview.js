/* eslint-disable jest/no-disabled-tests */
import '@testing-library/jest-dom';
import React from 'react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history/cjs/history.min';
import { render, screen } from '@testing-library/react';
import { ResourcesDashboardOverviewWidget } from '../ResourcesDashboardOverview';

const renderResourcesDashboardOverview = (props) => {
  const history = createMemoryHistory();

  render(
    <Router history={history}>
      <ResourcesDashboardOverviewWidget loading={props.loading} data={props.data} />
    </Router>,
  );
};

describe('Resource Dashboard Overview Widget', () => {
  it('handles undefined data', async () => {
    renderResourcesDashboardOverview({ data: undefined });

    expect(screen.getByText(/reports with resources/i)).toBeInTheDocument();
    expect(screen.getByText(/eclkc resources/i)).toBeInTheDocument();
    expect(screen.getByText(/recipients reached/i)).toBeInTheDocument();
    expect(screen.getByText(/participants reached/i)).toBeInTheDocument();
    expect(screen.getByText(/reports citing ipd courses/i)).toBeInTheDocument();
  });

  it('shows the correct data', async () => {
    const data = {
      report: {
        numResources: '8,135',
        num: '19,914',
        percentResources: '40.85%',
      },
      resource: {
        numEclkc: '1,819',
        num: '2,365',
        percentEclkc: '79.91%',
      },
      recipient: {
        numResources: '248',
      },
      participant: {
        numParticipants: '765',
      },
      ipdCourses: {
        percentReports: '88.88%',
      },
    };

    renderResourcesDashboardOverview({ data });
    expect(await screen.findByText(/^[ \t]*reports with resources\r?\n?[ \t]*8,135 of 19,914/i)).toBeVisible();
    expect(await screen.findByText(/^[ \t]*eclkc resources\n?[ \t]*1,819 of 2,365/i)).toBeVisible();
    expect(await screen.findByText(/248/i)).toBeVisible();
    expect(await screen.findByText(/recipients reached/i)).toBeVisible();
    expect(await screen.findByText(/765/i)).toBeVisible();
    expect(await screen.findByText(/participants reached/i)).toBeVisible();
    expect(await screen.findByText(/88.88%/i)).toBeVisible();
    expect(await screen.findByText(/reports citing ipd courses/i)).toBeVisible();
  });
});
