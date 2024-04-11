import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import { ObjectiveSwitch } from '../GoalCard';

describe('ObjectiveSwitch', () => {
  const history = createMemoryHistory();

  it('renders goal objectives', async () => {
    const objective = {
      id: 123,
      title: 'This is an objective',
      endDate: '2020-01-01',
      reasons: ['reason1', 'reason2'],
      status: 'In Progress',
      grantNumbers: ['grant1', 'grant2'],
      topics: [],
      activityReports: [
        {
          displayId: 'r-123',
          legacyId: '123',
          number: '678',
          id: 678,
          endDate: '2020-01-01',
        },
      ],
    };
    render(
      <Router history={history}>
        <ObjectiveSwitch objective={objective} objectivesExpanded />
      </Router>,
    );
    expect(screen.getByText('This is an objective')).toBeInTheDocument();
    expect(screen.getByText('2020-01-01')).toBeInTheDocument();
    expect(screen.getByText('reason1')).toBeInTheDocument();
    expect(screen.getByText('reason2')).toBeInTheDocument();
    const link = screen.getByText('r-123');
    expect(link).toHaveAttribute('href', '/activity-reports/legacy/123');
  });

  it('renders session objectives', async () => {
    const objective = {
      title: 'We will get together and learn stuff',
      trainingReportId: 'R-01-23-1234',
      grantNumbers: ['grant1', 'grant2'],
      endDate: '2020-01-01',
      topics: ['TEST TOPIC', 'TEST TOPIC 2'],
      sessionName: 'Brand new session: learning stuff',
      type: 'session',
    };
    render(
      <Router history={history}>
        <ObjectiveSwitch objective={objective} objectivesExpanded />
      </Router>,
    );
    expect(screen.getByText(/we will get together and learn stuff/i)).toBeInTheDocument();
    expect(screen.getByText(/brand new session: learning stuff/i)).toBeInTheDocument();
    expect(screen.getByText(/test topic/i)).toBeInTheDocument();
    expect(screen.getByText(/test topic 2/i)).toBeInTheDocument();
    expect(screen.getByText('2020-01-01')).toBeInTheDocument();
    const link = screen.getByText('R-01-23-1234');
    expect(link).toHaveAttribute('href', '/training-report/view/1234');
  });
});
