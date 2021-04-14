import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import fetchMock from 'fetch-mock';

import UserContext from '../../../UserContext';
import Landing from '../index';
import activityReports, { activityReportsSorted, generateXFakeReports } from '../mocks';
import { getReportsDownloadURL } from '../../../fetchers/helpers';

jest.mock('../../../fetchers/helpers');

const oldWindowLocation = window.location;

const renderLanding = (user) => {
  render(
    <MemoryRouter>
      <UserContext.Provider value={{ user }}>
        <Landing authenticated />
      </UserContext.Provider>
    </MemoryRouter>,
  );
};

describe('Landing Page', () => {
  beforeEach(async () => {
    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10',
      { count: 2, rows: activityReports },
    );
    fetchMock.get('/api/activity-reports/alerts?sortBy=startDate&sortDir=desc&offset=0&limit=10',
      { alertsCount: 0, alerts: [] });
    const user = {
      name: 'test@test.com',
      permissions: [
        {
          scopeId: 3,
          regionId: 1,
        },
      ],
    };

    renderLanding(user);
    await screen.findByText('Activity Reports');
  });
  afterEach(() => fetchMock.restore());

  test('displays a dismissable alert with a status message for a report, if provided', async () => {
    const user = {
      name: 'test@test.com',
      permissions: [
        {
          scopeId: 3,
          regionId: 1,
        },
      ],
    };
    const message = {
      status: 'TESTED',
      displayId: 'R14-AR-1',
      time: 'today',
    };

    const pastLocations = [
      { pathname: '/activity-reports/1', state: { message } },
    ];

    await render(
      <MemoryRouter initialEntries={pastLocations}>
         <UserContext.Provider value={{ user }}>
           <Landing authenticated />
         </UserContext.Provider>
       </MemoryRouter>,
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toBeVisible();

    const alertButton = await screen.findByLabelText(/dismiss alert/i);
    expect(alertButton).toBeVisible();

    fireEvent.click(alertButton);

    // https://testing-library.com/docs/guide-disappearance#waiting-for-disappearance
    await waitFor(() => {
      expect(screen.queryByText(/you successfully tested report R14-AR-1 on today/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/dismiss alert/i)).not.toBeInTheDocument();
    });
  });

  test('displays activity reports heading', async () => {
    expect(await screen.findByText('Activity Reports')).toBeVisible();
  });

  test('displays report id column', async () => {
    const reportIdColumnHeader = await screen.findByRole('columnheader', {
      name: /report id/i,
    });
    expect(reportIdColumnHeader).toBeVisible();
  });

  test('displays grantee column', async () => {
    const granteeColumnHeader = await screen.findByRole('columnheader', {
      name: /grantee/i,
    });
    expect(granteeColumnHeader).toBeVisible();
  });

  test('displays start date column', async () => {
    const startDateColumnHeader = await screen.findByRole('columnheader', {
      name: /start date/i,
    });
    expect(startDateColumnHeader).toBeVisible();
  });

  test('displays creator column', async () => {
    const creatorColumnHeader = await screen.findByRole('columnheader', {
      name: /creator/i,
    });
    expect(creatorColumnHeader).toBeVisible();
  });

  test('displays topics column', async () => {
    const topicsColumnHeader = await screen.findByRole('columnheader', {
      name: /topic\(s\)/i,
    });
    expect(topicsColumnHeader).toBeVisible();
  });

  test('displays the correct report id', async () => {
    const reportIdLink = await screen.findByRole('link', {
      name: /r14-ar-1/i,
    });

    expect(reportIdLink).toBeVisible();
    expect(reportIdLink.closest('a')).toHaveAttribute(
      'href',
      '/activity-reports/1',
    );
  });

  test('displays the correct grantees', async () => {
    const grantee = await screen.findByRole('cell', {
      name: /johnston-romaguera\njohnston-romaguera\ngrantee name/i,
    });
    const nonGrantee = await screen.findByRole('cell', {
      name: /qris system/i,
    });

    expect(grantee).toBeVisible();
    expect(nonGrantee).toBeVisible();
  });

  test('displays the correct start date', async () => {
    const startDate = await screen.findByRole('cell', {
      name: /02\/08\/2021/i,
    });

    expect(startDate).toBeVisible();
  });

  test('displays the correct topics', async () => {
    const topics = await screen.findByRole('cell', {
      name: /behavioral \/ mental health\nclass: instructional support/i,
    });

    expect(topics).toBeVisible();
    expect(topics.firstChild).toHaveClass('smart-hub--ellipsis');
    expect(topics.firstChild.firstChild).toHaveClass('usa-tag smart-hub--table-collection');
    expect(topics.firstChild).toHaveTextContent('Behavioral / Mental HealthCLASS: Instructional Support');
  });

  test('displays the correct collaborators', async () => {
    const collaborators = await screen.findByRole('cell', {
      name: /cucumber user, gs\nhermione granger, ss/i,
    });

    expect(collaborators).toBeVisible();
    expect(collaborators.firstChild).toHaveClass('smart-hub--ellipsis');
    expect(collaborators.firstChild.children.length).toBe(2);
    expect(collaborators.firstChild.firstChild).toHaveClass('usa-tag smart-hub--table-collection');
    expect(collaborators.firstChild.firstChild).toHaveTextContent('Cucumber User');
    expect(collaborators.firstChild.lastChild).toHaveTextContent('Hermione Granger');
  });

  test('displays the correct last saved dates', async () => {
    const lastSavedDates = await screen.findAllByText(/02\/04\/2021/i);

    expect(lastSavedDates.length).toBe(1);
  });

  test('displays the correct statuses', async () => {
    const draft = await screen.findByText(/draft/i);
    const needsAction = await screen.findByText(/needs action/i);

    expect(draft).toBeVisible();
    expect(needsAction).toBeVisible();
  });

  test('displays the options buttons', async () => {
    const optionButtons = await screen.findAllByRole('button', {
      name: /actions for activity report r14-ar-2/i,
    });

    expect(optionButtons.length).toBe(1);
  });

  test('displays the new activity report button', async () => {
    const newActivityReportBtns = await screen.findAllByText(/New Activity Report/);

    expect(newActivityReportBtns.length).toBe(1);
  });
});

