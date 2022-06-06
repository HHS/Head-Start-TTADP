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
import UserContext from '../../../../UserContext';
import { SCOPE_IDS } from '../../../../Constants';
import FilterContext from '../../../../FilterContext';
import { mockWindowProperty } from '../../../../testHelpers';

const memoryHistory = createMemoryHistory();
const yearToDate = encodeURIComponent(formatDateRange({ yearToDate: true, forDateTime: true }));

describe('Goals and Objectives', () => {
  const goals = [{
    id: 4598,
    goalStatus: 'In Progress',
    createdOn: '2021-06-15',
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
    createdOn: '2021-06-15',
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
    createdOn: '2021-07-15',
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
      createdOn: '2021-07-15',
      goalText: 'This is goal text 2.',
      goalTopics: ['Program Planning and Services'],
      objectiveCount: 1,
      goalNumber: 'R14-G-4599',
      reasons: ['Monitoring | Deficiency'],
      objectives: [],
    },
  ];

  const recipient = {
    goals: [
      {
        id: 1,
        number: 'number',
      },
    ],
    grants: [],
  };

  const user = {
    name: 'test@test.com',
    homeRegionId: 1,
    permissions: [
      {
        scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
        regionId: 1,
      },
    ],
  };

  const renderGoalsAndObjectives = (ids = []) => {
    render(
      <Router history={memoryHistory}>
        <UserContext.Provider value={{ user }}>
          <FilterContext.Provider value={{ filterKey: 'test' }}>
            <GoalsObjectives
              recipientId="401"
              regionId="1"
              recipient={recipient}
              location={{
                state: { ids }, hash: '', pathname: '', search: '',
              }}
            />
          </FilterContext.Provider>
        </UserContext.Provider>
      </Router>,
    );
  };

  mockWindowProperty('sessionStorage', {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  });

  beforeEach(async () => {
    fetchMock.reset();
    // Default.
    const goalsUrl = `/api/recipient/401/region/1/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=5&createDate.win=${yearToDate}`;
    fetchMock.get(goalsUrl, { count: 1, goalRows: goals });

    // Filters Status.
    const filterStatusUrl = '/api/recipient/401/region/1/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=5&status.in[]=Not%20started';
    fetchMock.get(filterStatusUrl, { count: 1, goalRows: filterStatusGoals });

    // No Filters.
    const noFilterUrl = '/api/recipient/401/region/1/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=5';
    fetchMock.get(noFilterUrl, { count: 2, goalRows: noFilterGoals });

    const statusRes = {
      total: 0, 'Not started': 0, 'In progress': 0, Closed: 0, Suspended: 0,
    };

    const goalStatusGraph = `/api/widgets/goalStatusGraph?createDate.win=${yearToDate}&region.in[]=1&recipientId.ctn[]=401`;
    fetchMock.get(goalStatusGraph, statusRes);

    const goalStatusGraphWStatus = '/api/widgets/goalStatusGraph?status.in[]=Not%20started&region.in[]=1&recipientId.ctn[]=401';
    fetchMock.get(goalStatusGraphWStatus, statusRes);

    const goalStatusGraphUnfiltered = '/api/widgets/goalStatusGraph?region.in[]=1&recipientId.ctn[]=401';
    fetchMock.get(goalStatusGraphUnfiltered, statusRes);
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('renders the Goals and Objectives page appropriately', async () => {
    act(() => renderGoalsAndObjectives());
    expect(await screen.findByText('TTA goals and objectives')).toBeVisible();
    expect(screen.getAllByRole('cell')[0].querySelector('.fa-clock')).toBeTruthy();
    expect(screen.getAllByRole('cell')[0]).toHaveTextContent(/in progress/i);
    expect(screen.getAllByRole('cell')[1]).toHaveTextContent('06/15/2021');
    expect(screen.getAllByRole('cell')[2]).toHaveTextContent(/this is goal text 1/i);
    expect(screen.getAllByRole('cell')[3]).toHaveTextContent(/Human ResourcesSafety PracticesProgram Planning and Ser/i);
    expect(screen.getAllByRole('cell')[4]).toHaveTextContent('5 Objectives');
  });

  it('renders correctly when filter is changed', async () => {
    // Default with 2 Rows.
    const goalsUrl = `/api/recipient/401/region/1/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=5&createDate.win=${yearToDate}`;
    fetchMock.get(goalsUrl, { count: 2, goalRows: noFilterGoals }, { overwriteRoutes: true });

    act(() => renderGoalsAndObjectives());

    expect(await screen.findByText(/1-2 of 2/i)).toBeVisible();
    expect(screen.getAllByRole('cell')[0]).toHaveTextContent(/in progress/i);

    // Change Filter and Apply.
    userEvent.click(await screen.findByRole('button', { name: /open filters for this page/i }));

    userEvent.selectOptions(await screen.findByRole('combobox', { name: 'topic' }), 'status');
    userEvent.selectOptions(await screen.findByRole('combobox', { name: 'condition' }), 'is');

    const statusSelect = await screen.findByLabelText(/select status to filter by/i);
    await selectEvent.select(statusSelect, ['Not started']);

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

    await screen.findByRole('cell', { name: /in progress/i });
    await screen.findByRole('cell', { name: '06/15/2021' });
    await screen.findByRole('cell', { name: /this is goal text 1/i });
    await screen.findByRole('cell', { name: /Human Resources/i });
    await screen.findByRole('cell', { name: '5 Objectives' });

    await screen.findByRole('cell', { name: /not started/i });
    await screen.findByRole('cell', { name: '07/15/2021' });
    await screen.findByRole('cell', { name: /this is goal text 2/i });
    await screen.findByRole('cell', { name: '1 Objective' });

    expect(await screen.findByText(/1-2 of 2/i)).toBeVisible();
  });

  it('sorts by created on desc when new goals are created', async () => {
    // Created New Goal.
    const newGoalsUrl = '/api/recipient/401/region/1/goals?sortBy=createdOn&sortDir=desc&offset=0&limit=5';
    fetchMock.get(newGoalsUrl, {
      count: 3,
      goalRows: [
        { id: 1, ...goals[0] },
        { id: 2, ...goals[0] },
        { id: 3, ...goals[0] },
      ],
    });
    act(() => renderGoalsAndObjectives([1]));
    // If api request contains 3 we know it included the desired sort.
    expect(await screen.findByText(/1-3 of 3/i)).toBeVisible();
  });
});
