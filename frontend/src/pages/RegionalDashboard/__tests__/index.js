import '@testing-library/jest-dom';
import React from 'react';
import join from 'url-join';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import {
  act, render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import { SCOPE_IDS } from '@ttahub/common';
import RegionalDashboard from '../index';
import { formatDateRange } from '../../../utils';
import UserContext from '../../../UserContext';
import AriaLiveContext from '../../../AriaLiveContext';
import AppLoadingContext from '../../../AppLoadingContext';

const history = createMemoryHistory();

const overViewUrl = join('api', 'widgets', 'overview');
const overViewResponse = {
  numReports: '6', numGrants: '6', numOtherEntities: '0', inPerson: '0', sumDuration: '13.0', numParticipants: '86',
};
const totalHrsAndRecipientGraphUrl = join('api', 'widgets', 'totalHrsAndRecipientGraph');
const totalHoursResponse = [{
  name: 'Hours of Training',
  x: ['17', '18', '23', '2', '3'],
  y: [1.5, 0, 0, 0, 0],
  month: ['Nov', 'Nov', 'Nov', 'Dec', 'Dec'],
  trace: 'circle',
}, {
  name: 'Hours of Technical Assistance',
  x: ['17', '18', '23', '2', '3'],
  y: [0, 0, 2.5, 2.5, 0],
  month: ['Nov', 'Nov', 'Nov', 'Dec', 'Dec'],
  trace: 'square',
}, {
  name: 'Hours of Both',
  x: ['17', '18', '23', '2', '3'],
  y: [1.5, 1.5, 0, 0, 3.5],
  month: ['Nov', 'Nov', 'Nov', 'Dec', 'Dec'],
  trace: 'triangle',
}];
const topicFrequencyGraphUrl = join('api', 'widgets', 'topicFrequencyGraph');
const topicFrequencyResponse = [{ topic: 'Behavioral / Mental Health / Trauma', count: 0 }, { topic: 'Child Screening and Assessment', count: 0 }];
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
    fetchMock.get(`${activityReportsUrl}?sortBy=updatedAt&sortDir=desc&offset=0&limit=10`, activityReportsResponse);
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
      </AppLoadingContext.Provider>,
    );
  };

  it('shows proper heading for user with more than one region', async () => {
    const user = {
      homeRegionId: 14,
      permissions: [{
        regionId: 1,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }, {
        regionId: 2,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }],
    };

    // Initial Page Load.
    fetchMock.get(`${overViewUrl}?${allRegions}&${lastThirtyDaysParams}`, overViewResponse);
    fetchMock.get(`${totalHrsAndRecipientGraphUrl}?${allRegions}&${lastThirtyDaysParams}`, totalHoursResponse);
    fetchMock.get(`${topicFrequencyGraphUrl}?${allRegions}&${lastThirtyDaysParams}`, topicFrequencyResponse);
    fetchMock.get(`${activityReportsUrl}?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&${allRegions}&${lastThirtyDaysParams}`, activityReportsResponse);
    fetchMock.get(`${standardGoalsListUrl}?${allRegions}&${lastThirtyDaysParams}`, standardGoalsListResponse);

    // Only Region 1.
    fetchMock.get(`${overViewUrl}?${regionInParams}`, overViewResponse);
    fetchMock.get(`${totalHrsAndRecipientGraphUrl}?${regionInParams}`, totalHoursResponse);
    fetchMock.get(`${topicFrequencyGraphUrl}?${regionInParams}`, topicFrequencyResponse);
    fetchMock.get(`${activityReportsUrl}?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&${regionInParams}`, activityReportsResponse);
    fetchMock.get(`${standardGoalsListUrl}?${regionInParams}`, standardGoalsListResponse);

    renderDashboard(user);
    let heading = await screen.findByText(/regional tta activity dashboard/i);
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
    const apply = await screen.findByRole('button', { name: /apply filters for regional dashboard/i });
    act(() => userEvent.click(apply));

    // Verify page render after apply.
    heading = await screen.findByText(/regional tta activity dashboard/i);
    expect(heading).toBeVisible();

    // Remove Region 1 filter pill.
    const removeRegion = await screen.findByRole('button', { name: /this button removes the filter: region is 1/i });
    act(() => userEvent.click(removeRegion));

    heading = await screen.findByText(/regional tta activity dashboard/i);
    expect(heading).toBeVisible();
  });

  it('shows proper heading for user with one region', async () => {
    const user = {
      homeRegionId: 1,
      permissions: [{
        regionId: 1,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }],
    };

    fetchMock.get(`${overViewUrl}?${regionInParams}&${lastThirtyDaysParams}`, overViewResponse);
    fetchMock.get(`${totalHrsAndRecipientGraphUrl}?${regionInParams}&${lastThirtyDaysParams}`, totalHoursResponse);
    fetchMock.get(`${topicFrequencyGraphUrl}?${regionInParams}&${lastThirtyDaysParams}`, topicFrequencyResponse);
    fetchMock.get(`${activityReportsUrl}?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&${regionInParams}&${lastThirtyDaysParams}`, activityReportsResponse);

    renderDashboard(user);
    const heading = await screen.findByText(/Regional TTA activity dashboard/i);
    expect(heading).toBeVisible();
  });

  it('navigates to /activity-reports', async () => {
    const user = {
      homeRegionId: 1,
      permissions: [{
        regionId: 1,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }],
    };

    fetchMock.get(`${overViewUrl}?${regionInParams}&${lastThirtyDaysParams}`, overViewResponse);
    fetchMock.get(`${totalHrsAndRecipientGraphUrl}?${regionInParams}&${lastThirtyDaysParams}`, totalHoursResponse);
    fetchMock.get(`${topicFrequencyGraphUrl}?${regionInParams}&${lastThirtyDaysParams}`, topicFrequencyResponse);
    fetchMock.get(`${activityReportsUrl}?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&${regionInParams}&${lastThirtyDaysParams}`, activityReportsResponse);

    renderDashboard(user, 'activity-reports');
    const heading = await screen.findByText(/regional dashboard - activity reports/i);
    expect(heading).toBeVisible();
  });

  it('navigates to /training-reports', async () => {
    const user = {
      homeRegionId: 1,
      permissions: [{
        regionId: 1,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }],
    };

    fetchMock.get(`${overViewUrl}?${regionInParams}&${lastThirtyDaysParams}`, overViewResponse);
    fetchMock.get(`${totalHrsAndRecipientGraphUrl}?${regionInParams}&${lastThirtyDaysParams}`, totalHoursResponse);
    fetchMock.get(`${topicFrequencyGraphUrl}?${regionInParams}&${lastThirtyDaysParams}`, topicFrequencyResponse);
    fetchMock.get(`${activityReportsUrl}?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&${regionInParams}&${lastThirtyDaysParams}`, activityReportsResponse);

    renderDashboard(user, 'training-reports');
    const heading = await screen.findByText(/regional dashboard - training reports/i);
    expect(heading).toBeVisible();
  });

  it('navigates to /all-reports', async () => {
    const user = {
      homeRegionId: 1,
      permissions: [{
        regionId: 1,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }],
    };

    fetchMock.get(`${overViewUrl}?${regionInParams}&${lastThirtyDaysParams}`, overViewResponse);
    fetchMock.get(`${totalHrsAndRecipientGraphUrl}?${regionInParams}&${lastThirtyDaysParams}`, totalHoursResponse);
    fetchMock.get(`${topicFrequencyGraphUrl}?${regionInParams}&${lastThirtyDaysParams}`, topicFrequencyResponse);
    fetchMock.get(`${activityReportsUrl}?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&${regionInParams}&${lastThirtyDaysParams}`, activityReportsResponse);

    renderDashboard(user, 'all-reports');
    const heading = await screen.findByText(/regional dashboard - all reports/i);
    expect(heading).toBeVisible();
  });

  it('hides specialist name filter if user can approve reports', async () => {
    fetchMock.get('/api/widgets/overview?region.in[]=1&region.in[]=2', overViewResponse);
    fetchMock.get('/api/widgets/totalHrsAndRecipientGraph?region.in[]=1&region.in[]=2', totalHoursResponse);
    fetchMock.get('/api/widgets/topicFrequencyGraph?region.in[]=1&region.in[]=2', topicFrequencyResponse);
    fetchMock.get('/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&region.in[]=1&region.in[]=2', activityReportsResponse);

    const user = {
      homeRegionId: 1,
      permissions: [{
        regionId: 1,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      },
      {
        regionId: 2,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }],
    };

    renderDashboard(user);

    // Open filters menu.
    const open = await screen.findByRole('button', { name: /open filters for this page/i, hidden: true });
    act(() => userEvent.click(open));
    // expect 'specialist name' not to be in the document.
    expect(screen.queryAllByText('Specialist name').length).toBe(0);
  });

  it('shows specialist name filter if user can approve reports', async () => {
    fetchMock.get('/api/widgets/overview?region.in[]=1&region.in[]=2', overViewResponse, { overwriteRoutes: true });
    fetchMock.get('/api/widgets/totalHrsAndRecipientGraph?region.in[]=1&region.in[]=2', totalHoursResponse, { overwriteRoutes: true });
    fetchMock.get('/api/widgets/topicFrequencyGraph?region.in[]=1&region.in[]=2', topicFrequencyResponse, { overwriteRoutes: true });
    fetchMock.get('/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&region.in[]=1&region.in[]=2', activityReportsResponse, { overwriteRoutes: true });

    const user = {
      homeRegionId: 1,
      permissions: [{
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
      }],
    };

    renderDashboard(user);

    // Open filters menu.
    const open = await screen.findByRole('button', { name: /open filters for this page/i });
    act(() => userEvent.click(open));

    // expect 'specialist name' to be in the document.
    expect(await screen.findByText('Specialist name')).toBeVisible();
  });

  it('shows region filter if user has more than one region', async () => {
    fetchMock.get('/api/widgets/overview?region.in[]=1&region.in[]=2', overViewResponse, { overwriteRoutes: true });
    fetchMock.get('/api/widgets/totalHrsAndRecipientGraph?region.in[]=1&region.in[]=2', totalHoursResponse, { overwriteRoutes: true });
    fetchMock.get('/api/widgets/topicFrequencyGraph?region.in[]=1&region.in[]=2', topicFrequencyResponse, { overwriteRoutes: true });
    fetchMock.get('/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&region.in[]=1&region.in[]=2', activityReportsResponse, { overwriteRoutes: true });

    const user = {
      homeRegionId: 1,
      permissions: [{
        regionId: 1,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      },
      {
        regionId: 2,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }],
    };

    renderDashboard(user);

    // Open filters menu.
    const open = await screen.findByRole('button', { name: /open filters for this page/i });
    act(() => userEvent.click(open));

    expect(document.querySelector('option[value="region"]')).toBeTruthy();
  });
});
