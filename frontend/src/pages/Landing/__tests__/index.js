/* eslint-disable jest/no-export */
import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import fetchMock from 'fetch-mock';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import { v4 as uuidv4 } from 'uuid';
import { SCOPE_IDS } from '@ttahub/common';
import UserContext from '../../../UserContext';
import AriaLiveContext from '../../../AriaLiveContext';
import MyGroupsProvider from '../../../components/MyGroupsProvider';
import Landing, { getAppliedRegion } from '../index';
import activityReports, { activityReportsSorted, generateXFakeReports, overviewRegionOne } from '../mocks';
import { getAllAlertsDownloadURL } from '../../../fetchers/helpers';
import { filtersToQueryString } from '../../../utils';
import { mockWindowProperty, convertToResponse } from '../../../testHelpers';

jest.mock('../../../fetchers/helpers', () => ({
  ...jest.requireActual('../../../fetchers/helpers'),
  getAllAlertsDownloadURL: jest.fn(),
}));

const mockAnnounce = jest.fn();

const filtersWithRegionOne = [
  {
    id: uuidv4(),
    topic: 'region',
    condition: 'is',
    query: 1,
  }];

const dateFilterWithRegionOne = filtersToQueryString(filtersWithRegionOne);

const base = '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&region.in[]=1';
const baseAlerts = '/api/activity-reports/alerts?sortBy=startDate&sortDir=desc&offset=0&limit=10&region.in[]=1';
const defaultOverviewUrl = '/api/widgets/overview?region.in[]=1';
const inTest = 'reportId.ctn[]=test';

const mockFetchWithRegionOne = () => {
  fetchMock.get(defaultOverviewUrl, overviewRegionOne);
};

const renderLanding = (user, locationState = null) => {
  const initialEntries = locationState
    ? [{ pathname: '/', state: locationState }]
    : ['/'];

  render(
    <MyGroupsProvider authenticated>
      <MemoryRouter initialEntries={initialEntries}>
        <AriaLiveContext.Provider value={{ announce: mockAnnounce }}>
          <UserContext.Provider value={{ user }}>
            <Landing authenticated />
          </UserContext.Provider>
        </AriaLiveContext.Provider>
      </MemoryRouter>
    </MyGroupsProvider>,
  );
};

const response = convertToResponse(activityReports);

describe('Landing Page', () => {
  mockWindowProperty('localStorage', {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  });
  beforeEach(async () => {
    fetchMock.get('/api/groups', []);
    fetchMock.get(base, response);

    fetchMock.get(baseAlerts, {
      alertsCount: 0,
      alerts: [],
      recipients: [],
      topics: [],
    });
    fetchMock.get(defaultOverviewUrl, overviewRegionOne);
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
      <MyGroupsProvider authenticated>
        <MemoryRouter initialEntries={pastLocations}>
          <UserContext.Provider value={{ user }}>
            <Landing authenticated user={user} />
          </UserContext.Provider>
        </MemoryRouter>
      </MyGroupsProvider>,
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

  test('displays date started column', async () => {
    const startDateColumnHeader = await screen.findByRole('columnheader', {
      name: /date started/i,
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
      name: /topics/i,
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
    const recipient = await screen.findByRole('button', { name: /click to visually reveal the recipients for R14-AR-1/i });
    expect(recipient.textContent).toContain('Johnston-Romaguera - 14CH00003');
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
    const topics = await screen.findByRole('button', { name: /click to visually reveal the topics for r14-ar-1/i });
    expect(topics).toBeVisible();
    expect(topics.firstChild).toHaveClass('smart-hub--ellipsis');
    expect(topics.firstChild.firstChild.firstChild).toHaveClass('smart-hub-tooltip--truncated');
    expect(topics).toHaveTextContent('Behavioral / Mental Health');
  });

  test('displays the correct collaborators', async () => {
    const collaborators = await screen.findByRole('cell', { name: /click to visually reveal the collaborators for r14-ar-1/i });
    expect(collaborators).toBeVisible();
    expect(collaborators.textContent).toContain('Orange, GS');
    expect(collaborators.textContent).toContain('Hermione Granger, SS');
    expect(collaborators.firstChild).toHaveClass('smart-hub-tooltip');
    expect(collaborators.firstChild.children.length).toBe(2);
    const truncated = collaborators.firstChild.children[1].firstChild.firstChild.firstChild;
    expect(truncated).toHaveClass('smart-hub-tooltip--truncated');
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
          convertToResponse(generateXFakeReports(10), true),
        );
        fetchMock.get(
          base,
          { count: 10, rows: [], recipients: [] },
        );
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
        expect(getAllAlertsDownloadURL).toHaveBeenCalledWith(dateFilterWithRegionOne);
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
        expect(getAllAlertsDownloadURL).toHaveBeenCalledWith(dateFilterWithRegionOne);
      });

      it('hides specialist name filter if user can approve reports', async () => {
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

        // expect 'specialist name' not to be in the document.
        expect(screen.queryAllByText('Specialist name').length).toBe(0);
      });

      it('shows specialist name filter if user can approve reports', async () => {
        const user = {
          name: 'test@test.com',
          homeRegionId: 1,
          permissions: [
            {
              scopeId: 3,
              regionId: 1,
            },
            {
              scopeId: 5,
              regionId: 1,
            },
          ],
        };

        renderLanding(user);

        const filterMenuButton = await screen.findByRole('button', { name: /filters/i });
        fireEvent.click(filterMenuButton);

        // expect 'specialist name' to be in the document.
        expect(await screen.findByText('Specialist name')).toBeVisible();
      });

      it('central office correctly shows all regions', async () => {
        const user = {
          name: 'test@test.com',
          homeRegionId: 14,
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
        expect(await screen.findByRole('heading', { name: /activity reports - your regions/i })).toBeVisible();
      });

      it('user with one region shows the correct label', async () => {
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
        expect(await screen.findByRole('heading', { name: /activity reports - your region/i })).toBeVisible();
      });

      it('user with multiple region shows the correct label', async () => {
        const user = {
          name: 'test@test.com',
          homeRegionId: 1,
          permissions: [
            {
              scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
              regionId: 1,
            },
            {
              scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
              regionId: 3,
            },
          ],
        };

        renderLanding(user);
        expect(await screen.findByRole('heading', { name: /activity reports - your regions/i })).toBeVisible();
      });
    });
  });
});

