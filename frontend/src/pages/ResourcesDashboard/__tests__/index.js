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

const resourceListUrl = join('api', 'widgets', 'resourceList');
const resourceListResponse = [
  { name: 'Resource URL 1', count: 759 },
  { name: 'Resource URL 2', count: 220 },
  { name: 'Resource URL 3', count: 135 },
];

const resourceListResponseRegionOne = [
  { name: 'Resource URL 4', count: 500 },
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

    // Region 1.
    fetchMock.get(`${resourceListUrl}?${regionInParams}`, resourceListResponseRegionOne);

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
    expect(await screen.findByRole('heading', { name: /resources in activity reports/i })).toBeVisible();
    expect(await screen.findByRole('cell', { name: /resource url 1/i })).toBeVisible();
    expect(await screen.findByRole('cell', { name: /759/i })).toBeVisible();
    expect(await screen.findByRole('cell', { name: /resource url 2/i })).toBeVisible();
    expect(await screen.findByRole('cell', { name: /220/i })).toBeVisible();
    expect(await screen.findByRole('cell', { name: /resource url 3/i })).toBeVisible();
    expect(await screen.findByRole('cell', { name: /135/i })).toBeVisible();

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
  });
});
