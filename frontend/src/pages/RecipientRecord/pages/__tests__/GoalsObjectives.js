import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, act,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import userEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';
import GoalsObjectives from '../GoalsObjectives';
import { formatDateRange } from '../../../../utils';

const memoryHistory = createMemoryHistory();
const yearToDate = encodeURIComponent(formatDateRange({ yearToDate: true, forDateTime: true }));

describe('Goals and Objectives', () => {
  const goals = [{
    id: 4598,
    goalStatus: 'In Progress',
    createdOn: '06/15/2021',
    goalText: 'This is goal text 1.',
    goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
    objectiveCount: 5,
    goalNumber: 'R14-G-4598',
    reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
    objectives: [],
  },
  ];

  const noFilterGoals = [{
    id: 4598,
    goalStatus: 'In Progress',
    createdOn: '06/15/2021',
    goalText: 'This is goal text 1.',
    goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
    objectiveCount: 5,
    goalNumber: 'R14-G-4598',
    reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
    objectives: [],
  },
  {
    id: 4599,
    goalStatus: 'Not Started',
    createdOn: '07/15/2021',
    goalText: 'This is goal text 2.',
    goalTopics: ['Program Planning and Services'],
    objectiveCount: 1,
    goalNumber: 'R14-G-4599',
    reasons: ['Monitoring | Deficiency'],
    objectives: [],
  },
  ];

  const filterStatusGoals = [
    {
      id: 4599,
      goalStatus: 'Not Started',
      createdOn: '07/15/2021',
      goalText: 'This is goal text 2.',
      goalTopics: ['Program Planning and Services'],
      objectiveCount: 1,
      goalNumber: 'R14-G-4599',
      reasons: ['Monitoring | Deficiency'],
      objectives: [],
    },
  ];

  const renderGoalsAndObjectives = () => {
    render(
      <Router history={memoryHistory}>
        <GoalsObjectives recipientId="401" />
      </Router>,
    );
  };

  beforeEach(async () => {
    fetchMock.reset();
    // Default.
    const goalsUrl = `/api/recipient/goals/401?sortBy=goalStatus&sortDir=asc&offset=0&limit=5&createDate.win=${yearToDate}`;
    fetchMock.get(goalsUrl, { count: 1, goalRows: goals });

    // Filters Status.
    const filterStatusUrl = '/api/recipient/goals/401?sortBy=goalStatus&sortDir=asc&offset=0&limit=5&status.in[]=Not%20Started';
    fetchMock.get(filterStatusUrl, { count: 1, goalRows: filterStatusGoals });

    // No Filters.
    const noFilterUrl = '/api/recipient/goals/401?sortBy=goalStatus&sortDir=asc&offset=0&limit=5';
    fetchMock.get(noFilterUrl, { count: 2, goalRows: noFilterGoals });
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('renders the Goals and Objectives page appropriately', async () => {
    act(() => renderGoalsAndObjectives());
    expect(await screen.findByText('TTA goals and objectives')).toBeVisible();
    expect(screen.getAllByRole('cell')[0].firstChild).toHaveClass('fa-clock');
    expect(screen.getAllByRole('cell')[0]).toHaveTextContent(/in progress/i);
    expect(screen.getAllByRole('cell')[1]).toHaveTextContent('06/15/2021');
    expect(screen.getAllByRole('cell')[2]).toHaveTextContent(/this is goal text 1/i);
    expect(screen.getAllByRole('cell')[3]).toHaveTextContent(/human resources, safety practices, program planning and services/i);
    expect(screen.getAllByRole('cell')[4]).toHaveTextContent('5 Objective(s)');
  });

  it('renders correctly when filter is changed', async () => {
    // Default with 2 Rows.
    const goalsUrl = `/api/recipient/goals/401?sortBy=goalStatus&sortDir=asc&offset=0&limit=5&createDate.win=${yearToDate}`;
    fetchMock.get(goalsUrl, { count: 2, goalRows: noFilterGoals }, { overwriteRoutes: true });

    act(() => renderGoalsAndObjectives());

    expect(await screen.findByText(/1-2 of 2/i)).toBeVisible();
    expect(screen.getAllByRole('cell')[0]).toHaveTextContent(/in progress/i);
    expect(screen.getAllByRole('cell')[7]).toHaveTextContent(/not started/i);

    // Change Filter and Apply.
    userEvent.click(await screen.findByRole('button', { name: /open filters for this page/i }));

    userEvent.selectOptions(await screen.findByRole('combobox', { name: 'topic' }), 'status');
    userEvent.selectOptions(await screen.findByRole('combobox', { name: 'condition' }), 'Is');

    const statusSelect = await screen.findByLabelText(/select status to filter by/i);
    await selectEvent.select(statusSelect, ['Not Started']);

    const apply = await screen.findByRole('button', { name: /apply filters to goals/i });
    userEvent.click(apply);

    // Expect 1 Row.
    expect(await screen.findByText(/1-1 of 1/i)).toBeVisible();
    expect(screen.getAllByRole('cell')[0]).toHaveTextContent(/not started/i);
  });

  it('renders correctly when filter is removed', async () => {
    act(() => renderGoalsAndObjectives());
    expect(await screen.findByText(/1-1 of 1/i)).toBeVisible();
    const removeFilter = await screen.findByRole('button', { name: /this button removes the filter/i });
    userEvent.click(removeFilter);

    expect(await screen.findByText(/1-2 of 2/i)).toBeVisible();
    expect(screen.getAllByRole('cell')[0]).toHaveTextContent(/in progress/i);
    expect(screen.getAllByRole('cell')[1]).toHaveTextContent('06/15/2021');
    expect(screen.getAllByRole('cell')[2]).toHaveTextContent(/this is goal text 1/i);
    expect(screen.getAllByRole('cell')[3]).toHaveTextContent(/human resources, safety practices, program planning and services/i);
    expect(screen.getAllByRole('cell')[4]).toHaveTextContent('5 Objective(s)');

    expect(screen.getAllByRole('cell')[7]).toHaveTextContent(/not started/i);
    expect(screen.getAllByRole('cell')[8]).toHaveTextContent('07/15/2021');
    expect(screen.getAllByRole('cell')[9]).toHaveTextContent(/this is goal text 2/i);
    expect(screen.getAllByRole('cell')[10]).toHaveTextContent(/program planning and services/i);
    expect(screen.getAllByRole('cell')[11]).toHaveTextContent('1 Objective(s)');
  });
});
