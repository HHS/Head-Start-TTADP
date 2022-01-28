import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, act,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
// import userEvent from '@testing-library/user-event';
// import selectEvent from 'react-select-event';
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
    const goalsUrl = `/api/recipient/goals/401?sortBy=updatedAt&sortDir=desc&offset=0&limit=5&createDate.win=${yearToDate}`;
    fetchMock.get(goalsUrl, { count: 1, goalRows: goals });
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
});