describe('Landing Page sorting', () => {
  afterEach(() => fetchMock.restore());

  beforeEach(async () => {
    fetchMock.get('/api/activity-reports/alerts?sortBy=startDate&sortDir=desc&offset=0&limit=10',
      { alertsCount: 0, alerts: [] });
    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10',
      { count: 2, rows: activityReports },
    );
    const user = {
      name: 'test@test.com',
      permissions: [
        {
          scopeId: 3,
          regionId: 1,
        },
      ],
    };

    renderLanding(user);
    await screen.findByText('Activity Reports');
  });

  it('clicking status column header will sort by status', async () => {
    const statusColumnHeader = await screen.findByText(/status/i);
    fetchMock.reset();
    fetchMock.get('/api/activity-reports/alerts?sortBy=startDate&sortDir=desc&offset=0&limit=10',
      { alertsCount: 0, alerts: [] });
    fetchMock.get(
      '/api/activity-reports?sortBy=status&sortDir=asc&offset=0&limit=10',
      { count: 2, rows: activityReportsSorted },
    );

    fireEvent.click(statusColumnHeader);

    await waitFor(() => expect(screen.getAllByRole('cell')[7]).toHaveTextContent(/needs action/i));
    await waitFor(() => expect(screen.getAllByRole('cell')[16]).toHaveTextContent(/draft/i));

    fetchMock.get(
      '/api/activity-reports?sortBy=status&sortDir=desc&offset=0&limit=10',
      { count: 2, rows: activityReports },
    );

    fireEvent.click(statusColumnHeader);
    await waitFor(() => expect(screen.getAllByRole('cell')[7]).toHaveTextContent(/draft/i));
    await waitFor(() => expect(screen.getAllByRole('cell')[16]).toHaveTextContent(/needs action/i));
  });

  it('clicking Last saved column header will sort by updatedAt', async () => {
    const columnHeader = await screen.findByText(/last saved/i);

    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=asc&offset=0&limit=10',
      { count: 2, rows: activityReportsSorted },
    );

    fireEvent.click(columnHeader);
    await waitFor(() => expect(screen.getAllByRole('cell')[6]).toHaveTextContent(/02\/04\/2021/i));
    await waitFor(() => expect(screen.getAllByRole('cell')[15]).toHaveTextContent(/02\/05\/2021/i));
  });

  it('clicking Collaborators column header will sort by collaborators', async () => {
    const columnHeader = await screen.findByText(/collaborator\(s\)/i);

    fetchMock.get(
      '/api/activity-reports?sortBy=collaborators&sortDir=asc&offset=0&limit=10',
      { count: 2, rows: activityReportsSorted },
    );

    fireEvent.click(columnHeader);

    await waitFor(() => expect(screen.getAllByRole('cell')[5]).toHaveTextContent('Cucumber User, GSHermione Granger, SS'));
    await waitFor(() => expect(screen.getAllByRole('cell')[14]).toHaveTextContent('Orange, GSHermione Granger, SS'));
  });

  it('clicking Topics column header will sort by topics', async () => {
    const columnHeader = await screen.findByText(/topic\(s\)/i);

    fetchMock.get(
      '/api/activity-reports?sortBy=topics&sortDir=asc&offset=0&limit=10',
      { count: 2, rows: activityReportsSorted },
    );

    fireEvent.click(columnHeader);
    await waitFor(() => expect(screen.getAllByRole('cell')[4]).toHaveTextContent(''));
    await waitFor(() => expect(screen.getAllByRole('cell')[13]).toHaveTextContent('Behavioral / Mental HealthCLASS: Instructional Support'));
  });

  it('clicking Creator column header will sort by author', async () => {
    const columnHeader = await screen.findByText(/creator/i);

    fetchMock.get(
      '/api/activity-reports?sortBy=author&sortDir=asc&offset=0&limit=10',
      { count: 2, rows: activityReportsSorted },
    );

    fireEvent.click(columnHeader);
    await waitFor(() => expect(screen.getAllByRole('cell')[3]).toHaveTextContent('Kiwi, GS'));
    await waitFor(() => expect(screen.getAllByRole('cell')[12]).toHaveTextContent('Kiwi, TTAC'));
  });

  it('clicking Start date column header will sort by start date', async () => {
    const columnHeader = await screen.findByText(/start date/i);

    fetchMock.get(
      '/api/activity-reports?sortBy=startDate&sortDir=asc&offset=0&limit=10',
      { count: 2, rows: activityReportsSorted },
    );

    fireEvent.click(columnHeader);
    await waitFor(() => expect(screen.getAllByRole('cell')[2]).toHaveTextContent('02/01/2021'));
    await waitFor(() => expect(screen.getAllByRole('cell')[11]).toHaveTextContent('02/08/2021'));
  });

  it('clicking Grantee column header will sort by grantee', async () => {
    const columnHeader = await screen.findByRole('button', {
      name: /grantee\. activate to sort ascending/i,
    });

    fetchMock.get(
      '/api/activity-reports?sortBy=activityRecipients&sortDir=asc&offset=0&limit=10',
      { count: 2, rows: activityReportsSorted },
    );

    fireEvent.click(columnHeader);
    await waitFor(() => expect(screen.getAllByRole('cell')[1]).toHaveTextContent('Johnston-RomagueraJohnston-RomagueraGrantee Name'));
  });

  it('clicking Report id column header will sort by region and id', async () => {
    const columnHeader = await screen.findByText(/report id/i);

    fetchMock.get(
      '/api/activity-reports?sortBy=regionId&sortDir=asc&offset=0&limit=10',
      { count: 2, rows: activityReportsSorted },
    );

    fireEvent.click(columnHeader);
    await waitFor(() => expect(screen.getAllByRole('link')[4]).toHaveTextContent('R14-AR-2'));
    await waitFor(() => expect(screen.getAllByRole('link')[5]).toHaveTextContent('R14-AR-1'));
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
    fetchMock.get('/api/activity-reports/alerts?sortBy=startDate&sortDir=desc&offset=0&limit=10',
      { alertsCount: 0, alerts: [] });
    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10',
      { count: 2, rows: activityReportsSorted },
    );

    fireEvent.click(pageOne);
    await waitFor(() => expect(screen.getAllByRole('cell')[6]).toHaveTextContent(/02\/05\/2021/i));
    await waitFor(() => expect(screen.getAllByRole('cell')[15]).toHaveTextContent(/02\/04\/2021/i));
  });

  it('clicking on the second page updates to, from and total', async () => {
    expect(generateXFakeReports(10).length).toBe(10);
    await screen.findByRole('link', {
      name: /go to page number 1/i,
    });
    fetchMock.reset();
    fetchMock.get('/api/activity-reports/alerts?sortBy=startDate&sortDir=desc&offset=0&limit=10',
      { alertsCount: 0, alerts: [] });
    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10',
      { count: 17, rows: generateXFakeReports(10) },
    );
    const user = {
      name: 'test@test.com',
      permissions: [
        {
          scopeId: 3,
          regionId: 1,
        },
      ],
    };

    renderLanding(user);

    const pageTwo = await screen.findByRole('link', {
      name: /go to page number 2/i,
    });

    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=10&limit=10',
      { count: 17, rows: generateXFakeReports(10) },
    );

    fireEvent.click(pageTwo);
    await waitFor(() => expect(screen.getByText(/11-17 of 17/i)).toBeVisible());
  });
});

