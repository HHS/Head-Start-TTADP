import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import fetchMock from 'fetch-mock';
import UserContext from '../../../UserContext';
import AriaLiveContext from '../../../AriaLiveContext';
import GoalsTable from '../GoalsTable';

jest.mock('../../../fetchers/helpers');

const oldWindowLocation = window.location;

const mockAnnounce = jest.fn();
const recipientId = '1000';
const withRegionOne = '&region.in[]=1';
const base = `/api/recipient/goals/${recipientId}?sortBy=goalStatus&sortDir=asc&offset=0&limit=5`;
const defaultBaseUrlWithRegionOne = `${base}${withRegionOne}`;

const defaultUser = {
  name: 'test@test.com',
  homeRegionId: 14,
  permissions: [
    {
      scopeId: 3,
      regionId: 1,
    },
  ],
};

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
{
  id: 8547,
  goalStatus: 'Not Started',
  createdOn: '05/15/2021',
  goalText: 'This is goal text 2.',
  goalTopics: ['Nutrition', 'Oral Health'],
  objectiveCount: 2,
  goalNumber: 'R14-G-8547',
  reasons: ['Below Competitive Threshold (CLASS)'],
},
{
  id: 65478,
  goalStatus: 'Completed',
  createdOn: '04/15/2021',
  goalText: 'This is goal text 3.',
  goalTopics: ['Parent and Family Engagement'],
  objectiveCount: 4,
  goalNumber: 'R14-G-65478',
  reasons: ['Monitoring | Area of Concern'],
},
{
  id: 65479,
  goalStatus: '', // Needs Status.
  createdOn: '03/15/2021',
  goalText: 'This is goal text 4.',
  goalTopics: ['Partnerships and Community Engagement'],
  objectiveCount: 3,
  goalNumber: 'R14-G-65479',
  reasons: ['COVID-19 response'],
},
{
  id: 65480,
  goalStatus: 'Draft',
  createdOn: '02/15/2021',
  goalText: 'This is goal text 5.',
  goalTopics: ['Safety Practices'],
  objectiveCount: 1,
  goalNumber: 'R14-G-65480',
  reasons: ['New Recipient'],
},
{
  id: 65481,
  goalStatus: 'Ceased/Suspended',
  createdOn: '01/15/2021',
  goalText: 'This is goal text 6.',
  goalTopics: ['Recordkeeping and Reporting'],
  objectiveCount: 8,
  goalNumber: 'R14-G-65481',
  reasons: ['School Readiness Goals'],
},
];

const renderTable = (user) => {
  render(
    <MemoryRouter>
      <AriaLiveContext.Provider value={{ announce: mockAnnounce }}>
        <UserContext.Provider value={{ user }}>
          <GoalsTable
            filters={[{
              id: '1',
              topic: 'region',
              condition: 'Is',
              query: '1',
            }]}
            recipientId={recipientId}
            onUpdateFilters={() => { }}
          />
        </UserContext.Provider>
      </AriaLiveContext.Provider>
    </MemoryRouter>,
  );
};

