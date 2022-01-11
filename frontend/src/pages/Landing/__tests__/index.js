/* eslint-disable jest/no-disabled-tests */
import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, fireEvent, waitFor, within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import fetchMock from 'fetch-mock';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import UserContext from '../../../UserContext';
import AriaLiveContext from '../../../AriaLiveContext';
import Landing from '../index';
import activityReports, { activityReportsSorted, generateXFakeReports, overviewRegionOne } from '../mocks';
import { getAllAlertsDownloadURL } from '../../../fetchers/helpers';

jest.mock('../../../fetchers/helpers');

const mockAnnounce = jest.fn();

const base = '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10';
const baseAlerts = '/api/activity-reports/alerts?sortBy=startDate&sortDir=desc&offset=0&limit=10';

const withRegionOne = '&region.in[]=1';
const baseAlertsWithRegionOne = `${baseAlerts}${withRegionOne}`;
const baseWithRegionOne = `${base}${withRegionOne}`;

const defaultOverviewUrl = '/api/widgets/overview?';
const defaultOverviewUrlWithRegionOne = `${defaultOverviewUrl}${withRegionOne}`;
const overviewUrlWithRegionOne = `${defaultOverviewUrl}?region.in[]=1`;
const inTest = 'reportId.in[]=test';

const mockFetchWithRegionOne = () => {
  fetchMock.get(baseWithRegionOne, { count: 2, rows: activityReports });
  fetchMock.get(baseAlertsWithRegionOne, {
    alertsCount: 0,
    alerts: [],
  });
  fetchMock.get(overviewUrlWithRegionOne, overviewRegionOne);
};

const renderLanding = (user) => {
  render(
    <MemoryRouter>
      <AriaLiveContext.Provider value={{ announce: mockAnnounce }}>
        <UserContext.Provider value={{ user }}>
          <Landing authenticated />
        </UserContext.Provider>
      </AriaLiveContext.Provider>
    </MemoryRouter>,
  );
};

