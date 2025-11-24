/* eslint-disable max-len */
import '@testing-library/jest-dom';
import React from 'react';
import moment from 'moment';
import join from 'url-join';
import { SCOPE_IDS } from '@ttahub/common';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import {
  act,
  render,
  screen,
  fireEvent,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';

import ResourcesDashboard from '../index';
import UserContext from '../../../UserContext';
import AriaLiveContext from '../../../AriaLiveContext';
import MyGroupsProvider from '../../../components/MyGroupsProvider';
import { formatDateRange } from '../../../utils';

const history = createMemoryHistory();

const defaultDate = formatDateRange({
  forDateTime: true,
  string: `2022/07/01-${moment().format('YYYY/MM/DD')}`,
  withSpaces: false,
});
const defaultDateParam = `startDate.win=${encodeURIComponent(defaultDate)}`;

const resourcesUrl = join('api', 'resources/flat');

const resourcesDefault = {
  resourcesDashboardOverview: {
    report: {
      numResources: '8,135',
      num: '19,914',
      percentResources: '40.85%',
    },
    resource: {
      numHeadStart: '1,819',
      num: '2,365',
      percentHeadStart: '79.91%',
    },
    recipient: {
      numResources: '248',
    },
    participant: {
      numParticipants: '765',
    },
    ipdCourses: {
      percentReports: '4.65%',
    },
  },
  resourcesUse: {
    headers: [{
      displayName: 'Jan-22',
      name: 'January 2022',
    }],
    resources: [
      {
        heading: 'https://test1.gov',
        isUrl: true,
        data: [
          {
            title: 'Jan-22',
            value: '177',
          },
          {
            title: 'total',
            value: '262',
          },
        ],
      },
    ],
  },
  topicUse: {
    headers: [
      {
        displayName: 'Oct-22',
        name: 'October 2022',
      },
      {
        displayName: 'Nov-22',
        name: 'November 2022',
      },
      {
        displayName: 'Dec-22',
        name: 'December 2022',
      },
    ],
    topics: [{
      heading: 'https://official1.gov',
      isUrl: true,
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
    ],
  },
  reportIds: [1, 2, 3],
};

const resourcesRegion1 = {
  resourcesDashboardOverview: {
    report: {
      numResources: '7,135',
      num: '18,914',
      percentResources: '2.65%',
    },
    resource: {
      numHeadStart: '819',
      num: '1,365',
      percentHeadStart: '1.66%',
    },
    recipient: {
      numResources: '148',
    },
    participant: {
      numParticipants: '665',
    },
    ipdCourses: {
      percentReports: '4.65%',
    },
  },
  resourcesUse: {
    headers: [{
      displayName: 'Jan-22',
      name: 'January 2022',
    }],
    resources: [
      {
        heading: 'https://test2.gov',
        isUrl: true,
        data: [
          {
            title: 'Jan-22',
            value: '18',
          },
          {
            title: 'total',
            value: '21',
          },
        ],
      },
    ],
  },
  topicUse: {
    headers: [
      {
        displayName: 'Oct-22',
        name: 'October 2022',
      },
      {
        displayName: 'Nov-22',
        name: 'November 2022',
      },
      {
        displayName: 'Dec-22',
        name: 'December 2022',
      },
    ],
    topics: [{
      heading: 'https://official2.gov',
      isUrl: true,
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
  reportIds: [],
};

const resourcesRegion2 = {
  resourcesDashboardOverview: {
    report: {
      numResources: '6,135',
      num: '17,914',
      percentResources: '1.65%',
    },
    resource: {
      numHeadStart: '818',
      num: '365',
      percentHeadStart: '.66%',
    },
    recipient: {
      numResources: '148',
    },
    participant: {
      numParticipants: '565',
    },
    ipdCourses: {
      percentReports: '4.65%',
    },
  },
  resourcesUse: {
    headers: [{
      displayName: 'Jan-22',
      name: 'January 2022',
    }],
    resources: [
      {
        heading: 'https://test3.gov',
        isUrl: true,
        data: [
          {
            title: 'Jan-22',
            value: '19',
          },
          {
            title: 'total',
            value: '22',
          },
        ],
      },
    ],
  },
  topicUse: {
    headers: [
      {
        displayName: 'Oct-22',
        name: 'October 2022',
      },
      {
        displayName: 'Nov-22',
        name: 'November 2022',
      },
      {
        displayName: 'Dec-22',
        name: 'December 2022',
      },
    ],
    topics: [{
      heading: 'https://official3.gov',
      isUrl: true,
      data: [
        {
          title: 'Oct-22',
          value: '333',
        },
        {
          title: 'Nov-22',
          value: '444',
        },
        {
          title: 'Dec-22',
          value: '555',
        },
        {
          title: 'total',
          value: '666',
        },
      ],
    },
    ],
  },
  activityReports: {
    count: 1,
    rows: [],
    topics: [],
    recipients: [],
  },
  reportIds: [],
};

const reportResponse = {
  count: 0,
  rows: [],
  topics: [],
  recipients: [],
};

const allRegions = 'region.in[]=1&region.in[]=2';
const mockAnnounce = jest.fn();
const regionInParams = 'region.in[]=1';
const regionTwoInParams = 'region.in[]=2';
const reportIdInParams = 'region.in[]=1&region.in[]=2&reportId.ctn[]=123';
const reportPostUrl = '/api/activity-reports/reportsByManyIds';

describe('Resource Dashboard page', () => {
  beforeEach(() => {
    fetchMock.get('/api/groups', []);
  });

  afterEach(() => fetchMock.restore());

  const renderResourcesDashboard = (user) => {
    render(
      <MyGroupsProvider authenticated>
        <UserContext.Provider value={{ user }}>
          <AriaLiveContext.Provider value={{ announce: mockAnnounce }}>
            <Router history={history}>
              <ResourcesDashboard user={user} />
            </Router>
          </AriaLiveContext.Provider>
        </UserContext.Provider>
      </MyGroupsProvider>,
    );
  };

  it('renders correctly', async () => {
    // Page Load.
    fetchMock.get(`${resourcesUrl}?${allRegions}&${defaultDateParam}`, resourcesDefault);
    fetchMock.get(`${resourcesUrl}?${allRegions}`, resourcesDefault);

    // Region 1.
    fetchMock.get(`${resourcesUrl}?${regionInParams}`, resourcesRegion1);

    // Region 2.
    fetchMock.get(`${resourcesUrl}?${regionTwoInParams}`, resourcesRegion2);

    // Report ID (non-region).
    fetchMock.get(`${resourcesUrl}?${reportIdInParams}`, resourcesRegion2);

    fetchMock.post(reportPostUrl, reportResponse);

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
    expect(await screen.findByText(/resource dashboard/i)).toBeVisible();

    const button = await screen.findByRole('button', { name: /Open Actions for Resource use/i });

    act(() => {
      userEvent.click(button);
    });

    const viewAsTable = await screen.findByRole('button', { name: /view as table/i });

    act(() => {
      userEvent.click(viewAsTable);
    });

    // Overview (initial).
    expect(screen.getByText(/40.85%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*reports with resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/8,135 of 19,914/i)).toBeInTheDocument();

    expect(screen.getByText(/79.91%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*headstart.gov resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/1,819 of 2,365/i)).toBeInTheDocument();

    expect(await screen.findByText(/248/i)).toBeVisible();
    expect(screen.getAllByText(/^[ \t]*recipients reached[ \t]*$/i)[0]).toBeInTheDocument();
    expect(await screen.findByText(/765/i)).toBeVisible();
    expect(screen.getAllByText(/^[ \t]*participants reached[ \t]*$/i)[0]).toBeInTheDocument();

    // Resource Use (initial).
    expect(screen.getByText(/Jan-22/i)).toBeInTheDocument();
    expect(screen.getByText(/test1.gov/i)).toBeInTheDocument();
    expect(screen.getAllByText(/177/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/262/i)[0]).toBeInTheDocument();

    // Resources Associated Default.
    expect(screen.getByText(/Resources associated with topics on Activity Reports/i)).toBeInTheDocument();
    expect(screen.getByText(/Oct-22/i)).toBeInTheDocument();
    expect(screen.getByText(/Nov-22/i)).toBeInTheDocument();
    expect(screen.getByText(/Dec-22/i)).toBeInTheDocument();

    expect(screen.getByText(/https:\/\/official1\.gov/i)).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /66/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /773/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /88/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /99/i })).toBeInTheDocument();

    // Add region filter.
    let open = await screen.findByRole('button', { name: /open filters for this page/i });
    act(() => userEvent.click(open));

    // Change first filter to Region 1.
    let [lastTopic] = Array.from(document.querySelectorAll('[name="topic"]')).slice(-1);
    act(() => userEvent.selectOptions(lastTopic, 'region'));

    let [lastCondition] = Array.from(document.querySelectorAll('[name="condition"]')).slice(-1);
    act(() => userEvent.selectOptions(lastCondition, 'is'));

    let select = await screen.findByRole('combobox', { name: 'Select region to filter by' });
    act(() => userEvent.selectOptions(select, 'Region 1'));

    // Apply filter menu with Region 1 filter.
    let apply = await screen.findByRole('button', { name: /apply filters for resources dashboard/i });
    act(() => userEvent.click(apply));

    // Verify page render after apply.
    expect(await screen.findByText(/resource dashboard/i)).toBeVisible();

    // Overview (region filter).
    expect(screen.getByText(/2.65%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*reports with resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/7,135 of 18,914/i)).toBeInTheDocument();

    expect(screen.getByText(/1.66%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*headstart.gov resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/819 of 1,365/i)).toBeInTheDocument();

    expect(await screen.findByText(/148/i)).toBeVisible();
    expect(screen.getAllByText(/^[ \t]*recipients reached[ \t]*$/i)[0]).toBeInTheDocument();
    expect(await screen.findByText(/665/i)).toBeVisible();
    expect(screen.getAllByText(/^[ \t]*participants reached[ \t]*$/i)[0]).toBeInTheDocument();

    // Reason Use.
    expect(screen.getByText(/Jan-22/i)).toBeInTheDocument();
    expect(screen.getByText(/test2.gov/i)).toBeInTheDocument();

    // Resources Region 1.
    expect(screen.getByText(/Resources associated with topics on Activity Reports/i)).toBeInTheDocument();
    expect(screen.getByText(/Oct-22/i)).toBeInTheDocument();
    expect(screen.getByText(/Nov-22/i)).toBeInTheDocument();
    expect(screen.getByText(/Dec-22/i)).toBeInTheDocument();

    expect(screen.getByText(/https:\/\/official2\.gov/i)).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /111/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /222/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /333/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /444/i })).toBeInTheDocument();
    // Remove filter.
    open = await screen.findByRole('button', { name: /open filters for this page/i });
    act(() => userEvent.click(open));

    const removeBtn = await screen.findByRole('button', { name: /remove region is 1 filter\. click apply filters to make your changes/i });
    act(() => userEvent.click(removeBtn));

    apply = await screen.findByRole('button', { name: /apply filters for resources dashboard/i });
    act(() => userEvent.click(apply));
    expect(await screen.findByText(/resource dashboard/i)).toBeVisible();

    // Overview reverted after remove.
    expect(screen.getByText(/40.85%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*reports with resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/8,135 of 19,914/i)).toBeInTheDocument();

    expect(screen.getByText(/79.91%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*headstart.gov resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/1,819 of 2,365/i)).toBeInTheDocument();

    expect(await screen.findByText(/248/i)).toBeVisible();
    expect(screen.getAllByText(/^[ \t]*recipients reached[ \t]*$/i)[0]).toBeInTheDocument();
    expect(await screen.findByText(/765/i)).toBeVisible();
    expect(screen.getAllByText(/^[ \t]*participants reached[ \t]*$/i)[0]).toBeInTheDocument();

    // Resource Use (initial).
    expect(screen.getByText(/Jan-22/i)).toBeInTheDocument();
    expect(screen.getByText(/test1.gov/i)).toBeInTheDocument();
    expect(screen.getAllByText(/177/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/262/i)[0]).toBeInTheDocument();

    // Resources Associated Default.
    expect(screen.getByText(/Resources associated with topics on Activity Reports/i)).toBeInTheDocument();
    expect(screen.getByText(/Oct-22/i)).toBeInTheDocument();
    expect(screen.getByText(/Nov-22/i)).toBeInTheDocument();
    expect(screen.getByText(/Dec-22/i)).toBeInTheDocument();

    expect(screen.getByText(/https:\/\/official1\.gov/)).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /66/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /773/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /88/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /99/i })).toBeInTheDocument();

    // Add region filter test pill remove.
    open = await screen.findByRole('button', { name: /open filters for this page/i });
    act(() => userEvent.click(open));

    [lastTopic] = Array.from(document.querySelectorAll('[name="topic"]')).slice(-1);
    act(() => userEvent.selectOptions(lastTopic, 'region'));

    [lastCondition] = Array.from(document.querySelectorAll('[name="condition"]')).slice(-1);
    act(() => userEvent.selectOptions(lastCondition, 'is'));

    select = await screen.findByRole('combobox', { name: 'Select region to filter by' });
    act(() => userEvent.selectOptions(select, 'Region 2'));

    apply = await screen.findByRole('button', { name: /apply filters for resources dashboard/i });
    act(() => userEvent.click(apply));
    expect(await screen.findByText(/resource dashboard/i)).toBeVisible();

    expect(screen.getByText(/1.65%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*reports with resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/6,135 of 17,914/i)).toBeInTheDocument();

    // iPD courses
    expect(screen.getByText(/4.65%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*reports citing ipd courses[ \t]*$/i)[0]).toBeInTheDocument();

    expect(screen.getByText(/.66%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*headstart.gov resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/818 of 365/i)).toBeInTheDocument();

    expect(await screen.findByText(/148/i)).toBeVisible();
    expect(screen.getAllByText(/^[ \t]*recipients reached[ \t]*$/i)[0]).toBeInTheDocument();
    expect(await screen.findByText(/565/i)).toBeVisible();
    expect(screen.getAllByText(/^[ \t]*participants reached[ \t]*$/i)[0]).toBeInTheDocument();

    // Resource Use.
    expect(screen.getByText(/Jan-22/i)).toBeInTheDocument();
    expect(screen.getByText(/test3.gov/i)).toBeInTheDocument();
    expect(screen.getAllByText(/19/i)[0]).toBeInTheDocument();

    // Resources Region 2.
    expect(screen.getByText(/Resources associated with topics on Activity Reports/i)).toBeInTheDocument();
    expect(screen.getByText(/Oct-22/i)).toBeInTheDocument();
    expect(screen.getByText(/Nov-22/i)).toBeInTheDocument();
    expect(screen.getByText(/Dec-22/i)).toBeInTheDocument();

    expect(screen.getByText(/https:\/\/official3\.gov/i)).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /333/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /444/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /555/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /666/i })).toBeInTheDocument();

    // Test filter updates from region pill remove.
    let removePill = await screen.findByRole('button', { name: /this button removes the filter: region is 2/i });
    act(() => userEvent.click(removePill));
    expect(await screen.findByText(/resource dashboard/i)).toBeVisible();

    // Overview reverted after remove.
    expect(screen.getByText(/40.85%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*reports with resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/8,135 of 19,914/i)).toBeInTheDocument();

    expect(screen.getByText(/79.91%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*headstart.gov resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/1,819 of 2,365/i)).toBeInTheDocument();

    expect(await screen.findByText(/248/i)).toBeVisible();
    expect(screen.getAllByText(/^[ \t]*recipients reached[ \t]*$/i)[0]).toBeInTheDocument();
    expect(await screen.findByText(/765/i)).toBeVisible();
    expect(screen.getAllByText(/^[ \t]*participants reached[ \t]*$/i)[0]).toBeInTheDocument();

    // Resource Use (initial).
    expect(screen.getByText(/Jan-22/i)).toBeInTheDocument();
    expect(screen.getByText(/test1.gov/i)).toBeInTheDocument();
    expect(screen.getAllByText(/177/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/262/i)[0]).toBeInTheDocument();

    // Add non-region filter.
    open = await screen.findByRole('button', { name: /open filters for this page/i });
    act(() => userEvent.click(open));

    [lastTopic] = Array.from(document.querySelectorAll('[name="topic"]')).slice(-1);
    act(() => userEvent.selectOptions(lastTopic, 'Report ID'));

    [lastCondition] = Array.from(document.querySelectorAll('[name="condition"]')).slice(-1);
    act(() => userEvent.selectOptions(lastCondition, 'contains'));

    const reportIdText = await screen.findByRole('textbox', { name: /enter a report id/i });
    act(() => {
      fireEvent.change(reportIdText, { target: { value: '123' } });
    });

    apply = await screen.findByRole('button', { name: /apply filters for resources dashboard/i });
    act(() => userEvent.click(apply));
    expect(await screen.findByText(/resource dashboard/i)).toBeVisible();

    expect(screen.getByText(/1.65%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*reports with resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/6,135 of 17,914/i)).toBeInTheDocument();

    expect(screen.getByText(/.66%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*headstart.gov resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/818 of 365/i)).toBeInTheDocument();

    expect(await screen.findByText(/148/i)).toBeVisible();
    expect(screen.getAllByText(/^[ \t]*recipients reached[ \t]*$/i)[0]).toBeInTheDocument();
    expect(await screen.findByText(/565/i)).toBeVisible();
    expect(screen.getAllByText(/^[ \t]*participants reached[ \t]*$/i)[0]).toBeInTheDocument();

    // Resource Use.
    expect(screen.getByText(/Jan-22/i)).toBeInTheDocument();
    expect(screen.getByText(/test3.gov/i)).toBeInTheDocument();
    expect(screen.getAllByText(/19/i)[0]).toBeInTheDocument();

    // Resources Region 2.
    expect(screen.getByText(/Resources associated with topics on Activity Reports/i)).toBeInTheDocument();
    expect(screen.getByText(/Oct-22/i)).toBeInTheDocument();
    expect(screen.getByText(/Nov-22/i)).toBeInTheDocument();
    expect(screen.getByText(/Dec-22/i)).toBeInTheDocument();

    expect(screen.getByText(/https:\/\/official3\.gov/i)).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /333/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /444/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /555/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /666/i })).toBeInTheDocument();

    // Test remove non-region filter pill.
    removePill = await screen.findByRole('button', { name: /this button removes the filter: report id contains 123/i });
    act(() => userEvent.click(removePill));
    expect(await screen.findByText(/resource dashboard/i)).toBeVisible();

    // Shows initial.
    expect(screen.getByText(/40.85%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*reports with resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/8,135 of 19,914/i)).toBeInTheDocument();

    expect(screen.getByText(/79.91%/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^[ \t]*headstart.gov resources[ \t]*$/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/1,819 of 2,365/i)).toBeInTheDocument();

    expect(await screen.findByText(/248/i)).toBeVisible();
    expect(screen.getAllByText(/^[ \t]*recipients reached[ \t]*$/i)[0]).toBeInTheDocument();
    expect(await screen.findByText(/765/i)).toBeVisible();
    expect(screen.getAllByText(/^[ \t]*participants reached[ \t]*$/i)[0]).toBeInTheDocument();

    // Resource Use (initial).
    expect(screen.getByText(/Jan-22/i)).toBeInTheDocument();
    expect(screen.getByText(/test1.gov/i)).toBeInTheDocument();
    expect(screen.getAllByText(/177/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/262/i)[0]).toBeInTheDocument();

    // Resources Associated Default.
    expect(screen.getByText(/Resources associated with topics on Activity Reports/i)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /Topics/i })).toBeInTheDocument();
    expect(screen.getByText(/Oct-22/i)).toBeInTheDocument();
    expect(screen.getByText(/Nov-22/i)).toBeInTheDocument();
    expect(screen.getByText(/Dec-22/i)).toBeInTheDocument();

    expect(screen.getByText(/https:\/\/official1\.gov/i)).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /66/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /773/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /88/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: /99/i })).toBeInTheDocument();
  });

  it('handles errors by displaying an error message', async () => {
    // Page Load.
    fetchMock.get(`${resourcesUrl}?${allRegions}`, 500, { overwriteRoutes: true });
    fetchMock.post(reportPostUrl, 500);

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

    const [alert] = await screen.findAllByRole('alert');
    expect(alert).toBeVisible();
    expect(alert.textContent).toBe('Unable to fetch resources');
  });

  it('exports reports en masse', async () => {
    // Page Load.
    fetchMock.get(`${resourcesUrl}?${allRegions}&${defaultDateParam}`, resourcesDefault);
    fetchMock.get(`${resourcesUrl}?${allRegions}`, resourcesDefault);
    fetchMock.post(reportPostUrl, {
      count: 1,
      rows: [{
        id: 1,
        sortedTopics: [],
        activityRecipients: [],
        displayId: 'R-1-23',
      }],
      topics: [],
      recipients: [],
    });

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
    expect(await screen.findByText(/resource dashboard/i)).toBeVisible();

    const exportReportsMenu = await screen.findByRole('button', { name: /reports menu/i });
    act(() => userEvent.click(exportReportsMenu));

    const getAllUrl = '/api/activity-reports/download-all?id=1&id=2&id=3';
    fetchMock.get(getAllUrl, 200);

    const exportAllReportsButton = document.querySelector('#activity-reportsexport-table');
    act(() => userEvent.click(exportAllReportsButton));

    expect(fetchMock.called(getAllUrl)).toBe(true);
  });
  it('exports reports singly', async () => {
    // Page Load.
    fetchMock.get(`${resourcesUrl}?${allRegions}&${defaultDateParam}`, resourcesDefault);
    fetchMock.get(`${resourcesUrl}?${allRegions}`, resourcesDefault);
    fetchMock.post(reportPostUrl, {
      count: 1,
      rows: [{
        id: 1,
        sortedTopics: [],
        activityRecipients: [],
        displayId: 'R-1-23',
      }],
      topics: [],
      recipients: [],
    });

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

    const checkbox = await screen.findByRole('checkbox', { name: /select R-1-23/i });
    act(() => userEvent.click(checkbox));

    const exportReportsMenu = await screen.findByRole('button', { name: /reports menu/i });
    act(() => userEvent.click(exportReportsMenu));

    const csvUrl = '/api/activity-reports/download?format=csv&report[]=1';
    fetchMock.get(csvUrl, 200);

    const exportSelectedReportsButton = document.querySelector('#activity-reportsexport-reports');
    act(() => userEvent.click(exportSelectedReportsButton));

    expect(fetchMock.called(csvUrl)).toBe(true);
  });
});
