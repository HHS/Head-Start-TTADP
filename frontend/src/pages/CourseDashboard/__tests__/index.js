/* eslint-disable max-len */
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SCOPE_IDS } from '@ttahub/common';
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
        id: 0,
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
        id: 1,
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
  beforeEach(() => {
    window.sessionStorage.clear();
    history.replace('/');
  });
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
    expect(await screen.findByText('EEP courses')).toBeVisible();

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

  it.each(['apply', 'remove', 'region permissions'])(
    'resets course pagination when filters change via %s',
    async (mutation) => {
      const user = {
        homeRegionId: 14,
        permissions: [
          { regionId: 1, scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS },
          { regionId: 2, scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS },
        ],
      };
      const initialRegions =
        mutation === 'region permissions'
          ? 'region.in[]=99&region.in[]=1'
          : mutation === 'remove'
            ? 'region.in[]=1'
            : allRegions;
      history.replace(`/?${initialRegions}`);
      const filteredRegions = mutation === 'apply' ? 'region.in[]=1' : allRegions;
      if (mutation === 'region permissions') {
        window.sessionStorage.setItem('', '[]');
        window.sessionStorage.setItem(
          '-activityReportsTable-sorting',
          JSON.stringify({ sortBy: '1', direction: 'desc', activePage: 2 })
        );
      }
      const initialUrl = `${coursesUrl}?${initialRegions}`;
      const filteredUrl = `${coursesUrl}?${filteredRegions}`;
      const course = coursesDefault.coursesAssociatedWithActivityReports.courses[0];
      fetchMock.get(initialUrl, {
        coursesAssociatedWithActivityReports: {
          headers: coursesDefault.coursesAssociatedWithActivityReports.headers,
          courses: Array.from({ length: 11 }, (_, id) => ({
            ...course,
            id,
            heading: `Initial Course ${id}`,
          })),
        },
      });
      fetchMock.get(filteredUrl, {
        coursesAssociatedWithActivityReports: {
          headers: coursesDefault.coursesAssociatedWithActivityReports.headers,
          courses: [{ ...course, heading: 'Filtered Course' }],
        },
      });
      renderResourcesDashboard(user);

      if (mutation !== 'region permissions') {
        await screen.findByText('Initial Course 0');
        await userEvent.click(screen.getByRole('button', { name: /page 2/i }));
      }
      expect(await screen.findByText('Initial Course 10')).toBeVisible();

      if (mutation === 'apply') {
        await userEvent.click(screen.getByRole('button', { name: /open filters for this page/i }));
        const [topic] = Array.from(document.querySelectorAll('[name="topic"]')).slice(-1);
        await userEvent.selectOptions(topic, 'region');
        const [condition] = Array.from(document.querySelectorAll('[name="condition"]')).slice(-1);
        await userEvent.selectOptions(condition, 'is');
        await userEvent.selectOptions(
          screen.getByRole('combobox', { name: 'Select region to filter by' }),
          'Region 1'
        );
        await userEvent.click(
          screen.getByRole('button', { name: /apply filters for course dashboard/i })
        );
      } else if (mutation === 'remove') {
        await userEvent.click(
          screen.getByRole('button', { name: /this button removes the filter: region is 1/i })
        );
      } else {
        await userEvent.click(screen.getByRole('button', { name: /show filter with my regions/i }));
      }

      await waitFor(() => expect(fetchMock.called(filteredUrl)).toBe(true));
      expect(await screen.findByText('Filtered Course')).toBeVisible();
      expect(screen.queryByText('Initial Course 10')).not.toBeInTheDocument();
    }
  );
});