describe('Landing Page', () => {
  beforeEach(async () => {
    fetchMock.get(base, { count: 2, rows: activityReports });
    fetchMock.get(baseWithRegionOne, { count: 2, rows: activityReports });
    fetchMock.get(baseAlertsWithRegionOne, {
      alertsCount: 0,
      alerts: [],
    });
    fetchMock.get(baseAlerts, {
      alertsCount: 0,
      alerts: [],
    });
    fetchMock.get(defaultOverviewUrl, overviewRegionOne);
    fetchMock.get(overviewUrlWithRegionOne, overviewRegionOne);

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
    await screen.findByText('Activity reports');
  });
  afterEach(() => fetchMock.restore());

  test('displays a dismissable alert with a status message for a report, if provided', async () => {
    const user = {
      name: 'test@test.com',
      homeRegionId: 1,
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

    render(
      <MemoryRouter initialEntries={pastLocations}>
        <UserContext.Provider value={{ user }}>
          <Landing authenticated user={user} />
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
    expect(await screen.findByRole('heading', { name: /Activity reports - /i })).toBeVisible();
  });

  test('displays report id column', async () => {
    const reportIdColumnHeader = await screen.findByRole('columnheader', {
      name: /report id/i,
    });
    expect(reportIdColumnHeader).toBeVisible();
  });

  test('displays recipient column', async () => {
    const recipientColumnHeader = await screen.findByRole('columnheader', {
      name: /recipient/i,
    });
    expect(recipientColumnHeader).toBeVisible();
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

  test('displays the correct recipients', async () => {
    const recipient = await screen.findByRole('button', { name: /johnston-romaguera johnston-romaguera recipient name click to visually reveal the recipients for r14-ar-1/i });
    const otherEntity = await screen.findByRole('cell', {
      name: /qris system/i,
    });

    expect(recipient).toBeVisible();
    expect(otherEntity).toBeVisible();
  });

  test('displays the correct start date', async () => {
    const startDate = await screen.findByRole('cell', {
      name: /02\/08\/2021/i,
    });

    expect(startDate).toBeVisible();
  });

  test('displays the correct topics', async () => {
    const topics = await screen.findByRole('button', { name: /behavioral \/ mental health class: instructional support click to visually reveal the topics for r14-ar-1/i });

    expect(topics).toBeVisible();
    expect(topics.firstChild).toHaveClass('smart-hub--ellipsis');
    expect(topics.firstChild.firstChild.firstChild).toHaveClass('smart-hub--tooltip-truncated');
    expect(topics.firstChild).toHaveTextContent('Behavioral / Mental Health CLASS: Instructional Support');
  });

  test('displays the correct collaborators', async () => {
    const collaborators = await screen.findByRole('cell', { name: /orange, gs hermione granger, ss click to visually reveal the collaborators for r14-ar-1/i });
    expect(collaborators).toBeVisible();
    expect(collaborators.firstChild).toHaveClass('smart-hub--tooltip');
    expect(collaborators.firstChild.children.length).toBe(2);
    const truncated = collaborators.firstChild.children[1].firstChild.firstChild.firstChild;
    expect(truncated).toHaveClass('smart-hub--tooltip-truncated');
    expect(truncated).toHaveTextContent('Orange, GS');
  });

  test('displays the correct last saved dates', async () => {
    const lastSavedDates = await screen.findAllByText(/02\/04\/2021/i);

    expect(lastSavedDates.length).toBe(1);
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

describe('Landing page table menus & selections', () => {
  describe('download all alerts button', () => {
    describe('downloads all alerts', () => {
      afterAll(() => {
        getAllAlertsDownloadURL.mockClear();
      });

      beforeAll(async () => {
        fetchMock.reset();
        fetchMock.get(
          baseAlerts,
          { count: 10, alerts: generateXFakeReports(10) },
        );
        fetchMock.get(
          base,
          { count: 10, rows: [] },
        );
        fetchMock.get(overviewUrlWithRegionOne, overviewRegionOne);

        window.location = {
          assign: jest.fn(),
        };
        fetchMock.get(defaultOverviewUrl, overviewRegionOne);
      });

      it('downloads all reports', async () => {
        const user = {
          name: 'test@test.com',
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

        renderLanding(user);
        const reportMenu = await screen.findByLabelText(/my alerts report menu/i);
        userEvent.click(reportMenu);
        const downloadButton = await screen.findByRole('menuitem', { name: /export table data/i });
        userEvent.click(downloadButton);
        expect(getAllAlertsDownloadURL).toHaveBeenCalledWith('');
      });

      it('disables alert download button while downloading', async () => {
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

        renderLanding(user);
        const reportMenu = await screen.findByLabelText(/my alerts report menu/i);
        userEvent.click(reportMenu);
        expect(await screen.findByRole('menuitem', { name: /export table data/i })).not.toBeDisabled();
        const downloadButton = await screen.findByRole('menuitem', { name: /export table data/i });
        userEvent.click(downloadButton);
        expect(await screen.findByRole('menuitem', { name: /export table data/i })).toBeDisabled();
        expect(getAllAlertsDownloadURL).toHaveBeenCalledWith('');
      });
    });
  });
});

describe('My alerts sorting', () => {
  afterEach(() => fetchMock.restore());

  beforeEach(async () => {
    fetchMock.reset();

    // Alerts.
    fetchMock.get(baseAlerts, {
      alertsCount: 2,
      alerts: activityReports,
    });

    // Alerts Region 1.
    fetchMock.get(baseAlertsWithRegionOne, {
      alertsCount: 2,
      alerts: activityReports,
    });

    // Activity Reports.
    fetchMock.get(base, { count: 0, rows: [] });

    // Activity Reports Region 1.
    fetchMock.get(baseWithRegionOne, { count: 0, rows: [] });

    // Overview.
    fetchMock.get(defaultOverviewUrl, overviewRegionOne);

    // Overview Region 1.
    fetchMock.get(overviewUrlWithRegionOne, overviewRegionOne);

    fetchMock.get(defaultOverviewUrlWithRegionOne, overviewRegionOne);

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

    renderLanding(user);
    await screen.findByText('Activity reports');
  });

  it('is enabled for Status', async () => {
    const statusColumnHeaders = await screen.findAllByText(/status/i);

    expect(statusColumnHeaders.length).toBe(1);
    fetchMock.reset();

    fireEvent.click(statusColumnHeaders[0]);

    await waitFor(() => expect(screen.getAllByRole('cell')[7]).toHaveTextContent(/draft/i));
    await waitFor(() => expect(screen.getAllByRole('cell')[16]).toHaveTextContent(/needs action/i));

    fetchMock.get('/api/activity-reports/alerts?sortBy=calculatedStatus&sortDir=desc&offset=0&limit=10',
      { alertsCount: 2, alerts: activityReportsSorted });

    fireEvent.click(statusColumnHeaders[0]);
    await waitFor(() => expect(screen.getAllByRole('cell')[7]).toHaveTextContent(/needs action/i));
    await waitFor(() => expect(screen.getAllByRole('cell')[16]).toHaveTextContent(/draft/i));
  });

  it('is enabled for Report ID', async () => {
    const reportIdHeaders = await screen.findAllByRole('columnheader', { name: /report id/i });
    expect(reportIdHeaders.length).toBe(2);
    fetchMock.reset();
    fetchMock.get('/api/activity-reports/alerts?sortBy=regionId&sortDir=asc&offset=0&limit=10',
      { alertsCount: 2, alerts: activityReports });
    fetchMock.get(
      base,
      { count: 0, rows: [] },
    );
    const columnHeaders = await screen.findAllByText(/report id/i);
    fireEvent.click(columnHeaders[0]);
    await waitFor(() => expect(screen.getAllByRole('cell')[0]).toHaveTextContent(/r14-ar-1/i));
    await waitFor(() => expect(screen.getAllByRole('cell')[9]).toHaveTextContent(/r14-ar-2/i));
  });

  it('is enabled for Recipient', async () => {
    const columnHeaders = await screen.findAllByRole('button', {
      name: /recipient\. activate to sort ascending/i,
    });
    expect(columnHeaders.length).toBe(2);
    fetchMock.reset();
    fetchMock.get('/api/activity-reports/alerts?sortBy=activityRecipients&sortDir=asc&offset=0&limit=10',
      { alertsCount: 2, alerts: activityReports });
    fetchMock.get(
      base,
      { count: 0, rows: [] },
    );

    fireEvent.click(columnHeaders[0]);

    const textContent = /Johnston-Romaguera Johnston-Romaguera Recipient Name click to visually reveal the recipients for R14-AR-1$/i;
    await waitFor(() => expect(screen.getAllByRole('cell')[1]).toHaveTextContent(textContent));
    await waitFor(() => expect(screen.getAllByRole('cell')[10]).toHaveTextContent(/qris system/i));
  });

  it('is enabled for Start date', async () => {
    const columnHeaders = await screen.findAllByText(/start date/i);

    expect(columnHeaders.length).toBe(2);
    fetchMock.reset();
    fetchMock.get('/api/activity-reports/alerts?sortBy=startDate&sortDir=asc&offset=0&limit=10',
      { alertsCount: 2, alerts: activityReportsSorted });
    fetchMock.get(
      base,
      { count: 0, rows: [] },
    );

    fireEvent.click(columnHeaders[0]);

    await waitFor(() => expect(screen.getAllByRole('cell')[2]).toHaveTextContent(/02\/01\/2021/i));
    await waitFor(() => expect(screen.getAllByRole('cell')[11]).toHaveTextContent(/02\/08\/2021/i));
  });

  it('is enabled for Creator', async () => {
    const columnHeaders = await screen.findAllByText(/creator/i);

    expect(columnHeaders.length).toBe(2);
    fetchMock.reset();
    fetchMock.get('/api/activity-reports/alerts?sortBy=author&sortDir=asc&offset=0&limit=10',
      { alertsCount: 2, alerts: activityReportsSorted });
    fetchMock.get(
      base,
      { count: 0, rows: [] },
    );

    fireEvent.click(columnHeaders[0]);

    await waitFor(() => expect(screen.getAllByRole('cell')[3]).toHaveTextContent(/kiwi, gs/i));
    await waitFor(() => expect(screen.getAllByRole('cell')[12]).toHaveTextContent(/kiwi, ttac/i));
  });

  it('is enabled for Collaborator(s)', async () => {
    const columnHeaders = await screen.findAllByText(/collaborator\(s\)/i);
    expect(columnHeaders.length).toBe(2);
    fetchMock.reset();

    fetchMock.get('/api/activity-reports/alerts?sortBy=collaborators&sortDir=asc&offset=0&limit=10',
      { alertsCount: 2, alerts: activityReportsSorted });
    fetchMock.get(`${base}`, { count: 0, rows: [] });

    fireEvent.click(columnHeaders[0]);

    const firstCell = /Cucumber User, GS Hermione Granger, SS click to visually reveal the collaborators for R14-AR-2$/i;
    const secondCell = /Orange, GS Hermione Granger, SS click to visually reveal the collaborators for R14-AR-1$/i;
    await waitFor(() => expect(screen.getAllByRole('cell')[5]).toHaveTextContent(firstCell));
    await waitFor(() => expect(screen.getAllByRole('cell')[14]).toHaveTextContent(secondCell));
  });
});

describe('handleApplyFilters', () => {
  beforeAll(() => fetchMock.reset());
  beforeEach(() => {
    delete window.location;
    window.location = new URL('https://www.test.gov');
    mockFetchWithRegionOne();
    fetchMock.get(base, { count: 2, rows: activityReports });
    fetchMock.get(defaultOverviewUrl, overviewRegionOne);
    fetchMock.get(baseAlerts, { alertsCount: 0, alerts: [] });

    fetchMock.get(`${defaultOverviewUrl}?${inTest}`, overviewRegionOne);
    fetchMock.get(`${baseAlerts}&${inTest}`, { alertsCount: 0, alerts: [] });
  });

  afterEach(() => fetchMock.restore());

  it('calls AriaLiveContext.announce', async () => {
    const user = {
      name: 'test@test.com',
      homeRegionId: 1,
      permissions: [
        {
          scopeId: 3,
          regionId: 1,
        },
      ],
    };
    renderLanding(user);

    // Only one button exists only because there are no alerts
    const filterMenuButton = await screen.findByRole('button', { name: /filters/i });
    fireEvent.click(filterMenuButton);

    // Add new filter
    const addNewFilterButton = await screen.findByRole('button', { name: /add new filter/i });
    fireEvent.click(addNewFilterButton);

    // Get filter group.
    const topic = await screen.findAllByRole('combobox', { name: /topic/i });
    userEvent.selectOptions(topic[0], 'reportId');

    const condition = await screen.findByRole('combobox', { name: 'condition' });
    userEvent.selectOptions(condition, 'Contains');

    fetchMock.get('/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&reportId.in[]=test', { count: 0, rows: [] });
    const query = await screen.findByRole('textbox');
    userEvent.type(query, 'test');

    // const apply = await screen.findByRole('button', { name: /apply filters to this page/i });
    const apply = await screen.findByTestId(/apply-filters-test-id/i);

    act(() => {
      userEvent.click(apply);
    });

    expect(mockAnnounce).toHaveBeenCalled();
    // wait for everything to finish loading
    await waitFor(() => expect(screen.queryByText(/Loading data/i)).toBeNull());
  });
});

describe('handleApplyAlertFilters', () => {
  beforeAll(() => fetchMock.reset());
  beforeEach(() => {
    delete window.location;
    window.location = new URL('https://www.test.gov');

    fetchMock.get(baseAlerts, {
      count: 10,
      alerts: generateXFakeReports(10),
    });

    fetchMock.get(base,
      { count: 1, rows: generateXFakeReports(1) });
    fetchMock.get(overviewUrlWithRegionOne, overviewRegionOne);
    fetchMock.get(`${base}&${inTest}`, {
      count: 0,
      rows: [],
    });
    fetchMock.get(`${defaultOverviewUrl}?${inTest}`, overviewRegionOne);
    fetchMock.get(`${baseAlerts}&${inTest}`, { alertsCount: 0, alerts: [] });

    fetchMock.get(defaultOverviewUrl, overviewRegionOne);
  });

  afterEach(() => fetchMock.restore());

  it('calls AriaLiveContext.announce', async () => {
    const user = {
      name: 'test@test.com',
      homeRegionId: 1,
      permissions: [
        {
          scopeId: 3,
          regionId: 1,
        },
      ],
    };
    renderLanding(user);

    // Only one filters button should be shown.
    const allFilterButtons = await screen.findAllByRole('button', { name: /filters/i });
    expect(allFilterButtons.length).toBe(1);

    const filterMenuButton = allFilterButtons[0];
    fireEvent.click(filterMenuButton);

    // Add new filter
    const addFilter = await screen.findByRole('button', { name: /add new filter/i });
    fireEvent.click(addFilter);

    const topic = await screen.findByRole('combobox', { name: 'topic' });
    userEvent.selectOptions(topic, 'reportId');

    const condition = await screen.findByRole('combobox', { name: 'condition' });
    userEvent.selectOptions(condition, 'Contains');

    const query = await screen.findByRole('textbox');
    userEvent.type(query, 'test');

    fetchMock.restore();
    fetchMock.get('/api/activity-reports/alerts?sortBy=startDate&sortDir=desc&offset=0&limit=10&reportId.in[]=test', {
      count: 1,
      alerts: generateXFakeReports(1),
    });
    fetchMock.get('/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&reportId.in[]=test', { count: 1, rows: generateXFakeReports(1) });
    fetchMock.get('/api/widgets/overview?reportId.in[]=test', overviewRegionOne);
    const apply = await screen.findByTestId(/apply-filters-test-id/i);
    act(() => {
      userEvent.click(apply);
    });

    expect(mockAnnounce).toHaveBeenCalled();
    // wait for everything to finish loading
    await waitFor(() => expect(screen.queryByText(/Loading data/i)).toBeNull());
  });
});

describe('handles region filter', () => {
  beforeEach(() => {
    delete window.location;
    window.location = new URL('https://www.test.gov');
  });

  afterEach(() => fetchMock.restore());

  it('adds region filter', async () => {
    fetchMock.get(baseAlertsWithRegionOne, {
      count: 10,
      alerts: generateXFakeReports(10),
    });

    fetchMock.get(baseWithRegionOne,
      { count: 1, rows: generateXFakeReports(1) });

    fetchMock.get(defaultOverviewUrlWithRegionOne, overviewRegionOne);

    const user = {
      name: 'test@test.com',
      homeRegionId: 1,
      permissions: [
        {
          scopeId: 3,
          regionId: 1,
        },
        {
          scopeId: 3,
          regionId: 2,
        },
      ],
    };
    renderLanding(user);

    const filterMenuButton = await screen.findByRole('button', { name: /filters/i });
    fireEvent.click(filterMenuButton);

    const regionFilter = await screen.findByRole('combobox', { name: /select region to filter by/i });
    expect(await within(regionFilter).findByText(/region 1/i)).toBeVisible();
  });
  it('hides region filter', async () => {
    fetchMock.get(baseAlerts, {
      count: 10,
      alerts: generateXFakeReports(10),
    });

    fetchMock.get(base,
      { count: 1, rows: generateXFakeReports(1) });

    fetchMock.get(defaultOverviewUrl, overviewRegionOne);

    const user = {
      name: 'test@test.com',
      homeRegionId: 1,
      permissions: [
        {
          scopeId: 3,
          regionId: 1,
        },
      ],
    };
    renderLanding(user);

    const filterMenuButton = await screen.findByRole('button', { name: /filters/i });
    fireEvent.click(filterMenuButton);
    const regionFilter = screen.queryByRole('combobox', { name: /select region to filter by/i });
    expect(regionFilter).not.toBeInTheDocument();
  });
});
