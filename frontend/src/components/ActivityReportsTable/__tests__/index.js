import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, fireEvent, waitFor, act,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import fetchMock from 'fetch-mock';

import userEvent from '@testing-library/user-event';
import UserContext from '../../../UserContext';
import AriaLiveContext from '../../../AriaLiveContext';
import ActivityReportsTable from '../index';
import activityReports, { activityReportsSorted, generateXFakeReports } from '../mocks';
import { getReportsDownloadURL, getAllReportsDownloadURL } from '../../../fetchers/helpers';

jest.mock('../../../fetchers/helpers');

const oldWindowLocation = window.location;

const mockAnnounce = jest.fn();

const withRegionOne = '&region.in[]=1';
const base = '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10';
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

const mockFetchWithRegionOne = () => {
  fetchMock.get(defaultBaseUrlWithRegionOne, { count: 2, rows: activityReports });
};

const renderTable = (user, dateTime) => {
  render(
    <MemoryRouter>
      <AriaLiveContext.Provider value={{ announce: mockAnnounce }}>
        <UserContext.Provider value={{ user }}>
          <ActivityReportsTable
            filters={[{
              id: '1',
              topic: 'region',
              condition: 'Contains',
              query: '1',
            }]}
            showFilter
            onUpdateFilters={() => { }}
            tableCaption="Activity Reports"
            dateTime={dateTime}
          />
        </UserContext.Provider>
      </AriaLiveContext.Provider>
    </MemoryRouter>,
  );
};

describe('Table menus & selections', () => {
  describe('Table row context menu', () => {
    beforeAll(() => {
      delete global.window.location;

      global.window.location = {
        ...oldWindowLocation,
        assign: jest.fn(),
      };
    });

    beforeEach(async () => {
      fetchMock.reset();
      fetchMock.get(
        defaultBaseUrlWithRegionOne,
        { count: 10, rows: generateXFakeReports(10, ['approved']) },
      );
      const user = {
        name: 'test@test.com',
        homeRegionId: 1,
        permissions: [
          {
            scopeId: 3,
            regionId: 1,
          },
          {
            scopeId: 2,
            regionId: 1,
          },
        ],
      };

      renderTable(user);
      await screen.findByText('Activity Reports');
    });

    afterEach(() => {
      window.location.assign.mockReset();
      getReportsDownloadURL.mockClear();
      fetchMock.restore();
    });

    afterAll(() => {
      window.location = oldWindowLocation;
    });

    it('can trigger an activity report download', async () => {
      const contextMenus = await screen.findAllByRole('button', { name: /actions for activity report /i });

      await waitFor(() => {
        expect(contextMenus.length).not.toBe(0);
      });

      const menu = contextMenus[0];

      await waitFor(() => {
        expect(menu).toBeVisible();
      });

      fireEvent.click(menu);

      const viewButton = await screen.findByRole('button', { name: 'Download' });

      await waitFor(() => {
        expect(viewButton).toBeVisible();
      });

      fireEvent.click(viewButton);

      await waitFor(() => {
        expect(window.location.assign).toHaveBeenCalled();
      });
    });
  });

  describe('Table row checkboxes', () => {
    afterEach(() => fetchMock.restore());

    beforeEach(async () => {
      fetchMock.reset();
      fetchMock.get(
        defaultBaseUrlWithRegionOne,
        { count: 10, rows: generateXFakeReports(10) },
      );
      const user = {
        name: 'test@test.com',
        homeRegionId: 14,
        permissions: [
          {
            scopeId: 3,
            regionId: 1,
          },
        ],
      };

      renderTable(user);
      await screen.findByText('Activity Reports');
    });

    it('Can select and deselect a single checkbox', async () => {
      const reportCheckboxes = await screen.findAllByRole('checkbox', { name: /select /i });

      // Element 0 is 'Select all', so we want 1 or later
      const singleReportCheck = reportCheckboxes[1];
      expect(singleReportCheck.value).toEqual('1');

      fireEvent.click(singleReportCheck);
      expect(singleReportCheck.checked).toBe(true);

      fireEvent.click(singleReportCheck);
      expect(singleReportCheck.checked).toBe(false);
    });
  });

  describe('Date display', () => {
    afterEach(() => fetchMock.restore());

    beforeEach(async () => {
      fetchMock.reset();
      fetchMock.get(
        defaultBaseUrlWithRegionOne,
        { count: 10, rows: generateXFakeReports(10) },
      );
    });

    it('Shows date display', async () => {
      const dateTime = { label: '11/03/2021 - 12/03/2021', timestamp: '2021/11/03-2021/12/03' };
      renderTable(defaultUser, dateTime);
      expect(await screen.findByRole('heading', { name: /activity reports/i })).toBeVisible();
      expect(await screen.findByText(/11\/03\/2021 - 12\/03\/2021/i)).toBeVisible();
    });
  });

  describe('Table header checkbox', () => {
    afterEach(() => fetchMock.restore());

    beforeEach(async () => {
      fetchMock.reset();
      fetchMock.get(
        defaultBaseUrlWithRegionOne,
        { count: 10, rows: generateXFakeReports(10) },
      );
      const user = {
        name: 'test@test.com',
        homeRegionId: 14,
        permissions: [
          {
            scopeId: 3,
            regionId: 1,
          },
        ],
      };

      renderTable(user);
      await screen.findByText('Activity Reports');
    });

    it('Selects all reports when checked', async () => {
      const selectAllCheckbox = await screen.findByLabelText(/select or de-select all reports/i);

      fireEvent.click(selectAllCheckbox);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes).toHaveLength(11); // 1 selectAllCheckbox + 10 report checkboxes
        checkboxes.forEach((c) => expect(c).toBeChecked());
      });
    });

    it('De-selects all reports if all are already selected', async () => {
      const selectAllCheckbox = await screen.findByLabelText(/select or de-select all reports/i);

      fireEvent.click(selectAllCheckbox);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes).toHaveLength(11); // 1 selectAllCheckbox + 10 report checkboxes
        checkboxes.forEach((c) => expect(c).toBeChecked());
      });

      fireEvent.click(selectAllCheckbox);

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes).toHaveLength(11); // 1 selectAllCheckbox + 10 report checkboxes
        checkboxes.forEach((c) => expect(c).not.toBeChecked());
      });
    });
  });

  describe('Selected count badge', () => {
    it('can de-select all reports', async () => {
      fetchMock.reset();
      fetchMock.get(
        defaultBaseUrlWithRegionOne,
        { count: 10, rows: generateXFakeReports(10) },
      );
      const user = {
        name: 'test@test.com',
        homeRegionId: 14,
        permissions: [
          {
            scopeId: 3,
            regionId: 1,
          },
        ],
      };

      renderTable(user);
      await screen.findByText('Activity Reports');
      const selectAllCheckbox = await screen.findByLabelText(/select or de-select all reports/i);
      userEvent.click(selectAllCheckbox);
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes).toHaveLength(11); // 1 selectAllCheckbox + 10 report checkboxes
        checkboxes.forEach((c) => expect(c).toBeChecked());
      });

      const deselect = await screen.findByRole('button', { name: 'deselect all reports' });
      fireEvent.click(deselect);
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes).toHaveLength(11); // 1 selectAllCheckbox + 10 report checkboxes
        checkboxes.forEach((c) => expect(c).not.toBeChecked());
      });
    });
  });

  describe('download all reports button', () => {
    afterAll(() => {
      getAllReportsDownloadURL.mockClear();
    });

    beforeAll(async () => {
      fetchMock.reset();
      fetchMock.get(
        defaultBaseUrlWithRegionOne,
        { count: 10, rows: [] },
      );
    });

    it('downloads all reports', async () => {
      const user = {
        name: 'test@test.com',
        permissions: [
          {
            scopeId: 3,
            regionId: 1,
          },
        ],
      };

      renderTable(user);
      const reportMenu = await screen.findByLabelText(/reports menu/i);
      userEvent.click(reportMenu);
      const downloadButton = await screen.findByRole('menuitem', { name: /export table data/i });
      userEvent.click(downloadButton);
      expect(getAllReportsDownloadURL).toHaveBeenCalledWith('region.in[]=1');
    });
  });
});

