import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, act, waitFor,
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

const defaultStatuses = {
  total: 0,
  'Not started': 0,
  'In progress': 0,
  Closed: 0,
  Suspended: 0,
};

describe('Goals and Objectives', () => {
  const goals = [{
    id: 4598,
    goalStatus: 'In Progress',
    createdOn: '2021-06-15',
    goalText: 'This is goal text 1.',
    goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
    objectiveCount: 5,
    goalNumbers: ['G-4598'],
    reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
    objectives: [],
  },
  ];

  const noFilterGoals = [{
    id: 4599,
    goalStatus: 'In Progress',
    createdOn: '2021-06-15',
    goalText: 'This is goal text 1.',
    goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
    objectiveCount: 5,
    goalNumbers: ['G-4599'],
    reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
    objectives: [],
  },
  {
    id: 4600,
    goalStatus: 'Not Started',
    createdOn: '2021-07-15',
    goalText: 'This is goal text 2.',
    goalTopics: ['Program Planning and Services'],
    objectiveCount: 1,
    goalNumbers: ['G-4600'],
    reasons: ['Monitoring | Deficiency'],
    objectives: [],
  },
  ];

  const filterStatusGoals = [
    {
      id: 4601,
      goalStatus: 'Not Started',
      createdOn: '2021-07-15',
      goalText: 'This is goal text 2.',
      goalTopics: ['Program Planning and Services'],
      objectiveCount: 1,
      goalNumbers: ['G-4601'],
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
              recipientName="test"
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
    const goalsUrl = `/api/recipient/401/region/1/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=10&createDate.win=${yearToDate}`;
    fetchMock.get(goalsUrl, { count: 1, goalRows: goals, statuses: defaultStatuses });

    // Filters Status.
    const filterStatusUrl = '/api/recipient/401/region/1/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=10&status.in[]=Not%20started';
    fetchMock.get(filterStatusUrl, {
      count: 1, goalRows: filterStatusGoals, statuses: defaultStatuses,
    });

    // No Filters.
    const noFilterUrl = '/api/recipient/401/region/1/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=10';
    fetchMock.get(noFilterUrl, { count: 2, goalRows: noFilterGoals, statuses: defaultStatuses });
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('renders the Goals and Objectives title appropriately', async () => {
    act(() => renderGoalsAndObjectives());
    expect(document.title).toEqual('Goals and Objectives - test - TTA Hub');
  });

  it('renders the Goals and Objectives page appropriately', async () => {
    act(() => renderGoalsAndObjectives());
    expect(await screen.findByText('TTA goals and objectives')).toBeVisible();
  });

  it('renders correctly when filter is changed', async () => {
    // Default with 2 Rows.
    const goalsUrl = `/api/recipient/401/region/1/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=5&createDate.win=${yearToDate}`;
    fetchMock.get(goalsUrl,
      { count: 2, goalRows: noFilterGoals, statuses: defaultStatuses }, { overwriteRoutes: true });

    act(() => renderGoalsAndObjectives());

    expect(await screen.findByText(/1-2 of 2/i)).toBeVisible();

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
    const notStartedStatuses = await screen.findAllByText(/not started/i);
    expect(notStartedStatuses.length).toBe(5);
  });

  it('renders correctly when filter is removed', async () => {
    act(() => renderGoalsAndObjectives());
    const removeFilter = await screen.findByRole('button', { name: /this button removes the filter/i });
    userEvent.click(removeFilter);

    await screen.findByText(/this is goal text 1/i);
    await screen.findByText(/this is goal text 2/i);

    expect(await screen.findByText(/1-2 of 2/i)).toBeVisible();
  });

  it('will update goals status', async () => {
    fetchMock.restore();

    const response = [{
      id: 4598,
      goalStatus: 'Not Started',
      createdOn: '2021-06-15',
      goalText: 'This is goal text 1.',
      goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
      objectiveCount: 5,
      goalNumbers: ['G-4598'],
      reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
      objectives: [],
    },
    ];

    const noFilterUrl = '/api/recipient/401/region/1/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=10';
    fetchMock.get(noFilterUrl, { count: 2, goalRows: response, statuses: defaultStatuses });

    act(() => renderGoalsAndObjectives());

    const statusMenuToggle = await screen.findByRole('button', { name: 'Change status for goal 4598' });
    fetchMock.restore();
    expect(fetchMock.called()).toBe(false);
    fetchMock.put('/api/goals/changeStatus', [response[0]]);
    userEvent.click(statusMenuToggle);
    userEvent.click(await screen.findByRole('button', { name: /In Progress/i }));
    expect(fetchMock.called()).toBeTruthy();
  });

  it('will sort by the dropdown', async () => {
    act(() => renderGoalsAndObjectives());

    fetchMock.restore();
    fetchMock.get('/api/recipient/401/region/1/goals?sortBy=createdOn&sortDir=asc&offset=0&limit=10', { count: 1, goalRows: goals, statuses: defaultStatuses });
    const sortCreated = await screen.findByTestId('sortGoalsBy');
    userEvent.selectOptions(sortCreated, 'createdOn-asc');

    await waitFor(() => expect(fetchMock.called()).toBeTruthy());
  });

  it('sorts by created on desc when new goals are created', async () => {
    // Created New Goal.
    const newGoalsUrl = '/api/recipient/401/region/1/goals?sortBy=createdOn&sortDir=desc&offset=0&limit=10';
    fetchMock.get(newGoalsUrl, {
      count: 3,
      goalRows: [
        { id: 1, ...goals[0] },
        { id: 2, ...goals[0] },
        { id: 3, ...goals[0] },
      ],
      statuses: defaultStatuses,
    });
    act(() => renderGoalsAndObjectives([1]));
    // If api request contains 3 we know it included the desired sort.
    expect(await screen.findByText(/1-3 of 3/i)).toBeVisible();
  });

  it('handles a fetch error', async () => {
    fetchMock.restore();
    // Created New Goal.
    const newGoalsUrl = '/api/recipient/401/region/1/goals?sortBy=createdOn&sortDir=desc&offset=0&limit=10';
    fetchMock.get(newGoalsUrl, 500);
    act(() => renderGoalsAndObjectives([1]));

    expect(await screen.findByText(/Unable to fetch goals/i)).toBeVisible();
  });

  it('adjusts items per page', async () => {
    fetchMock.restore();

    const goalToUse = {
      id: 0,
      goalStatus: 'Not Started',
      createdOn: '2021-06-15',
      goalText: '',
      goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
      objectiveCount: 5,
      goalNumbers: ['G-4598'],
      reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
      objectives: [],
    };
    const goalCount = 60;
    const goalsToDisplay = [];
    // eslint-disable-next-line no-plusplus
    for (let i = 1; i <= goalCount; i++) {
      const goalText = `This is goal text ${i}.`;
      goalsToDisplay.push({ ...goalToUse, id: i, goalText });
    }
    const noFilterUrl = '/api/recipient/401/region/1/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=10';
    fetchMock.get(noFilterUrl,
      {
        count: goalCount,
        goalRows: goalsToDisplay.slice(0, 10),
        statuses: defaultStatuses,
      });

    // Render.
    act(() => renderGoalsAndObjectives());

    // Assert initial.
    expect(await screen.findByText(/1-10 of 60/i)).toBeVisible();
    let goalsPerPage = screen.queryAllByTestId('goalCard');
    expect(goalsPerPage.length).toBe(10);

    // Change per page.
    const noFilterUrlMore = '/api/recipient/401/region/1/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=25';
    fetchMock.get(noFilterUrlMore,
      {
        count: goalCount,
        goalRows: goalsToDisplay.slice(0, 25),
        statuses: defaultStatuses,
      });
    const perPageDropDown = await screen.findByRole('combobox', { name: /select goals per page/i });
    userEvent.selectOptions(perPageDropDown, '25');

    // Assert per page change.
    expect(await screen.findByText(/1-25 of 60/i)).toBeVisible();
    goalsPerPage = screen.queryAllByTestId('goalCard');
    expect(goalsPerPage.length).toBe(25);
  });
});
