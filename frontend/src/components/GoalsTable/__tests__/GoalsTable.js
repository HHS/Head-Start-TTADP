import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, waitFor, fireEvent,
} from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import fetchMock from 'fetch-mock';
import UserContext from '../../../UserContext';
import FilterContext from '../../../FilterContext';
import AriaLiveContext from '../../../AriaLiveContext';
import GoalsTable from '../GoalsTable';
import { SCOPE_IDS } from '../../../Constants';
import { mockWindowProperty } from '../../../testHelpers';

jest.mock('../../../fetchers/helpers');

const oldWindowLocation = window.location;

const mockAnnounce = jest.fn();
const recipientId = '1000';
const regionId = '1';
const baseWithRegionOne = `/api/recipient/${recipientId}/region/1/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=10`;

const defaultUser = {
  name: 'test@test.com',
  homeRegionId: 1,
  permissions: [
    {
      scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
      regionId: 1,
    },
  ],
};

const goals = [{
  id: 4598,
  goalStatus: 'In Progress',
  createdOn: '2021-06-15',
  goalText: 'This is goal text 1.',
  goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
  objectiveCount: 5,
  goalNumbers: ['R14-G-4598'],
  reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
  objectives: [],
},
{
  id: 8547,
  goalStatus: 'Not Started',
  createdOn: '2021-05-15',
  goalText: 'This is goal text 2.',
  goalTopics: ['Nutrition', 'Oral Health'],
  objectiveCount: 2,
  goalNumbers: ['R14-G-8547'],
  reasons: ['Below Competitive Threshold (CLASS)'],
  objectives: [],
},
{
  id: 65478,
  goalStatus: 'Completed',
  createdOn: '2021-04-15',
  goalText: 'This is goal text 3.',
  goalTopics: ['Parent and Family Engagement'],
  objectiveCount: 4,
  goalNumbers: ['R14-G-65478'],
  reasons: ['Monitoring | Area of Concern'],
  objectives: [],
},
{
  id: 65479,
  goalStatus: '', // Needs Status.
  createdOn: '2021-03-15',
  goalText: 'This is goal text 4.',
  goalTopics: ['Partnerships and Community Engagement'],
  objectiveCount: 3,
  goalNumbers: ['R14-G-65479'],
  reasons: ['COVID-19 response'],
  objectives: [],
},
{
  id: 65480,
  goalStatus: 'Draft',
  createdOn: '2021-02-15',
  goalText: 'This is goal text 5.',
  goalTopics: ['Safety Practices'],
  objectiveCount: 1,
  goalNumbers: ['R14-G-65480'],
  reasons: ['New Recipient'],
  objectives: [],
},
{
  id: 65481,
  goalStatus: 'Suspended',
  createdOn: '2021-01-15',
  goalText: 'This is goal text 6.',
  goalTopics: ['Recordkeeping and Reporting'],
  objectiveCount: 8,
  goalNumbers: ['R14-G-65481'],
  reasons: ['School Readiness Goals'],
  objectives: [],
},
];

const goalWithObjectives = [{
  id: 4458,
  goalStatus: 'In Progress',
  createdOn: '2021-06-15',
  goalText: 'This is a goal with objectives',
  goalTopics: ['Human Resources'],
  objectiveCount: 4,
  goalNumbers: ['R14-G-4598'],
  reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
  objectives: [{
    title: 'Objective 1 Title',
    endDate: '06/14/2021',
    reasons: ['Monitoring | Deficiency'],
    status: 'In Progress',
    id: 345345345,
    ttaProvided: '',
    grantNumbers: ['1'],
    activityReports: [{
      id: 1,
      number: 'ar-number-1',
      legacyId: null,
    }],
  },
  {
    title: 'Objective 2 Title',
    endDate: '05/14/2021',
    reasons: ['Below Competitive Threshold (CLASS)'],
    status: 'Not Started',
    id: 234234253,
    ttaProvided: '',
    grantNumbers: ['1'],
    activityReports: [{
      id: 2,
      number: 'ar-number-2',
      legacyId: null,
    }],
  },
  {
    title: 'Objective 3 Title',
    endDate: '04/14/2021',
    reasons: ['COVID-19 response'],
    status: 'Complete',
    id: 2938234,
    ttaProvided: '',
    grantNumbers: ['1'],
    activityReports: [{
      id: 3,
      number: 'ar-number-3',
      legacyId: null,
    }],
  },
  {
    title: 'Objective 4 Title',
    endDate: '03/14/2021',
    reasons: ['New Staff / Turnover'],
    status: 'In Progress',
    id: 255384234,
    ttaProvided: '',
    grantNumbers: ['200342cat'],
    activityReports: [{
      id: 4,
      number: 'ar-number-4',
      legacyId: null,
    }],
  },
  {
    title: 'Objective 5 Title',
    endDate: '02/14/2021',
    reasons: ['Complaint'],
    status: 'Unknown Status',
    id: 298398934834,
    ttaProvided: '',
    grantNumbers: ['1'],
    activityReports: [{
      id: 5,
      number: 'ar-number-5',
      legacyId: null,
    }],
  },
  ],
},
];

