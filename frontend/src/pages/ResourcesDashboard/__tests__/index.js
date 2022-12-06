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

import ResourcesDashboard from '../index';
import { formatDateRange } from '../../../utils';
import { SCOPE_IDS } from '../../../Constants';
import UserContext from '../../../UserContext';

const history = createMemoryHistory();

const resourceOverviewUrl = join('api', 'widgets', 'resourcesDashboardOverview');
const resourcesOverview = {
  report: {
    num: '1,721',
    numResources: '661',
    percentResources: '38.41%',
    numNoResources: '1,060',
    percentNoResources: '61.59%',
    numEclkc: '634',
    percentEclkc: '36.84%',
    numNonEclkc: '101',
    percentNonEclkc: '5.87%',
  },
  recipient: {
    num: '231',
    numResources: '220',
    percentResources: '95.24%',
    numNoResources: '11',
    percentNoResources: '4.76%',
    numEclkc: '219',
    percentEclkc: '94.81%',
    numNonEclkc: '83',
    percentNonEclkc: '35.93%',
  },
  resource: {
    num: '606',
    numEclkc: '500',
    percentEclkc: '82.51%',
    numNonEclkc: '106',
    percentNonEclkc: '17.49%',
  },
};

const resourcesOverviewRegionOne = {
  report: {
    num: '1,721',
    numResources: '661',
    percentResources: '38.41%',
    numNoResources: '1,060',
    percentNoResources: '61.59%',
    numEclkc: '634',
    percentEclkc: '36.84%',
    numNonEclkc: '101',
    percentNonEclkc: '5.87%',
  },
  recipient: {
    num: '231',
    numResources: '220',
    percentResources: '95.24%',
    numNoResources: '11',
    percentNoResources: '4.76%',
    numEclkc: '219',
    percentEclkc: '94.81%',
    numNonEclkc: '83',
    percentNonEclkc: '35.93%',
  },
  resource: {
    num: '606',
    numEclkc: '500',
    percentEclkc: '82.51%',
    numNonEclkc: '106',
    percentNonEclkc: '17.49%',
  },
};

const resourceListUrl = join('api', 'widgets', 'resourceList');
const resourceListResponse = [
  {
    name: 'Resource one',
    url: '',
    reportCount: 4,
    participantCount: 6,
    recipientCount: 2,
  },
  {
    name: 'Resource two',
    url: '',
    reportCount: 7,
    participantCount: 8,
    recipientCount: 3,
  },
  {
    name: 'Resource three',
    url: '',
    reportCount: 9,
    participantCount: 5,
    recipientCount: 1,
  },
];

const resourceListResponseRegionOne = [
  {
    name: 'Resource URL 4',
    url: '',
    reportCount: 12,
    participantCount: 11,
    recipientCount: 10,
  },
];

const lastThirtyDays = formatDateRange({
  lastThirtyDays: true,
  forDateTime: true,
});
const allRegions = 'region.in[]=1&region.in[]=2';
const lastThirtyDaysParams = `startDate.win=${encodeURIComponent(lastThirtyDays)}`;

const regionInParams = 'region.in[]=1';

describe('Resources Dashboard page', () => {
  afterEach(() => fetchMock.restore());
  const renderResourcesDashboard = (user) => {
    render(
      <UserContext.Provider value={{ user }}>
        <Router history={history}>
          <ResourcesDashboard user={user} />
        </Router>
      </UserContext.Provider>,
    );
  };

  it('renders correctly', async () => {
    // Page Load.
    fetchMock.get(`${resourceListUrl}?${allRegions}&${lastThirtyDaysParams}`, resourceListResponse);
    fetchMock.get(`${resourceOverviewUrl}?${allRegions}&${lastThirtyDaysParams}`, resourcesOverview);

    // Region 1.
    fetchMock.get(`${resourceListUrl}?${regionInParams}`, resourceListResponseRegionOne);
    fetchMock.get(`${resourceOverviewUrl}?${regionInParams}`, resourcesOverviewRegionOne);

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

    renderResourcesDashboard(user);
    expect(await screen.findByText(/resources dashboard/i)).toBeVisible();

    // Resource List (initial).
    expect(screen.getByText(/resources in activity reports/i)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /resource/i })).toBeInTheDocument(3);
    expect(screen.getByRole('columnheader', { name: /number of activities/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /number of participants/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /number of recipients/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /resource one/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /4/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /6/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /2/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /resource two/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /2/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /8/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /2/i })).toBeInTheDocument();

    // Overview (initial).
    expect(screen.getByText(/95.24%/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Recipients rec'd resources\r?\n?[ \t]*220 of 231/i)).toBeInTheDocument();
    expect(screen.getByText(/94.81%/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Recipients rec'd ECLKC resources\r?\n?[ \t]*219 of 231/i)).toBeInTheDocument();
    expect(screen.getByText(/35.93%/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Recipients rec'd non-ECLKC resources\r?\n?[ \t]*83 of 231/i)).toBeInTheDocument();
    expect(screen.getByText(/4.76%/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Recipients rec'd no resources\r?\n?[ \t]*11 of 231/i)).toBeInTheDocument();

    expect(screen.getByText(/38.41%/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Reports include resources\r?\n?[ \t]*661 of 1,721/i)).toBeInTheDocument();
    expect(screen.getByText(/36.84%/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Reports include ECLKC resources\r?\n?[ \t]*634 of 1,721/i)).toBeInTheDocument();
    expect(screen.getByText(/5.87%/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Reports include non-ECLKC resources\r?\n?[ \t]*101 of 1,721/i)).toBeInTheDocument();
    expect(screen.getByText(/61.59%/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Reports include no resources\r?\n?[ \t]*1,060 of 1,721/i)).toBeInTheDocument();

    expect(screen.getByText(/82.51%/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*ECLKC Resources\r?\n?[ \t]*500 of 606/i)).toBeInTheDocument();
    expect(screen.getByText(/17.49%/i)).toBeInTheDocument();
    expect(screen.getByText(/^[ \t]*Non-ECLKC Resources\r?\n?[ \t]*106 of 606/i)).toBeInTheDocument();

    // Remove existing filter.
    const remove = await screen.findByRole('button', { name: /This button removes the filter/i });
    act(() => userEvent.click(remove));

    // Add region filter.
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
    const apply = await screen.findByRole('button', { name: /apply filters for resources dashboard/i });
    act(() => userEvent.click(apply));

    // Verify page render after apply.
    expect(await screen.findByText(/resources dashboard/i)).toBeVisible();

    // Resource List (region filter).
    expect(await screen.findByRole('heading', { name: /resources in activity reports/i })).toBeVisible();
    expect(await screen.findByRole('cell', { name: /resource url 4/i })).toBeVisible();
    expect(await screen.findByRole('cell', { name: /500/i })).toBeVisible();

    // Overview (region filter).
    expect(screen.getByText(/20%/i)).toBeInTheDocument();
    expect(screen.getByText(/2 eclkc resources of 10/i)).toBeInTheDocument();
    expect(screen.getByText(/30%/i)).toBeInTheDocument();
    expect(screen.getByText(/3 non-eclkc resources of 10/i)).toBeInTheDocument();
    expect(screen.getByText(/40%/i)).toBeInTheDocument();
    expect(screen.getByText(/4 no resources of 10/i)).toBeInTheDocument();
  });
});
