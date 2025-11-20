import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import { SCOPE_IDS, GOAL_STATUS } from '@ttahub/common';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import userEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';
import GoalsObjectives from '../GoalsObjectives';
import { formatDateRange } from '../../../../utils';
import UserContext from '../../../../UserContext';
import FilterContext from '../../../../FilterContext';
import { mockWindowProperty } from '../../../../testHelpers';
import AppLoadingContext from '../../../../AppLoadingContext';

const memoryHistory = createMemoryHistory();
const yearToDate = encodeURIComponent(formatDateRange({ yearToDate: true, forDateTime: true }));

const defaultStatuses = {
  total: 0,
  [GOAL_STATUS.NOT_STARTED]: 0,
  [GOAL_STATUS.IN_PROGRESS]: 0,
  [GOAL_STATUS.CLOSED]: 0,
  [GOAL_STATUS.SUSPENDED]: 0,
};

describe('Goals and Objectives', () => {
  const goals = [{
    id: 4598,
    status: GOAL_STATUS.IN_PROGRESS,
    createdAt: '2021-06-15',
    name: 'This is goal text 1.',
    goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
    objectiveCount: 5,
    goalNumbers: ['G-4598'],
    reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
    objectives: [],
    goalCollaborators: [],
    ids: [4598],
    onAR: false,
    grant: { number: '12345' },
    previousStatus: null,
  },
  ];

  const noFilterGoals = [{
    id: 4599,
    status: GOAL_STATUS.IN_PROGRESS,
    createdAt: '2021-06-15',
    name: 'This is goal text 1.',
    goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
    objectiveCount: 5,
    goalNumbers: ['G-4599'],
    reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
    objectives: [],
    goalCollaborators: [],
    ids: [4599],
    onAR: false,
    grant: { number: '12345' },
    previousStatus: null,
  },
  {
    id: 4600,
    ids: [4600],
    status: GOAL_STATUS.NOT_STARTED,
    createdAt: '2021-07-15',
    name: 'This is goal text 2.',
    goalTopics: ['Program Planning and Services'],
    objectiveCount: 1,
    goalNumbers: ['G-4600'],
    reasons: ['Monitoring | Deficiency'],
    objectives: [],
    goalCollaborators: [],
    onAR: false,
    grant: { number: '12346' },
    previousStatus: null,
  },
  ];

  const filterStatusGoals = [
    {
      id: 4601,
      ids: [4601],
      status: GOAL_STATUS.NOT_STARTED,
      createdAt: '2021-07-15',
      name: 'This is goal text 2.',
      goalTopics: ['Program Planning and Services'],
      objectiveCount: 1,
      goalNumbers: ['G-4601'],
      reasons: ['Monitoring | Deficiency'],
      objectives: [],
      goalCollaborators: [],
      onAR: false,
      grant: { number: '12347' },
      previousStatus: null,
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
    const userForContext = {
      ...user,
    };

    render(
      <Router history={memoryHistory}>
        <AppLoadingContext.Provider value={{ setIsAppLoading: () => {}, isAppLoading: false }}>
          <UserContext.Provider value={{ user: userForContext }}>
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
        </AppLoadingContext.Provider>
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
    fetchMock.get(goalsUrl, {
      count: 1,
      goalRows: goals,
      statuses: defaultStatuses,
      allGoalIds: [
        { id: goals[0].id, goalIds: goals[0].ids },
      ],
    });

    // Filters Status.
    const filterStatusUrl = '/api/recipient/401/region/1/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=10&status.in[]=Not%20Started';
    fetchMock.get(filterStatusUrl, {
      count: 1,
      goalRows: filterStatusGoals,
      statuses: defaultStatuses,
      allGoalIds: [
        { id: filterStatusGoals[0].id, goalIds: filterStatusGoals[0].ids },
      ],
    });

    // No Filters.
    const noFilterUrl = '/api/recipient/401/region/1/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=10';
    fetchMock.get(noFilterUrl, {
      count: 2,
      goalRows: noFilterGoals,
      statuses: defaultStatuses,
      allGoalIds: [
        { id: noFilterGoals[0].id, goalIds: noFilterGoals[0].ids },
        { id: noFilterGoals[1].id, goalIds: noFilterGoals[1].ids },
      ],
    });

    fetchMock.get(
      '/api/communication-logs/region/1/recipient/401?sortBy=communicationDate&direction=desc&offset=0&limit=5&format=json&purpose.in[]=RTTAPA%20updates&purpose.in[]=RTTAPA%20Initial%20Plan%20%2F%20New%20Recipient',
      { rows: [], count: 0 },
    );
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('renders the Goals and Objectives page appropriately', async () => {
    act(() => renderGoalsAndObjectives());
    expect(await screen.findByText('TTA goals and objectives')).toBeVisible();
  });

  it('renders correctly when filter is changed', async () => {
    // Default with 2 Rows.
    const goalsUrl = `/api/recipient/401/region/1/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=5&createDate.win=${yearToDate}`;
    fetchMock.get(goalsUrl,
      {
        count: 2,
        goalRows: noFilterGoals,
        statuses: defaultStatuses,
        allGoalIds: [],
      }, { overwriteRoutes: true });
    act(() => renderGoalsAndObjectives());

    // Change Filter and Apply.
    userEvent.click(await screen.findByRole('button', { name: /open filters for this page/i }));

    userEvent.selectOptions(await screen.findByRole('combobox', { name: 'topic' }), 'status');
    userEvent.selectOptions(await screen.findByRole('combobox', { name: 'condition' }), 'is');

    const statusSelect = await screen.findByLabelText(/select status to filter by/i);
    await selectEvent.select(statusSelect, [GOAL_STATUS.NOT_STARTED]);

    const apply = await screen.findByRole('button', { name: /apply filters to goals/i });
    userEvent.click(apply);

    // Expect 1 Row.
    expect(await screen.findByText(/1-1 of 1/i)).toBeVisible();
    const notStartedStatuses = await screen.findAllByText(/not started/i);
    expect(notStartedStatuses.length).toBe(6);
  });

  it('resets the page number when filters change', async () => {
    // CLear all mocks.
    fetchMock.restore();

    // Default with 2 Rows.
    let goalsUrl = '/api/recipient/401/region/1/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=10&status.in[]=Not%20Started';
    fetchMock.get(goalsUrl,
      {
        count: 11,
        allGoalIds: [
          { id: 1 },
          { id: 2 },
          { id: 3 },
          { id: 4 },
          { id: 5 },
          { id: 6 },
          { id: 7 },
          { id: 8 },
          { id: 9 },
          { id: 10 },
          { id: 11 }],
        goalRows: [
          { ...noFilterGoals[0], id: 1 },
          { ...noFilterGoals[0], id: 2 },
          { ...noFilterGoals[0], id: 3 },
          { ...noFilterGoals[0], id: 4 },
          { ...noFilterGoals[0], id: 5 },
          { ...noFilterGoals[0], id: 6 },
          { ...noFilterGoals[0], id: 7 },
          { ...noFilterGoals[0], id: 8 },
          { ...noFilterGoals[0], id: 9 },
          { ...noFilterGoals[0], id: 10 },
          { ...noFilterGoals[0], id: 11 },
        ],
        statuses: defaultStatuses,
      },
      { overwriteRoutes: true });

    act(() => renderGoalsAndObjectives());

    // Go to the next page.
    goalsUrl = '/api/recipient/401/region/1/goals?sortBy=goalStatus&sortDir=asc&offset=10&limit=10&status.in[]=Not%20Started';
    fetchMock.get(goalsUrl,
      {
        count: 11,
        allGoalIds: [
          { id: 1 },
          { id: 2 },
          { id: 3 },
          { id: 4 },
          { id: 5 },
          { id: 6 },
          { id: 7 },
          { id: 8 },
          { id: 9 },
          { id: 10 },
          { id: 11 }],
        goalRows: [
          { ...noFilterGoals[0], id: 11 },
        ],
        statuses: defaultStatuses,
      }, { overwriteRoutes: true });

    const [pageTwo] = await screen.findAllByRole('button', { name: /page 2/i });
    userEvent.click(pageTwo);

    // Change Filter and Apply.
    userEvent.click(await screen.findByRole('button', { name: /open filters for this page/i }));

    userEvent.selectOptions(await screen.findByRole('combobox', { name: 'topic' }), 'status');
    userEvent.selectOptions(await screen.findByRole('combobox', { name: 'condition' }), 'is');

    const statusSelect = await screen.findByLabelText(/select status to filter by/i);
    await selectEvent.select(statusSelect, [GOAL_STATUS.CLOSED]);

    goalsUrl = '/api/recipient/401/region/1/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=10&status.in[]=Not%20Started&status.in[]=Closed';
    fetchMock.get(goalsUrl,
      {
        count: 1,
        allGoalIds: [
          { id: 1 },
        ],
        goalRows: [
          { ...noFilterGoals[0], id: 11 },
        ],
        statuses: defaultStatuses,
      }, { overwriteRoutes: true });

    const apply = await screen.findByRole('button', { name: /apply filters to goals/i });
    userEvent.click(apply);

    // Expect the goalsUrl to have been called.
    expect(fetchMock.called(goalsUrl)).toBe(true);
    // by verifying that we called this URl ^ we confirm the correct URL params are passed
    // and do not need to do any additional verification to prove out this test
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
    fetchMock.get(
      '/api/communication-logs/region/1/recipient/401?sortBy=communicationDate&direction=desc&offset=0&limit=5&format=json&purpose.in[]=RTTAPA%20updates&purpose.in[]=RTTAPA%20Initial%20Plan%20%2F%20New%20Recipient',
      { rows: [], count: 0, allGoalIds: [] },
    );

    const response = [{
      id: 4598,
      ids: [4598],
      status: GOAL_STATUS.NOT_STARTED,
      createdAt: '2021-06-15',
      name: 'This is goal text 1.',
      goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
      objectiveCount: 5,
      goalNumbers: ['G-4598'],
      reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
      objectives: [],
      goalCollaborators: [],
      onAR: false,
      grant: { number: '12345' },
      previousStatus: null,
    },
    ];

    const noFilterUrl = '/api/recipient/401/region/1/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=10';
    fetchMock.get(noFilterUrl, {
      count: 2,
      goalRows: response,
      statuses: defaultStatuses,
      allGoalIds: [{ id: 4598, goalIds: [4598] }],
    });

    act(() => renderGoalsAndObjectives());

    const statusMenuToggle = await screen.findByRole('button', { name: 'Change status for goal 4598' });
    fetchMock.restore();
    expect(fetchMock.called()).toBe(false);
    fetchMock.put('/api/goals/changeStatus', [response[0]]);

    act(() => userEvent.click(statusMenuToggle));
    act(() => userEvent.click(screen.getByRole('button', { name: /Closed/i })));
    act(() => userEvent.click(screen.getByRole('radio', { name: /tta/i })));

    const submit = await screen.findByRole('button', { name: /change goal status/i });

    act(() => userEvent.click(submit));

    await waitFor(() => expect(fetchMock.called()).toBeTruthy());
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
        { ...goals[0], id: 1 },
        { ...goals[0], id: 2 },
        { ...goals[0], id: 3 },
      ],
      statuses: defaultStatuses,
      allGoalIds: [{
        id: 1,
        goalIds: [1],
      },
      {
        id: 2,
        goalIds: [2],
      },
      {
        id: 3,
        goalIds: [3],
      },
      ],
    });
    act(() => renderGoalsAndObjectives([1]));
    // If api request contains 3 we know it included the desired sort.
    expect(await screen.findByText(/1-3 of 3/i)).toBeVisible();
  });

  it('handles a fetch error', async () => {
    fetchMock.restore();
    // Created New Goal.

    fetchMock.get(
      '/api/communication-logs/region/1/recipient/401?sortBy=communicationDate&direction=desc&offset=0&limit=5&format=json&purpose.in[]=RTTAPA%20updates&purpose.in[]=RTTAPA%20Initial%20Plan%20%2F%20New%20Recipient',
      { rows: [], count: 0 },
    );
    const newGoalsUrl = '/api/recipient/401/region/1/goals?sortBy=createdOn&sortDir=desc&offset=0&limit=10';
    fetchMock.get(newGoalsUrl, 500);
    act(() => renderGoalsAndObjectives([1]));

    expect(await screen.findByText(/Unable to fetch goals/i)).toBeVisible();
  });
  /// 2

  it('adjusts items per page', async () => {
    fetchMock.restore();

    fetchMock.get(
      '/api/communication-logs/region/1/recipient/401?sortBy=communicationDate&direction=desc&offset=0&limit=5&format=json&purpose.in[]=RTTAPA%20updates&purpose.in[]=RTTAPA%20Initial%20Plan%20%2F%20New%20Recipient',
      { rows: [], count: 0, allGoalIds: [] },
    );
    const goalToUse = {
      id: 1,
      ids: [1, 2],
      status: GOAL_STATUS.NOT_STARTED,
      createdAt: '2021-06-15',
      name: '',
      goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
      objectiveCount: 5,
      goalNumbers: ['G-4598'],
      reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
      objectives: [],
      goalCollaborators: [],
      onAR: false,
      grant: { number: '12345' },
      previousStatus: null,
    };
    const goalCount = 60;
    const goalsToDisplay = [];
    const allGoalIds = [];
    // eslint-disable-next-line no-plusplus
    for (let i = 1; i <= goalCount; i++) {
      const goalText = `This is goal text ${i}.`;
      goalsToDisplay.push({ ...goalToUse, id: i, goalText });
      allGoalIds.push({ id: i, goalIds: [i] });
    }
    const noFilterUrl = '/api/recipient/401/region/1/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=10';
    fetchMock.get(noFilterUrl,
      {
        count: goalCount,
        goalRows: goalsToDisplay.slice(0, 10),
        statuses: defaultStatuses,
        allGoalIds,
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
        allGoalIds,
      });
    const perPageDropDown = await screen.findByRole('combobox', { name: /per page/i });
    userEvent.selectOptions(perPageDropDown, '25');

    // Assert per page change.
    expect(await screen.findByText(/1-25 of 60/i)).toBeVisible();
    goalsPerPage = screen.queryAllByTestId('goalCard');
    expect(goalsPerPage.length).toBe(25);
  });

  it('respects select all on a per page basis', async () => {
    const goalUrl = '/api/recipient/401/region/1/goals?sortBy=createdOn&sortDir=desc&offset=0&limit=10';
    fetchMock.get(goalUrl, {
      count: 12,
      goalRows: [
        { ...goals[0], id: 1 },
        { ...goals[0], id: 2 },
        { ...goals[0], id: 3 },
        { ...goals[0], id: 4 },
        { ...goals[0], id: 5 },
        { ...goals[0], id: 6 },
        { ...goals[0], id: 7 },
        { ...goals[0], id: 8 },
        { ...goals[0], id: 9 },
        { ...goals[0], id: 10 },
      ],
      statuses: defaultStatuses,
      allGoalIds: [{
        id: 1,
        goalIds: [1],
      },
      {
        id: 2,
        goalIds: [2],
      },
      {
        id: 3,
        goalIds: [3],
      },
      {
        id: 4,
        goalIds: [4],
      },
      {
        id: 5,
        goalIds: [5],
      },
      {
        id: 6,
        goalIds: [6],
      },
      {
        id: 7,
        goalIds: [7],
      },
      {
        id: 8,
        goalIds: [8],
      },
      {
        id: 9,
        goalIds: [9],
      },
      {
        id: 10,
        goalIds: [10],
      },
      ],
    });
    act(() => renderGoalsAndObjectives([1]));
    expect(await screen.findByText(/1-10 of 12/i)).toBeVisible();

    // Select All.
    const selectAll = await screen.findByRole('checkbox', { name: /select all goals/i });
    userEvent.click(selectAll);

    // Assert all are selected.
    const checkboxes = screen.queryAllByRole('checkbox', { name: /select goal/i });
    expect(checkboxes.length).toBe(10);
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeChecked();
    });

    // Shows 10 selected.
    expect(await screen.findByText(/10 selected/i)).toBeVisible();

    // Change per page.
    const goalUrlMore = '/api/recipient/401/region/1/goals?sortBy=createdOn&sortDir=desc&offset=10&limit=10';
    fetchMock.get(goalUrlMore, {
      count: 12,
      goalRows: [
        { ...goals[0], id: 11 },
        { ...goals[0], id: 12 },
      ],
      statuses: defaultStatuses,
      allGoalIds: [{
        id: 11,
        goalIds: [11],
      },
      {
        id: 12,
        goalIds: [12],
      },
      ],
    });

    // Click page 2.
    const [pageTwo] = await screen.findAllByRole('button', { name: /page 2/i });
    userEvent.click(pageTwo);

    // Shows 10 selected.
    expect(await screen.findByText(/10 selected/i)).toBeVisible();

    // Assert all selected is NOT checked.
    const selectAllNext = await screen.findByRole('checkbox', { name: /select all goals/i });
    expect(selectAllNext).not.toBeChecked();

    // Get all the checkboxes.
    const checkboxesNext = screen.queryAllByRole('checkbox', { name: /select goal/i });
    expect(checkboxesNext.length).toBe(2);

    // Check the second one.
    userEvent.click(checkboxesNext[1]);

    // Shows 11 selected.
    expect(await screen.findByText(/11 selected/i)).toBeVisible();

    // Select All.
    userEvent.click(selectAllNext);

    // Assert all are selected.
    const checkboxesNextAll = screen.queryAllByRole('checkbox', { name: /select goal/i });
    expect(checkboxesNextAll.length).toBe(2);
    checkboxesNextAll.forEach((checkbox) => {
      expect(checkbox).toBeChecked();
    });

    // Shows 12 selected.
    expect(await screen.findByText(/12 selected/i)).toBeVisible();

    // Uncheck the second checkbox.
    userEvent.click(checkboxesNext[1]);

    // Assert the select all check box is not checked.
    expect(selectAllNext).not.toBeChecked();
    // Shows 11 selected.
    expect(await screen.findByText(/11 selected/i)).toBeVisible();
  });
});