const renderTable = (user, hasActiveGrants = true) => {
  render(
    <MemoryRouter>
      <AriaLiveContext.Provider value={{ announce: mockAnnounce }}>
        <UserContext.Provider value={{ user }}>
          <FilterContext.Provider value={{ filterKey: 'goalsTable' }}>
            <GoalsTable
              filters={[]}
              recipientId={recipientId}
              regionId={regionId}
              onUpdateFilters={() => { }}
              hasActiveGrants={hasActiveGrants}
              showNewGoals={false}
            />
          </FilterContext.Provider>
        </UserContext.Provider>
      </AriaLiveContext.Provider>
    </MemoryRouter>,
  );
};

describe('Goals Table', () => {
  mockWindowProperty('sessionStorage', {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  });

  beforeAll(() => {
    delete global.window.location;

    global.window.location = {
      ...oldWindowLocation,
      assign: jest.fn(),
    };
  });
  afterAll(() => {
    window.location = oldWindowLocation;
  });

  describe('Table displays data', () => {
    beforeEach(async () => {
      fetchMock.reset();
      fetchMock.get(
        baseWithRegionOne,
        { count: 6, goalRows: goals },
      );
    });

    afterEach(() => {
      window.location.assign.mockReset();
      fetchMock.restore();
    });

    it('Shows the correct data', async () => {
      renderTable(defaultUser);
      await screen.findByText('TTA goals and objectives');
      expect(await screen.findByText(/1-6 of 6/i)).toBeVisible();

      await screen.findByRole('cell', { name: '06/15/2021' });
      await screen.findByRole('cell', { name: /this is goal text 1/i });
      await screen.findByRole('cell', { name: '5 Objectives' });

      // Not started.
      await screen.findByRole('cell', { name: '05/15/2021' });
      await screen.findByRole('cell', { name: /this is goal text 2/i });

      await screen.findByRole('cell', { name: /nutrition/i });
      await screen.findByRole('cell', { name: '2 Objectives' });

      // Closed.
      await screen.findByRole('cell', { name: '04/15/2021' });
      await screen.findByRole('cell', { name: /this is goal text 3/i });
      await screen.findByRole('cell', { name: /parent and family/i });
      await screen.findByRole('cell', { name: '4 Objectives' });

      // Needs status.
      await screen.findByRole('cell', { name: '03/15/2021' });
      await screen.findByRole('cell', { name: /this is goal text 4/i });
      await screen.findByRole('cell', { name: /partnerships and/i });
      await screen.findByRole('cell', { name: '3 Objectives' });

      // Draft.
      await screen.findByRole('cell', { name: '02/15/2021' });
      await screen.findByRole('cell', { name: /this is goal text 5/i });
      await screen.findByRole('cell', { name: '1 Objective' });

      // Ceased/Suspended.
      await screen.findByRole('cell', { name: '01/15/2021' });
      await screen.findByRole('cell', { name: /this is goal text 6/i });
      await screen.findByRole('cell', { name: /recordkeeping and/i });
      await screen.findByRole('cell', { name: '8 Objectives' });
    });
  });

  describe('Table displays objective data', () => {
    beforeEach(async () => {
      fetchMock.reset();
      fetchMock.get(
        baseWithRegionOne,
        { count: 1, goalRows: goalWithObjectives },
      );
    });

    afterEach(() => {
      window.location.assign.mockReset();
      fetchMock.restore();
    });

    it('Shows the correct objective data', async () => {
      act(() => renderTable(defaultUser));
      await screen.findByText('TTA goals and objectives');

      // Objective 1.
      await screen.findByText(/objective 1 title/i);
      await screen.findByRole('link', { name: /ar-number-1/i });
      await screen.findByText('06/14/2021');
      await screen.findByText(/monitoring | deficiency/i);

      // Objective 2.
      await screen.findByText(/objective 2 title/i);
      await screen.findByRole('link', { name: /ar-number-2/i });
      await screen.findByText('05/14/2021');
      await screen.findByText('Below Competitive Threshold (CLASS)');

      // Objective 3.
      await screen.findByText(/objective 3 title/i);
      await screen.findByRole('link', { name: /ar-number-3/i });
      await screen.findByText('04/14/2021');
      await screen.findByText(/covid-19 response/i);

      expect(await screen.findByText(/1-1 of 1/i)).toBeVisible();
      expect(screen.getAllByRole('cell')[0]).toHaveTextContent(/in progress/i);
    });

    it('Expands and collapses objectives', async () => {
      renderTable(defaultUser);
      await screen.findByText('TTA goals and objectives');

      expect(document.querySelector('.tta-smarthub--goal-row-collapsed')).toBeInTheDocument();

      // Expand Objectives via click.
      const expandObjectives = await screen.findByRole('button', { name: "Expand objective's for goal R14-G-4598" });
      fireEvent.click(expandObjectives);
      expect(document.querySelector('.tta-smarthub--goal-row-collapsed')).not.toBeInTheDocument();

      // Collapse Objectives via click.
      const collapseButton = await screen.findByRole('button', { name: "Collapse objective's for goal R14-G-4598" });
      fireEvent.click(collapseButton);
      expect(document.querySelector('.tta-smarthub--goal-row-collapsed')).toBeInTheDocument();
    });

    it('hides the add new goal button if recipient has no active grants', async () => {
      renderTable(defaultUser, false);
      await screen.findByText('TTA goals and objectives');

      const link = screen.queryByRole('link', { name: /Add new goal/i });
      expect(link).toBe(null);
    });

    it('hides the add new goal button if user doesn\'t have permissions', async () => {
      const user = {
        ...defaultUser,
        permissions: [
          {
            scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
            regionId: 1,
          },
        ],
      };

      renderTable(user);
      await screen.findByText('TTA goals and objectives');

      const link = screen.queryByRole('link', { name: /Add new goal/i });
      expect(link).toBe(null);
    });
  });

  describe('Table sorting', () => {
    beforeEach(async () => {
      fetchMock.reset();
      fetchMock.get(
        baseWithRegionOne,
        { count: 6, goalRows: goals },
      );
      renderTable(defaultUser);
      await screen.findByText('TTA goals and objectives');
    });

    afterEach(() => {
      window.location.assign.mockReset();
      fetchMock.restore();
    });

    it('clicking Created On column header sorts', async () => {
      // Asc.
      const gaolsAsc = [...goals];
      const columnHeaderAsc = await screen.findByRole('button', { name: /created on\. activate to sort ascending/i });
      const sortedGoalsAsc = gaolsAsc.sort((a, b) => ((a.createdOn > b.createdOn) ? 1 : -1));
      fetchMock.get(
        `/api/recipient/${recipientId}/region/1/goals?sortBy=createdOn&sortDir=asc&offset=0&limit=10`,
        { count: 6, goalRows: sortedGoalsAsc },
      );
      expect(screen.getAllByRole('cell')[1]).toHaveTextContent('06/15/2021');

      fireEvent.click(columnHeaderAsc);
      await screen.findByText('TTA goals and objectives');

      expect(screen.getAllByRole('cell')[1]).toHaveTextContent('01/15/2021');

      // Desc.
      const columnHeaderDesc = await screen.findByRole('button', { name: /created on\. activate to sort descending/i });
      const gaolsDesc = [...goals];
      const sortedGoalsDesc = gaolsDesc.sort((a, b) => ((a.createdOn < b.createdOn) ? 1 : -1));
      fetchMock.get(
        `/api/recipient/${recipientId}/region/1/goals?sortBy=createdOn&sortDir=desc&offset=0&limit=10`,
        { count: 6, goalRows: sortedGoalsDesc },
      );

      fireEvent.click(columnHeaderDesc);
      await screen.findByText('TTA goals and objectives');

      const cells = await screen.findAllByRole('cell');
      expect(cells[1]).toHaveTextContent('06/15/2021');
    });

    it('clicking Goal status column header sorts', async () => {
      // Desc.
      const columnHeaderDesc = await screen.findByRole('button', { name: /goal status\. activate to sort descending/i });
      const goalsDesc = [...goals];
      const sortedGoalsDesc = goalsDesc.sort((a, b) => ((a.goalStatus < b.goalStatus) ? 1 : -1));
      fetchMock.get(
        `/api/recipient/${recipientId}/region/1/goals?sortBy=goalStatus&sortDir=desc&offset=0&limit=10`,
        { count: 6, goalRows: sortedGoalsDesc },
      );
      expect(screen.getAllByRole('cell')[0]).toHaveTextContent('In progress');

      fireEvent.click(columnHeaderDesc);
      await screen.findByText('TTA goals and objectives');

      const cells = await screen.findAllByRole('cell');
      expect(cells[0]).toHaveTextContent('Suspended');

      // Desc (via button press).
      const goalsAsc = [...goals];
      const sortedGoalsAsc = goalsAsc.sort((a, b) => ((a.goalStatus > b.goalStatus) ? 1 : -1));
      fetchMock.get(
        `/api/recipient/${recipientId}/region/1/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=10`,
        { count: 6, goalRows: sortedGoalsAsc }, { overwriteRoutes: true },
      );

      const columnHeaderAsc = await screen.findByRole('button', { name: /goal status\. activate to sort ascending/i });

      columnHeaderAsc.focus();
      expect(columnHeaderAsc).toHaveFocus();
      fireEvent.keyPress(columnHeaderAsc, { key: 'Enter', code: 13, charCode: 13 });
      await screen.findByText('TTA goals and objectives');
      const [cell] = await screen.findAllByRole('cell');
      expect(cell).toHaveTextContent('Needs status');
    });
  });

  describe('Paging', () => {
    beforeEach(async () => {
      fetchMock.reset();
      fetchMock.get(
        baseWithRegionOne,
        { count: 6, goalRows: goals },
      );
      renderTable(defaultUser);
      await screen.findByText('TTA goals and objectives');
    });

    afterEach(() => {
      window.location.assign.mockReset();
      fetchMock.restore();
    });

    it('Pagination links are visible', async () => {
      const prevLink = await screen.findByRole('link', {
        name: /go to previous page/i,
      });
      const pageOne = await screen.findByRole('link', {
        name: /go to page number 1/i,
      });
      const nextLink = await screen.findByRole('link', {
        name: /go to next page/i,
      });

      expect(prevLink).toBeVisible();
      expect(pageOne).toBeVisible();
      expect(nextLink).toBeVisible();
    });

    it('Clicking on pagination page works', async () => {
      const pageOne = await screen.findByRole('link', {
        name: /go to page number 1/i,
      });
      fetchMock.reset();
      fetchMock.get(
        baseWithRegionOne,
        { count: 6, goalRows: [goals[0], goals[1], goals[2], goals[3], goals[4]] },
      );
      fireEvent.click(pageOne);
      const cells = await screen.findAllByRole('cell');
      expect(cells.length).toBe(42);
    });
  });

  describe('Context Menu', () => {
    beforeEach(async () => {
      fetchMock.restore();
      fetchMock.get(
        baseWithRegionOne,
        { count: 1, goalRows: [goals[0], goals[3]] },
      );
      renderTable(defaultUser);
      await screen.findByText('TTA goals and objectives');
    });

    afterEach(() => {
      window.location.assign.mockReset();
      fetchMock.restore();
    });

    it('Sets goal status with reason', async () => {
      fetchMock.reset();
      fetchMock.put('/api/goals/4598/changeStatus', {
        id: 4598,
        status: 'Closed',
        createdOn: '06/15/2021',
        goalText: 'This is goal text 1.',
        goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
        objectiveCount: 5,
        goalNumber: 'R14-G-4598',
        reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
      });

      // Open Context Menu.
      const changeStatus = await screen.findByRole('button', { name: /Change status for goal 4598/i });
      userEvent.click(changeStatus);
      const closed = await screen.findByRole('button', { name: /Closed/i });
      userEvent.click(closed);

      // Select a reason.
      const reasonRadio = await screen.findByRole('radio', { name: /duplicate goal/i, hidden: true });
      fireEvent.click(reasonRadio);

      // Submit reason why.
      const submitButton = await screen.findAllByText(/submit/i);
      fireEvent.click(submitButton[0]);

      // Verify new status.
      await waitFor(() => expect(screen.getAllByRole('cell')[0]).toHaveTextContent('Closed'));
    });

    it('Sets goal status without reason', async () => {
      fetchMock.reset();
      fetchMock.put('/api/goals/65479/changeStatus', {
        id: 65479,
        goalStatus: 'In Progress',
        createdOn: '06/15/2021',
        goalText: 'This is goal text 1.',
        goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
        objectiveCount: 0,
        goalNumber: 'R14-G-65479',
        reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
        objectives: [],
        previousStatus: 'Needs status',
      });

      expect(fetchMock.called()).toBe(false);

      // Open Context Menu.
      const changeStatus = await screen.findByRole('button', { name: /Change status for goal 65479/i });
      userEvent.click(changeStatus);
      const inProgress = await screen.findByRole('button', { name: /In Progress/i });
      userEvent.click(inProgress);

      // Verify goal status change.
      expect(fetchMock.called()).toBe(true);
    });
  });
});
