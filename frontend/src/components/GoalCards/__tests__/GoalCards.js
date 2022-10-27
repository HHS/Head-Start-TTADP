import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, waitFor, fireEvent,
} from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import fetchMock from 'fetch-mock';
import UserContext from '../../../UserContext';
import AriaLiveContext from '../../../AriaLiveContext';
import GoalCards from '../GoalCards';
import { SCOPE_IDS } from '../../../Constants';
import { mockWindowProperty } from '../../../testHelpers';

jest.mock('../../../fetchers/helpers');

const oldWindowLocation = window.location;

const mockAnnounce = jest.fn();
const recipientId = '1000';
const regionId = '1';

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

const baseGoals = [{
  id: 4598,
  ids: [4598],
  goalStatus: 'In Progress',
  createdOn: '2021-06-15',
  goalText: 'This is goal text 1.',
  goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
  objectiveCount: 5,
  goalNumbers: ['G-4598'],
  reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
  objectives: [],
},
{
  id: 8547,
  ids: [8547],
  goalStatus: 'Not Started',
  createdOn: '2021-05-15',
  goalText: 'This is goal text 2.',
  goalTopics: ['Nutrition', 'Oral Health'],
  objectiveCount: 2,
  goalNumbers: ['G-8547'],
  reasons: ['Below Competitive Threshold (CLASS)'],
  objectives: [],
},
{
  id: 65478,
  ids: [65478],
  goalStatus: 'Completed',
  createdOn: '2021-04-15',
  goalText: 'This is goal text 3.',
  goalTopics: ['Parent and Family Engagement'],
  objectiveCount: 4,
  goalNumbers: ['G-65478'],
  reasons: ['Monitoring | Area of Concern'],
  objectives: [],
},
{
  id: 65479,
  ids: [65479],
  goalStatus: '', // Needs Status.
  createdOn: '2021-03-15',
  goalText: 'This is goal text 4.',
  goalTopics: ['Partnerships and Community Engagement'],
  objectiveCount: 3,
  goalNumbers: ['G-65479'],
  reasons: ['COVID-19 response'],
  objectives: [],
},
{
  id: 65480,
  ids: [65480],
  goalStatus: 'Draft',
  createdOn: '2021-02-15',
  goalText: 'This is goal text 5.',
  goalTopics: ['Safety Practices'],
  objectiveCount: 1,
  goalNumbers: ['G-65480'],
  reasons: ['New Recipient'],
  objectives: [],
},
{
  id: 65481,
  ids: [65481],
  goalStatus: 'Suspended',
  createdOn: '2021-01-15',
  goalText: 'This is goal text 6.',
  goalTopics: ['Recordkeeping and Reporting'],
  objectiveCount: 8,
  goalNumbers: ['G-65481'],
  reasons: ['School Readiness Goals'],
  objectives: [],
},
];

const goalWithObjectives = [{
  id: 4458,
  ids: [4458],
  goalStatus: 'In Progress',
  createdOn: '2021-06-15',
  goalText: 'This is a goal with objectives',
  goalTopics: ['Human Resources'],
  objectiveCount: 4,
  goalNumbers: ['G-4598'],
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
      displayId: 'ar-number-1',
      legacyId: null,
      endDate: '06/14/2021',
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
      displayId: 'ar-number-2',
      legacyId: null,
      endDate: '01/14/2020',
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
      displayId: 'ar-number-3',
      legacyId: null,
      endDate: '02/14/2020',
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
      displayId: 'ar-number-4',
      legacyId: null,
      endDate: '03/14/2020',
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
      displayId: 'ar-number-5',
      legacyId: null,
      endDate: '04/14/2020',
    }],
  },
  ],
},
];

const handlePageChange = jest.fn();
const requestSort = jest.fn();
const setGoals = jest.fn();
const history = createMemoryHistory();

