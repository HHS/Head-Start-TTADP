/* eslint-disable max-len */
import '@testing-library/jest-dom';
import {
  // act,
  render,
  screen,
  // fireEvent,
} from '@testing-library/react';
import { SCOPE_IDS } from '@ttahub/common';
// import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import moment from 'moment';
import React from 'react';
import { Router } from 'react-router-dom';
import join from 'url-join';
import AriaLiveContext from '../../../AriaLiveContext';
import UserContext from '../../../UserContext';
import { formatDateRange } from '../../../utils';
import CourseDashboard from '../index';

const history = createMemoryHistory();

const defaultDate = formatDateRange({
  forDateTime: true,
  string: `2022/07/01-${moment().format('YYYY/MM/DD')}`,
  withSpaces: false,
});
const defaultDateParam = `startDate.win=${encodeURIComponent(defaultDate)}`;

const coursesDefault = {
  coursesAssociatedWithActivityReports: {
    headers: ['Oct-22', 'Nov-22', 'Dec-22'],
    courses: [
      {
        heading: 'Sample Course 1',
        isUrl: false,
        data: [
          {
            title: 'Oct-22',
            value: '66',
          },
          {
            title: 'Nov-22',
            value: '773',
          },
          {
            title: 'Dec-22',
            value: '88',
          },
          {
            title: 'total',
            value: '99',
          },
        ],
      },
      {
        heading: 'Sample Course 2',
        isUrl: false,
        data: [
          {
            title: 'Oct-22',
            value: '111',
          },
          {
            title: 'Nov-22',
            value: '222',
          },
          {
            title: 'Dec-22',
            value: '333',
          },
          {
            title: 'total',
            value: '444',
          },
        ],
      },
    ],
  },
};

const coursesUrl = join('api', 'courses/dashboard');
const allRegions = 'region.in[]=1&region.in[]=2';
const mockAnnounce = jest.fn();

describe('Resources Dashboard page', () => {
  afterEach(() => fetchMock.restore());
  const renderResourcesDashboard = (user) => {
    render(
      <UserContext.Provider value={{ user }}>
        <AriaLiveContext.Provider value={{ announce: mockAnnounce }}>
          <Router history={history}>
            <CourseDashboard user={user} />
          </Router>
        </AriaLiveContext.Provider>
      </UserContext.Provider>
    );
  };

  it('renders correctly', async () => {
    fetchMock.get(`${coursesUrl}?${allRegions}`, coursesDefault, { overwriteRoutes: true });

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

    renderResourcesDashboard(user);
    expect(await screen.findByText('iPD courses')).toBeVisible();

    // Assert column headers.
    expect(await screen.findByText(/oct-22/i)).toBeVisible();
    expect(await screen.findByText(/nov-22/i)).toBeVisible();

    // Check for the course data.
    expect(await screen.findByText(/sample course 1/i)).toBeVisible();
    expect(await screen.findByText(/sample course 2/i)).toBeVisible();

    // Assert course values.
    expect(await screen.findByText(/66/i)).toBeVisible();
    expect(await screen.findByText(/773/i)).toBeVisible();
    expect(await screen.findByText(/88/i)).toBeVisible();
    expect(await screen.findByText(/99/i)).toBeVisible();

    expect(await screen.findByText(/111/i)).toBeVisible();
    expect(await screen.findByText(/222/i)).toBeVisible();
    expect(await screen.findByText(/333/i)).toBeVisible();
    expect(await screen.findByText(/444/i)).toBeVisible();
  });

  it('handles errors by displaying an error message', async () => {
    // Page Load.
    fetchMock.get(`${coursesUrl}?${allRegions}&${defaultDateParam}`, 500, {
      overwriteRoutes: true,
    });

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

    renderResourcesDashboard(user);

    const [alert] = await screen.findAllByRole('alert');
    expect(alert).toBeVisible();
    expect(alert.textContent).toBe('Unable to fetch course data');
  });
});