describe('Table sorting', () => {
  afterEach(() => fetchMock.restore());

  beforeEach(async () => {
    fetchMock.reset();
    mockFetchWithRegionOne();
    const user = {
      name: 'test@test.com',
      homeRegionId: 1,
      permissions: [
        {
          scopeId: 3,
          regionId: 1,
        },
        {
          scopeId: 2,
          regionId: 1,
        },
      ],
    };

    renderTable(user);
    await screen.findByText('Activity Reports');
  });

  it('clicking Last saved column header will sort by updatedAt', async () => {
    const columnHeader = await screen.findByText(/last saved/i);

    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=asc&offset=0&limit=10&region.in[]=1',
      { count: 2, rows: activityReportsSorted },
    );

    fireEvent.click(columnHeader);
    await waitFor(() => expect(screen.getAllByRole('cell')[7]).toHaveTextContent(/02\/04\/2021/i));
    await waitFor(() => expect(screen.getAllByRole('cell')[17]).toHaveTextContent(/02\/05\/2021/i));
  });

  it('clicking Collaborators column header will sort by collaborators', async () => {
    const columnHeader = await screen.findByText(/collaborator\(s\)/i);

    fetchMock.get(
      '/api/activity-reports?sortBy=collaborators&sortDir=asc&offset=0&limit=10&region.in[]=1',
      { count: 2, rows: activityReportsSorted },
    );

    await act(async () => fireEvent.click(columnHeader));
    await waitFor(() => expect(screen.getAllByRole('cell')[6]).toHaveTextContent('Cucumber User, GS Hermione Granger, SS'));
    await waitFor(() => expect(screen.getAllByRole('cell')[16]).toHaveTextContent('Orange, GS Hermione Granger, SS'));
  });

  it('clicking Topics column header will sort by topics', async () => {
    const columnHeader = await screen.findByText(/topic\(s\)/i);

    fetchMock.get(
      '/api/activity-reports?sortBy=topics&sortDir=asc&offset=0&limit=10&region.in[]=1',
      { count: 2, rows: activityReportsSorted },
    );

    await act(async () => fireEvent.click(columnHeader));
    await waitFor(() => expect(screen.getAllByRole('cell')[15]).toHaveTextContent(/Behavioral \/ Mental Health CLASS: Instructional Support click to visually reveal the topics for R14-AR-1$/i));
  });

  it('clicking Creator column header will sort by author', async () => {
    const columnHeader = await screen.findByText(/creator/i);

    fetchMock.get(
      '/api/activity-reports?sortBy=author&sortDir=asc&offset=0&limit=10&region.in[]=1',
      { count: 2, rows: activityReportsSorted },
    );

    fireEvent.click(columnHeader);
    await waitFor(() => expect(screen.getAllByRole('cell')[3]).toHaveTextContent('Kiwi, GS'));
    await waitFor(() => expect(screen.getAllByRole('cell')[13]).toHaveTextContent('Kiwi, TTAC'));
  });

  it('clicking Start date column header will sort by start date', async () => {
    const columnHeader = await screen.findByText(/start date/i);

    fetchMock.get(
      '/api/activity-reports?sortBy=startDate&sortDir=asc&offset=0&limit=10&region.in[]=1',
      { count: 2, rows: activityReportsSorted },
    );

    fireEvent.click(columnHeader);
    await waitFor(() => expect(screen.getAllByRole('cell')[2]).toHaveTextContent('02/01/2021'));
    await waitFor(() => expect(screen.getAllByRole('cell')[12]).toHaveTextContent('02/08/2021'));
  });

  it('clicking Grantee column header will sort by grantee', async () => {
    const columnHeader = await screen.findByRole('button', {
      name: /recipient\. activate to sort ascending/i,
    });

    fetchMock.get(
      '/api/activity-reports?sortBy=activityRecipients&sortDir=asc&offset=0&limit=10&region.in[]=1',
      { count: 2, rows: activityReportsSorted },
    );

    fireEvent.click(columnHeader);
    await waitFor(() => expect(screen.getAllByRole('cell')[1]).toHaveTextContent('Johnston-Romaguera Johnston-Romaguera Grantee Name'));
  });

  it('clicking Report id column header will sort by region and id', async () => {
    const columnHeader = await screen.findByText(/report id/i);

    fetchMock.get(
      '/api/activity-reports?sortBy=regionId&sortDir=asc&offset=0&limit=10&region.in[]=1',
      { count: 2, rows: activityReportsSorted },
    );

    expect((await screen.findAllByRole('link'))[3]).toHaveTextContent('R14-AR-1');
    expect((await screen.findAllByRole('link'))[4]).toHaveTextContent('R14-AR-2');
    fireEvent.click(columnHeader);

    await waitFor(() => screen.queryByText('Loading Data') === null);
    expect((await screen.findAllByRole('link'))[3]).toHaveTextContent('R14-AR-2');
    expect((await screen.findAllByRole('link'))[4]).toHaveTextContent('R14-AR-1');
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

  it('clicking on pagination page works', async () => {
    const pageOne = await screen.findByRole('link', {
      name: /go to page number 1/i,
    });
    fetchMock.reset();
    fetchMock.get(
      defaultBaseUrlWithRegionOne,
      { count: 2, rows: activityReportsSorted },
    );

    fireEvent.click(pageOne);
    await waitFor(() => expect(screen.getAllByRole('cell')[7]).toHaveTextContent(/02\/05\/2021/i));
    await waitFor(() => expect(screen.getAllByRole('cell')[17]).toHaveTextContent(/02\/04\/2021/i));
  });

  it('clicking on the second page updates to, from and total', async () => {
    expect(generateXFakeReports(10).length).toBe(10);
    await screen.findByRole('link', {
      name: /go to page number 1/i,
    });
    fetchMock.reset();
    fetchMock.get(
      defaultBaseUrlWithRegionOne,
      { count: 17, rows: generateXFakeReports(10) },
    );
    const user = {
      name: 'test@test.com',
      homeRegionId: 14,
      permissions: [
        {
          scopeId: 3,
          regionId: 1,
        },
      ],
    };

    renderTable(user);

    const pageTwo = await screen.findByRole('link', {
      name: /go to page number 2/i,
    });

    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=10&limit=10&region.in[]=1',
      { count: 17, rows: generateXFakeReports(10) },
    );

    fireEvent.click(pageTwo);
    await waitFor(() => expect(screen.getByText(/11-17 of 17/i)).toBeVisible());
  });
});
