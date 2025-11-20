import '@testing-library/jest-dom';
import React from 'react';
import { SCOPE_IDS, GOAL_STATUS } from '@ttahub/common';
import {
  render, screen, fireEvent,
} from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import fetchMock from 'fetch-mock';
import UserContext from '../../../UserContext';
import AriaLiveContext from '../../../AriaLiveContext';
import GoalCards from '../GoalCards';

import { mockWindowProperty } from '../../../testHelpers';
import { OBJECTIVE_STATUS } from '../../../Constants';

jest.mock('../../../fetchers/helpers');
jest.mock('../../ReopenReasonModal', () => ({
  __esModule: true,
  default: () => <div data-testid="reopen-reason-modal-mock" />,
}));

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
  ids: [4598, 4599],
  status: GOAL_STATUS.IN_PROGRESS,
  createdAt: '2021-06-15',
  name: 'This is goal text 1.',
  goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
  objectiveCount: 5,
  goalNumbers: ['G-4598'],
  reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
  objectives: [],
  collaborators: [],
  goalTemplateId: 101,
  grant: { id: 1, number: 'Grant 1' },
},
{
  id: 8547,
  ids: [8547],
  status: GOAL_STATUS.NOT_STARTED,
  createdAt: '2021-05-15',
  name: 'This is goal text 2.',
  goalTopics: ['Nutrition', 'Oral Health'],
  objectiveCount: 2,
  goalNumbers: ['G-8547'],
  reasons: ['Below Competitive Threshold (CLASS)'],
  objectives: [],
  collaborators: [],
  goalTemplateId: 102,
  grant: { id: 2, number: 'Grant 2' },
},
{
  id: 65478,
  ids: [65478],
  status: GOAL_STATUS.CLOSED,
  createdAt: '2021-04-15',
  name: 'This is goal text 3.',
  goalTopics: ['Parent and Family Engagement'],
  objectiveCount: 4,
  goalNumbers: ['G-65478'],
  reasons: ['Monitoring | Area of Concern'],
  objectives: [],
  collaborators: [],
  goalTemplateId: 103,
  grant: { id: 3, number: 'Grant 3' },
},
{
  id: 65479,
  ids: [65479],
  status: '', // Needs Status.
  createdAt: '2021-03-15',
  name: 'This is goal text 4.',
  goalTopics: ['Partnerships and Community Engagement'],
  objectiveCount: 3,
  goalNumbers: ['G-65479'],
  reasons: ['COVID-19 response'],
  objectives: [],
  collaborators: [],
  goalTemplateId: 104,
  grant: { id: 4, number: 'Grant 4' },
},
{
  id: 65480,
  ids: [65480],
  status: GOAL_STATUS.DRAFT,
  createdAt: '2021-02-15',
  name: 'This is goal text 5.',
  goalTopics: ['Safety Practices'],
  objectiveCount: 1,
  goalNumbers: ['G-65480'],
  reasons: ['New Recipient'],
  objectives: [],
  collaborators: [],
  goalTemplateId: 105,
  grant: { id: 5, number: 'Grant 5' },
},
{
  id: 65481,
  ids: [65481],
  status: GOAL_STATUS.SUSPENDED,
  createdAt: '2021-01-15',
  name: 'This is goal text 6.',
  goalTopics: ['Recordkeeping and Reporting'],
  objectiveCount: 8,
  goalNumbers: ['G-65481'],
  reasons: ['School Readiness Goals'],
  objectives: [],
  collaborators: [],
  goalTemplateId: 106,
  grant: { id: 6, number: 'Grant 6' },
},
];