describe('Goals Table', () => {
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
        defaultBaseUrlWithRegionOne,
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
      expect(await screen.findByText(/1-5 of 6/i)).toBeVisible();

      // In progress.
      expect(screen.getAllByRole('cell')[0].firstChild).toHaveClass('fa-clock');
      expect(screen.getAllByRole('cell')[0]).toHaveTextContent(/in progress/i);
      expect(screen.getAllByRole('cell')[1]).toHaveTextContent('06/15/2021');
      expect(screen.getAllByRole('cell')[2]).toHaveTextContent(/this is goal text 1/i);
      expect(screen.getAllByRole('cell')[3]).toHaveTextContent(/human resources, safety practices, program planning and services/i);
      expect(screen.getAllByRole('cell')[4]).toHaveTextContent('5 Objective(s)');

      // Click Context Menu on 'In progress'.
      let rowContextBtn = await screen.findByRole('button', { name: /actions for goal 4598/i });
      fireEvent.click(rowContextBtn);
      let contextMenus = await screen.findByRole('menu');
      expect(contextMenus).toHaveTextContent(/close goal/i);
      expect(contextMenus).toHaveTextContent(/cease\/suspend goal/i);

      // Not started.
      expect(screen.getAllByRole('cell')[6].firstChild).toHaveClass('fa-minus-circle');
      expect(screen.getAllByRole('cell')[6]).toHaveTextContent(/not started/i);
      expect(screen.getAllByRole('cell')[7]).toHaveTextContent('05/15/2021');
      expect(screen.getAllByRole('cell')[8]).toHaveTextContent(/this is goal text 2/i);
      expect(screen.getAllByRole('cell')[9]).toHaveTextContent(/nutrition, oral health/i);
      expect(screen.getAllByRole('cell')[10]).toHaveTextContent('2 Objective(s)');

      // Click Context Menu on 'Not started'.
      rowContextBtn = await screen.findByRole('button', { name: /actions for goal 8547/i });
      fireEvent.click(rowContextBtn);
      contextMenus = await screen.findAllByRole('menu');
      expect(contextMenus.length).toBe(2);
      expect(contextMenus[1]).toHaveTextContent(/close goal/i);
      expect(contextMenus[1]).toHaveTextContent(/cease\/suspend goal/i);

      // Closed.
      expect(screen.getAllByRole('cell')[12].firstChild).toHaveClass('fa-check-circle');
      expect(screen.getAllByRole('cell')[12]).toHaveTextContent(/closed/i);
      expect(screen.getAllByRole('cell')[13]).toHaveTextContent('04/15/2021');
      expect(screen.getAllByRole('cell')[14]).toHaveTextContent(/this is goal text 3/i);
      expect(screen.getAllByRole('cell')[15]).toHaveTextContent(/parent and family engagement/i);
      expect(screen.getAllByRole('cell')[16]).toHaveTextContent('4 Objective(s)');

      // Click Context Menu on 'Closed'.
      rowContextBtn = await screen.findByRole('button', { name: /actions for goal 65478/i });
      fireEvent.click(rowContextBtn);
      contextMenus = await screen.findAllByRole('menu');
      expect(contextMenus.length).toBe(3);
      expect(contextMenus[2]).toHaveTextContent(/Re-open goal/i);

      // Needs status.
      expect(screen.getAllByRole('cell')[18].firstChild).toHaveClass('fa-exclamation-circle ');
      expect(screen.getAllByRole('cell')[18]).toHaveTextContent(/needs status/i);
      expect(screen.getAllByRole('cell')[19]).toHaveTextContent('03/15/2021');
      expect(screen.getAllByRole('cell')[20]).toHaveTextContent(/this is goal text 4/i);
      expect(screen.getAllByRole('cell')[21]).toHaveTextContent(/partnerships and community engagement/i);
      expect(screen.getAllByRole('cell')[22]).toHaveTextContent('3 Objective(s)');

      // Click Context Menu on 'Needs status'.
      rowContextBtn = await screen.findByRole('button', { name: /actions for goal 65479/i });
      fireEvent.click(rowContextBtn);
      contextMenus = await screen.findAllByRole('menu');
      expect(contextMenus.length).toBe(4);
      expect(contextMenus[3]).toHaveTextContent(/Mark not started/i);
      expect(contextMenus[3]).toHaveTextContent(/Mark in progress/i);
      expect(contextMenus[3]).toHaveTextContent(/Close goal/i);
      expect(contextMenus[3]).toHaveTextContent(/cease\/suspend goal/i);

      // Draft.
      expect(screen.getAllByRole('cell')[24].firstChild).toHaveClass('fa-pencil-alt');
      expect(screen.getAllByRole('cell')[24]).toHaveTextContent(/draft/i);
      expect(screen.getAllByRole('cell')[25]).toHaveTextContent('02/15/2021');
      expect(screen.getAllByRole('cell')[26]).toHaveTextContent(/this is goal text 5/i);
      expect(screen.getAllByRole('cell')[27]).toHaveTextContent(/safety practices/i);
      expect(screen.getAllByRole('cell')[28]).toHaveTextContent('1 Objective(s)');

      // Ceased/Suspended.
      expect(screen.getAllByRole('cell')[30].firstChild).toHaveClass('fa-times-circle');
      expect(screen.getAllByRole('cell')[30]).toHaveTextContent('Ceased/ suspended');
      expect(screen.getAllByRole('cell')[31]).toHaveTextContent('01/15/2021');
      expect(screen.getAllByRole('cell')[32]).toHaveTextContent(/this is goal text 6/i);
      expect(screen.getAllByRole('cell')[33]).toHaveTextContent(/recordkeeping and reporting/i);
      expect(screen.getAllByRole('cell')[34]).toHaveTextContent('8 Objective(s)');

      // Click Context Menu on 'Ceased/Suspended'.
      rowContextBtn = await screen.findByRole('button', { name: /actions for goal 65481/i });
      fireEvent.click(rowContextBtn);
      contextMenus = await screen.findAllByRole('menu');
      expect(contextMenus.length).toBe(5);
      expect(contextMenus[4]).toHaveTextContent(/Re-open goal/i);
    });
  });

  describe('Table sorting', () => {
    beforeEach(async () => {
      fetchMock.reset();
      fetchMock.get(
        defaultBaseUrlWithRegionOne,
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
        `/api/recipient/goals/${recipientId}?sortBy=createdOn&sortDir=asc&offset=0&limit=5&region.in[]=1`,
        { count: 6, goalRows: sortedGoalsAsc },
      );
      expect(screen.getAllByRole('cell')[1]).toHaveTextContent('06/15/2021');

      fireEvent.click(columnHeaderAsc);
      await screen.findByText('TTA goals and objectives');

      await waitFor(() => expect(screen.getAllByRole('cell')[1]).toHaveTextContent('01/15/2021'));
      await waitFor(() => expect(screen.getAllByRole('cell')[31]).toHaveTextContent('06/15/2021'));

      // Desc.
      const columnHeaderDesc = await screen.findByRole('button', { name: /created on\. activate to sort descending/i });
      const gaolsDesc = [...goals];
      const sortedGoalsDesc = gaolsDesc.sort((a, b) => ((a.createdOn < b.createdOn) ? 1 : -1));
      fetchMock.get(
        `/api/recipient/goals/${recipientId}?sortBy=createdOn&sortDir=desc&offset=0&limit=5&region.in[]=1`,
        { count: 6, goalRows: sortedGoalsDesc },
      );

      fireEvent.click(columnHeaderDesc);
      await screen.findByText('TTA goals and objectives');

      await waitFor(() => expect(screen.getAllByRole('cell')[1]).toHaveTextContent('06/15/2021'));
      await waitFor(() => expect(screen.getAllByRole('cell')[31]).toHaveTextContent('01/15/2021'));
    });

    it('clicking Goal status column header sorts', async () => {
      // Desc.
      const columnHeaderDesc = await screen.findByRole('button', { name: /goal status\. activate to sort descending/i });
      const goalsDesc = [...goals];
      const sortedGoalsDesc = goalsDesc.sort((a, b) => ((a.goalStatus < b.goalStatus) ? 1 : -1));
      fetchMock.get(
        `/api/recipient/goals/${recipientId}?sortBy=goalStatus&sortDir=desc&offset=0&limit=5&region.in[]=1`,
        { count: 6, goalRows: sortedGoalsDesc },
      );
      expect(screen.getAllByRole('cell')[0]).toHaveTextContent('In progress');

      fireEvent.click(columnHeaderDesc);
      await screen.findByText('TTA goals and objectives');

      await waitFor(() => expect(screen.getAllByRole('cell')[0]).toHaveTextContent('Not started'));
      await waitFor(() => expect(screen.getAllByRole('cell')[30]).toHaveTextContent('Needs status'));

      // Desc (via button press).
      const goalsAsc = [...goals];
      const sortedGoalsAsc = goalsAsc.sort((a, b) => ((a.goalStatus > b.goalStatus) ? 1 : -1));
      fetchMock.get(
        `/api/recipient/goals/${recipientId}?sortBy=goalStatus&sortDir=asc&offset=0&limit=5&region.in[]=1`,
        { count: 6, goalRows: sortedGoalsAsc }, { overwriteRoutes: true },
      );

      const columnHeaderAsc = await screen.findByRole('button', { name: /goal status\. activate to sort ascending/i });

      columnHeaderAsc.focus();
      expect(columnHeaderAsc).toHaveFocus();
      fireEvent.keyPress(columnHeaderAsc, { key: 'Enter', code: 13, charCode: 13 });
      await screen.findByText('TTA goals and objectives');

      await waitFor(() => expect(screen.getAllByRole('cell')[0]).toHaveTextContent('Needs status'));
      await waitFor(() => expect(screen.getAllByRole('cell')[30]).toHaveTextContent('Not started'));
    });
  });

  describe('Paging', () => {
    beforeEach(async () => {
      fetchMock.reset();
      fetchMock.get(
        defaultBaseUrlWithRegionOne,
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
        defaultBaseUrlWithRegionOne,
        { count: 6, goalRows: [goals[0], goals[1], goals[2], goals[3], goals[4]] },
      );
      fireEvent.click(pageOne);
      await waitFor(() => expect(screen.getAllByRole('cell')[1]).toHaveTextContent('06/15/2021'));
      await waitFor(() => expect(screen.getAllByRole('cell')[31]).toHaveTextContent('01/15/2021'));
    });

    it('clicking on the second page updates page values', async () => {
      await screen.findByRole('link', {
        name: /go to page number 1/i,
      });

      fetchMock.reset();
      fetchMock.get(
        defaultBaseUrlWithRegionOne,
        { count: 6, goalRows: [goals[0], goals[1], goals[2], goals[3], goals[4]] },
      );

      renderTable(defaultUser);

      const pageTwo = await screen.findByRole('link', {
        name: /go to page number 2/i,
      });

      fetchMock.get(
        `/api/recipient/goals/${recipientId}?sortBy=goalStatus&sortDir=asc&offset=5&limit=5&region.in[]=1`,
        { count: 6, goalRows: [goals[5]] },
      );

      fireEvent.click(pageTwo);
      await waitFor(() => expect(screen.getByText(/6-6 of 6/i)).toBeVisible());
    });
  });

  describe('Context Menu', () => {
    beforeEach(async () => {
      fetchMock.reset();
      fetchMock.get(
        defaultBaseUrlWithRegionOne,
        { count: 1, goalRows: [goals[0], goals[1]] },
      );
      renderTable(defaultUser);
      await screen.findByText('TTA goals and objectives');
    });

    afterEach(() => {
      window.location.assign.mockReset();
      fetchMock.restore();
    });

    it('Sets goal status', async () => {
      fetchMock.reset();
      fetchMock.put('/api/goals/4598/changeStatus', {
        id: 4598,
        status: 'Completed',
        createdOn: '06/15/2021',
        goalText: 'This is goal text 1.',
        goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
        objectiveCount: 5,
        goalNumber: 'R14-G-4598',
        reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
      });

      // Open Context Menu.
      const contextButton = await screen.findByRole('button', { name: /actions for goal 4598/i });
      fireEvent.click(contextButton);

      // Change goal status to 'Closed'.
      const closeGoalButton = await screen.findByText(/close goal/i);
      fireEvent.click(closeGoalButton);
      await waitFor(() => expect(screen.getAllByRole('cell')[0]).toHaveTextContent('Closed'));
    });
  });
});