describe('Landing page table menus & selections', () => {
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
      fetchMock.get('/api/activity-reports/alerts?sortBy=startDate&sortDir=desc&offset=0&limit=10',
        { alertsCount: 0, alerts: [] });
      fetchMock.get(
        '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10',
        { count: 10, rows: generateXFakeReports(10) },
      );
      const user = {
        name: 'test@test.com',
        permissions: [
          {
            scopeId: 3,
            regionId: 1,
          },
        ],
      };

      renderLanding(user);
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
      fetchMock.get('/api/activity-reports/alerts?sortBy=startDate&sortDir=desc&offset=0&limit=10',
        { alertsCount: 0, alerts: [] });
      fetchMock.get(
        '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10',
        { count: 10, rows: generateXFakeReports(10) },
      );
      const user = {
        name: 'test@test.com',
        permissions: [
          {
            scopeId: 3,
            regionId: 1,
          },
        ],
      };

      renderLanding(user);
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

  describe('Table header checkbox', () => {
    afterEach(() => fetchMock.restore());

    beforeEach(async () => {
      fetchMock.reset();
      fetchMock.get('/api/activity-reports/alerts?sortBy=startDate&sortDir=desc&offset=0&limit=10',
        { alertsCount: 0, alerts: [] });
      fetchMock.get(
        '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10',
        { count: 10, rows: generateXFakeReports(10) },
      );
      const user = {
        name: 'test@test.com',
        permissions: [
          {
            scopeId: 3,
            regionId: 1,
          },
        ],
      };

      renderLanding(user);
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

  describe('Tablewide Context Menu', () => {
    beforeAll(() => {
      delete global.window.location;

      global.window.location = {
        ...oldWindowLocation,
        assign: jest.fn(),
      };
    });

    beforeEach(async () => {
      fetchMock.reset();
      fetchMock.get('/api/activity-reports/alerts?sortBy=startDate&sortDir=desc&offset=0&limit=10',
        { alertsCount: 0, alerts: [] });
      fetchMock.get(
        '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10',
        { count: 10, rows: generateXFakeReports(10) },
      );
      const user = {
        name: 'test@test.com',
        permissions: [
          {
            scopeId: 3,
            regionId: 1,
          },
        ],
      };

      renderLanding(user);
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

    it('Download a single selected report', async () => {
      const reportCheckboxes = await screen.findAllByRole('checkbox', { name: /select /i });

      // Element 0 is 'Select all', so we want 1 or later
      const singleReportCheck = reportCheckboxes[1];
      expect(singleReportCheck.value).toEqual('1');

      fireEvent.click(singleReportCheck);

      const contextMenu = await screen.findByLabelText(/actions for selected reports/i);

      fireEvent.click(contextMenu);

      const downloadButton = await screen.findByRole('button', { name: 'Download Selected Reports' });

      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(getReportsDownloadURL).toHaveBeenCalledWith(['1']);
        expect(window.location.assign).toHaveBeenCalled();
      });
    });

    it('Can trigger the download of multiple reports', async () => {
      // Try selecting all reports first
      const selectAllCheckbox = await screen.findByLabelText(/select or de-select all reports/i);

      fireEvent.click(selectAllCheckbox);

      const contextMenu = await screen.findByLabelText(/actions for selected reports/i);

      fireEvent.click(contextMenu);

      const downloadButton = await screen.findByRole('button', { name: 'Download Selected Reports' });

      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(getReportsDownloadURL).toHaveBeenCalled();
        expect(window.location.assign).toHaveBeenCalled();
      });
    });

    it('Does not trigger download when no reports are selected', async () => {
      const contextMenu = await screen.findByLabelText(/actions for selected reports/i);
      fireEvent.click(contextMenu);

      const downloadButton = await screen.findByRole('button', { name: 'Download Selected Reports' });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(getReportsDownloadURL).not.toHaveBeenCalled();
        expect(window.location.assign).not.toHaveBeenCalled();
      });
    });
  });
});

