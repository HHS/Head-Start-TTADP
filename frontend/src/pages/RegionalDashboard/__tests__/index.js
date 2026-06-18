import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SCOPE_IDS } from '@ttahub/common';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router-dom';
import join from 'url-join';
import AppLoadingContext from '../../../AppLoadingContext';
import AriaLiveContext from '../../../AriaLiveContext';
import { generateXFakeReports } from '../../../components/ActivityReportsTable/mocks';
import { convertToResponse } from '../../../testHelpers';
import UserContext from '../../../UserContext';
import { formatDateRange } from '../../../utils';
import RegionalDashboard from '../index';

const history = createMemoryHistory();

const overViewUrl = join('api', 'widgets', 'overview');
const overViewResponse = {
  numReports: '6',
  numGrants: '6',
  numOtherEntities: '0',
  inPerson: '0',
  sumDuration: '13.0',
  numParticipants: '86',
};
const reasonListUrl = join('api', 'widgets', 'reasonList');
const reasonListResponse = [{ name: 'Ongoing Quality Improvement', count: 3 }];
const totalHrsAndRecipientGraphUrl = join('api', 'widgets', 'totalHrsAndRecipientGraph');
const totalHoursResponse = [
  {
    name: 'Hours of Training',
    x: ['17', '18', '23', '2', '3'],
    y: [1.5, 0, 0, 0, 0],
    month: ['Nov', 'Nov', 'Nov', 'Dec', 'Dec'],
    trace: 'circle',
  },
  {
    name: 'Hours of Technical Assistance',
    x: ['17', '18', '23', '2', '3'],
    y: [0, 0, 2.5, 2.5, 0],
    month: ['Nov', 'Nov', 'Nov', 'Dec', 'Dec'],
    trace: 'square',
  },
  {
    name: 'Hours of Both',
    x: ['17', '18', '23', '2', '3'],
    y: [1.5, 1.5, 0, 0, 3.5],
    month: ['Nov', 'Nov', 'Nov', 'Dec', 'Dec'],
    trace: 'triangle',
  },
];
const topicFrequencyGraphUrl = join('api', 'widgets', 'topicFrequencyGraph');
const topicFrequencyResponse = [
  { topic: 'Behavioral / Mental Health / Trauma', count: 0 },
  { topic: 'Child Screening and Assessment', count: 0 },
];
const activityReportsUrl = join('api', 'activity-reports');
const activityReportsResponse = { count: 0, rows: [] };

const lastThirtyDays = formatDateRange({
  lastThirtyDays: true,
  forDateTime: true,
});

const lastThirtyDaysParams = `startDate.win=${encodeURIComponent(lastThirtyDays)}`;
const allRegions = 'region.in[]=1&region.in[]=2';
const regionInParams = 'region.in[]=1';

const hoursOfTrainingUrl = '/api/widgets/trHoursOfTrainingByNationalCenter';
const overviewUrl = '/api/widgets/trOverview';
const sessionsByTopicUrl = '/api/widgets/trSessionsByTopic';
const standardGoalsListUrl = join('api', 'widgets', 'standardGoalsList');
const standardGoalsListResponse = [];
const feedItemUrl = '/api/feeds/item?tag=ttahub-qa-dash-filters';
const feedItemResponse = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <title>QA Dashboard Filters</title>
  <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
  <subtitle>Confluence Syndication Feed</subtitle>
  <id>https://acf-ohs.atlassian.net/wiki</id>
  <entry>
    <title>QA Dashboard Filters</title>
    <link rel="alternate" href="https://acf-ohs.atlassian.net/wiki" />
    <category term="ttahub-qa-dash-filters" />
    <author>
      <name>Anonymous Hub User</name>
    </author>
    <updated>2023-03-22T21:03:16Z</updated>
    <published>2023-03-22T21:03:16Z</published>
    <summary type="html">&lt;div class="feed"&gt;&lt;p&gt;Filter information&lt;/p&gt;&lt;/div&gt;</summary>
    <dc:creator>Anonymous Hub User</dc:creator>
    <dc:date>2023-03-22T21:03:16Z</dc:date>
  </entry>