describe('My alerts sorting', () => {
  afterEach(() => fetchMock.restore());

  beforeEach(async () => {
    fetchMock.reset();

    // Alerts.
    fetchMock.get(baseAlerts, convertToResponse(activityReports, true));

    // Activity Reports.
    fetchMock.get(base, { count: 0, rows: [], recipients: [] });

    // Overview.
    fetchMock.get(defaultOverviewUrl, overviewRegionOne);

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

    const url = '/api/activity-reports/alerts?sortBy=calculatedStatus&sortDir=asc&offset=0&limit=10&region.in[]=1';
    fetchMock.get(url,
      convertToResponse(activityReportsSorted, true));

    expect(fetchMock.called(url)).toBe(false);
    act(() => {
      fireEvent.click(statusColumnHeaders[0]);
    });
    await waitFor(() => expect(fetchMock.called(url)).toBe(true));
  });

  it('is enabled for Report ID', async () => {
    const reportIdHeaders = await screen.findAllByRole('columnheader', { name: /report id/i });
    expect(reportIdHeaders.length).toBe(2);
    fetchMock.reset();
    const url = '/api/activity-reports/alerts?sortBy=regionId&sortDir=asc&offset=0&limit=10&region.in[]=1';
    fetchMock.get(url,
      convertToResponse(activityReports, true));
    fetchMock.get(
      base,
      { count: 0, rows: [], recipients: [] },
    );
    const columnHeaders = await screen.findAllByText(/report id/i);
    expect(fetchMock.called(url)).toBe(false);
    act(() => {
      fireEvent.click(columnHeaders[0]);
    });
    await waitFor(() => expect(fetchMock.called(url)).toBe(true));
  });

  it('is enabled for Recipient', async () => {
    const columnHeaders = await screen.findAllByRole('button', {
      name: /recipient\. activate to sort ascending/i,
    });
    expect(columnHeaders.length).toBe(2);
    fetchMock.reset();
    const url = '/api/activity-reports/alerts?sortBy=activityRecipients&sortDir=asc&offset=0&limit=10&region.in[]=1';
    fetchMock.get(url,
      convertToResponse(activityReports, true));
    fetchMock.get(
      base,
      { count: 0, rows: [], recipients: [] },
    );

    expect(fetchMock.called(url)).toBe(false);
    act(() => {
      fireEvent.click(columnHeaders[0]);
    });
    await waitFor(() => expect(fetchMock.called(url)).toBe(true));
  });

  it('is enabled for Start date', async () => {
    const columnHeaders = await screen.findAllByRole('button', { name: /date started\. activate to sort ascending/i });
    expect(columnHeaders.length).toBe(2);
    fetchMock.reset();
    const url = '/api/activity-reports/alerts?sortBy=startDate&sortDir=asc&offset=0&limit=10&region.in[]=1';
    fetchMock.get(url,
      convertToResponse(activityReportsSorted, true));
    fetchMock.get(
      base,
      { count: 0, rows: [], recipients: [] },
    );

    expect(fetchMock.called(url)).toBe(false);
    act(() => {
      fireEvent.click(columnHeaders[0]);
    });
    await waitFor(() => expect(fetchMock.called(url)).toBe(true));
  });

  it('is enabled for Creator', async () => {
    const columnHeaders = await screen.findAllByText(/creator/i);

    expect(columnHeaders.length).toBe(2);
    fetchMock.reset();
    const url = '/api/activity-reports/alerts?sortBy=author&sortDir=asc&offset=0&limit=10&region.in[]=1';
    fetchMock.get(url,
      convertToResponse(activityReportsSorted, true));
    fetchMock.get(
      base,
      { count: 0, rows: [], recipients: [] },
    );

    expect(fetchMock.called(url)).toBe(false);
    act(() => {
      fireEvent.click(columnHeaders[0]);
    });
    await waitFor(() => expect(fetchMock.called(url)).toBe(true));
  });

  it('is enabled for Collaborator(s)', async () => {
    const columnHeaders = await screen.findAllByText(/collaborators/i);
    fetchMock.reset();

    const url = '/api/activity-reports/alerts?sortBy=collaborators&sortDir=asc&offset=0&limit=10&region.in[]=1';
    fetchMock.get(url,
      convertToResponse(activityReportsSorted, true));
    fetchMock.get(`${base}`, { count: 0, rows: [], recipients: [] });

    expect(fetchMock.called(url)).toBe(false);
    act(() => {
      fireEvent.click(columnHeaders[0]);
    });
    await waitFor(() => expect(fetchMock.called(url)).toBe(true));
  });
});