describe('My alerts sorting', () => {
  afterEach(() => fetchMock.restore());

  beforeEach(async () => {
    fetchMock.get('/api/activity-reports/alerts?sortBy=startDate&sortDir=desc&offset=0&limit=10',
      { alertsCount: 2, alerts: activityReports });
    fetchMock.get('/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10',
      { count: 0, rows: [] });
    const user = {
      name: 'test@test.com',
      permissions: [
        {
          scopeId: 3,
          regionId: 1,
        },
      ],
    };

    renderLanding(user);
    await screen.findByText('Activity Reports');
  });

  it('is enabled for Status', async () => {
    const statusColumnHeaders = await screen.findAllByText(/status/i);

    expect(statusColumnHeaders.length).toBe(2);
    fetchMock.reset();
    fetchMock.get('/api/activity-reports/alerts?sortBy=status&sortDir=asc&offset=0&limit=10',
      { alertsCount: 2, alerts: activityReports });
    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10',
      { count: 0, rows: [] },
    );

    fireEvent.click(statusColumnHeaders[0]);
    await waitFor(() => expect(screen.getAllByRole('cell')[5]).toHaveTextContent(/draft/i));
    await waitFor(() => expect(screen.getAllByRole('cell')[12]).toHaveTextContent(/needs action/i));

    fetchMock.get('/api/activity-reports/alerts?sortBy=status&sortDir=desc&offset=0&limit=10',
      { alertsCount: 2, alerts: activityReportsSorted });

    fireEvent.click(statusColumnHeaders[0]);
    await waitFor(() => expect(screen.getAllByRole('cell')[5]).toHaveTextContent(/needs action/i));
    await waitFor(() => expect(screen.getAllByRole('cell')[12]).toHaveTextContent(/draft/i));
  });

  it('is enabled for Report ID', async () => {
    const columnHeaders = await screen.findAllByText(/report id/i);

    expect(columnHeaders.length).toBe(2);
    fetchMock.reset();
    fetchMock.get('/api/activity-reports/alerts?sortBy=regionId&sortDir=asc&offset=0&limit=10',
      { alertsCount: 2, alerts: activityReports });
    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10',
      { count: 0, rows: [] },
    );

    fireEvent.click(columnHeaders[0]);
    await waitFor(() => expect(screen.getAllByRole('cell')[0]).toHaveTextContent(/r14-ar-1/i));
    await waitFor(() => expect(screen.getAllByRole('cell')[7]).toHaveTextContent(/r14-ar-2/i));
  });

  it('is enabled for Grantee', async () => {
    const columnHeaders = await screen.findAllByRole('button', {
      name: /grantee\. activate to sort ascending/i,
    });
    expect(columnHeaders.length).toBe(2);
    fetchMock.reset();
    fetchMock.get('/api/activity-reports/alerts?sortBy=activityRecipients&sortDir=asc&offset=0&limit=10',
      { alertsCount: 2, alerts: activityReports });
    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10',
      { count: 0, rows: [] },
    );

    fireEvent.click(columnHeaders[0]);

    await waitFor(() => expect(screen.getAllByRole('cell')[1]).toHaveTextContent(/Johnston-RomagueraJohnston-RomagueraGrantee Name/i));
    await waitFor(() => expect(screen.getAllByRole('cell')[8]).toHaveTextContent(/qris system/i));
  });

  it('is enabled for Start date', async () => {
    const columnHeaders = await screen.findAllByText(/start date/i);

    expect(columnHeaders.length).toBe(2);
    fetchMock.reset();
    fetchMock.get('/api/activity-reports/alerts?sortBy=startDate&sortDir=asc&offset=0&limit=10',
      { alertsCount: 2, alerts: activityReportsSorted });
    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10',
      { count: 0, rows: [] },
    );

    fireEvent.click(columnHeaders[0]);

    await waitFor(() => expect(screen.getAllByRole('cell')[2]).toHaveTextContent(/02\/01\/2021/i));
    await waitFor(() => expect(screen.getAllByRole('cell')[9]).toHaveTextContent(/02\/08\/2021/i));
  });

  it('is enabled for Creator', async () => {
    const columnHeaders = await screen.findAllByText(/creator/i);

    expect(columnHeaders.length).toBe(2);
    fetchMock.reset();
    fetchMock.get('/api/activity-reports/alerts?sortBy=author&sortDir=asc&offset=0&limit=10',
      { alertsCount: 2, alerts: activityReportsSorted });
    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10',
      { count: 0, rows: [] },
    );

    fireEvent.click(columnHeaders[0]);

    await waitFor(() => expect(screen.getAllByRole('cell')[3]).toHaveTextContent(/kiwi, gs/i));
    await waitFor(() => expect(screen.getAllByRole('cell')[10]).toHaveTextContent(/kiwi, ttac/i));
  });

  it('is enabled for Collaborator(s)', async () => {
    const columnHeaders = await screen.findAllByText(/collaborator\(s\)/i);
    expect(columnHeaders.length).toBe(2);
    fetchMock.reset();
    fetchMock.get('/api/activity-reports/alerts?sortBy=collaborators&sortDir=asc&offset=0&limit=10',
      { alertsCount: 2, alerts: activityReportsSorted });
    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10',
      { count: 0, rows: [] },
    );

    fireEvent.click(columnHeaders[0]);

    await waitFor(() => expect(screen.getAllByRole('cell')[4]).toHaveTextContent(/cucumber user, gshermione granger, ss/i));
    await waitFor(() => expect(screen.getAllByRole('cell')[11]).toHaveTextContent(/orange, gshermione granger, ss/i));
  });
});

