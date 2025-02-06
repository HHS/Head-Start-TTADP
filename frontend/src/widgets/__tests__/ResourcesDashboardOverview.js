/* eslint-disable jest/no-disabled-tests */
import '@testing-library/jest-dom';
import React from 'react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
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
    expect(screen.getByText(/headstart.gov resources/i)).toBeInTheDocument();
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
        numHeadStart: '1,819',
        num: '2,365',
        percentHeadStart: '79.91%',
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
    expect(await screen.findByText(/8,135 of 19,914/)).toBeVisible();
    expect(await screen.findByText(/1,819 of 2,365/)).toBeVisible();
    expect(await screen.findByText(/248/)).toBeVisible();
    expect(await screen.findByText(/recipients reached/i)).toBeVisible();
    expect(await screen.findByText(/765/)).toBeVisible();
    expect(await screen.findByText(/participants reached/i)).toBeVisible();
    expect(await screen.findByText(/88.88%/)).toBeVisible();
    expect(await screen.findByText(/reports citing ipd courses/i)).toBeVisible();
  });
});