const renderTable = ({ goals, goalsCount }, user, hasActiveGrants = true) => {
  render(
    <Router history={history}>
      <AriaLiveContext.Provider value={{ announce: mockAnnounce }}>
        <UserContext.Provider value={{ user }}>
          <GoalCards
            recipientId={recipientId}
            regionId={regionId}
            onUpdateFilters={() => { }}
            hasActiveGrants={hasActiveGrants}
            showNewGoals={false}
            goals={goals}
            error=""
            goalsCount={goalsCount}
            handlePageChange={handlePageChange}
            requestSort={requestSort}
            loading={false}
            sortConfig={{
              sortBy: 'goalStatus',
              direction: 'asc',
              activePage: 1,
              offset: 0,
            }}
            setGoals={setGoals}
          />
        </UserContext.Provider>
      </AriaLiveContext.Provider>
    </Router>,
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
    afterEach(() => {
      window.location.assign.mockReset();
      fetchMock.restore();
    });

    it('Shows the correct data', async () => {
      renderTable({ goals: baseGoals, goalsCount: 6 }, defaultUser);
      await screen.findByText('TTA goals and objectives');
      expect(await screen.findByText(/1-6 of 6/i)).toBeVisible();

      await screen.findByText('06/15/2021');
      await screen.findByText(/this is goal text 1/i);

      // Not started.
      await screen.findByText('05/15/2021');
      await screen.findByText(/this is goal text 2/i);

      // Closed.
      await screen.findByText('04/15/2021');
      await screen.findByText(/this is goal text 3/i);

      // Needs status.
      await screen.findByText('03/15/2021');
      await screen.findByText(/this is goal text 4/i);

      // Draft.
      await screen.findByText('02/15/2021');
      await screen.findByText(/this is goal text 5/i);

      // Ceased/Suspended.
      await screen.findByText('01/15/2021');
      await screen.findByText(/this is goal text 6/i);
    });
  });

  describe('Table displays objective data', () => {
    afterEach(() => {
      window.location.assign.mockReset();
    });

    it('Shows the correct objective data', async () => {
      act(() => renderTable({ goals: goalWithObjectives, goalsCount: 1 }, defaultUser));
      await screen.findByText('TTA goals and objectives');

      const expandObjectives = await screen.findByRole('button', { name: /Expand objectives for goal/i });
      fireEvent.click(expandObjectives);

      // Objective 1.
      await screen.findByText(/objective 1 title/i);
      await screen.findByRole('link', { name: /ar-number-1/i });
      const lastTTa = screen.queryAllByText('06/14/2021');
      expect(lastTTa.length).toBe(2);
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
      const inProgressStatuses = await screen.findAllByText(/in progress/i);
      expect(inProgressStatuses.length).toBe(3);
    });

    it('Shows goals without objective data', async () => {
      act(() => renderTable({
        goals: [
          {
            ...goalWithObjectives[0], objectives: [],
          },
        ],
        goalsCount: 1,
      }, defaultUser));
      await screen.findByText('TTA goals and objectives');

      expect(await screen.findByText(/1-1 of 1/i)).toBeVisible();
      const status = await screen.findByRole('button', { name: /change status for goal 4458/i });
      expect(status).toHaveTextContent(/in progress/i);
    });

    it('Expands and collapses objectives', async () => {
      renderTable({ goals: goalWithObjectives, goalsCount: 1 }, defaultUser);
      await screen.findByText('TTA goals and objectives');

      expect(document.querySelector('.ttahub-goal-card__objective-list[hidden]')).toBeInTheDocument();

      // Expand Objectives via click.
      const expandObjectives = await screen.findByRole('button', { name: 'Expand objectives for goal G-4598' });
      fireEvent.click(expandObjectives);
      expect(document.querySelector('.ttahub-goal-card__objective-list[hidden]')).not.toBeInTheDocument();

      // Collapse Objectives via click.
      const collapseButton = await screen.findByRole('button', { name: 'Collapse objectives for goal G-4598' });
      fireEvent.click(collapseButton);
      expect(document.querySelector('.ttahub-goal-card__objective-list[hidden]')).toBeInTheDocument();
    });
    it('hides the add new goal button if recipient has no active grants', async () => {
      renderTable({ goals: goalWithObjectives, goalsCount: 1 }, defaultUser, false);
      await screen.findByText('TTA goals and objectives');

      const link = screen.queryByRole('link', { name: /Add new goals/i });
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

      renderTable({ goals: goalWithObjectives, goalsCount: 1 }, user);
      await screen.findByText('TTA goals and objectives');

      const link = screen.queryByRole('link', { name: /Add new goals/i });
      expect(link).toBe(null);
    });
  });

  describe('Table sorting', () => {
    beforeEach(async () => {
      renderTable({ goals: baseGoals, goalsCount: 6 }, defaultUser);
      await screen.findByText('TTA goals and objectives');
    });

    afterEach(() => {
      window.location.assign.mockReset();
    });

    it('sorts by created on', async () => {
      const sortCreated = await screen.findByRole('combobox');
      userEvent.selectOptions(sortCreated, 'createdOn-desc');
      expect(requestSort).toHaveBeenCalled();
    });

    it('sorts by goal status', async () => {
      const sortCreated = await screen.findByRole('combobox');
      userEvent.selectOptions(sortCreated, 'goalStatus-asc');
      await screen.findByText('TTA goals and objectives');
      expect(requestSort).toHaveBeenCalled();
    });
  });

  describe('Paging', () => {
    beforeEach(async () => {
      renderTable({ goals: baseGoals, goalsCount: 6 }, defaultUser);
      await screen.findByText('TTA goals and objectives');
    });

    afterEach(() => {
      window.location.assign.mockReset();
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

      fireEvent.click(pageOne);
      expect(handlePageChange).toHaveBeenCalled();
    });
  });

  describe('Context Menu', () => {
    beforeEach(async () => {
      fetchMock.restore();

      renderTable({ goals: [baseGoals[0], baseGoals[3]], goalsCount: 1 }, defaultUser);
      await screen.findByText('TTA goals and objectives');
    });

    afterEach(() => {
      window.location.assign.mockReset();
      fetchMock.restore();
    });

    it('Sets goal status with reason', async () => {
      fetchMock.reset();
      fetchMock.put('/api/goals/changeStatus', [{
        id: 4598,
        status: 'Closed',
        createdOn: '06/15/2021',
        goalText: 'This is goal text 1.',
        goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
        objectiveCount: 5,
        goalNumber: 'G-4598',
        reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
      }]);

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
      await waitFor(() => expect(fetchMock.called()).toBeTruthy());
      expect(setGoals).toHaveBeenCalled();
    });

    it('allows goals to be edited', async () => {
      history.push = jest.fn();
      const menuToggle = await screen.findByRole('button', { name: /Actions for goal 4598/i });
      userEvent.click(menuToggle);

      const editGoal = await screen.findByRole('button', { name: /Edit/i });
      userEvent.click(editGoal);
      expect(history.push).toHaveBeenCalled();
    });

    it('Sets goal status without reason', async () => {
      history.push = jest.fn();
      fetchMock.reset();
      fetchMock.put('/api/goals/changeStatus', [{
        id: 65479,
        goalStatus: 'In Progress',
        createdOn: '06/15/2021',
        goalText: 'This is goal text 1.',
        goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
        objectiveCount: 0,
        goalNumber: 'G-65479',
        reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
        objectives: [],
        previousStatus: 'Needs status',
      }]);

      expect(fetchMock.called()).toBe(false);

      // Open Context Menu.
      const changeStatus = await screen.findByRole('button', { name: /Change status for goal 65479/i });
      userEvent.click(changeStatus);
      const inProgress = await screen.findByRole('button', { name: /In Progress/i });
      userEvent.click(inProgress);

      // Verify goal status change.
      await waitFor(() => expect(fetchMock.called()).toBeTruthy());
      expect(setGoals).toHaveBeenCalled();

      // print goals
      const printButton = await screen.findByRole('button', { name: /Preview and print/i });
      userEvent.click(printButton);

      expect(history.push).toHaveBeenCalled();
    });
  });
});