</feed>`;

describe('Regional Dashboard page', () => {
  beforeEach(async () => {
    fetchMock.get(overViewUrl, overViewResponse);
    fetchMock.get(totalHrsAndRecipientGraphUrl, totalHoursResponse);
    fetchMock.get(topicFrequencyGraphUrl, topicFrequencyResponse);
    fetchMock.get(
      `${activityReportsUrl}?sortBy=updatedAt&sortDir=desc&offset=0&limit=10`,
      activityReportsResponse
    );
    fetchMock.get(standardGoalsListUrl, standardGoalsListResponse);
    fetchMock.get(feedItemUrl, feedItemResponse);

    fetchMock.get(overviewUrl, {
      numReports: '0',
      totalRecipients: '0',
      recipientPercentage: '0%',
      numGrants: '0',
      numRecipients: '0',
      sumDuration: '0',
      numParticipants: '0',
      numSessions: '0',
    });
    fetchMock.get(hoursOfTrainingUrl, []);
    fetchMock.get(sessionsByTopicUrl, []);
  });

  afterEach(() => fetchMock.restore());

  const renderDashboard = (user, reportType = '') => {
    render(
      <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
        <AriaLiveContext.Provider value={{ announce: jest.fn() }}>
          <UserContext.Provider value={{ user }}>
            <Router history={history}>
              <RegionalDashboard match={{ params: { reportType }, path: '', url: '' }} />
            </Router>
          </UserContext.Provider>
        </AriaLiveContext.Provider>
      </AppLoadingContext.Provider>
    );
  };

  it('shows proper heading for user with more than one region', async () => {
    const user = {
      homeRegionId: 14,
      permissions: [
        {
          regionId: 1,
          scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
        },
        {
          regionId: 2,
          scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
        },
      ],
    };

    // Initial Page Load.
    fetchMock.get(`${overViewUrl}?${allRegions}&${lastThirtyDaysParams}`, overViewResponse);
    fetchMock.get(
      `${totalHrsAndRecipientGraphUrl}?${allRegions}&${lastThirtyDaysParams}`,
      totalHoursResponse
    );
    fetchMock.get(
      `${topicFrequencyGraphUrl}?${allRegions}&${lastThirtyDaysParams}`,
      topicFrequencyResponse
    );
    fetchMock.get(
      `${activityReportsUrl}?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&${allRegions}&${lastThirtyDaysParams}`,
      activityReportsResponse
    );
    fetchMock.get(
      `${standardGoalsListUrl}?${allRegions}&${lastThirtyDaysParams}`,
      standardGoalsListResponse
    );

    // Only Region 1.
    fetchMock.get(`${overViewUrl}?${regionInParams}`, overViewResponse);
    fetchMock.get(`${totalHrsAndRecipientGraphUrl}?${regionInParams}`, totalHoursResponse);
    fetchMock.get(`${topicFrequencyGraphUrl}?${regionInParams}`, topicFrequencyResponse);
    fetchMock.get(
      `${activityReportsUrl}?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&${regionInParams}`,
      activityReportsResponse
    );
    fetchMock.get(`${standardGoalsListUrl}?${regionInParams}`, standardGoalsListResponse);

    renderDashboard(user);
    let heading = await screen.findByText(/Regional dashboard - Activity Reports/i);
    expect(heading).toBeVisible();

    // Open filters menu.
    const open = await screen.findByRole('button', { name: /open filters for this page/i });
    act(() => userEvent.click(open));

    // Change first filter to Region 1.
    const [lastTopic] = Array.from(document.querySelectorAll('[name="topic"]')).slice(-1);
    act(() => userEvent.selectOptions(lastTopic, 'region'));

    const [lastCondition] = Array.from(document.querySelectorAll('[name="condition"]')).slice(-1);
    act(() => userEvent.selectOptions(lastCondition, 'is'));

    const select = await screen.findByRole('combobox', { name: 'Select region to filter by' });
    act(() => userEvent.selectOptions(select, 'Region 1'));

    // Apply filter menu with Region 1 filter.
    const apply = await screen.findByRole('button', {
      name: /apply filters for regional dashboard/i,
    });
    act(() => userEvent.click(apply));

    // Verify page render after apply.
    heading = await screen.findByText(/Regional dashboard - Activity Reports/i);
    expect(heading).toBeVisible();

    // Remove Region 1 filter pill.
    const removeRegion = await screen.findByRole('button', {
      name: /this button removes the filter: region is 1/i,
    });
    act(() => userEvent.click(removeRegion));

    heading = await screen.findByText(/Regional dashboard - Activity Reports/i);
    expect(heading).toBeVisible();
  });

  it('shows proper heading for user with one region', async () => {
    const user = {
      homeRegionId: 1,
      permissions: [
        {
          regionId: 1,
          scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
        },
      ],
    };

    fetchMock.get(`${overViewUrl}?${regionInParams}&${lastThirtyDaysParams}`, overViewResponse);
    fetchMock.get(
      `${totalHrsAndRecipientGraphUrl}?${regionInParams}&${lastThirtyDaysParams}`,
      totalHoursResponse
    );
    fetchMock.get(
      `${topicFrequencyGraphUrl}?${regionInParams}&${lastThirtyDaysParams}`,
      topicFrequencyResponse
    );
    fetchMock.get(
      `${activityReportsUrl}?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&${regionInParams}&${lastThirtyDaysParams}`,
      activityReportsResponse
    );

    renderDashboard(user);
    const heading = await screen.findByText(/Regional dashboard - Activity Reports/i);
    expect(heading).toBeVisible();
  });

  it('navigates to /activity-reports', async () => {
    const user = {
      homeRegionId: 1,
      permissions: [
        {
          regionId: 1,
          scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
        },
      ],
    };

    fetchMock.get(`${overViewUrl}?${regionInParams}&${lastThirtyDaysParams}`, overViewResponse);
    fetchMock.get(
      `${totalHrsAndRecipientGraphUrl}?${regionInParams}&${lastThirtyDaysParams}`,
      totalHoursResponse
    );
    fetchMock.get(
      `${topicFrequencyGraphUrl}?${regionInParams}&${lastThirtyDaysParams}`,
      topicFrequencyResponse
    );
    fetchMock.get(
      `${activityReportsUrl}?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&${regionInParams}&${lastThirtyDaysParams}`,
      activityReportsResponse
    );

    renderDashboard(user, 'activity-reports');
    const heading = await screen.findByText(/regional dashboard - activity reports/i);
    expect(heading).toBeVisible();
  });

  it('navigates to /training-reports', async () => {
    const user = {
      homeRegionId: 1,
      permissions: [
        {
          regionId: 1,
          scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
        },
      ],
    };

    fetchMock.get(`${overViewUrl}?${regionInParams}&${lastThirtyDaysParams}`, overViewResponse);
    fetchMock.get(
      `${totalHrsAndRecipientGraphUrl}?${regionInParams}&${lastThirtyDaysParams}`,
      totalHoursResponse
    );
    fetchMock.get(
      `${topicFrequencyGraphUrl}?${regionInParams}&${lastThirtyDaysParams}`,
      topicFrequencyResponse
    );
    fetchMock.get(
      `${activityReportsUrl}?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&${regionInParams}&${lastThirtyDaysParams}`,
      activityReportsResponse
    );

    renderDashboard(user, 'training-reports');
    const heading = await screen.findByText(/regional dashboard - training reports/i);
    expect(heading).toBeVisible();
  });

  it('navigates to /all-reports', async () => {
    const user = {
      homeRegionId: 1,
      permissions: [
        {
          regionId: 1,
          scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
        },
      ],
    };

    fetchMock.get(`${overViewUrl}?${regionInParams}&${lastThirtyDaysParams}`, overViewResponse);
    fetchMock.get(
      `${totalHrsAndRecipientGraphUrl}?${regionInParams}&${lastThirtyDaysParams}`,
      totalHoursResponse
    );
    fetchMock.get(
      `${topicFrequencyGraphUrl}?${regionInParams}&${lastThirtyDaysParams}`,
      topicFrequencyResponse
    );
    fetchMock.get(
      `${activityReportsUrl}?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&${regionInParams}&${lastThirtyDaysParams}`,
      activityReportsResponse
    );

    renderDashboard(user, 'all-reports');
    const heading = await screen.findByText(/regional dashboard - all reports/i);
    expect(heading).toBeVisible();
  });

  it('navigates to /recipient-spotlight', async () => {
    const user = {
      homeRegionId: 1,
      permissions: [
        {
          regionId: 1,
          scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
        },
      ],
    };

    fetchMock.get(`${overViewUrl}?${regionInParams}&${lastThirtyDaysParams}`, overViewResponse);
    fetchMock.get(`${reasonListUrl}?${regionInParams}&${lastThirtyDaysParams}`, reasonListResponse);
    fetchMock.get(
      `${totalHrsAndRecipientGraphUrl}?${regionInParams}&${lastThirtyDaysParams}`,
      totalHoursResponse
    );
    fetchMock.get(
      `${topicFrequencyGraphUrl}?${regionInParams}&${lastThirtyDaysParams}`,
      topicFrequencyResponse
    );
    fetchMock.get(
      `${activityReportsUrl}?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&${regionInParams}&${lastThirtyDaysParams}`,
      activityReportsResponse
    );

    renderDashboard(user, 'recipient-spotlight');
    const heading = await screen.findByText(/regional dashboard - recipient spotlight/i);
    expect(heading).toBeVisible();
  });

  it('navigates to /monitoring and shows filters', async () => {
    const user = {
      homeRegionId: 1,
      permissions: [
        {
          regionId: 1,
          scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
        },
      ],
    };

    renderDashboard(user, 'monitoring');
    const heading = await screen.findByText(/regional dashboard - monitoring/i, { selector: 'h1' });
    expect(heading).toBeVisible();
    expect(document.querySelector('.ttahub-dashboard--filters')).toBeInTheDocument();
  });

  it('shows filters for recipient-spotlight', async () => {
    const user = {
      homeRegionId: 1,
      permissions: [
        {
          regionId: 1,
          scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
        },
      ],
    };

    // Mock recipient spotlight API
    const recipientSpotlightUrl = '/api/recipient-spotlight';
    const recipientSpotlightResponse = {
      count: 0,
      rows: [],
      statuses: {},
    };
    fetchMock.get(`begin:${recipientSpotlightUrl}`, recipientSpotlightResponse);

    renderDashboard(user, 'recipient-spotlight');

    // Wait for the page to render
    await screen.findByText(/regional dashboard - recipient spotlight/i);

    // Verify filters container is visible (not hidden)
    const filterContainer = document.querySelector('.ttahub-dashboard--filters');
    expect(filterContainer).toBeInTheDocument();
  });

  it('hides specialist name filter if user can approve reports', async () => {
    fetchMock.get('/api/widgets/overview?region.in[]=1&region.in[]=2', overViewResponse);
    fetchMock.get(
      '/api/widgets/totalHrsAndRecipientGraph?region.in[]=1&region.in[]=2',
      totalHoursResponse
    );
    fetchMock.get(
      '/api/widgets/topicFrequencyGraph?region.in[]=1&region.in[]=2',
      topicFrequencyResponse
    );
    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&region.in[]=1&region.in[]=2',
      activityReportsResponse
    );

    const user = {
      homeRegionId: 1,
      permissions: [
        {
          regionId: 1,
          scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
        },
        {
          regionId: 2,
          scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
        },
      ],
    };

    renderDashboard(user);

    // Open filters menu.
    const open = await screen.findByRole('button', {
      name: /open filters for this page/i,
      hidden: true,
    });
    act(() => userEvent.click(open));
    // expect 'specialist name' not to be in the document.
    expect(screen.queryAllByText('Specialist name').length).toBe(0);
  });

  it('shows specialist name filter if user can approve reports', async () => {
    fetchMock.get('/api/widgets/overview?region.in[]=1&region.in[]=2', overViewResponse, {
      overwriteRoutes: true,
    });
    fetchMock.get(
      '/api/widgets/totalHrsAndRecipientGraph?region.in[]=1&region.in[]=2',
      totalHoursResponse,
      {
        overwriteRoutes: true,
      }
    );
    fetchMock.get(
      '/api/widgets/topicFrequencyGraph?region.in[]=1&region.in[]=2',
      topicFrequencyResponse,
      {
        overwriteRoutes: true,
      }
    );
    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&region.in[]=1&region.in[]=2',
      activityReportsResponse,
      { overwriteRoutes: true }
    );

    const user = {
      homeRegionId: 1,
      permissions: [
        {
          regionId: 1,
          scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
        },
        {
          regionId: 2,
          scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
        },
        {
          regionId: 1,
          scopeId: SCOPE_IDS.APPROVE_ACTIVITY_REPORTS,
        },
      ],
    };

    renderDashboard(user);

    // Open filters menu.
    const open = await screen.findByRole('button', { name: /open filters for this page/i });
    act(() => userEvent.click(open));

    // expect 'specialist name' to be in the document.
    expect(await screen.findByText('Specialist name')).toBeVisible();
  });

  it('clears filters when switching tabs and restores them when returning', () => {
    // Reset shared state that bleeds from prior tests
    window.sessionStorage.clear();
    history.replace({ search: '' });

    const activityKey = 'regional-dashboard-filters-activity-reports';
    const trainingKey = 'regional-dashboard-filters-training-reports';

    // Seed distinct, identifiable filters for each tab using valid persisted date ranges
    const activityFilters = [
      {
        id: 'ar-filter',
        topic: 'startDate',
        condition: 'is within',
        query: formatDateRange({ lastThirtyDays: true, forDateTime: true }),
      },
    ];
    const trainingFilters = [
      {
        id: 'tr-filter',
        topic: 'startDate',
        condition: 'is within',
        query: '2024/01/01-2024/01/31',
      },
    ];
    window.sessionStorage.setItem(activityKey, JSON.stringify(activityFilters));
    window.sessionStorage.setItem(trainingKey, JSON.stringify(trainingFilters));

    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    const user = {
      homeRegionId: 1,
      permissions: [{ regionId: 1, scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS }],
    };

    const renderContent = (reportType) => (
      <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
        <AriaLiveContext.Provider value={{ announce: jest.fn() }}>
          <UserContext.Provider value={{ user }}>
            <Router history={history}>
              <RegionalDashboard match={{ params: { reportType }, path: '', url: '' }} />
            </Router>
          </UserContext.Provider>
        </AriaLiveContext.Provider>
      </AppLoadingContext.Provider>
    );

    const { rerender, unmount } = render(renderContent('activity-reports'));

    // Clear spy counts so we only observe the tab-switch writes
    setItemSpy.mockClear();

    // Switch to training tab — key={reportType} forces full remount of inner component
    rerender(renderContent('training-reports'));

    // The training key must never have been written with activity-reports filter data
    const trainingKeyWrites = setItemSpy.mock.calls.filter(([key]) => key === trainingKey);
    trainingKeyWrites.forEach(([, val]) => {
      expect(JSON.parse(val)).not.toContainEqual(expect.objectContaining({ id: 'ar-filter' }));
    });

    // Clear spy and return to activity tab
    setItemSpy.mockClear();
    rerender(renderContent('activity-reports'));

    // The activity key must never have been written with training-reports filter data
    const activityKeyWrites = setItemSpy.mock.calls.filter(([key]) => key === activityKey);
    activityKeyWrites.forEach(([, val]) => {
      expect(JSON.parse(val)).not.toContainEqual(expect.objectContaining({ id: 'tr-filter' }));
    });

    setItemSpy.mockRestore();
    unmount();
  });

  it('resets pagination to page 1 when filters are applied (TTAHUB-5283)', async () => {
    // Regression test: when the activity reports table is on a stale offset
    // (e.g. page 2 of a broader result set) and the user applies a narrowing
    // filter, the table must refetch at offset=0. Otherwise a stale offset
    // larger than the new total count causes the table to render zero rows
    // while the overview widget and CSV export (which do not paginate) still
    // show the correct count.
    window.sessionStorage.clear();
    history.push('/');
    const user = {
      homeRegionId: 14,
      permissions: [
        { regionId: 1, scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS },
        { regionId: 2, scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS },
      ],
    };

    const initialAllRegionsUrl = `${activityReportsUrl}?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&${allRegions}`;
    const page2AllRegionsUrl = `${activityReportsUrl}?sortBy=updatedAt&sortDir=desc&offset=10&limit=10&${allRegions}`;
    const filteredAtZeroUrl = `${activityReportsUrl}?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&${regionInParams}`;
    const filteredStaleUrl = `${activityReportsUrl}?sortBy=updatedAt&sortDir=desc&offset=10&limit=10&${regionInParams}`;

    // Sibling widgets — broad initial load (all regions)
    fetchMock.get(`${overViewUrl}?${allRegions}`, overViewResponse, { overwriteRoutes: true });
    fetchMock.get(`${totalHrsAndRecipientGraphUrl}?${allRegions}`, totalHoursResponse, {
      overwriteRoutes: true,
    });
    fetchMock.get(`${topicFrequencyGraphUrl}?${allRegions}`, topicFrequencyResponse, {
      overwriteRoutes: true,
    });
    fetchMock.get(`${standardGoalsListUrl}?${allRegions}`, standardGoalsListResponse, {
      overwriteRoutes: true,
    });

    // Initial table response: 10 rows out of 17 total → enables Page 2 button.
    fetchMock.get(
      initialAllRegionsUrl,
      convertToResponse(generateXFakeReports(10), false, 17),
      { overwriteRoutes: true }
    );
    fetchMock.get(
      page2AllRegionsUrl,
      convertToResponse(generateXFakeReports(10), false, 17),
      { overwriteRoutes: true }
    );

    // Sibling widgets — narrowed (region 1 only)
    fetchMock.get(`${overViewUrl}?${regionInParams}`, overViewResponse, { overwriteRoutes: true });
    fetchMock.get(`${totalHrsAndRecipientGraphUrl}?${regionInParams}`, totalHoursResponse, {
      overwriteRoutes: true,
    });
    fetchMock.get(`${topicFrequencyGraphUrl}?${regionInParams}`, topicFrequencyResponse, {
      overwriteRoutes: true,
    });
    fetchMock.get(`${standardGoalsListUrl}?${regionInParams}`, standardGoalsListResponse, {
      overwriteRoutes: true,
    });

    // The post-fix table fetch goes here.
    fetchMock.get(filteredAtZeroUrl, activityReportsResponse, { overwriteRoutes: true });
    // Mock the stale-offset URL too so an accidental call does not throw a
    // network error before our explicit assertion runs. The point of the
    // assertion below is that this URL is never invoked.
    fetchMock.get(filteredStaleUrl, activityReportsResponse, { overwriteRoutes: true });

    renderDashboard(user);

    // Wait for the initial table load to confirm the dashboard mounted.
    await waitFor(() => expect(fetchMock.called(initialAllRegionsUrl)).toBe(true));

    // Move the table to page 2 so the offset becomes stale.
    const [pageTwo] = await screen.findAllByRole('button', { name: /page 2/i });
    fireEvent.click(pageTwo);
    await waitFor(() => expect(fetchMock.called(page2AllRegionsUrl)).toBe(true));

    // Apply a Region 1 filter through the FilterPanel.
    const open = await screen.findByRole('button', { name: /open filters for this page/i });
    act(() => userEvent.click(open));

    const [lastTopic] = Array.from(document.querySelectorAll('[name="topic"]')).slice(-1);
    act(() => userEvent.selectOptions(lastTopic, 'region'));
    const [lastCondition] = Array.from(document.querySelectorAll('[name="condition"]')).slice(-1);
    act(() => userEvent.selectOptions(lastCondition, 'is'));
    const select = await screen.findByRole('combobox', { name: 'Select region to filter by' });
    act(() => userEvent.selectOptions(select, 'Region 1'));

    const apply = await screen.findByRole('button', {
      name: /apply filters for regional dashboard/i,
    });
    act(() => userEvent.click(apply));

    // The fix: the next table fetch must go out at offset=0.
    await waitFor(() => expect(fetchMock.called(filteredAtZeroUrl)).toBe(true));

    // And the table must not have refetched at the stale offset=10 with the
    // new filter — that is the exact bug condition.
    expect(fetchMock.called(filteredStaleUrl)).toBe(false);
  });

  it('resets pagination when RegionPermissionModal updates filters (TTAHUB-5283)', async () => {
    // Same regression as above, but for the second filter-mutation path:
    // RegionPermissionModal calls setFilters directly (not via
    // onApplyFilters/onRemoveFilter) when the user accepts "Show filter with
    // my regions". That path must also reset pagination, otherwise a stale
    // offset persists into the corrected fetch and the table renders empty.
    window.sessionStorage.clear();

    // Seed the activity-reports table sort config with a stale page-2 offset
    // so the bug pre-condition is in place at mount.
    const sessionFilterKey = 'regional-dashboard-filters-activityReports-1';
    const sortKey = `${sessionFilterKey}-activityReportsTable-sorting`;
    window.sessionStorage.setItem(sessionFilterKey, JSON.stringify([]));
    window.sessionStorage.setItem(
      sortKey,
      JSON.stringify({ sortBy: 'updatedAt', direction: 'desc', activePage: 2, offset: 10 })
    );

    // URL contains a region the user does NOT have access to (region 99) plus
    // a region they DO have (region 1). The modal will pop open on mount.
    history.push('/?region.in[]=99&region.in[]=1');

    const user = {
      homeRegionId: 1,
      permissions: [{ regionId: 1, scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS }],
    };

    // The initial render fires fetches with the URL filters at the stale
    // offset. We mock both possible URLs (offset=10 from sessionStorage and
    // offset=0 from the hook seeding the URL filter) so the network layer
    // does not throw.
    const badRegions = 'region.in[]=99&region.in[]=1';
    fetchMock.get(`${overViewUrl}?${badRegions}`, overViewResponse, { overwriteRoutes: true });
    fetchMock.get(`${totalHrsAndRecipientGraphUrl}?${badRegions}`, totalHoursResponse, {
      overwriteRoutes: true,
    });
    fetchMock.get(`${topicFrequencyGraphUrl}?${badRegions}`, topicFrequencyResponse, {
      overwriteRoutes: true,
    });
    fetchMock.get(`${standardGoalsListUrl}?${badRegions}`, standardGoalsListResponse, {
      overwriteRoutes: true,
    });
    fetchMock.get(
      `${activityReportsUrl}?sortBy=updatedAt&sortDir=desc&offset=10&limit=10&${badRegions}`,
      convertToResponse(generateXFakeReports(10), false, 17),
      { overwriteRoutes: true }
    );
    fetchMock.get(
      `${activityReportsUrl}?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&${badRegions}`,
      convertToResponse(generateXFakeReports(10), false, 17),
      { overwriteRoutes: true }
    );

    // After the modal action, filters narrow to just region 1.
    const correctedAtZeroUrl = `${activityReportsUrl}?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&${regionInParams}`;
    const correctedStaleUrl = `${activityReportsUrl}?sortBy=updatedAt&sortDir=desc&offset=10&limit=10&${regionInParams}`;
    fetchMock.get(`${overViewUrl}?${regionInParams}`, overViewResponse, { overwriteRoutes: true });
    fetchMock.get(`${totalHrsAndRecipientGraphUrl}?${regionInParams}`, totalHoursResponse, {
      overwriteRoutes: true,
    });
    fetchMock.get(`${topicFrequencyGraphUrl}?${regionInParams}`, topicFrequencyResponse, {
      overwriteRoutes: true,
    });
    fetchMock.get(`${standardGoalsListUrl}?${regionInParams}`, standardGoalsListResponse, {
      overwriteRoutes: true,
    });
    fetchMock.get(correctedAtZeroUrl, activityReportsResponse, { overwriteRoutes: true });
    fetchMock.get(correctedStaleUrl, activityReportsResponse, { overwriteRoutes: true });

    renderDashboard(user);

    // Modal should auto-open due to missing region 99.
    const showFiltersBtn = await screen.findByRole('button', {
      name: /show filter with my regions/i,
    });

    // Click "Show filter with my regions" — this routes through setFilters,
    // not onApplyFilters, so it exercises the second wrapper added in the fix.
    act(() => userEvent.click(showFiltersBtn));

    // The fix: the table refetches at offset=0 with the corrected filters.
    await waitFor(() => expect(fetchMock.called(correctedAtZeroUrl)).toBe(true));

    // The table must not have refetched at the stale offset with the
    // corrected filters — that is the bug condition for this code path.
    expect(fetchMock.called(correctedStaleUrl)).toBe(false);
  });

  it('shows region filter if user has more than one region', async () => {
    fetchMock.get('/api/widgets/overview?region.in[]=1&region.in[]=2', overViewResponse, {
      overwriteRoutes: true,
    });
    fetchMock.get(
      '/api/widgets/totalHrsAndRecipientGraph?region.in[]=1&region.in[]=2',
      totalHoursResponse,
      {
        overwriteRoutes: true,
      }
    );
    fetchMock.get(
      '/api/widgets/topicFrequencyGraph?region.in[]=1&region.in[]=2',
      topicFrequencyResponse,
      {
        overwriteRoutes: true,
      }
    );
    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&region.in[]=1&region.in[]=2',
      activityReportsResponse,
      { overwriteRoutes: true }
    );

    const user = {
      homeRegionId: 1,
      permissions: [
        {
          regionId: 1,
          scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
        },
        {
          regionId: 2,
          scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
        },
      ],
    };

    renderDashboard(user);

    // Open filters menu.
    const open = await screen.findByRole('button', { name: /open filters for this page/i });
    act(() => userEvent.click(open));

    expect(document.querySelector('option[value="region"]')).toBeTruthy();
  });
});
