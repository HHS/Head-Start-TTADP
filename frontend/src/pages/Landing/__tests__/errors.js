import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import fetchMock from 'fetch-mock';

import UserContext from '../../../UserContext';
import AriaLiveContext from '../../../AriaLiveContext';
import Landing from '../index';
import { overviewRegionOne } from '../mocks';

jest.mock('../../../fetchers/helpers');

const mockAnnounce = jest.fn();

const base = '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10';
const baseAlerts = '/api/activity-reports/alerts?sortBy=startDate&sortDir=desc&offset=0&limit=10';

const withRegionOne = '&region.in[]=1';
const baseAlertsWithRegionOne = `${baseAlerts}${withRegionOne}`;
const baseWithRegionOne = `${base}${withRegionOne}`;
const defaultOverviewUrl = '/api/widgets/overview';
const overviewUrlWithRegionOne = `${defaultOverviewUrl}?region.in[]=1`;

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

describe('Landing Page error', () => {
  afterEach(async () => fetchMock.reset());
  beforeEach(async () => {
    fetchMock.get(defaultOverviewUrl, overviewRegionOne);
    fetchMock.get(baseAlerts, { alertsCount: 0, alerts: [] });
    fetchMock.get(overviewUrlWithRegionOne, overviewRegionOne);
    fetchMock.get(baseAlertsWithRegionOne, { alertsCount: 0, alerts: [] });
  });

  it('handles errors by displaying an error message', async () => {
    fetchMock.get(base, 500, { overwriteRoutes: true });
    fetchMock.get(baseWithRegionOne, 500, { overwriteRoutes: true });
    const user = {
      name: 'test@test.com',
      homeRegionId: 2,
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
  });

  it('no empty row is shown if there are no reports', async () => {
    fetchMock.get(base, { count: 0, rows: [] });
    fetchMock.get(baseWithRegionOne, { count: 0, rows: [] });
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
    expect(await screen.findByText(/0-0 of 0/i)).toBeVisible();
  });

  it('does not displays new activity report button without permission', async () => {
    fetchMock.get(base, { count: 0, rows: [] });
    fetchMock.get(baseWithRegionOne, { count: 0, rows: [] });
    const user = {
      name: 'test@test.com',
      permissions: [
        {
          scopeId: 4,
          regionId: 1,
        },
      ],
    };
    renderLanding(user);

    await expect(screen.findAllByText(/New Activity Report/)).rejects.toThrow();
  });
});
