import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, fireEvent, within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import fetchMock from 'fetch-mock';
import { v4 as uuidv4 } from 'uuid';
import UserContext from '../../../UserContext';
import AriaLiveContext from '../../../AriaLiveContext';
import Landing from '../index';
import { generateXFakeReports, overviewRegionOne } from '../mocks';
import { filtersToQueryString, formatDateRange } from '../../../utils';
import { mockWindowProperty } from '../../../testHelpers';

jest.mock('../../../fetchers/helpers');

const mockAnnounce = jest.fn();

// Get last 30 day filter.
const defaultDate = formatDateRange({
  lastThirtyDays: true,
  forDateTime: true,
});

const filters = [{
  id: uuidv4(),
  topic: 'startDate',
  condition: 'Is within',
  query: defaultDate,
}];

const dateFilter = filtersToQueryString(filters);

const base = `/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&${dateFilter}`;
const baseAlerts = `/api/activity-reports/alerts?sortBy=startDate&sortDir=desc&offset=0&limit=10&${dateFilter}`;

const withRegionOne = '&region.in[]=1';
const baseAlertsWithRegionOne = `${baseAlerts}${withRegionOne}`;
const baseWithRegionOne = `${base}${withRegionOne}`;

const defaultOverviewUrl = `/api/widgets/overview?${dateFilter}`;
const defaultOverviewUrlWithRegionOne = `${defaultOverviewUrl}${withRegionOne}`;

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

describe('handles region filter', () => {
  mockWindowProperty('sessionStorage', {
    setItem: jest.fn(),
    getItem: jest.fn(),
  });

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