const goalWithObjectives = [{
  id: 4458,
  ids: [4458],
  status: GOAL_STATUS.IN_PROGRESS,
  createdAt: '2021-06-15',
  name: 'This is a goal with objectives',
  goalTopics: ['Human Resources'],
  objectiveCount: 4,
  goalNumbers: ['G-4598'],
  reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
  goalTemplateId: 201,
  grant: { id: 7, number: 'Grant 7' },
  objectives: [{
    title: 'Objective 1 Title',
    endDate: '06/14/2021',
    reasons: ['Monitoring | Deficiency'],
    status: OBJECTIVE_STATUS.IN_PROGRESS,
    id: 345345345,
    ids: [345345345],
    ttaProvided: '',
    grantNumbers: ['1'],
    topics: [{ name: 'Human Resources' }],
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
    status: OBJECTIVE_STATUS.NOT_STARTED,
    id: 234234253,
    ids: [234234253],
    ttaProvided: '',
    topics: [{ name: 'Human Resources' }],
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
    status: OBJECTIVE_STATUS.COMPLETE,
    id: 2938234,
    ids: [2938234],
    ttaProvided: '',
    grantNumbers: ['1'],
    topics: [{ name: 'Human Resources' }],
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
    status: OBJECTIVE_STATUS.IN_PROGRESS,
    id: 255384234,
    ids: [255384234],
    ttaProvided: '',
    grantNumbers: ['200342cat'],
    topics: [{ name: 'Human Resources' }],
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
    ids: [298398934834],
    topics: [{ name: 'Human Resources' }],
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
  collaborators: [],
},
];

const handlePageChange = jest.fn();
const requestSort = jest.fn();
const history = createMemoryHistory();

const renderTable = ({ goals, goalsCount, allGoalIds = null }, user, hasActiveGrants = true) => {
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
            allGoalIds={allGoalIds || goals.map((g) => g.id)}
            canMergeGoals={false}
            perPageChange={jest.fn()}
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
    beforeEach(() => {
      fetchMock.restore();
    });
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
      fetchMock.restore();
    });

    it('Shows the correct objective data', async () => {
      act(() => renderTable({ goals: goalWithObjectives, goalsCount: 1 }, defaultUser));
      await screen.findByText('TTA goals and objectives');

      const expandObjectives = await screen.findByRole('button', { name: /View objectives for goal/i });
      fireEvent.click(expandObjectives);

      // Objective 1.
      await screen.findByText(/objective 1 title/i);
      await screen.findByRole('link', { name: /ar-number-1/i });
      const lastTTa = screen.queryAllByText('06/14/2021');
      expect(lastTTa.length).toBe(2);

      // Objective 2.
      await screen.findByText(/objective 2 title/i);
      await screen.findByRole('link', { name: /ar-number-2/i });
      await screen.findByText('05/14/2021');

      // Objective 3.
      await screen.findByText(/objective 3 title/i);
      await screen.findByRole('link', { name: /ar-number-3/i });
      await screen.findByText('04/14/2021');

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
      const expandObjectives = await screen.findByRole('button', { name: 'View objectives for goal G-4598' });
      fireEvent.click(expandObjectives);
      expect(document.querySelector('.ttahub-goal-card__objective-list[hidden]')).not.toBeInTheDocument();

      // Collapse Objectives via click.
      const collapseButton = await screen.findByRole('button', { name: 'Hide objectives for goal G-4598' });
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
      fetchMock.restore();
    });

    it('sorts by created on', async () => {
      const sortCreated = await screen.findByTestId('sortGoalsBy');
      userEvent.selectOptions(sortCreated, 'createdOn-desc');
      expect(requestSort).toHaveBeenCalled();
    });
    it('sorts by goal status', async () => {
      const sortCreated = await screen.findByTestId('sortGoalsBy');
      userEvent.selectOptions(sortCreated, 'goalStatus-asc');
      await screen.findByText('TTA goals and objectives');
      expect(requestSort).toHaveBeenCalled();
    });
  });

  describe('Paging', () => {
    beforeEach(async () => {
      renderTable({ goals: baseGoals, goalsCount: 12 }, defaultUser);
      await screen.findByText('TTA goals and objectives');
    });

    afterEach(() => {
      window.location.assign.mockReset();
      fetchMock.restore();
    });

    it('Pagination links are visible', async () => {
      const [pageOne] = await screen.findAllByRole('button', {
        name: /page 1/i,
      });
      const [nextLink] = await screen.findAllByRole('button', {
        name: /next page/i,
      });

      expect(pageOne).toBeVisible();
      expect(nextLink).toBeVisible();
    });

    it('Clicking on pagination page works', async () => {
      const [pageOne] = await screen.findAllByRole('button', {
        name: /page 1/i,
      });

      fireEvent.click(pageOne);
      expect(handlePageChange).toHaveBeenCalled();
    });
  });

  describe('Checkboxes', () => {
    beforeEach(async () => {
      const allGoalIds = baseGoals.map((g) => g.id);
      allGoalIds.push(23);
      renderTable({ goals: baseGoals, goalsCount: 7, allGoalIds }, defaultUser);
      await screen.findByText('TTA goals and objectives');
    });

    afterEach(() => {
      window.location.assign.mockReset();
      fetchMock.restore();
    });

    it('Select page and all works', async () => {
      const selectAll = await screen.findByRole('checkbox', { name: /deselect all goals/i });
      fireEvent.click(selectAll);

      expect(await screen.findByText(/6 selected/i)).toBeVisible();
      expect(await screen.findByText(/all 6 goals on this page are selected\./i)).toBeVisible();
      const selectAllPages = await screen.findByRole('button', { name: /select all 7 goals/i });
      fireEvent.click(selectAllPages);

      expect(await screen.findByText(/7 selected/i)).toBeVisible();

      fireEvent.click(selectAll);
      expect(screen.queryByText(/7 selected/i)).toBeNull();
    });

    it('Shows the clear selection button and clears when clicked', async () => {
      const selectAll = await screen.findByRole('checkbox', { name: /deselect all goals/i });
      fireEvent.click(selectAll);
      expect(await screen.findByText(/6 selected/i)).toBeVisible();

      const selectAllPages = await screen.findByRole('button', { name: /select all 7 goals/i });
      fireEvent.click(selectAllPages);

      expect(screen.queryByText(/7 selected/i)).toBeVisible();

      const clearSelection = await screen.findByRole('button', { name: /clear selection/i });
      fireEvent.click(clearSelection);

      expect(screen.queryByText(/7 selected/i)).toBeNull();
      // verify all check boxes are unchecked.
      const checkBoxes = screen.queryAllByTestId('selectGoalTestId');
      checkBoxes.forEach((checkBox) => {
        expect(checkBox.checked).toBe(false);
      });
    });

    it('Deselect via pill', async () => {
      const selectAll = await screen.findByRole('checkbox', { name: /deselect all goals/i });
      fireEvent.click(selectAll);

      expect(await screen.findByText(/6 selected/i)).toBeVisible();
      expect(await screen.findByText(/all 6 goals on this page are selected\./i)).toBeVisible();

      const closeSelected = await screen.findByRole('button', { name: /deselect all goals/i });
      fireEvent.click(closeSelected);
      expect(screen.queryByText(/7 selected/i)).toBeNull();
    });

    it('Can select and deselect individual goals', async () => {
      const checkBoxes = screen.queryAllByTestId('selectGoalTestId');
      expect(checkBoxes.length).toBe(6);

      fireEvent.click(checkBoxes[0]);
      fireEvent.click(checkBoxes[1]);

      expect(await screen.findByText(/2 selected/i)).toBeVisible();

      fireEvent.click(checkBoxes[0]);
      fireEvent.click(checkBoxes[1]);

      expect(screen.queryByText(/2 selected/i)).toBeNull();
    });
  });

  describe('Context Menu', () => {
    beforeEach(async () => {
      fetchMock.restore();
      const goalForEditTest = {
        ...baseGoals[0],
        goalTemplateId: 123,
        grant: { id: 456 },
      };
      renderTable({ goals: [goalForEditTest, baseGoals[3]], goalsCount: 2 }, defaultUser);
      await screen.findByText('TTA goals and objectives');
    });

    afterEach(() => {
      window.location.assign.mockReset();
      fetchMock.restore();
    });

    it('allows goals to be edited', async () => {
      history.push = jest.fn();
      const menuToggle = await screen.findByRole('button', { name: /Actions for goal 4598/i });
      userEvent.click(menuToggle);

      const editGoal = await screen.findByRole('button', { name: /Edit/i });
      userEvent.click(editGoal);
      expect(history.push).toHaveBeenCalled();
    });

    it('calls print passing all goal ids on the page', async () => {
      // print goals
      const printButton = await screen.findByRole('button', { name: /Preview and print/i });
      userEvent.click(printButton);
      expect(history.push).toHaveBeenCalledWith('/recipient-tta-records/1000/region/1/rttapa/print', {
        selectedGoalIds: [4598, 65479],
        sortConfig: {
          activePage: 1, direction: 'asc', offset: 0, sortBy: 'goalStatus',
        },
      });
    });

    it('calls print passing all selected goal ids', async () => {
      // print goals
      const printButton = await screen.findByRole('button', { name: /Preview and print/i });

      // select the checkbox with the value of 4598.
      const checkBox = screen.queryAllByTestId('selectGoalTestId')[0];
      fireEvent.click(checkBox);

      userEvent.click(printButton);
      expect(history.push).toHaveBeenCalledWith('/recipient-tta-records/1000/region/1/rttapa/print', {
        selectedGoalIds: [4598],
        sortConfig: {
          activePage: 1, direction: 'asc', offset: 0, sortBy: 'goalStatus',
        },
      });
    });
  });

  describe('Context Menu with Different User Permissions', () => {
    beforeAll(() => {
      fetchMock.restore();
    });
    afterAll(() => {
      fetchMock.restore();
    });
    it('Hides the edit button if the user doesn\'t have permissions', async () => {
      const user = {
        ...defaultUser,
        permissions: [
          {
            scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
            regionId: 1,
          },
        ],
      };

      renderTable({ goals: [baseGoals[0]], goalsCount: 1 }, user);

      const menuToggle = await screen.findByRole('button', { name: /Actions for goal 4598/i });
      userEvent.click(menuToggle);

      const editGoal = screen.queryByRole('button', { name: /Edit/i });
      expect(editGoal).toBe(null);

      // Find the View button.
      const viewGoal = await screen.findByRole('button', { name: 'View details' });
      expect(viewGoal).toBeVisible();

      // Hides the Reopen button.
      const reopenOptions = screen.queryAllByRole('button', { name: 'Reopen' });
      expect(reopenOptions.length).toBe(0);
    });

    it('Shows the edit button if the user has permissions', async () => {
      renderTable({ goals: [baseGoals[0]], goalsCount: 1 }, defaultUser);

      const menuToggle = await screen.findByRole('button', { name: /Actions for goal 4598/i });
      userEvent.click(menuToggle);

      const editGoal = await screen.findByRole('button', { name: /Edit/i });
      expect(editGoal).toBeVisible();

      // hides the reopen button.
      const reopenOptions = screen.queryAllByRole('button', { name: 'Reopen' });
      expect(reopenOptions.length).toBe(0);
    });

    it('Hides the reopen button if the user doesn\'t have permissions', async () => {
      const user = {
        ...defaultUser,
        permissions: [
          {
            scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
            regionId: 1,
          },
        ],
      };

      renderTable(
        { goals: [{ ...baseGoals[2], status: GOAL_STATUS.CLOSED }], goalsCount: 1 }, user,
      );
      const menuToggle = await screen.findByRole('button', { name: /Actions for goal 65478/i });
      userEvent.click(menuToggle);

      // Verify the button Reopen is not visible.
      const reopenOptions = screen.queryAllByRole('button', { name: 'Reopen' });
      expect(reopenOptions.length).toBe(0);

      // Shows the view button.
      const viewGoal = await screen.findByRole('button', { name: 'View details' });
      expect(viewGoal).toBeVisible();
    });

    it('Shows the reopen button if the user has permissions', async () => {
      const user = {
        ...defaultUser,
        permissions: [
          {
            scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
            regionId: 1,
          },
        ],
      };

      renderTable(
        { goals: [{ ...baseGoals[2], status: GOAL_STATUS.CLOSED }], goalsCount: 1 }, user,
      );
      const menuToggle = await screen.findByRole('button', { name: /Actions for goal 65478/i });
      userEvent.click(menuToggle);

      // Verify the button Reopen is not visible.
      expect(await screen.findByRole('button', { name: 'Reopen' })).toBeVisible();

      // Shows the view button.
      const viewGoal = await screen.findByRole('button', { name: 'View details' });
      expect(viewGoal).toBeVisible();
    });
  });
});