describe('Landing Page error', () => {
  afterEach(() => fetchMock.restore());

  beforeEach(() => {
    fetchMock.get('/api/activity-reports/alerts?sortBy=startDate&sortDir=desc&offset=0&limit=10',
      { alertsCount: 0, alerts: [] });
  });

  it('handles errors by displaying an error message', async () => {
    fetchMock.get('/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10', 500);
    const user = {
      name: 'test@test.com',
      permissions: [
        {
          scopeId: 3,
          regionId: 1,
        },
      ],
    };
    renderLanding(user);
    const alert = await screen.findByRole('alert');
    expect(alert).toBeVisible();
    expect(alert).toHaveTextContent('Unable to fetch reports');
  });

  it('displays an empty row if there are no reports', async () => {
    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10',
      { count: 0, rows: [] },
    );
    const user = {
      name: 'test@test.com',
      permissions: [
        {
          scopeId: 3,
          regionId: 1,
        },
      ],
    };
    renderLanding(user);
    const rowCells = await screen.findAllByRole('cell');
    expect(rowCells.length).toBe(9);
    const grantee = rowCells[1];
    expect(grantee).toHaveTextContent('');
  });

  it('does not displays new activity report button without permission', async () => {
    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10',
      { count: 2, rows: activityReports },
    );
    const user = {
      name: 'test@test.com',
      permissions: [
        {
          scopeId: 2,
          regionId: 1,
        },
      ],
    };
    renderLanding(user);

    await expect(screen.findAllByText(/New Activity Report/)).rejects.toThrow();
  });
});