describe('handleApplyFilters', () => {
  beforeAll(() => fetchMock.reset());
  beforeEach(() => {
    delete window.location;
    window.location = new URL('https://www.test.gov');
    mockFetchWithRegionOne();
    fetchMock.get(base, convertToResponse(activityReports));
    fetchMock.get(baseAlerts, { alertsCount: 0, alerts: [], recipients: [] });
    fetchMock.get(`${defaultOverviewUrl}&${inTest}`, overviewRegionOne);
    fetchMock.get(`${baseAlerts}&${inTest}`, { alertsCount: 0, alerts: [], recipients: [] });
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

    // Get filter group.
    const topic = await screen.findByRole('combobox', { exact: true, name: /^topic/i });
    userEvent.selectOptions(topic, 'reportId');

    const condition = await screen.findByRole('combobox', { name: 'condition' });
    userEvent.selectOptions(condition, 'contains');

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
    fetchMock.get(baseAlerts, convertToResponse(generateXFakeReports(10), true));
    fetchMock.get(base,
      convertToResponse(generateXFakeReports(1), true));
    fetchMock.get(defaultOverviewUrl, overviewRegionOne);
    fetchMock.get(`${base}&${inTest}`, {
      count: 0,
      rows: [],
      recipients: [],
      topics: [],
    });
    fetchMock.get(`${defaultOverviewUrl}&${inTest}`, overviewRegionOne);
    fetchMock.get(`${baseAlerts}&${inTest}`, {
      alertsCount: 0, alerts: [], recipients: [], topics: [],
    });
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

    const filterMenuButton = await screen.findByRole('button', { name: /filters/i });
    fireEvent.click(filterMenuButton);

    const topic = await screen.findByRole('combobox', { name: /^topic/i });
    userEvent.selectOptions(topic, 'reportId');

    const condition = await screen.findByRole('combobox', { name: 'condition' });
    userEvent.selectOptions(condition, 'contains');

    const query = await screen.findByRole('textbox');
    userEvent.type(query, 'test');

    fetchMock.restore();
    fetchMock.get('/api/activity-reports/alerts?sortBy=startDate&sortDir=desc&offset=0&limit=10&region.in[]=1&reportId.in[]=test', {
      count: 1,
      alerts: generateXFakeReports(1),
    });
    fetchMock.get('/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&region.in[]=1&reportId.in[]=test', { count: 1, rows: generateXFakeReports(1) });
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

describe('getAppliedRegion', () => {
  it('returns null where appropriate', () => {
    const appliedRegion = getAppliedRegion([]);
    expect(appliedRegion).toBeNull();
  });
});
